/**
 * /api/admin/audit-log — read audit_logs with filters.
 *
 * Query params:
 *   q        — substring on action / entity_type / entity_id / metadata
 *   user     — UUID of the actor
 *   action   — exact action string
 *   limit    — max rows (default 100, capped 500)
 *   since    — ISO timestamp lower bound
 *
 * RLS-bypassing service-role read is fine because this route is gated
 * by the middleware admin check. We denormalise the actor's email into
 * the row so the page can render names without a second round-trip.
 */
import { NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('missing supabase env')
  return createSb(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(request: Request) {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  try {
    const sb = adminClient()
    const u  = new URL(request.url)
    const q       = (u.searchParams.get('q') || '').trim()
    const user    = u.searchParams.get('user')
    const action  = u.searchParams.get('action')
    const since   = u.searchParams.get('since')
    const limit   = Math.min(500, Math.max(10, Number(u.searchParams.get('limit')) || 100))

    let query = sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit)
    if (user)   query = query.eq('user_id', user)
    if (action) query = query.eq('action',  action)
    if (since)  query = query.gte('created_at', since)
    if (q) {
      const safe = q.replace(/[%_]/g, '')
      query = query.or(`action.ilike.%${safe}%,entity_type.ilike.%${safe}%,entity_id.ilike.%${safe}%`)
    }

    const { data: logs, error } = await query
    if (error) return NextResponse.json({ error: error.message, logs: [] }, { status: 500 })

    // Pull email for actors so the page can render who did what.
    const ids = [...new Set((logs ?? []).map(r => r.user_id).filter(Boolean) as string[])]
    let actors: Record<string, string> = {}
    if (ids.length > 0) {
      const { data: profs } = await sb.from('profiles').select('id, email').in('id', ids)
      actors = Object.fromEntries((profs ?? []).map(p => [p.id, p.email]))
    }

    return NextResponse.json({
      logs: (logs ?? []).map(r => ({ ...r, actor_email: actors[r.user_id as string] || null })),
      filters: { q, user, action, since, limit },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', logs: [] }, { status: 500 })
  }
}
