/**
 * /api/admin/payment-issues
 *
 * Lists accounts whose subscription is in an at-risk state from
 * Stripe's POV. These are the customers a billing operator should
 * actively chase — every row here is potential revenue you're about
 * to lose.
 *
 * Buckets:
 *   - past_due           — Stripe is retrying after a failed charge
 *   - unpaid             — retries exhausted, sub still exists
 *   - incomplete         — checkout abandoned mid-flow
 *   - incomplete_expired — checkout abandoned and 23h elapsed
 *   - paused             — explicitly paused (admin or user)
 *
 * Returns up to 200 rows, ordered by current_period_end ascending
 * so the most-overdue surface first. Includes light enrichment so
 * the UI can render without a second round-trip.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

const AT_RISK_STATUSES = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'] as const
type AtRiskStatus = (typeof AT_RISK_STATUSES)[number]

interface PaymentIssue {
  id:                   string
  email:                string | null
  full_name:            string | null
  plan:                 string | null
  subscription_status:  AtRiskStatus
  stripe_customer_id:   string | null
  current_period_end:   string | null
  billing_interval:     string | null
  days_overdue:         number | null
  created_at:           string
}

export async function GET(request: Request) {
  const gate = await requireAdmin('finance.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get('status')
  const valid: AtRiskStatus[] = statusFilter && (AT_RISK_STATUSES as readonly string[]).includes(statusFilter)
    ? [statusFilter as AtRiskStatus]
    : [...AT_RISK_STATUSES]

  const sb = serviceClient()
  const { data, error } = await sb
    .from('profiles')
    .select('id, email, full_name, plan, subscription_status, stripe_customer_id, current_period_end, billing_interval, created_at')
    .in('subscription_status', valid)
    .order('current_period_end', { ascending: true, nullsFirst: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message, issues: [], totals: {} }, { status: 500 })
  }

  const now = Date.now()
  const issues: PaymentIssue[] = (data ?? []).map((r) => ({
    id:                  r.id,
    email:               r.email,
    full_name:           r.full_name,
    plan:                r.plan,
    subscription_status: r.subscription_status as AtRiskStatus,
    stripe_customer_id:  r.stripe_customer_id,
    current_period_end:  r.current_period_end,
    billing_interval:    r.billing_interval,
    days_overdue: r.current_period_end
      ? Math.max(0, Math.floor((now - new Date(r.current_period_end).getTime()) / 86_400_000))
      : null,
    created_at: r.created_at,
  }))

  // Bucket counts so the UI doesn't recompute on every render.
  const totals: Record<string, number> = Object.fromEntries(AT_RISK_STATUSES.map(s => [s, 0]))
  for (const issue of issues) totals[issue.subscription_status]++
  totals.total = issues.length

  return NextResponse.json({ issues, totals, statuses: AT_RISK_STATUSES })
}
