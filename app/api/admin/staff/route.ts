/**
 * /api/admin/staff — list the team (everyone in user_roles with a
 * non-default role) and remove staff access.
 *
 *   GET                 → { rows: StaffRow[] }
 *   DELETE ?user_id=... → demote a staff member to plain `user`
 *
 * Role *changes* go through /api/admin/roles/assign which already
 * exists and is super_admin-gated. This endpoint covers the read
 * side and the "remove from team" action.
 *
 * GET is gated on `roles.write` so it doesn't leak the staff roster
 * to support/finance/etc. — only super_admin (wildcard *) and any
 * role granted roles.write can see it. DELETE is super_admin only.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { requireAdmin } from '@/lib/admin/require-admin'
import { createClient as createSb } from '@supabase/supabase-js'
import { supabaseUrl } from '@/lib/supabase/env'

interface StaffRow {
  id:               string
  email:            string | null
  role:             string
  created_at:       string | null
  last_sign_in_at:  string | null
}

const DEFAULT_NON_STAFF_ROLES = new Set(['user'])

function adminAuthClient() {
  return createSb(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
}

export async function GET() {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()

    // 1) Pull every user_roles row that isn't the default 'user' role.
    const { data: roles, error: rErr } = await sb
      .from('user_roles')
      .select('id, role, created_at')
    if (rErr) return NextResponse.json({ error: rErr.message, rows: [] }, { status: 500 })
    const staffRoles = (roles ?? []).filter(r => !DEFAULT_NON_STAFF_ROLES.has((r as { role: string }).role))
    if (staffRoles.length === 0) return NextResponse.json({ rows: [] })

    // 2) Resolve emails + last sign-in via the auth.admin API. We
    //    paginate through auth.users until every staff id is found
    //    or we hit the first empty page (defensive bound at 50
    //    pages × 200 = 10 000 users, well above any realistic
    //    staff count).
    const wanted = new Set(staffRoles.map(r => r.id as string))
    const userInfo = new Map<string, { email: string | null; last_sign_in_at: string | null }>()
    const authSb = adminAuthClient()
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await authSb.auth.admin.listUsers({ page, perPage: 200 })
      if (error) break
      const users = data?.users ?? []
      if (users.length === 0) break
      for (const u of users) {
        if (wanted.has(u.id)) {
          userInfo.set(u.id, {
            email:           u.email ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
          })
        }
      }
      if (userInfo.size >= wanted.size) break
      if (users.length < 200) break
    }

    const rows: StaffRow[] = staffRoles
      .map(r => {
        const info = userInfo.get(r.id as string) ?? { email: null, last_sign_in_at: null }
        return {
          id:              r.id as string,
          email:           info.email,
          role:            (r as { role: string }).role,
          created_at:      (r as { created_at: string | null }).created_at ?? null,
          last_sign_in_at: info.last_sign_in_at,
        }
      })
      // Sort: super_admin first, then admin, then everyone else
      // alphabetically by email so the list reads consistently.
      .sort((a, b) => {
        const order = (role: string) =>
          role === 'super_admin' ? 0
          : role === 'admin'     ? 1
          : 2
        const oa = order(a.role); const ob = order(b.role)
        if (oa !== ob) return oa - ob
        return (a.email || '').localeCompare(b.email || '')
      })

    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', rows: [] }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  try {
    const url = new URL(request.url)
    const targetId = url.searchParams.get('user_id')
    if (!targetId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    // Defence-in-depth: only super_admin can remove staff entirely.
    // requireAdmin('roles.write') already grants this, but block
    // self-demotion explicitly so a super_admin can't accidentally
    // lock themselves out.
    if (gate.user.id === targetId) {
      return NextResponse.json({ error: "you can't remove your own staff role" }, { status: 400 })
    }
    if (gate.role !== 'super_admin') {
      return NextResponse.json({ error: 'super_admin required' }, { status: 403 })
    }

    const sb = serviceClient()
    // Demote to 'user' rather than DELETE the row so the audit
    // history of which user had which role stays consistent.
    const { error } = await sb
      .from('user_roles')
      .update({ role: 'user' })
      .eq('id', targetId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sb.from('audit_logs').insert({
      user_id:     gate.user.id,
      action:      'role_removed',
      entity_type: 'user',
      entity_id:   targetId,
      metadata:    { demoted_to: 'user' },
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
