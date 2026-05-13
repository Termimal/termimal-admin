/**
 * /api/admin/kb — knowledge base + support macros CRUD.
 *
 *   GET ?q=&tag=    →  search/filter
 *   POST            →  create
 *   PATCH { id }    →  update
 *   DELETE ?id=
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('support.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || '').trim()
  const tag = (url.searchParams.get('tag') || '').trim()
  const sb = serviceClient()
  let query = sb.from('kb_articles').select('*').order('updated_at', { ascending: false }).limit(500)
  if (q)   query = query.or(`title.ilike.%${q}%,body_md.ilike.%${q}%`)
  if (tag) query = query.contains('tags', [tag])
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('support.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body?.slug || !body?.title || !body?.body_md)
    return NextResponse.json({ error: 'slug, title, body_md required' }, { status: 400 })
  const { data, error } = await serviceClient().from('kb_articles')
    .insert({ ...body, author_id: gate.user.id })
    .select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('support.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
  if (!body?.id || !body.patch) return NextResponse.json({ error: 'id + patch required' }, { status: 400 })
  const { error } = await serviceClient().from('kb_articles')
    .update({ ...body.patch, updated_at: new Date().toISOString() }).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('support.write')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await serviceClient().from('kb_articles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
