/**
 * /api/admin/experiments — CRUD + state transitions for A/B experiments.
 *
 * Storage: public.experiments. The marketing site / SPA reads from
 * this table at request time (or via a small cache) to bucket users
 * into variants. The admin UI here just creates / pauses / ends
 * them; assignment logic lives in the application code.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { requireAdmin } from '@/lib/admin/require-admin'

const ALLOWED = ['name', 'description', 'variants', 'status', 'metric', 'notes'] as const

export async function GET() {
  const gate = await requireAdmin('experiments.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const { data, error } = await sb.from('experiments').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  const gate = await requireAdmin('experiments.write')
  if (gate.ok === false) return gate.response
  try {
    const sb   = serviceClient()
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body?.key || !body.name) return NextResponse.json({ error: 'key and name required' }, { status: 400 })
    const insert: Record<string, unknown> = {
      key: String(body.key).toLowerCase().replace(/\s+/g, '_').slice(0, 60),
      name: body.name,
      description: body.description ?? null,
      variants: body.variants ?? [{ key: 'control', weight: 50 }, { key: 'variant', weight: 50 }],
      status: body.status ?? 'draft',
      metric: body.metric ?? null,
      notes:  body.notes  ?? null,
    }
    const { data, error } = await sb.from('experiments').insert(insert).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('experiments.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ALLOWED) if (k in body.patch) update[k] = body.patch[k]
    if ('status' in update) {
      if (update.status === 'running') update.started_at = new Date().toISOString()
      if (update.status === 'ended')   update.ended_at   = new Date().toISOString()
    }
    const { data, error } = await sb.from('experiments').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('experiments.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('experiments').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
