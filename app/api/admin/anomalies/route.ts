import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env"
/**
 * /api/admin/anomalies — read-only anomaly detection feed.
 *
 * Computes lightweight detectors over the last 24 hours of activity
 * and returns a scored, sorted list of alerts. Designed to be safe to
 * call frequently (no writes, ~10 service-role queries, results
 * cached at the layer above).
 *
 * Detectors (V1):
 *   1. SIGNUP_BURST          — signups in last hour > 3× the 7-day hourly avg
 *   2. EMAIL_DOMAIN_CLUSTER  — 5+ signups from the same domain in 24 h
 *   3. DISPOSABLE_ESCAPE     — signup whose domain matches our blocklist
 *                              (means a row slipped past the signup gate)
 *   4. TRIAL_STRANDED        — subscription_status='trialing' but
 *                              trial_ends_at is in the past
 *   5. FAILED_PAYMENT_SURGE  — invoices(status=payment_failed) in 24 h
 *                              ≥ 5 OR ≥ 3× the 7-day daily avg
 *   6. IP_DENSITY            — same IP signed >= 3 distinct users in 24 h
 *   7. CROSS_COUNTRY_LOGIN   — single user signed in from >= 2 countries
 *                              in 24 h (credential reuse / VPN-rotation)
 *
 * Severity is one of {info, warn, critical}. The page surfaces them
 * sorted critical → warn → info, then most recent first within each
 * bucket.
 *
 * Auth: this route assumes the calling session has already passed the
 * admin gate from middleware.ts. The service-role key is used only
 * inside the route — never returned to the client.
 *
 * Runtime: default Node runtime (NOT edge) because OpenNext for
 * Cloudflare requires edge-runtime routes to be defined as separate
 * functions in the open-next config, and the rest of /app/api/admin/*
 * uses the default runtime — keeping anomalies on the same runtime
 * keeps the bundle simple.
 */

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'

interface Anomaly {
  id:        string
  type:
    | 'SIGNUP_BURST'
    | 'EMAIL_DOMAIN_CLUSTER'
    | 'DISPOSABLE_ESCAPE'
    | 'TRIAL_STRANDED'
    | 'FAILED_PAYMENT_SURGE'
    | 'IP_DENSITY'
    | 'CROSS_COUNTRY_LOGIN'
    | 'HIGH_RISK_LOGIN'
  severity:  'info' | 'warn' | 'critical'
  title:     string
  detail:    string
  /** When the underlying signal occurred (latest event in the cluster). */
  observed_at: string
  /** Free-form payload for the UI to render drilldowns. */
  context:   Record<string, unknown>
}

function adminClient() {
  const url = supabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createSbClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const HOUR_MS  = 60 * 60 * 1000
const DAY_MS   = 24 * HOUR_MS
const WEEK_MS  = 7  * DAY_MS

// ── Detectors ─────────────────────────────────────────────────────

async function detectSignupBurst(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const since7d = new Date(Date.now() - WEEK_MS).toISOString()
  const sinceHr = new Date(Date.now() - HOUR_MS).toISOString()
  const { data: weekly, error: weklyErr } = await sb
    .from('profiles')
    .select('created_at')
    .gte('created_at', since7d)
  if (weklyErr || !weekly) return []
  const lastHourCount = weekly.filter(p => p.created_at >= sinceHr).length
  // Average count per hour over the past 7 days, excluding the
  // current hour so we compare to baseline, not the spike itself.
  const baseline7d = weekly.filter(p => p.created_at < sinceHr).length / (7 * 24)
  const expected = Math.max(1, baseline7d)
  const ratio = lastHourCount / expected
  if (lastHourCount < 5 || ratio < 3) return []
  return [{
    id:          rid('signup_burst'),
    type:        'SIGNUP_BURST',
    severity:    ratio >= 6 ? 'critical' : 'warn',
    title:       `Signup burst: ${lastHourCount} accounts in the last hour`,
    detail:      `Baseline is ~${expected.toFixed(1)}/h over the past 7 days. Current rate is ${ratio.toFixed(1)}× normal.`,
    observed_at: new Date().toISOString(),
    context:     { last_hour_count: lastHourCount, baseline_per_hour: expected, ratio },
  }]
}

async function detectEmailDomainCluster(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const since = new Date(Date.now() - DAY_MS).toISOString()
  const { data, error } = await sb
    .from('profiles')
    .select('id, email, created_at')
    .gte('created_at', since)
  if (error || !data) return []
  const byDomain = new Map<string, { ids: string[]; latest: string }>()
  for (const row of data) {
    const email = (row as { email?: string }).email
    if (!email) continue
    const at = email.lastIndexOf('@')
    if (at < 0) continue
    const domain = email.slice(at + 1).toLowerCase()
    if (!domain) continue
    let group = byDomain.get(domain)
    if (!group) { group = { ids: [], latest: row.created_at }; byDomain.set(domain, group) }
    group.ids.push(row.id)
    if (row.created_at > group.latest) group.latest = row.created_at
  }
  const out: Anomaly[] = []
  for (const [domain, g] of byDomain.entries()) {
    if (g.ids.length < 5) continue
    // Skip the obvious public providers — 5+ gmail signups in 24h
    // is not a signal on its own.
    if (PUBLIC_EMAIL_DOMAINS.has(domain)) continue
    out.push({
      id:          rid('domain_cluster'),
      type:        'EMAIL_DOMAIN_CLUSTER',
      severity:    g.ids.length >= 15 ? 'critical' : 'warn',
      title:       `${g.ids.length} signups from @${domain} in 24 h`,
      detail:      `Same email domain across ${g.ids.length} accounts. Possible signup farm or single-org bulk creation.`,
      observed_at: g.latest,
      context:     { domain, user_ids: g.ids.slice(0, 50) },
    })
  }
  return out
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com',
  'msn.com', 'pm.me', 'mail.com', 'zoho.com', 'gmx.com', 'gmx.de', 'yandex.com',
  'qq.com', '163.com', 'naver.com',
])

async function detectDisposableEscapes(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const since = new Date(Date.now() - DAY_MS).toISOString()
  const [{ data: bad, error: be }, { data: profiles, error: pe }] = await Promise.all([
    sb.from('disposable_email_domains').select('domain'),
    sb.from('profiles').select('id, email, created_at').gte('created_at', since),
  ])
  if (be || pe || !bad || !profiles) return []
  const blocklist = new Set(bad.map(b => b.domain.toLowerCase()))
  const escapes: Anomaly[] = []
  for (const row of profiles) {
    const email = (row as { email?: string }).email
    if (!email) continue
    const at = email.lastIndexOf('@')
    if (at < 0) continue
    const domain = email.slice(at + 1).toLowerCase()
    if (!blocklist.has(domain)) continue
    escapes.push({
      id:          rid('disposable_escape'),
      type:        'DISPOSABLE_ESCAPE',
      severity:    'critical',
      title:       `Disposable-email signup escaped the gate: ${email}`,
      detail:      `Domain "${domain}" is on the disposable_email_domains blocklist but the signup completed. Investigate the signup hardening path.`,
      observed_at: row.created_at,
      context:     { user_id: row.id, email, domain },
    })
  }
  return escapes
}

async function detectTrialStranded(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('profiles')
    .select('id, email, plan, subscription_status, trial_ends_at')
    .eq('subscription_status', 'trialing')
    .lt('trial_ends_at', now)
  if (error || !data || data.length === 0) return []
  // Aggregate to a single anomaly so the alert list doesn't drown in
  // per-user rows. Drilldown shows the affected user_ids.
  return [{
    id:          rid('trial_stranded'),
    type:        'TRIAL_STRANDED',
    severity:    data.length >= 10 ? 'warn' : 'info',
    title:       `${data.length} accounts stuck in 'trialing' past trial_ends_at`,
    detail:      `Their trial ended but subscription_status hasn't been flipped by Stripe. Either the webhook missed customer.subscription.updated or they cancelled and the row was never cleaned.`,
    observed_at: now,
    context:     { count: data.length, sample_user_ids: data.slice(0, 20).map(r => r.id) },
  }]
}

async function detectFailedPaymentSurge(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const since7d = new Date(Date.now() - WEEK_MS).toISOString()
  const since1d = new Date(Date.now() - DAY_MS).toISOString()
  // Stripe's invoice.payment_failed populates invoices.status, not
  // payments — both tables exist; we hit invoices since the webhook
  // writes there.
  const { data: weekly, error: we } = await sb
    .from('invoices')
    .select('created_at, status')
    .gte('created_at', since7d)
    .neq('status', 'paid')
  if (we || !weekly) return []
  const lastDay  = weekly.filter(r => r.created_at >= since1d).length
  const priorAvg = (weekly.filter(r => r.created_at < since1d).length) / 6 // 6 prior days
  const baseline = Math.max(1, priorAvg)
  if (lastDay < 5 && lastDay / baseline < 3) return []
  return [{
    id:          rid('failed_payment_surge'),
    type:        'FAILED_PAYMENT_SURGE',
    severity:    lastDay >= 25 ? 'critical' : 'warn',
    title:       `${lastDay} non-paid invoice events in the last 24 h`,
    detail:      `Baseline is ~${baseline.toFixed(1)}/day over the prior 6 days. Investigate Stripe — could indicate card-testing fraud, a price misconfig, or a real biller outage.`,
    observed_at: new Date().toISOString(),
    context:     { last_day: lastDay, baseline_per_day: baseline },
  }]
}

async function detectIpDensity(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const since = new Date(Date.now() - DAY_MS).toISOString()
  const { data, error } = await sb
    .from('user_login_history')
    .select('user_id, ip_address, signed_in_at')
    .gte('signed_in_at', since)
  if (error || !data || data.length === 0) return []
  const byIp = new Map<string, { users: Set<string>; latest: string }>()
  for (const row of data) {
    if (!row.ip_address) continue
    let g = byIp.get(row.ip_address)
    if (!g) { g = { users: new Set<string>(), latest: row.signed_in_at }; byIp.set(row.ip_address, g) }
    g.users.add(row.user_id)
    if (row.signed_in_at > g.latest) g.latest = row.signed_in_at
  }
  const out: Anomaly[] = []
  for (const [ip, g] of byIp.entries()) {
    if (g.users.size < 3) continue
    out.push({
      id:          rid('ip_density'),
      type:        'IP_DENSITY',
      severity:    g.users.size >= 8 ? 'critical' : 'warn',
      title:       `${g.users.size} distinct users signed in from ${ip} in 24 h`,
      detail:      `One IP, multiple accounts. Could be a shared office NAT (benign) or a credential-stuffing run (not benign). Cross-reference the affected user_ids against signup time and country.`,
      observed_at: g.latest,
      context:     { ip_address: ip, user_count: g.users.size, user_ids: [...g.users].slice(0, 50) },
    })
  }
  return out
}

async function detectCrossCountryLogin(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const since = new Date(Date.now() - DAY_MS).toISOString()
  const { data, error } = await sb
    .from('user_login_history')
    .select('user_id, country, signed_in_at, ip_address')
    .gte('signed_in_at', since)
  if (error || !data || data.length === 0) return []
  const byUser = new Map<string, { countries: Set<string>; latest: string; ips: Set<string> }>()
  for (const row of data) {
    if (!row.country) continue
    let g = byUser.get(row.user_id)
    if (!g) { g = { countries: new Set<string>(), latest: row.signed_in_at, ips: new Set<string>() }; byUser.set(row.user_id, g) }
    g.countries.add(row.country)
    if (row.ip_address) g.ips.add(row.ip_address)
    if (row.signed_in_at > g.latest) g.latest = row.signed_in_at
  }
  const out: Anomaly[] = []
  for (const [userId, g] of byUser.entries()) {
    if (g.countries.size < 2) continue
    out.push({
      id:          rid('cross_country'),
      type:        'CROSS_COUNTRY_LOGIN',
      severity:    g.countries.size >= 3 ? 'critical' : 'warn',
      title:       `User signed in from ${g.countries.size} countries in 24 h`,
      detail:      `${[...g.countries].join(', ')}. ${g.ips.size} distinct IPs. VPN-hopping is benign; account takeover is not — confirm with the user.`,
      observed_at: g.latest,
      context:     { user_id: userId, countries: [...g.countries], ip_count: g.ips.size },
    })
  }
  return out
}

/**
 * Surfaces every login_events row whose `anomaly_score >= 40` from
 * the last 24h. The DB-side scorer already did the heavy lifting
 * (impossible travel, new country/device/IP, failed-login burst,
 * many-devices), so this detector is essentially a SELECT.
 *
 * Each high-risk login becomes one Anomaly row. We attach the user's
 * email from auth.users so the admin doesn't have to click through
 * to identify them, and we render the reasons as a comma-list in the
 * detail string.
 */
async function detectHighRiskLogin(sb: ReturnType<typeof adminClient>): Promise<Anomaly[]> {
  const since = new Date(Date.now() - DAY_MS).toISOString()
  const { data: events, error } = await sb
    .from('login_events')
    .select('id, user_id, signed_in_at, ip, country, city, region, browser, os, device_type, method, anomaly_score, anomaly_reasons, marked_safe_by_user, marked_compromised_by_user, notified_at')
    .gte('signed_in_at', since)
    .gte('anomaly_score', 40)
    .order('anomaly_score', { ascending: false })
    .limit(50)
  if (error || !events || events.length === 0) return []

  // Pull the user email + full_name in one batch so we can render
  // identity in the alert title without leaking the whole row.
  const ids = Array.from(new Set(events.map((e: { user_id: string }) => e.user_id)))
  const { data: profiles } = ids.length
    ? await sb.from('profiles').select('id, email, full_name').in('id', ids)
    : { data: [] }
  const profMap = new Map<string, { email?: string; full_name?: string }>(
    (profiles || []).map((p: { id: string }) => [p.id, p as { email?: string; full_name?: string }]),
  )

  return events.map((e: {
    id: string; user_id: string; signed_in_at: string; ip: string | null
    country: string | null; city: string | null; region: string | null
    browser: string | null; os: string | null; device_type: string | null
    method: string | null; anomaly_score: number; anomaly_reasons: string[] | null
    marked_safe_by_user: boolean; marked_compromised_by_user: boolean
    notified_at: string | null
  }): Anomaly => {
    const prof = profMap.get(e.user_id)
    const who  = prof?.email || prof?.full_name || `user-${e.user_id.slice(0, 8)}`
    const where = [e.city, e.region, e.country].filter(Boolean).join(', ') || 'unknown location'
    const dev   = `${e.browser || '?'} on ${e.os || '?'}`
    const reasons = (e.anomaly_reasons || []).join(', ') || '(no reasons recorded)'
    const sev: Anomaly['severity'] =
      e.marked_compromised_by_user ? 'critical' :
      e.anomaly_score >= 70        ? 'critical' :
      e.anomaly_score >= 50        ? 'warn'     :
                                     'info'
    const titlePrefix = e.marked_compromised_by_user ? '🚨 USER REPORTED COMPROMISED — ' : ''
    return {
      id:       `hrlogin_${e.id}`,
      type:     'HIGH_RISK_LOGIN',
      severity: sev,
      title:    `${titlePrefix}High-risk sign-in for ${who} (score ${e.anomaly_score})`,
      detail:   `${dev} · ${where} · IP ${e.ip || '—'} · via ${e.method || '?'}\nReasons: ${reasons}` +
                (e.marked_safe_by_user ? '\n✓ User confirmed this was them.' : '') +
                (e.notified_at ? `\n📧 Email alert sent ${new Date(e.notified_at).toLocaleString()}.` : ''),
      observed_at: e.signed_in_at,
      context: {
        event_id:                   e.id,
        user_id:                    e.user_id,
        user_email:                 prof?.email,
        score:                      e.anomaly_score,
        reasons:                    e.anomaly_reasons || [],
        ip:                         e.ip,
        country:                    e.country,
        city:                       e.city,
        region:                     e.region,
        browser:                    e.browser,
        os:                         e.os,
        device_type:                e.device_type,
        method:                     e.method,
        marked_safe_by_user:        e.marked_safe_by_user,
        marked_compromised_by_user: e.marked_compromised_by_user,
        notified_at:                e.notified_at,
      },
    }
  })
}

// ── Entrypoint ─────────────────────────────────────────────────────

export async function GET() {
  const gate = await requireAdmin('anomalies.read')
  if (gate.ok === false) return gate.response
  let sb: ReturnType<typeof adminClient>
  try {
    sb = adminClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'configuration error', anomalies: [] },
      { status: 500 },
    )
  }

  // Run detectors in parallel. Each returns an Anomaly[] or [].
  // Detector failures degrade gracefully (we just lose that signal
  // for this poll).
  const settled = await Promise.allSettled([
    detectSignupBurst(sb),
    detectEmailDomainCluster(sb),
    detectDisposableEscapes(sb),
    detectTrialStranded(sb),
    detectFailedPaymentSurge(sb),
    detectIpDensity(sb),
    detectCrossCountryLogin(sb),
    detectHighRiskLogin(sb),
  ])

  const anomalies: Anomaly[] = []
  const errors: string[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') anomalies.push(...r.value)
    else                          errors.push(String(r.reason).slice(0, 200))
  }

  // critical → warn → info, then newest first within each bucket.
  const order = { critical: 0, warn: 1, info: 2 }
  anomalies.sort((a, b) => {
    const s = order[a.severity] - order[b.severity]
    if (s !== 0) return s
    return b.observed_at.localeCompare(a.observed_at)
  })

  return NextResponse.json({
    anomalies,
    counts: {
      critical: anomalies.filter(a => a.severity === 'critical').length,
      warn:     anomalies.filter(a => a.severity === 'warn').length,
      info:     anomalies.filter(a => a.severity === 'info').length,
      total:    anomalies.length,
    },
    detector_errors: errors,
    generated_at: new Date().toISOString(),
  })
}
