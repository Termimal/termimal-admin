/**
 * /api/admin/items/[id]/watch — toggle self-as-watcher.
 * POST { add: true | false }  → adds or removes the caller from
 *                                the item.watchers array.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const { id } = await params
  const body = await request.json().catch(() => null) as { add?: boolean } | null
  const sb = serviceClient()
  const { data: row } = await sb.from('admin_items').select('watchers').eq('id', id).maybeSingle() as { data: { watchers: string[] | null } | null }
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const current = new Set(row.watchers ?? [])
  if (body?.add === false) current.delete(gate.user.id)
  else                     current.add(gate.user.id)
  const { error } = await sb.from('admin_items').update({ watchers: [...current] }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, watching: current.has(gate.user.id) })
}
