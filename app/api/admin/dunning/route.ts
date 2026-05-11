/**
 * /api/admin/dunning — past-due retry view + manual actions.
 *
 *   GET                    → list past-due users joined with dunning_state
 *   POST { user_id, action: 'grant_grace' | 'cancel' | 'mark_resolved', days? }
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET() {
  const gate = await requireAdmin('billing.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  // Past-due users + their dunning state.
  const { data: profiles, error: pErr } = await sb.from('profiles')
    .select('id, email, full_name, plan, current_period_end, subscription_status')
    .in('subscription_status', ['past_due','unpaid','incomplete'])
    .limit(500) as { data: Array<{ id: string; email: string; full_name: string | null; plan: string; current_period_end: string | null; subscription_status: string }> | null; error: { message: string } | null }
  if (pErr) return NextResponse.json({ error: pErr.message, rows: [] }, { status: 500 })

  if (!profiles?.length) return NextResponse.json({ rows: [] })

  const ids = profiles.map(p => p.id)
  const { data: states } = await sb.from('dunning_state').select('*').in('user_id', ids)
  const byUser = new Map<string, unknown>((states ?? []).map((s: { user_id: string }) => [s.user_id, s]))

  const rows = profiles.map(p => ({ profile: p, dunning: byUser.get(p.id) ?? null }))
  return NextResponse.json({ rows })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('billing.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { user_id?: string; action?: string; days?: number } | null
  if (!body?.user_id || !body.action) return NextResponse.json({ error: 'user_id + action required' }, { status: 400 })

  const sb = serviceClient()
  const now = new Date().toISOString()
  const days = Math.max(1, Math.min(body.days ?? 7, 30))

  if (body.action === 'grant_grace') {
    const until = new Date(Date.now() + days * 86400000).toISOString()
    await sb.from('dunning_state').upsert({
      user_id: body.user_id, grace_until: until, meta: { granted_by: gate.user.id, granted_at: now },
    }, { onConflict: 'user_id' })
  } else if (body.action === 'mark_resolved') {
    await sb.from('dunning_state').upsert({
      user_id: body.user_id, resolved_at: now, meta: { resolved_by: gate.user.id },
    }, { onConflict: 'user_id' })
  } else if (body.action === 'cancel') {
    // Caller should also cancel in Stripe — we only mirror status here.
    await sb.from('profiles').update({ subscription_status: 'canceled' }).eq('id', body.user_id)
  } else {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'dunning.' + body.action,
    entity_type: 'user', entity_id: body.user_id,
    metadata: { days },
  })
  return NextResponse.json({ ok: true })
}
