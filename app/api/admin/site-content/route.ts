/**
 * /api/admin/site-content — CRUD on the marketing-site key/value
 * content table.
 *
 *   GET                            → all rows (admin sees defaults + overrides)
 *   PATCH { key, value }           → upsert a single key
 *   DELETE ?key=…                  → drop (falls back to hardcoded default)
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET() {
  const gate = await requireAdmin('content.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const { data, error } = await sb
    .from('site_content')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true })
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const body = await req.json().catch(() => null) as { key?: string; value?: string; description?: string; category?: string } | null
  if (!body?.key || typeof body.value !== 'string') {
    return NextResponse.json({ error: 'key + value required' }, { status: 400 })
  }
  if (body.key.length > 80 || body.value.length > 4000) {
    return NextResponse.json({ error: 'key or value too long' }, { status: 400 })
  }
  const sb = serviceClient()
  const { data, error } = await sb.from('site_content').upsert({
    key:         body.key,
    value:       body.value,
    description: body.description?.slice(0, 200) || null,
    category:    body.category?.slice(0, 40) || null,
    updated_at:  new Date().toISOString(),
    updated_by:  gate.user.id,
  }, { onConflict: 'key' }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data })
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const key = new URL(req.url).searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
  const sb = serviceClient()
  const { error } = await sb.from('site_content').delete().eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
