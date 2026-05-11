/**
 * /api/admin/dsar — Data Subject Access Request queue
 *
 *   GET                       → list pending + recently-closed
 *   POST { email, kind, ... } → create on behalf (e.g. ingested from
 *                                privacy@ inbox)
 *   PATCH { id, status }      → update status (in_progress/complete/rejected)
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const status = (url.searchParams.get('status') || '').trim()
  const sb = serviceClient()
  let q = sb.from('dsar_requests').select('*').order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('users.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { email?: string; kind?: string; user_id?: string | null; reason?: string } | null
  if (!body?.email || !body.kind) return NextResponse.json({ error: 'email + kind required' }, { status: 400 })
  if (!['access','rectification','erasure','portability','restriction','objection'].includes(body.kind))
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
  const sb = serviceClient()
  const { data, error } = await sb.from('dsar_requests').insert({
    email:   body.email.trim().toLowerCase(),
    kind:    body.kind,
    user_id: body.user_id ?? null,
    reason:  body.reason ?? null,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('users.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; status?: string; reason?: string } | null
  if (!body?.id || !body.status) return NextResponse.json({ error: 'id + status required' }, { status: 400 })
  if (!['open','in_progress','complete','rejected'].includes(body.status))
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  const sb = serviceClient()
  const patch: Record<string, unknown> = { status: body.status }
  if (body.status === 'complete' || body.status === 'rejected') {
    patch.responded_at = new Date().toISOString()
    patch.responded_by = gate.user.id
  }
  if (body.reason) patch.reason = body.reason
  const { error } = await sb.from('dsar_requests').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Audit
  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'dsar.update_status',
    entity_type: 'dsar', entity_id: body.id,
    metadata: { status: body.status },
  })
  return NextResponse.json({ ok: true })
}
