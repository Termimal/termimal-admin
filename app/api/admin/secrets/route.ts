/**
 * /api/admin/secrets — secrets rotation registry (METADATA ONLY).
 *
 * We NEVER store the secret value in the DB. This is purely a
 * tracking table: name + when it was last rotated + when it's due.
 *
 *   GET                                → list, with `overdue` boolean
 *   POST { name, rotation_days }       → create
 *   PATCH { id, action: 'rotated' }    → mark rotated NOW
 *   PATCH { id, patch }                → update metadata
 *   DELETE ?id=                        → remove
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

interface SecretRow {
  id: string
  name: string
  rotation_days: number
  last_rotated_at: string | null
  is_active: boolean
  description: string | null
  owner: string | null
  notes: string | null
  updated_at: string
}

export async function GET() {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  const { data, error } = await serviceClient().from('secrets_registry').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  const now = Date.now()
  const rows = (data as SecretRow[] ?? []).map(r => {
    const due = r.last_rotated_at
      ? new Date(r.last_rotated_at).getTime() + r.rotation_days * 24 * 3600 * 1000
      : 0
    return { ...r, overdue: !r.last_rotated_at || now > due, due_at: due ? new Date(due).toISOString() : null }
  })
  return NextResponse.json({ rows })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const { data, error } = await serviceClient().from('secrets_registry').insert(body).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as {
    id?: string; action?: string; patch?: Record<string, unknown>; notes?: string
  } | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  let patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.action === 'rotated') {
    patch.last_rotated_at = new Date().toISOString()
    patch.rotated_by = gate.user.id
    if (body.notes) patch.notes = body.notes
  } else if (body.patch) {
    patch = { ...patch, ...body.patch }
  }
  const { error } = await serviceClient().from('secrets_registry').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await serviceClient().from('audit_logs').insert({
    user_id: gate.user.id, action: 'secret.update',
    entity_type: 'secret', entity_id: body.id,
    metadata: { action: body.action || 'patch' },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await serviceClient().from('secrets_registry').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
