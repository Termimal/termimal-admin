/**
 * /api/admin/referrals — referral events with approval flow.
 *
 *   GET    ?status=…&limit=…       list events, joined with referrer/referred profiles
 *   PATCH  { id, status, reward_amount? }   transition status; logs audit row
 *   POST   { referrer_id, referred_id, reward_amount }   manual entry (rare)
 *
 * Status machine:
 *   pending → converted | rejected
 *   converted → rewarded | rejected
 *   rewarded → (terminal — no further transitions)
 *   rejected → (terminal)
 *
 * The actual payout (Stripe credit, coupon, bank transfer) is **not**
 * automated here — admins mark `rewarded` only after they've issued
 * the credit through whatever channel they use. The status field is
 * the audit trail.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

interface ReferralRow {
  id:            string
  referrer_id:   string
  referred_id:   string
  status:        string
  reward_amount: number
  created_at:    string
}
interface ProfileLite { id: string; email: string; full_name: string | null }

const VALID_STATUSES = ['pending', 'converted', 'rewarded', 'rejected'] as const
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  pending:   ['converted', 'rejected'],
  converted: ['rewarded',  'rejected'],
  rewarded:  [],
  rejected:  [],
}

export async function GET(request: Request) {
  try {
    const sb  = serviceClient()
    const u   = new URL(request.url)
    const status = u.searchParams.get('status')
    const limit  = Math.min(500, Math.max(10, Number(u.searchParams.get('limit')) || 100))
    let q = sb.from('referral_events').select('*').order('created_at', { ascending: false }).limit(limit)
    if (status && status !== 'all' && (VALID_STATUSES as readonly string[]).includes(status)) {
      q = q.eq('status', status)
    }
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })

    const rows = (data ?? []) as ReferralRow[]
    const ids  = [...new Set(rows.flatMap(r => [r.referrer_id, r.referred_id]).filter(Boolean))]
    let profileMap: Record<string, ProfileLite> = {}
    if (ids.length) {
      const { data: profs } = await sb
        .from('profiles')
        .select('id, email, full_name')
        .in('id', ids)
      profileMap = Object.fromEntries(((profs ?? []) as ProfileLite[]).map(p => [p.id, p]))
    }

    // Aggregate stats — small enough to compute inline.
    const { data: allRows } = await sb.from('referral_events').select('status, reward_amount')
    const stats = { pending: 0, converted: 0, rewarded: 0, rejected: 0, total_paid_out: 0, pending_owed: 0 }
    for (const r of (allRows ?? []) as Array<Pick<ReferralRow, 'status' | 'reward_amount'>>) {
      const k = r.status as keyof typeof stats
      if (k in stats) (stats as Record<string, number>)[k]++
      if (r.status === 'rewarded')  stats.total_paid_out += Number(r.reward_amount) || 0
      if (r.status === 'converted') stats.pending_owed   += Number(r.reward_amount) || 0
    }

    return NextResponse.json({
      rows: rows.map(r => ({
        ...r,
        referrer: profileMap[r.referrer_id] ?? null,
        referred: profileMap[r.referred_id] ?? null,
      })),
      stats,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e), rows: [] }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieSb = await createSsrClient()
    const { data: { user: actor } } = await cookieSb.auth.getUser()
    if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await request.json().catch(() => null) as {
      id?: string; status?: string; reward_amount?: number; note?: string
    } | null
    if (!body?.id || !body.status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    if (!(VALID_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: `invalid status — must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const sb = serviceClient()
    const { data: current } = await sb.from('referral_events').select('status, reward_amount, referrer_id, referred_id').eq('id', body.id).maybeSingle()
    if (!current) return NextResponse.json({ error: 'referral not found' }, { status: 404 })

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(body.status)) {
      return NextResponse.json({
        error: `cannot transition ${current.status} → ${body.status}; allowed: ${allowed.join(', ') || '(terminal)'}`,
      }, { status: 422 })
    }

    const update: Record<string, unknown> = { status: body.status }
    if (typeof body.reward_amount === 'number' && body.reward_amount >= 0) update.reward_amount = body.reward_amount
    const { data, error } = await sb.from('referral_events').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sb.from('audit_logs').insert({
      user_id:     actor.id,
      action:      `referral_${body.status}`,
      entity_type: 'referral_event',
      entity_id:   body.id,
      metadata:    {
        from: current.status, to: body.status,
        reward_amount: update.reward_amount ?? current.reward_amount,
        note: body.note ?? null,
      },
    }).then(() => null, () => null)

    return NextResponse.json({ row: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
