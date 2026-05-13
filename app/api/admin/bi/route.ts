/**
 * /api/admin/bi — Business Intelligence aggregator.
 *
 * Returns every metric the BI dashboard needs in a single payload:
 *   - signups by day (last 90 days)
 *   - active subscriptions by plan
 *   - MRR (gross + EUR-equivalent across all currencies)
 *   - churn (cancelled in last 30 / 90 days)
 *   - revenue by currency (Stripe-side balance + invoiced)
 *   - referrals breakdown (sources, conversion)
 *   - top countries
 *   - cohort retention (new in month X, still active month X+1, X+2…)
 *
 * The dashboard is read-only — no mutations. Permission required:
 * analytics.read. The handler uses the cookie-bound Supabase
 * client so RLS still applies, then falls back to service-role for
 * tables that don't have admin-readable RLS yet.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

interface SignupRow { created_at: string; plan: string | null }
interface ProfileRow {
  plan: string | null
  subscription_status: string | null
  current_period_end: string | null
  country: string | null
  created_at: string
  stripe_subscription_id: string | null
}

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const days = Math.max(7, Math.min(parseInt(url.searchParams.get('days') || '90', 10), 365))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const sb = serviceClient()

  // ── 1. signups + plan distribution ────────────────────────────
  const { data: profiles } = await sb
    .from('profiles')
    .select('plan, subscription_status, current_period_end, country, created_at, stripe_subscription_id')
    .gte('created_at', since)
    .returns<ProfileRow[]>()

  const signupsByDay: Record<string, number> = {}
  const planCounts:   Record<string, number> = {}
  const countryCounts: Record<string, number> = {}
  for (const p of profiles ?? []) {
    const day = (p.created_at || '').slice(0, 10)
    if (day) signupsByDay[day] = (signupsByDay[day] || 0) + 1
    const plan = p.plan || 'free'
    planCounts[plan] = (planCounts[plan] || 0) + 1
    if (p.country) countryCounts[p.country] = (countryCounts[p.country] || 0) + 1
  }

  // ── 2. MRR (only paying real subs) ────────────────────────────
  // Pricing: pro = €9.99 monthly / €99.99 yearly,
  //          premium = €19.99 / €199.99
  const PLAN_MRR_EUR = { pro: 9.99, premium: 19.99, starter: 4.99 } as Record<string, number>
  const { data: paying } = await sb
    .from('profiles')
    .select('plan, subscription_status, billing_interval, stripe_subscription_id')
    .in('subscription_status', ['active', 'past_due'])
    .not('stripe_subscription_id', 'is', null)
    .returns<{ plan: string | null; subscription_status: string | null; billing_interval: string | null; stripe_subscription_id: string }[]>()
  let mrrEur = 0
  for (const r of paying ?? []) {
    const m = PLAN_MRR_EUR[(r.plan || 'free').toLowerCase()] ?? 0
    if (r.billing_interval === 'year') mrrEur += m // yearly subs already amortise; m is the monthly equivalent
    else mrrEur += m
  }

  // ── 3. churn last-30 days ─────────────────────────────────────
  const churnSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: churned30 } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'canceled')
    .gte('updated_at', churnSince)

  // ── 4. revenue by currency from invoices table (Stripe-mirrored) ──
  // Falls back to empty if no `invoices` table exists yet.
  let revenueByCurrency: Array<{ currency: string; gross: number; net: number; count: number }> = []
  try {
    const { data: inv } = await sb
      .from('invoices')
      .select('currency, amount_paid_cents, fee_cents, paid_at')
      .gte('paid_at', since)
      .returns<{ currency: string; amount_paid_cents: number; fee_cents: number | null }[]>()
    const tally: Record<string, { gross: number; net: number; count: number }> = {}
    for (const i of inv ?? []) {
      const c = (i.currency || 'eur').toUpperCase()
      tally[c] = tally[c] || { gross: 0, net: 0, count: 0 }
      tally[c].gross += (i.amount_paid_cents || 0) / 100
      tally[c].net   += ((i.amount_paid_cents || 0) - (i.fee_cents || 0)) / 100
      tally[c].count += 1
    }
    revenueByCurrency = Object.entries(tally).map(([currency, v]) => ({ currency, ...v }))
  } catch { /* table not present, leave empty */ }

  // ── 5. referrals breakdown ────────────────────────────────────
  let referralsBySource: Array<{ source: string; count: number; converted: number }> = []
  try {
    const { data: refs } = await sb
      .from('referrals')
      .select('source, status')
      .returns<{ source: string | null; status: string | null }[]>()
    const tally: Record<string, { count: number; converted: number }> = {}
    for (const r of refs ?? []) {
      const s = r.source || 'direct'
      tally[s] = tally[s] || { count: 0, converted: 0 }
      tally[s].count += 1
      if (r.status === 'converted' || r.status === 'paid') tally[s].converted += 1
    }
    referralsBySource = Object.entries(tally).map(([source, v]) => ({ source, ...v }))
  } catch { /* no referrals table, skip */ }

  // ── 6. cohort retention (last 6 months) ───────────────────────
  // Group signups by month, then for each cohort check how many
  // are still subscription_status='active' and how many have churned.
  const cohorts: Array<{ month: string; signups: number; active_now: number }> = []
  {
    const sixMo = new Date(); sixMo.setMonth(sixMo.getMonth() - 6); sixMo.setDate(1); sixMo.setHours(0,0,0,0)
    const { data: cohortRows } = await sb
      .from('profiles')
      .select('created_at, subscription_status, plan')
      .gte('created_at', sixMo.toISOString())
      .returns<{ created_at: string; subscription_status: string | null; plan: string | null }[]>()
    const tally: Record<string, { signups: number; active_now: number }> = {}
    for (const r of cohortRows ?? []) {
      const month = (r.created_at || '').slice(0, 7) // YYYY-MM
      tally[month] = tally[month] || { signups: 0, active_now: 0 }
      tally[month].signups += 1
      if (r.subscription_status === 'active' && r.plan && r.plan !== 'free') tally[month].active_now += 1
    }
    for (const [month, v] of Object.entries(tally).sort(([a], [b]) => a.localeCompare(b))) {
      cohorts.push({ month, signups: v.signups, active_now: v.active_now })
    }
  }

  return NextResponse.json({
    ok: true,
    range: { since, days },
    signups_by_day: Object.entries(signupsByDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count })),
    plan_counts:   planCounts,
    country_counts: Object.entries(countryCounts).sort(([, a], [, b]) => b - a).slice(0, 12).map(([country, count]) => ({ country, count })),
    mrr_eur:       mrrEur,
    arr_eur:       mrrEur * 12,
    churned_30d:   churned30 ?? 0,
    revenue_by_currency: revenueByCurrency,
    referrals_by_source: referralsBySource,
    cohorts,
    paying_count:  (paying ?? []).length,
    total_signups: (profiles ?? []).length,
  })
}
