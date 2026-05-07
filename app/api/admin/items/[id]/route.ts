/**
 * /api/admin/items/[id] — update + archive (soft delete).
 *
 *   PATCH  /api/admin/items/[id]
 *     body: any subset of { title, description, status, priority,
 *                           category, tags, assignee_id, due_date,
 *                           position }
 *
 *   DELETE /api/admin/items/[id]
 *     Soft-archive (sets archived_at). The row stays so the activity
 *     log keeps its referential integrity. Use ?hard=true to actually
 *     drop the row (super_admin scope only — RLS still gates this).
 *
 * Side effects:
 *   - status / priority / assignee changes record an event in
 *     admin_item_events with the actor_id.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = [
  'title', 'description', 'status', 'priority', 'category',
  'tags', 'assignee_id', 'due_date', 'position',
] as const
type Field = typeof ALLOWED_FIELDS[number]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

    const update: Record<string, unknown> = {}
    for (const k of ALLOWED_FIELDS) {
      if (k in body) update[k] = (body as Record<Field, unknown>)[k]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no valid fields' }, { status: 400 })
    }

    // Tag sanitisation — the column is jsonb; we accept arrays only.
    if ('tags' in update && !Array.isArray(update.tags)) update.tags = []

    // Read prior state so we can write a meaningful event row.
    const { data: prior } = await sb
      .from('admin_items')
      .select('status, priority, assignee_id')
      .eq('id', id)
      .single()

    const { data: row, error } = await sb
      .from('admin_items')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Activity log: emit one event per meaningful field change. Best-effort.
    if (prior) {
      const events: Array<{ type: string; payload: Record<string, unknown> }> = []
      if ('status'      in update && update.status      !== prior.status)      events.push({ type: 'status_change',   payload: { from: prior.status,      to: update.status } })
      if ('priority'    in update && update.priority    !== prior.priority)    events.push({ type: 'priority_change', payload: { from: prior.priority,    to: update.priority } })
      if ('assignee_id' in update && update.assignee_id !== prior.assignee_id) events.push({ type: 'assign',          payload: { from: prior.assignee_id, to: update.assignee_id } })
      for (const ev of events) {
        await sb.from('admin_item_events').insert({
          item_id:  id, actor_id: user.id, type: ev.type, payload: ev.payload,
        }).then(() => null, () => null)
      }
    }

    return NextResponse.json({ item: row })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    const url = new URL(request.url)
    const hard = url.searchParams.get('hard') === 'true'

    if (hard) {
      const { error } = await sb.from('admin_items').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, deleted: true })
    }

    const { data: row, error } = await sb
      .from('admin_items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sb.from('admin_item_events').insert({
      item_id:  id, actor_id: user.id, type: 'archive', payload: {},
    }).then(() => null, () => null)

    return NextResponse.json({ item: row, archived: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
