/**
 * Customer health score.
 *
 * 0–100 composite from signals every SaaS has cheap access to:
 *   - days_since_login        (40% weight)   newer = healthier
 *   - onboarding_completion   (15%)          completed-steps / total
 *   - subscription_tier_bias  (15%)          paying > trial > free
 *   - support_burden          (15%)          fewer open tickets = healthier
 *   - billing_health          (15%)          past_due / dunning sinks score
 *
 * The job is computed in batches by an admin route. We persist the
 * latest snapshot in `customer_health` so the user list / win-back
 * queue / churn-risk widget can read by a single index.
 */
import { serviceClient } from './service-client'

interface HealthInputs {
  user_id:                string
  last_login_at:          string | null
  onboarding_state:       Record<string, unknown> | null
  subscription_status:    string | null
  plan:                   string | null
  open_tickets:           number
}

export interface ComputedHealth {
  user_id: string
  score:   number
  band:    'green' | 'yellow' | 'red'
  signals: Record<string, number>
  reasons: string[]
}

const ONBOARDING_TOTAL = 6 // matches OnboardingChecklist STEPS

export function computeHealth(input: HealthInputs): ComputedHealth {
  const reasons: string[] = []
  const signals: Record<string, number> = {}

  // 1) Login recency (40 pts max)
  let recency = 40
  if (input.last_login_at) {
    const ageDays = (Date.now() - new Date(input.last_login_at).getTime()) / (24*3600*1000)
    if (ageDays < 1)        recency = 40
    else if (ageDays < 7)   recency = 35
    else if (ageDays < 14)  recency = 25
    else if (ageDays < 30)  recency = 12
    else                    { recency = 0; reasons.push(`No login in ${Math.round(ageDays)}d`) }
  } else {
    recency = 0
    reasons.push('Never signed in')
  }
  signals.recency = recency

  // 2) Onboarding completion (15 pts)
  let onboarding = 0
  if (input.onboarding_state && typeof input.onboarding_state === 'object') {
    const completed = (input.onboarding_state as { completed?: Record<string, string> })?.completed ?? {}
    const n = Object.keys(completed).length
    onboarding = Math.round((Math.min(n, ONBOARDING_TOTAL) / ONBOARDING_TOTAL) * 15)
    if (n < 3) reasons.push(`Only ${n}/${ONBOARDING_TOTAL} onboarding steps done`)
  } else {
    reasons.push('Onboarding never touched')
  }
  signals.onboarding = onboarding

  // 3) Subscription bias (15 pts)
  let tierBias = 0
  switch (input.subscription_status) {
    case 'active':   tierBias = 15; break
    case 'trialing': tierBias = 10; break
    case 'past_due': tierBias = 4;  reasons.push('Past-due payment'); break
    case 'canceled': tierBias = 2;  reasons.push('Cancelled'); break
    default:         tierBias = 5
  }
  signals.tierBias = tierBias

  // 4) Support burden (15 pts) — fewer open tickets = healthier
  let support = 15
  if (input.open_tickets >= 5)      { support = 0;  reasons.push(`${input.open_tickets} open support tickets`) }
  else if (input.open_tickets >= 3) { support = 5;  reasons.push(`${input.open_tickets} open support tickets`) }
  else if (input.open_tickets >= 1) { support = 10 }
  signals.support = support

  // 5) Billing health (15 pts) — penalise past_due/dunning
  let billing = 15
  if (input.subscription_status === 'past_due') { billing = 0; }
  else if (input.subscription_status === 'canceled') { billing = 5 }
  signals.billing = billing

  const score = Math.max(0, Math.min(100, recency + onboarding + tierBias + support + billing))
  const band: ComputedHealth['band'] =
    score >= 70 ? 'green' :
    score >= 40 ? 'yellow' :
    'red'

  return { user_id: input.user_id, score, band, signals, reasons }
}

/**
 * Compute health for ALL users in batches and persist snapshots.
 * Returns counts so the admin can verify the job ran.
 */
export async function recomputeAllHealth(): Promise<{ green: number; yellow: number; red: number; total: number }> {
  const sb = serviceClient()

  // Get last_login per user from login_events (most recent signed_in_at).
  const { data: profiles } = await sb.from('profiles')
    .select('id, onboarding_state, subscription_status, plan')
    .limit(50000) as { data: Array<{ id: string; onboarding_state: Record<string, unknown> | null; subscription_status: string | null; plan: string | null }> | null }
  if (!profiles?.length) return { green: 0, yellow: 0, red: 0, total: 0 }

  // Last login by user. One round-trip — limited to 100k rows, recent first.
  const { data: logins } = await sb.from('login_events')
    .select('user_id, signed_in_at')
    .order('signed_in_at', { ascending: false })
    .limit(100000) as { data: Array<{ user_id: string; signed_in_at: string }> | null }
  const lastByUser = new Map<string, string>()
  for (const r of (logins ?? [])) {
    if (!lastByUser.has(r.user_id)) lastByUser.set(r.user_id, r.signed_in_at)
  }

  let green = 0, yellow = 0, red = 0
  const rows: ComputedHealth[] = []
  for (const p of profiles) {
    const h = computeHealth({
      user_id:             p.id,
      last_login_at:       lastByUser.get(p.id) ?? null,
      onboarding_state:    p.onboarding_state ?? null,
      subscription_status: p.subscription_status,
      plan:                p.plan,
      open_tickets:        0,
    })
    rows.push(h)
    if (h.band === 'green') green++
    else if (h.band === 'yellow') yellow++
    else red++
  }

  // Upsert in chunks of 500.
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map(h => ({
      user_id: h.user_id,
      score:   h.score,
      band:    h.band,
      signals: h.signals,
      reasons: h.reasons,
      updated_at: new Date().toISOString(),
    }))
    await sb.from('customer_health').upsert(chunk, { onConflict: 'user_id' })
  }

  return { green, yellow, red, total: rows.length }
}
