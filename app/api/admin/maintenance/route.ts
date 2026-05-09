/**
 * /api/admin/maintenance — schedule + manage maintenance windows.
 *
 *   GET    /api/admin/maintenance
 *   POST   /api/admin/maintenance       { starts_at, ends_at, message }
 *   PATCH  /api/admin/maintenance       { id, patch: { starts_at?, ends_at?, message?, status? } }
 *   DELETE /api/admin/maintenance?id=…
 *
 * Sites should ALSO check the `maintenance_mode` flag on
 * system_settings (handled by /admin/system) for ad-hoc downtime.
 * This route is for SCHEDULED windows visible to users in advance.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { requireAdmin } from '@/lib/admin/require-admin'

const ALLOWED = ['starts_at', 'ends_at', 'message', 'status'] as const

export async function GET() {
  const gate = await requireAdmin('maintenance.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const { data, error } = await sb.from('scheduled_maintenance').select('*').order('starts_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  const gate = await requireAdmin('maintenance.write')
  if (gate.ok === false) return gate.response
  try {
    const user = gate.user

    const sb   = serviceClient()
    const body = await request.json().catch(() => null) as { starts_at?: string; ends_at?: string; message?: string } | null
    if (!body?.starts_at || !body.ends_at || !body.message) {
      return NextResponse.json({ error: 'starts_at, ends_at, message required' }, { status: 400 })
    }
    if (new Date(body.ends_at) <= new Date(body.starts_at)) {
      return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 })
    }
    const { data, error } = await sb.from('scheduled_maintenance').insert({
      starts_at:  body.starts_at,
      ends_at:    body.ends_at,
      message:    body.message.slice(0, 500),
      status:     'scheduled',
      created_by: user.id,
    }).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('maintenance.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ALLOWED) if (k in body.patch) update[k] = body.patch[k]
    const { data, error } = await sb.from('scheduled_maintenance').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('maintenance.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    // Soft-cancel rather than hard-delete so the audit trail survives.
    const { error } = await sb.from('scheduled_maintenance').update({ status: 'cancelled' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
