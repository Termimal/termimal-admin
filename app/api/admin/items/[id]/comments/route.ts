/**
 * /api/admin/items/[id]/comments
 *
 *   GET                  → list comments + author profiles
 *   POST { body_md }     → add a comment
 *   PATCH { commentId, body_md } → edit your own comment
 *   DELETE ?commentId=   → delete (author or super_admin)
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const { id } = await params
  const sb = serviceClient()
  const { data: comments, error } = await sb
    .from('admin_item_comments')
    .select('id, item_id, author_id, body_md, edited_at, created_at')
    .eq('item_id', id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message, comments: [] }, { status: 500 })

  const ids = new Set<string>((comments ?? []).map((c: { author_id: string }) => c.author_id))
  let profiles: unknown[] = []
  if (ids.size > 0) {
    const { data } = await sb.from('profiles').select('id, full_name, email, avatar_url').in('id', [...ids])
    profiles = data ?? []
  }
  return NextResponse.json({ comments: comments ?? [], profiles })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const { id } = await params
  const body = await request.json().catch(() => null) as { body_md?: string } | null
  if (!body?.body_md?.trim()) return NextResponse.json({ error: 'body_md required' }, { status: 400 })
  const sb = serviceClient()
  const { data, error } = await sb.from('admin_item_comments').insert({
    item_id: id, author_id: gate.user.id, body_md: body.body_md.trim().slice(0, 8000),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await sb.from('admin_item_events').insert({
    item_id: id, actor_id: gate.user.id, type: 'comment', payload: { comment_id: data.id },
  }).then(() => null, () => null)
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { commentId?: string; body_md?: string } | null
  if (!body?.commentId || !body?.body_md?.trim()) return NextResponse.json({ error: 'commentId + body_md required' }, { status: 400 })
  const sb = serviceClient()
  // Author-only edit (or super_admin).
  const { data: row } = await sb.from('admin_item_comments').select('author_id').eq('id', body.commentId).maybeSingle() as { data: { author_id: string } | null }
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (row.author_id !== gate.user.id && gate.role !== 'super_admin') {
    return NextResponse.json({ error: 'not your comment' }, { status: 403 })
  }
  const { error } = await sb.from('admin_item_comments').update({
    body_md: body.body_md.trim().slice(0, 8000), edited_at: new Date().toISOString(),
  }).eq('id', body.commentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const commentId = url.searchParams.get('commentId')
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 })
  const sb = serviceClient()
  const { data: row } = await sb.from('admin_item_comments').select('author_id').eq('id', commentId).maybeSingle() as { data: { author_id: string } | null }
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (row.author_id !== gate.user.id && gate.role !== 'super_admin') {
    return NextResponse.json({ error: 'not your comment' }, { status: 403 })
  }
  const { error } = await sb.from('admin_item_comments').delete().eq('id', commentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
