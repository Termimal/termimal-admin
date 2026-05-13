/**
 * /api/admin/items — list + create (Jira-style).
 *
 *   GET   /api/admin/items?q=&status=todo,in_progress&priority=high,critical
 *                          &labels=infra,security&assignee=<uuid>,<uuid>
 *                          &sprint=Q3-2026&parent=<uuid>&has_due=true
 *                          &archived=false
 *                          &sort_by=updated_at|created_at|due_date|priority|story_points
 *                          &sort_dir=asc|desc&limit=200&offset=0
 *   POST  /api/admin/items                                  → create
 *
 * Search goes through `admin_items_search()` RPC which:
 *   - full-text matches across item_key, title, description, body_md, labels
 *   - filters by every dimension
 *   - sorts with rank as the default boost
 *   - returns total_count for pagination
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

interface AdminItem {
  id: string; item_key: string | null;
  title: string; description: string | null; body_md: string | null;
  status: string; priority: string; category: string | null; severity: string | null;
  sprint: string | null; story_points: number | null; parent_id: string | null;
  tags: unknown; labels: string[];
  assignee_id: string | null; reporter_id: string | null; watchers: string[];
  due_date: string | null; position: number; archived_at: string | null;
  created_at: string; updated_at: string;
}
interface ProfileLite { id: string; full_name: string | null; email: string | null; avatar_url: string | null }

function csv(s: string | null): string[] | null {
  if (!s) return null
  const arr = s.split(',').map(x => x.trim()).filter(Boolean)
  return arr.length ? arr : null
}
function csvUuid(s: string | null): string[] | null { return csv(s) }

export async function GET(request: Request) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  try {
    const url = new URL(request.url)
    const q         = (url.searchParams.get('q') || '').trim()
    const status    = csv(url.searchParams.get('status'))
    const priority  = csv(url.searchParams.get('priority'))
    const labels    = csv(url.searchParams.get('labels'))
    const assignee  = csvUuid(url.searchParams.get('assignee'))
    const reporter  = csvUuid(url.searchParams.get('reporter'))
    const sprint    = csv(url.searchParams.get('sprint'))
    const parent    = url.searchParams.get('parent') || null
    const hasDueRaw = url.searchParams.get('has_due')
    const hasDue    = hasDueRaw === 'true' ? true : hasDueRaw === 'false' ? false : null
    const archived  = url.searchParams.get('archived') === 'true'
    const sortBy    = url.searchParams.get('sort_by') || 'updated_at'
    const sortDir   = url.searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc'
    const limit     = Math.min(Math.max(parseInt(url.searchParams.get('limit')  || '200', 10) || 200, 1), 1000)
    const offset    = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)

    const sb = serviceClient()
    const { data, error } = await sb.rpc('admin_items_search', {
      p_q: q || null,
      p_status: status, p_priority: priority,
      p_labels: labels, p_assignee: assignee, p_reporter: reporter,
      p_sprint: sprint, p_parent: parent, p_has_due: hasDue,
      p_archived: archived, p_sort_by: sortBy, p_sort_dir: sortDir,
      p_limit: limit, p_offset: offset,
    })
    if (error) return NextResponse.json({ error: error.message, items: [] }, { status: 500 })

    const rows = (data ?? []) as Array<AdminItem & { sort_position: number; rank: number; total_count: number }>
    const items = rows.map(r => ({ ...r, position: r.sort_position }))
    const total = rows[0]?.total_count ?? 0

    // Profile lookups for assignee + reporter + watchers + commenters.
    const ids = new Set<string>()
    for (const it of items) {
      if (it.assignee_id) ids.add(it.assignee_id)
      if (it.reporter_id) ids.add(it.reporter_id)
      for (const w of it.watchers ?? []) ids.add(w)
    }
    let profiles: ProfileLite[] = []
    if (ids.size > 0) {
      const { data: prof } = await sb.from('profiles').select('id, full_name, email, avatar_url').in('id', [...ids])
      profiles = (prof as ProfileLite[] | null) ?? []
    }

    // Facets for the chip filters (labels, sprints).
    const { data: facets } = await sb.rpc('admin_items_facets')

    return NextResponse.json({ items, profiles, total, facets: facets ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', items: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  try {
    const sb = await createClient()
    const user = gate.user
    const body = await request.json().catch(() => null) as Partial<AdminItem> | null
    if (!body?.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const { data: maxRow } = await sb
      .from('admin_items')
      .select('position')
      .eq('status', body.status ?? 'backlog')
      .is('archived_at', null)
      .order('position', { ascending: false })
      .limit(1).maybeSingle()
    const nextPos = (maxRow?.position ?? 0) + 1

    const insert = {
      title:        body.title.trim().slice(0, 280),
      description:  body.description ?? null,
      body_md:      body.body_md ?? null,
      status:       body.status   ?? 'backlog',
      priority:     body.priority ?? 'medium',
      category:     body.category ?? 'general',
      severity:     body.severity ?? null,
      sprint:       body.sprint ?? null,
      story_points: body.story_points ?? null,
      parent_id:    body.parent_id ?? null,
      tags:         Array.isArray(body.tags) ? body.tags.slice(0, 16) : [],
      labels:       Array.isArray(body.labels) ? body.labels.slice(0, 32) : [],
      assignee_id:  body.assignee_id ?? null,
      reporter_id:  user.id,
      watchers:     Array.isArray(body.watchers) ? body.watchers.slice(0, 32) : [],
      due_date:     body.due_date ?? null,
      position:     nextPos,
    }

    const { data: row, error } = await sb.from('admin_items').insert(insert).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sb.from('admin_item_events').insert({
      item_id: row.id, actor_id: user.id, type: 'create',
      payload: { status: row.status, priority: row.priority },
    }).then(() => null, () => null)

    return NextResponse.json({ item: row })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
