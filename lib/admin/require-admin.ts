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

/**
 * Schema reminder:
 *   public.user_roles  → (id uuid PK = auth.uid, role text)
 *   public.rbac_roles  → (name text PK, permissions jsonb, …)
 *
 * Permissions are NOT denormalised onto user_roles — we look up the
 * caller's role, then resolve the permission list from rbac_roles.
 * `super_admin` is conventionally granted `["*"]` which roleGrants()
 * treats as wildcard-allow.
 */
interface UserRoleRow { id: string; role: string }
interface RbacRow     { permissions: string[] | null }

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

  // Step 1 — does this user have a row in user_roles? RLS lets every
  // authenticated user read their own row.
  const { data: ur, error: urErr } = await sb
    .from('user_roles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<UserRoleRow>()
  if (urErr) {
    return { ok: false, response: NextResponse.json({ error: 'role lookup failed' }, { status: 500 }) }
  }
  if (!ur) {
    return { ok: false, response: NextResponse.json({ error: 'not an admin' }, { status: 403 }) }
  }

  // Step 2 — resolve the role's permission list from rbac_roles.
  // If the row doesn't exist (rare — system roles seed both tables
  // together), fall through with an empty list which fails any
  // explicit perm check.
  const { data: rb } = await sb
    .from('rbac_roles')
    .select('permissions')
    .eq('name', ur.role)
    .maybeSingle<RbacRow>()
  const permissions = Array.isArray(rb?.permissions) ? (rb!.permissions as string[]) : []

  if (perm && !roleGrants(permissions, perm)) {
    return { ok: false, response: NextResponse.json({ error: `missing permission: ${perm}` }, { status: 403 }) }
  }

  return {
    ok: true,
    sb,
    user: { id: user.id, email: user.email || null },
    role: ur.role,
    permissions,
  }
}
