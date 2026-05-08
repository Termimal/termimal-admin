/**
 * /api/admin/customer-notes — per-user activity timeline.
 *
 *   GET  /api/admin/customer-notes?user_id=…
 *   POST /api/admin/customer-notes  { user_id, body, kind?, pinned? }
 *   PATCH /api/admin/customer-notes  { id, patch: { body?, kind?, pinned? } }
 *   DELETE /api/admin/customer-notes?id=…
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const sb = serviceClient()
    const userId = new URL(request.url).searchParams.get('user_id')
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    const { data: notes, error } = await sb
      .from('customer_notes')
      .select('*')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message, notes: [] }, { status: 500 })

    // Resolve author display names.
    const authorIds = [...new Set((notes ?? []).map(n => n.author_id).filter(Boolean) as string[])]
    let authors: Record<string, { email: string; full_name: string | null }> = {}
    if (authorIds.length) {
      const { data: profs } = await sb.from('profiles').select('id, email, full_name').in('id', authorIds)
      authors = Object.fromEntries((profs ?? []).map(p => [p.id, { email: p.email, full_name: p.full_name }]))
    }
    return NextResponse.json({
      notes: (notes ?? []).map(n => ({ ...n, author: n.author_id ? authors[n.author_id] : null })),
    })
  } catch (e) { return NextResponse.json({ error: String(e), notes: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const sb = serviceClient()
    // Pull caller's id from the cookie session for author_id.
    const cookieSb = await createSsrClient()
    const { data: { user } } = await cookieSb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    const body = await request.json().catch(() => null) as {
      user_id?: string; body?: string; kind?: string; pinned?: boolean; metadata?: unknown
    } | null
    if (!body?.user_id || !body.body) return NextResponse.json({ error: 'user_id and body required' }, { status: 400 })

    const insert = {
      user_id:   body.user_id,
      author_id: user.id,
      body:      body.body.slice(0, 5000),
      kind:      body.kind ?? 'note',
      pinned:    !!body.pinned,
      metadata:  body.metadata ?? {},
    }
    const { data, error } = await sb.from('customer_notes').insert(insert).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ note: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ['body', 'kind', 'pinned'] as const) if (k in body.patch) update[k] = body.patch[k]
    const { data, error } = await sb.from('customer_notes').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ note: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('customer_notes').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
