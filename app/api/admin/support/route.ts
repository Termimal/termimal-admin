/**
 * /api/admin/support — list + update support_tickets.
 *
 *   GET  /api/admin/support?status=open|in_progress|resolved|closed&priority=…&q=…
 *   PATCH /api/admin/support  body: { id, patch: {...} }
 */
import { NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('missing supabase env')
  return createSb(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

const ALLOWED = ['status', 'priority', 'assigned_to', 'subject', 'message'] as const

export async function GET(request: Request) {
  try {
    const sb = adminClient()
    const u  = new URL(request.url)
    const status   = u.searchParams.get('status')
    const priority = u.searchParams.get('priority')
    const q        = (u.searchParams.get('q') || '').trim()

    let query = sb
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (status   && status   !== 'all') query = query.eq('status',   status)
    if (priority && priority !== 'all') query = query.eq('priority', priority)
    if (q) {
      const safe = q.replace(/[%_]/g, '')
      query = query.or(`subject.ilike.%${safe}%,message.ilike.%${safe}%`)
    }

    const { data: tickets, error } = await query
    if (error) return NextResponse.json({ error: error.message, tickets: [] }, { status: 500 })

    // Resolve user emails for the ticket creator + assignee.
    const ids = new Set<string>()
    for (const t of tickets ?? []) {
      if (t.user_id)     ids.add(t.user_id)
      if (t.assigned_to) ids.add(t.assigned_to)
    }
    let profiles: Record<string, { email: string; full_name: string | null }> = {}
    if (ids.size > 0) {
      const { data: profs } = await sb.from('profiles').select('id, email, full_name').in('id', [...ids])
      profiles = Object.fromEntries((profs ?? []).map(p => [p.id, { email: p.email, full_name: p.full_name }]))
    }

    return NextResponse.json({
      tickets: (tickets ?? []).map(t => ({
        ...t,
        user:     t.user_id     ? profiles[t.user_id]     : null,
        assignee: t.assigned_to ? profiles[t.assigned_to] : null,
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', tickets: [] }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const sb = adminClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) {
      return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    }
    const update: Record<string, unknown> = {}
    for (const k of ALLOWED) {
      if (k in body.patch) update[k] = body.patch[k]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no valid fields' }, { status: 400 })
    }
    update.updated_at = new Date().toISOString()
    const { data, error } = await sb.from('support_tickets').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ticket: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
