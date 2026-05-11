/**
 * /api/admin/changelog — CRUD on changelog_entries.
 *
 *   GET                                                → all rows incl. drafts
 *   POST  { slug, version?, title, body_md, kind, publish? } → create
 *   PATCH { id, ...partial }                           → update
 *   DELETE ?id=...                                     → drop
 *
 * Permission: content.write.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

const KINDS = ['feature','fix','breaking','security','perf']

export async function GET() {
  const gate = await requireAdmin('content.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const { data, error } = await sb.from('changelog_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

interface Body {
  id?: string; slug?: string; version?: string; title?: string
  body_md?: string; kind?: string; publish?: boolean
}

export async function POST(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const body = await req.json().catch(() => null) as Body | null
  if (!body?.slug || !body.title || !body.body_md) {
    return NextResponse.json({ error: 'slug + title + body_md required' }, { status: 400 })
  }
  if (body.kind && !KINDS.includes(body.kind)) {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
  }
  const sb = serviceClient()
  const { data, error } = await sb.from('changelog_entries').insert({
    slug:        body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    version:     body.version?.slice(0, 32) || null,
    title:       body.title.slice(0, 200),
    body_md:     body.body_md.slice(0, 10000),
    kind:        body.kind || 'feature',
    published_at: body.publish ? new Date().toISOString() : null,
    created_by:  gate.user.id,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data })
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const body = await req.json().catch(() => null) as Body | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (body.kind && !KINDS.includes(body.kind)) {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.slug)     patch.slug    = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80)
  if (body.version !== undefined) patch.version = body.version?.slice(0, 32) || null
  if (body.title)    patch.title   = body.title.slice(0, 200)
  if (body.body_md)  patch.body_md = body.body_md.slice(0, 10000)
  if (body.kind)     patch.kind    = body.kind
  if (body.publish === true)  patch.published_at = new Date().toISOString()
  if (body.publish === false) patch.published_at = null
  const sb = serviceClient()
  const { data, error } = await sb.from('changelog_entries').update(patch).eq('id', body.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data })
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = serviceClient()
  const { error } = await sb.from('changelog_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
