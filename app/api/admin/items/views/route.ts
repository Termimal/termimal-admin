/**
 * /api/admin/items/views — saved filter combos that appear as chips.
 *
 *   GET                         → mine + shared
 *   POST { name, filters, sort, view_mode } → create
 *   PATCH { id, patch }         → update mine
 *   DELETE ?id=                 → delete mine
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET() {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const { data, error } = await sb.from('admin_item_views')
    .select('*')
    .or(`user_id.eq.${gate.user.id},is_shared.eq.true`)
    .order('view_position', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message, views: [] }, { status: 500 })
  return NextResponse.json({ views: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as {
    name?: string; filters?: Record<string, unknown>; sort?: Record<string, unknown>;
    view_mode?: string; is_shared?: boolean
  } | null
  if (!body?.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const sb = serviceClient()
  const { data, error } = await sb.from('admin_item_views').insert({
    user_id:    gate.user.id,
    name:       body.name.trim().slice(0, 80),
    filters:    body.filters ?? {},
    sort:       body.sort ?? { by: 'updated_at', dir: 'desc' },
    view_mode:  body.view_mode ?? 'board',
    is_shared:  !!body.is_shared,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
  if (!body?.id || !body.patch) return NextResponse.json({ error: 'id + patch required' }, { status: 400 })
  const sb = serviceClient()
  const { error } = await sb.from('admin_item_views').update(body.patch).eq('id', body.id).eq('user_id', gate.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = serviceClient()
  const { error } = await sb.from('admin_item_views').delete().eq('id', id).eq('user_id', gate.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
