/**
 * /api/admin/seo-pages — per-route SEO overrides.
 *
 *   GET    /api/admin/seo-pages
 *   POST   /api/admin/seo-pages   { path, title, description, og_image, canonical, noindex }
 *   PATCH  /api/admin/seo-pages   { id, patch }
 *   DELETE /api/admin/seo-pages?id=…
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'

const ALLOWED = ['path', 'title', 'description', 'og_image', 'canonical', 'noindex'] as const

export async function GET() {
  try {
    const sb = serviceClient()
    const { data, error } = await sb.from('seo_pages').select('*').order('path', { ascending: true })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body?.path) return NextResponse.json({ error: 'path is required' }, { status: 400 })
    const insert: Record<string, unknown> = { path: String(body.path) }
    for (const k of ALLOWED) if (k in body) insert[k] = body[k]
    insert.updated_at = new Date().toISOString()
    const { data, error } = await sb.from('seo_pages').upsert(insert, { onConflict: 'path' }).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ALLOWED) if (k in body.patch) update[k] = body.patch[k]
    update.updated_at = new Date().toISOString()
    const { data, error } = await sb.from('seo_pages').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('seo_pages').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
