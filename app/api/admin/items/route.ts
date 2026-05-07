/**
 * /api/admin/items — list + create.
 *
 *   GET  /api/admin/items?status=in_progress&assignee=<uuid>&q=keyword
 *   POST /api/admin/items
 *
 * Reads use the cookie-bound Supabase client so RLS enforces
 * admin-only access. Writes also go through that client — no
 * service-role escape hatch — so RLS sees auth.uid() and the
 * `Admins write items` policy applies.
 *
 * The list response includes denormalised assignee/reporter
 * profile rows so the page can render names/avatars without a
 * second round-trip.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AdminItem {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  category: string | null
  tags: string[]
  assignee_id: string | null
  reporter_id: string | null
  due_date: string | null
  position: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

interface ProfileLite { id: string; full_name: string | null; email: string | null; avatar_url: string | null }

export async function GET(request: Request) {
  try {
    const sb  = await createClient()
    const url = new URL(request.url)
    const status   = url.searchParams.get('status')
    const assignee = url.searchParams.get('assignee')
    const priority = url.searchParams.get('priority')
    const q        = (url.searchParams.get('q') || '').trim()
    const archived = url.searchParams.get('archived') === 'true'

    let query = sb
      .from('admin_items')
      .select('*')
      .order('position', { ascending: true })
      .order('updated_at', { ascending: false })

    if (!archived) query = query.is('archived_at', null)
    else            query = query.not('archived_at', 'is', null)
    if (status   && status   !== 'all') query = query.eq('status',   status)
    if (priority && priority !== 'all') query = query.eq('priority', priority)
    if (assignee && assignee !== 'all') query = query.eq('assignee_id', assignee === 'unassigned' ? null : assignee)
    if (q) query = query.or(`title.ilike.%${q.replace(/[%_]/g, '')}%,description.ilike.%${q.replace(/[%_]/g, '')}%`)

    const { data: items, error } = await query.limit(500)
    if (error) return NextResponse.json({ error: error.message, items: [] }, { status: 500 })

    // Pull profile rows for assignee + reporter so the UI can render names.
    const ids = new Set<string>()
    for (const it of (items as AdminItem[] | null) ?? []) {
      if (it.assignee_id) ids.add(it.assignee_id)
      if (it.reporter_id) ids.add(it.reporter_id)
    }
    let profiles: ProfileLite[] = []
    if (ids.size > 0) {
      const { data: prof } = await sb
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', [...ids])
      profiles = (prof as ProfileLite[] | null) ?? []
    }

    return NextResponse.json({
      items: items ?? [],
      profiles,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', items: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    const body = await request.json().catch(() => null) as Partial<AdminItem> | null
    if (!body || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // The position default places new items at the bottom of their
    // status column. Drag-to-reorder later writes a fractional position.
    const { data: maxRow } = await sb
      .from('admin_items')
      .select('position')
      .eq('status', body.status ?? 'backlog')
      .is('archived_at', null)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextPos = (maxRow?.position ?? 0) + 1

    const insert = {
      title:        body.title.trim().slice(0, 280),
      description:  body.description ?? null,
      status:       body.status   ?? 'backlog',
      priority:     body.priority ?? 'medium',
      category:     body.category ?? 'general',
      tags:         Array.isArray(body.tags) ? body.tags.slice(0, 16) : [],
      assignee_id:  body.assignee_id ?? null,
      reporter_id:  user.id,
      due_date:     body.due_date ?? null,
      position:     nextPos,
    }

    const { data: row, error } = await sb
      .from('admin_items')
      .insert(insert)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Activity log entry. Failure here is non-fatal — the item exists.
    await sb.from('admin_item_events').insert({
      item_id:  row.id,
      actor_id: user.id,
      type:     'create',
      payload:  { status: row.status, priority: row.priority },
    }).then(() => null, () => null)

    return NextResponse.json({ item: row })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
