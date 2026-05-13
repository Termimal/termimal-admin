/**
 * /api/admin/testimonials — CRUD on customer quotes.
 *
 *   GET                        → all rows incl. hidden
 *   POST   { author_name, body, ... }     → create
 *   PATCH  { id, ...partial }             → update
 *   DELETE ?id=…                          → drop
 *
 * Permission: content.write.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

interface Body {
  id?: string
  author_name?: string
  author_role?: string | null
  author_company?: string | null
  body?: string
  avatar_url?: string | null
  plan?: string | null
  rating?: number
  featured?: boolean
  visible?: boolean
  sort_order?: number
}

export async function GET() {
  const gate = await requireAdmin('content.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const { data, error } = await sb
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const body = await req.json().catch(() => null) as Body | null
  if (!body?.author_name?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'author_name + body required' }, { status: 400 })
  }
  const sb = serviceClient()
  const { data, error } = await sb.from('testimonials').insert({
    author_name:    body.author_name.trim().slice(0, 120),
    author_role:    body.author_role?.slice(0, 120) || null,
    author_company: body.author_company?.slice(0, 120) || null,
    body:           body.body.trim().slice(0, 1200),
    avatar_url:     body.avatar_url?.slice(0, 500) || null,
    plan:           body.plan || null,
    rating:         body.rating ?? 5,
    featured:       body.featured ?? false,
    visible:        body.visible ?? true,
    sort_order:     body.sort_order ?? 100,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data })
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const body = await req.json().catch(() => null) as Body | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.author_name)    patch.author_name    = body.author_name.slice(0, 120)
  if (body.author_role !== undefined)    patch.author_role    = body.author_role?.slice(0, 120) || null
  if (body.author_company !== undefined) patch.author_company = body.author_company?.slice(0, 120) || null
  if (body.body)           patch.body           = body.body.slice(0, 1200)
  if (body.avatar_url !== undefined)     patch.avatar_url     = body.avatar_url?.slice(0, 500) || null
  if (body.plan !== undefined)           patch.plan           = body.plan || null
  if (typeof body.rating === 'number')   patch.rating         = body.rating
  if (typeof body.featured === 'boolean') patch.featured       = body.featured
  if (typeof body.visible === 'boolean')  patch.visible        = body.visible
  if (typeof body.sort_order === 'number') patch.sort_order   = body.sort_order
  const sb = serviceClient()
  const { data, error } = await sb.from('testimonials').update(patch).eq('id', body.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data })
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = serviceClient()
  const { error } = await sb.from('testimonials').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
