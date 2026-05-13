/**
 * /api/admin/mass-revoke — emergency global session + token kill switch.
 *
 * POST { confirm: 'REVOKE_ALL', scope: 'all' | 'users' | 'admins' }
 *
 * What happens:
 *   - scope=all      → Supabase admin.signOut('global') for every user
 *                       + every api_token marked revoked_at=now
 *   - scope=users    → only non-admins
 *   - scope=admins   → only admins (revoke admin sessions, keep customers in)
 *
 * Use during a compromise (admin creds leaked, suspected XSS).
 *
 * Gated on roles.write (super_admin in practice). Logs to audit + writes
 * a banner to system_state so users see why they're suddenly signed out.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function POST(request: Request) {
  const gate = await requireAdmin('roles.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { confirm?: string; scope?: string; reason?: string } | null
  if (body?.confirm !== 'REVOKE_ALL') return NextResponse.json({ error: "must POST { confirm: 'REVOKE_ALL' }" }, { status: 400 })
  const scope = body.scope ?? 'all'
  const reason = (body.reason ?? '').trim().slice(0, 500)

  const sb = serviceClient()

  // Resolve admin uids.
  const { data: adminRoles } = await sb.from('user_roles').select('id')
  const adminIds = new Set<string>((adminRoles ?? []).map((r: { id: string }) => r.id))

  // Walk auth.users via the admin API. The Worker has a hard 50s CPU
  // ceiling; signOut is one HTTP call per user so we cap one
  // invocation at 5 pages (≈ 5k users). For larger accounts call
  // this endpoint repeatedly with the page query param.
  let revokedUsers = 0
  const perPage = 1000
  const startPageRaw = parseInt(new URL(request.url).searchParams.get('page') || '1', 10)
  const startPage    = Math.max(1, isFinite(startPageRaw) ? startPageRaw : 1)
  const maxPages     = 5
  let lastPage       = startPage
  for (let page = startPage; page < startPage + maxPages; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const users = data.users
    if (!users.length) break
    for (const u of users) {
      const isAdmin = adminIds.has(u.id)
      if (scope === 'all' || (scope === 'admins' && isAdmin) || (scope === 'users' && !isAdmin)) {
        try {
          await sb.auth.admin.signOut(u.id, 'global')
          revokedUsers++
        } catch { /* swallow per-user */ }
      }
    }
    lastPage = page
    if (users.length < perPage) break
  }

  // Kill API tokens. If scope=admins, only revoke tokens belonging to admins.
  let revokedTokens = 0
  try {
    // Count first (since update doesn't return a count easily here).
    let cq = sb.from('api_tokens').select('id', { count: 'exact', head: true }).is('revoked_at', null)
    if (scope === 'admins') cq = cq.in('user_id', [...adminIds])
    else if (scope === 'users') {
      const list = `(${[...adminIds].map(id => `"${id}"`).join(',') || 'null'})`
      cq = cq.not('user_id', 'in', list)
    }
    const { count } = await cq
    revokedTokens = count ?? 0

    let uq = sb.from('api_tokens').update({ revoked_at: new Date().toISOString() }).is('revoked_at', null)
    if (scope === 'admins') uq = uq.in('user_id', [...adminIds])
    else if (scope === 'users') {
      const list = `(${[...adminIds].map(id => `"${id}"`).join(',') || 'null'})`
      uq = uq.not('user_id', 'in', list)
    }
    await uq
  } catch { /* ignore */ }

  // Set system banner
  await sb.from('system_state').update({
    banner_message: `Sessions revoked at ${new Date().toISOString()} — please sign in again.`,
    updated_at: new Date().toISOString(),
    readonly_by: gate.user.id,
  }).eq('id', 1)

  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'system.mass_revoke',
    entity_type: 'system', entity_id: 'all',
    metadata: { scope, reason, revokedUsers, revokedTokens },
  })

  return NextResponse.json({ ok: true, revokedUsers, revokedTokens, scope, last_page: lastPage, next_page: lastPage + 1 })
}
