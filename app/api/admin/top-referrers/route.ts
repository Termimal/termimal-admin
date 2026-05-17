/**
 * /api/admin/top-referrers
 *
 * Ranks accounts by how many referral_events name them as referrer.
 * Bucketed by status so an admin sees signal vs noise:
 *   - total:     every referral_events row pointing at the user
 *   - converted: pending + converted + rewarded (the referred user
 *                actually signed up)
 *   - rewarded:  finalised reward state — money paid out
 *
 * Sorted by rewarded count desc, with tiebreaker on converted count.
 *
 * Gated to referrals.read.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

interface TopReferrer {
  id:           string
  email:        string | null
  full_name:    string | null
  total:        number
  converted:    number
  rewarded:     number
  reward_total: number
  latest_at:    string | null
}

export async function GET() {
  const gate = await requireAdmin('referrals.read')
  if (gate.ok === false) return gate.response

  const sb = serviceClient()

  // Pull all referral_events — bounded by 5000 because beyond that
  // we'd want a materialized view, not in-memory aggregation.
  const { data, error } = await sb
    .from('referral_events')
    .select('referrer_id, status, reward_amount, created_at')
    .limit(5000)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message, referrers: [] }, { status: 500 })
  }

  type Row = { referrer_id: string; status: string; reward_amount: number | null; created_at: string }

  const agg = new Map<string, {
    total: number; converted: number; rewarded: number; reward_total: number; latest_at: string
  }>()
  for (const r of (data ?? []) as Row[]) {
    if (!r.referrer_id) continue
    const a = agg.get(r.referrer_id) ?? { total: 0, converted: 0, rewarded: 0, reward_total: 0, latest_at: r.created_at }
    a.total++
    if (r.status === 'converted' || r.status === 'rewarded' || r.status === 'pending') a.converted++
    if (r.status === 'rewarded') {
      a.rewarded++
      a.reward_total += Number(r.reward_amount ?? 0)
    }
    if (r.created_at > a.latest_at) a.latest_at = r.created_at
    agg.set(r.referrer_id, a)
  }

  if (agg.size === 0) {
    return NextResponse.json({ referrers: [], totals: { rows: 0, unique_referrers: 0 } })
  }

  // Join referrer profiles for display.
  const ids = [...agg.keys()]
  const { data: profs } = await sb
    .from('profiles')
    .select('id, email, full_name')
    .in('id', ids)
  const profMap = new Map((profs ?? []).map((p) => [p.id, p]))

  const referrers: TopReferrer[] = ids.map((id) => {
    const a = agg.get(id)!
    const p = profMap.get(id) ?? { email: null, full_name: null }
    return {
      id,
      email:        p.email,
      full_name:    p.full_name,
      total:        a.total,
      converted:    a.converted,
      rewarded:     a.rewarded,
      reward_total: +a.reward_total.toFixed(2),
      latest_at:    a.latest_at,
    }
  })

  referrers.sort((a, b) => (b.rewarded - a.rewarded) || (b.converted - a.converted) || (b.total - a.total))

  return NextResponse.json({
    referrers: referrers.slice(0, 100),
    totals: { rows: (data ?? []).length, unique_referrers: referrers.length },
  })
}
