/**
 * /api/admin/ropa — Records of Processing Activities (GDPR Art. 30).
 * Standard CRUD.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET() {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  const { data, error } = await serviceClient().from('ropa_entries').select('*').order('category')
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body?.category || !body?.description || !body?.legal_basis)
    return NextResponse.json({ error: 'category, description, legal_basis required' }, { status: 400 })
  const { data, error } = await serviceClient().from('ropa_entries').insert(body).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
  if (!body?.id || !body.patch) return NextResponse.json({ error: 'id + patch required' }, { status: 400 })
  const { error } = await serviceClient().from('ropa_entries')
    .update({ ...body.patch, updated_at: new Date().toISOString() })
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await serviceClient().from('ropa_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
