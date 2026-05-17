/**
 * /api/admin/alerts
 *
 *   GET    ?status=open|resolved (default open) - list rows newest-first
 *   POST   body: { id, action: 'resolve' | 'reopen', note?: string }
 *
 * Open alerts are unresolved server-side errors that affected real
 * users. Resolving an alert marks it dismissed and unblocks future
 * occurrences from spamming super_admins (well — actually, future
 * occurrences will create a NEW row since the unique index is
 * partial-on-unresolved. Resolving clears the slate).
 *
 * Gated to system.read for GET and system.write for POST.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('system.read')
  if (gate.ok === false) return gate.response

  const url    = new URL(request.url)
  const status = url.searchParams.get('status') ?? 'open'

  const sb = serviceClient()
  let q = sb.from('critical_alerts').select('*').order('last_seen_at', { ascending: false }).limit(500)
  if (status === 'open')     q = q.is('resolved_at', null)
  if (status === 'resolved') q = q.not('resolved_at', 'is', null)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ error: error.message, alerts: [] }, { status: 500 })
  }
  type Row = { severity: string; count: number; resolved_at: string | null }
  const rows = (data ?? []) as Row[]
  return NextResponse.json({
    alerts: data ?? [],
    totals: {
      open:     rows.filter(r => !r.resolved_at).length,
      resolved: rows.filter(r =>  r.resolved_at).length,
      critical: rows.filter(r => !r.resolved_at && r.severity === 'critical').length,
      occurrences_24h: rows.filter(r => !r.resolved_at).reduce((s, r) => s + (r.count || 0), 0),
    },
  })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('system.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as { id?: string; action?: 'resolve' | 'reopen'; note?: string } | null
  if (!body?.id || !body.action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  const sb    = serviceClient()
  const patch = body.action === 'resolve'
    ? { resolved_at: new Date().toISOString(), resolved_by: gate.user.id, resolved_note: body.note ?? null }
    : { resolved_at: null, resolved_by: null, resolved_note: null }

  const { error } = await sb.from('critical_alerts').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('audit_logs').insert({
    user_id:     gate.user.id,
    action:      `alert.${body.action}`,
    entity_type: 'critical_alert',
    entity_id:   body.id,
    metadata:    { note: body.note ?? null },
  })

  return NextResponse.json({ ok: true })
}
