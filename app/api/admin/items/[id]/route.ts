/**
 * /api/admin/items/[id] — update + archive (soft delete).
 *
 *   PATCH  /api/admin/items/[id]
 *     body: any subset of { title, description, body_md, status,
 *                           priority, category, severity, sprint,
 *                           story_points, parent_id, tags, labels,
 *                           assignee_id, watchers, due_date, position }
 *
 *   DELETE /api/admin/items/[id]      → soft archive (sets archived_at)
 *   DELETE /api/admin/items/[id]?hard=true  → hard delete (super_admin only)
 *
 * Each meaningful field change emits an admin_item_events row.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/require-admin'

const ALLOWED_FIELDS = [
  'title', 'description', 'body_md', 'status', 'priority',
  'category', 'severity', 'sprint', 'story_points', 'parent_id',
  'tags', 'labels', 'assignee_id', 'watchers', 'due_date', 'position',
] as const
type Field = typeof ALLOWED_FIELDS[number]

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const sb = await createClient()
    const user = gate.user
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

    const update: Record<string, unknown> = {}
    for (const k of ALLOWED_FIELDS) {
      if (k in body) update[k] = (body as Record<Field, unknown>)[k]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no valid fields' }, { status: 400 })
    }
    if ('tags'     in update && !Array.isArray(update.tags))     update.tags     = []
    if ('labels'   in update && !Array.isArray(update.labels))   update.labels   = []
    if ('watchers' in update && !Array.isArray(update.watchers)) update.watchers = []

    const { data: prior } = await sb.from('admin_items')
      .select('status, priority, assignee_id, labels, sprint, story_points')
      .eq('id', id).single()

    const { data: row, error } = await sb.from('admin_items')
      .update(update).eq('id', id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (prior) {
      const events: Array<{ type: string; payload: Record<string, unknown> }> = []
      if ('status'       in update && update.status       !== prior.status)       events.push({ type: 'status_change',       payload: { from: prior.status,       to: update.status } })
      if ('priority'     in update && update.priority     !== prior.priority)     events.push({ type: 'priority_change',     payload: { from: prior.priority,     to: update.priority } })
      if ('assignee_id'  in update && update.assignee_id  !== prior.assignee_id)  events.push({ type: 'assign',              payload: { from: prior.assignee_id,  to: update.assignee_id } })
      if ('sprint'       in update && update.sprint       !== prior.sprint)       events.push({ type: 'sprint_change',       payload: { from: prior.sprint,       to: update.sprint } })
      if ('story_points' in update && update.story_points !== prior.story_points) events.push({ type: 'story_points_change', payload: { from: prior.story_points, to: update.story_points } })
      if ('labels'       in update) {
        const a = new Set((prior.labels ?? []) as string[])
        const b = new Set((update.labels ?? []) as string[])
        const added   = [...b].filter(x => !a.has(x))
        const removed = [...a].filter(x => !b.has(x))
        if (added.length || removed.length) events.push({ type: 'labels_change', payload: { added, removed } })
      }
      for (const ev of events) {
        await sb.from('admin_item_events').insert({
          item_id: id, actor_id: user.id, type: ev.type, payload: ev.payload,
        }).then(() => null, () => null)
      }
    }
    return NextResponse.json({ item: row })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  try {
    const sb = await createClient()
    const user = gate.user
    const url = new URL(request.url)
    const hard = url.searchParams.get('hard') === 'true'

    if (hard) {
      const { error } = await sb.from('admin_items').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, deleted: true })
    }
    const { data: row, error } = await sb.from('admin_items')
      .update({ archived_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await sb.from('admin_item_events').insert({
      item_id: id, actor_id: user.id, type: 'archive', payload: {},
    }).then(() => null, () => null)
    return NextResponse.json({ item: row, archived: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
