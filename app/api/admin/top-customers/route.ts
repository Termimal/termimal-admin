/**
 * /api/admin/top-customers
 *
 * Lists customers with the highest estimated lifetime value. We
 * don't have invoice-level data exposed here, so LTV is approximated
 * from plan price × months active since signup.
 *
 *   plan price = { starter: 9, pro: 9.99, premium: 19.99, free: 0 }
 *   months_active = ceil( (now - created_at) / 30d )
 *   ltv_est = plan_price * months_active
 *
 * Sorted by ltv_est descending. The ranked list is the right starting
 * point for proactive support, NPS outreach, and gifting.
 *
 * Capped at 100 rows; gated to users.read.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

const PLAN_PRICE: Record<string, number> = {
  free:    0,
  starter: 9,
  pro:     9.99,
  premium: 19.99,
}

interface TopCustomer {
  id:                  string
  email:               string | null
  full_name:           string | null
  plan:                string | null
  subscription_status: string | null
  current_period_end:  string | null
  created_at:          string
  months_active:       number
  ltv_estimate:        number
}

export async function GET() {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response

  const sb = serviceClient()
  // Pull every paying account. 500 rows max keeps it bounded.
  const { data, error } = await sb
    .from('profiles')
    .select('id, email, full_name, plan, subscription_status, current_period_end, created_at')
    .in('subscription_status', ['active', 'trialing', 'past_due'])
    .not('plan', 'in', '("free")')
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message, customers: [] }, { status: 500 })
  }

  const now = Date.now()
  const enriched: TopCustomer[] = (data ?? []).map((r) => {
    const ageMs        = Math.max(0, now - new Date(r.created_at).getTime())
    const months_active = Math.max(1, Math.ceil(ageMs / (30 * 86_400_000)))
    const price        = PLAN_PRICE[r.plan ?? 'free'] ?? 0
    return {
      id:                  r.id,
      email:               r.email,
      full_name:           r.full_name,
      plan:                r.plan,
      subscription_status: r.subscription_status,
      current_period_end:  r.current_period_end,
      created_at:          r.created_at,
      months_active,
      ltv_estimate:        +(price * months_active).toFixed(2),
    }
  })

  enriched.sort((a, b) => b.ltv_estimate - a.ltv_estimate)
  const top = enriched.slice(0, 100)

  // Aggregate totals so the UI can show "top 100 = $X of total $Y".
  const totals = {
    top_ltv:   +top.reduce((s, r) => s + r.ltv_estimate, 0).toFixed(2),
    all_ltv:   +enriched.reduce((s, r) => s + r.ltv_estimate, 0).toFixed(2),
    count_all: enriched.length,
  }

  return NextResponse.json({ customers: top, totals })
}
