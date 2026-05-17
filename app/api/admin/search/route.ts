/**
 * /api/admin/search — power search across users, subscriptions, and
 * recent activity for the back office.
 *
 * Single query box, one endpoint. The caller passes ?q=... and we
 * pattern-match across:
 *   - profiles.email          (substring, case-insensitive)
 *   - profiles.full_name      (substring)
 *   - profiles.id             (exact UUID, when q looks like a UUID)
 *   - profiles.stripe_customer_id (exact)
 *   - referral_events.referral_code (exact when q matches the code shape)
 *
 * Returns up to 20 user hits, each enriched with:
 *   - active subscription summary (status, plan, current_period_end)
 *   - latest 5 audit_log entries
 *
 * Gated to any admin/super_admin role. Service-role bypasses RLS so
 * the search works against every row, but the caller is still
 * authenticated.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STRIPE_CUS_RE = /^cus_[A-Za-z0-9]+$/

interface UserHit {
  id:                   string
  email:                string | null
  full_name:            string | null
  plan:                 string | null
  subscription_status:  string | null
  stripe_customer_id:   string | null
  created_at:           string
  current_period_end:   string | null
  recent_actions:       Array<{ action: string; entity_type: string | null; created_at: string }>
}

export async function GET(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const q   = (url.searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ q, hits: [], hint: 'query at least 2 chars' })
  }

  const sb = serviceClient()

  // ── Build the OR query for profiles. Use ilike for substrings,
  // eq for exact-match shapes (UUID, Stripe customer ID).
  const exactId       = UUID_RE.test(q) ? q : null
  const exactStripe   = STRIPE_CUS_RE.test(q) ? q : null
  const ilikePattern  = `%${q.replace(/[%_]/g, '\\$&')}%`

  const orParts: string[] = [
    `email.ilike.${ilikePattern}`,
    `full_name.ilike.${ilikePattern}`,
  ]
  if (exactId)     orParts.push(`id.eq.${exactId}`)
  if (exactStripe) orParts.push(`stripe_customer_id.eq.${exactStripe}`)

  const { data: rows, error } = await sb
    .from('profiles')
    .select('id, email, full_name, plan, subscription_status, stripe_customer_id, created_at, current_period_end')
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message, hits: [] }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ q, hits: [] })
  }

  // Enrich each hit with the latest 5 audit_log rows. Single batched
  // query → group by actor in memory rather than one query per user.
  const ids = rows.map((r) => r.id)
  const { data: audits } = await sb
    .from('audit_logs')
    .select('user_id, action, entity_type, created_at')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .limit(200)   // generous — group in memory below

  const auditsByUser = new Map<string, Array<{ action: string; entity_type: string | null; created_at: string }>>()
  for (const r of (audits ?? []) as Array<{ user_id: string; action: string; entity_type: string | null; created_at: string }>) {
    const arr = auditsByUser.get(r.user_id) ?? []
    if (arr.length < 5) arr.push({ action: r.action, entity_type: r.entity_type, created_at: r.created_at })
    auditsByUser.set(r.user_id, arr)
  }

  const hits: UserHit[] = rows.map((r) => ({
    id:                  r.id,
    email:               r.email,
    full_name:           r.full_name,
    plan:                r.plan,
    subscription_status: r.subscription_status,
    stripe_customer_id:  r.stripe_customer_id,
    created_at:          r.created_at,
    current_period_end:  r.current_period_end,
    recent_actions:      auditsByUser.get(r.id) ?? [],
  }))

  return NextResponse.json({ q, hits })
}
