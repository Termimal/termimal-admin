/**
 * /api/admin/jit — just-in-time elevation list + grant + revoke.
 *
 *   GET                                  → list (active + recent)
 *   POST { role, reason, duration_min }  → grant for self
 *   PATCH { id, action: 'revoke' }       → revoke
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { requestElevation, revokeElevation } from '@/lib/admin/jit'

export async function GET() {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const { data, error } = await sb.from('jit_elevations')
    .select('*').order('granted_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { role?: string; reason?: string; duration_min?: number } | null
  if (!body?.role || !body.reason) return NextResponse.json({ error: 'role + reason required' }, { status: 400 })
  const res = await requestElevation({
    userId: gate.user.id,
    role:   body.role,
    reason: body.reason,
    durationMin: body.duration_min,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })

  // Audit
  await serviceClient().from('audit_logs').insert({
    user_id: gate.user.id, action: 'jit.grant',
    entity_type: 'role', entity_id: body.role,
    metadata: { id: res.id, expires_at: res.expires_at, reason: body.reason },
  })
  return NextResponse.json(res)
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string } | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const res = await revokeElevation({ approvalId: body.id, revokerId: gate.user.id })
  if (!res.ok) return NextResponse.json({ error: 'revoke failed' }, { status: 500 })
  await serviceClient().from('audit_logs').insert({
    user_id: gate.user.id, action: 'jit.revoke',
    entity_type: 'jit', entity_id: body.id, metadata: {},
  })
  return NextResponse.json({ ok: true })
}
