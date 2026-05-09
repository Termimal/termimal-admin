/**
 * Defence-in-depth helper for admin API route handlers.
 *
 * Today, almost every /api/admin/* route uses the Supabase
 * service-role key directly without re-reading the cookie. The
 * caller's identity is enforced by Next.js middleware in
 * `middleware.ts`, which is fine — but if middleware is ever
 * skipped (config edit, route excluded by matcher, future Next.js
 * middleware-bypass CVE — there have been several) every admin
 * endpoint becomes anonymous-writable.
 *
 * Calling `requireAdmin()` at the top of each handler closes that
 * gap: a 401 is returned if no Supabase session cookie is present
 * or the cookie's user isn't in `user_roles` with at least the
 * configured permission. The check costs one DB round-trip per
 * request; trivial vs the cost of a breach.
 *
 * Usage:
 *
 *   export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
 *     const gate = await requireAdmin('billing.refund')
 *     if (gate.ok === false) return gate.response
 *     const { sb, user, role } = gate
 *     // …business logic, audit `actor_id: user.id` etc.
 *   }
 */
import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { roleGrants, type Permission } from './permissions'

interface AdminRow {
  user_id: string
  role: string
  permissions: string[] | null
}

interface AdminGateOk {
  ok: true
  /** Cookie-bound Supabase client. RLS-aware. */
  sb: Awaited<ReturnType<typeof createServerSupabase>>
  user: { id: string; email: string | null }
  role: string
  permissions: string[]
}
interface AdminGateFail {
  ok: false
  response: NextResponse
}

export async function requireAdmin(
  perm: Permission | null = null,
): Promise<AdminGateOk | AdminGateFail> {
  const sb = await createServerSupabase()
  const { data: auth } = await sb.auth.getUser()
  const user = auth?.user
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'not authenticated' }, { status: 401 }) }
  }

  // Read role + permissions for the authenticated caller. The query
  // goes through RLS — so a non-admin can't even see their own row.
  const { data, error } = await sb
    .from('user_roles')
    .select('user_id, role, permissions')
    .eq('user_id', user.id)
    .maybeSingle<AdminRow>()
  if (error) {
    return { ok: false, response: NextResponse.json({ error: 'role lookup failed' }, { status: 500 }) }
  }
  if (!data) {
    return { ok: false, response: NextResponse.json({ error: 'not an admin' }, { status: 403 }) }
  }
  const permissions = Array.isArray(data.permissions) ? data.permissions : []
  if (perm && !roleGrants(permissions, perm)) {
    return { ok: false, response: NextResponse.json({ error: `missing permission: ${perm}` }, { status: 403 }) }
  }

  return {
    ok: true,
    sb,
    user: { id: user.id, email: user.email || null },
    role: data.role,
    permissions,
  }
}
