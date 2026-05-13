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
import { serviceClient } from './service-client'
import { roleGrants, type Permission } from './permissions'

/**
 * Schema reminder:
 *   public.user_roles  → (id uuid PK = auth.uid, role text)
 *   public.rbac_roles  → (name text PK, permissions jsonb, …)
 *
 * Permissions are NOT denormalised onto user_roles — we resolve the
 * caller's role first, then look up rbac_roles for the permission
 * list. `super_admin` is conventionally `["*"]`; roleGrants() treats
 * the wildcard as allow-all.
 *
 * IMPORTANT — auth + lookup paths are intentionally split:
 *   1. AUTH check uses the cookie-bound SSR client. If middleware is
 *      ever skipped (config edit, future Next CVE), a missing or
 *      forged JWT still gets rejected here because the cookie has
 *      to validate against Supabase to return a user.
 *   2. ROLE lookup uses the service-role client. Two reasons:
 *        a. cookie-bound RLS reads have been observed to flake in
 *           Cloudflare Workers (header-size / serialization quirks)
 *           — failing those silently broke the BI dashboard with
 *           "role lookup failed" even for super_admins who clearly
 *           passed middleware.
 *        b. service-role bypasses RLS, so the result is independent
 *           of whatever weird policy state the project is in.
 *      Defence-in-depth still works because step 1 validated the JWT.
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

/**
 * Baked-in fallback used when rbac_roles has no row for the role.
 * Mirrors the same constant in middleware.ts so callers see consistent
 * behaviour whether the request is gated by middleware or by this
 * helper. Keep both copies in sync.
 */
const FALLBACK_PERMS: Record<string, string[]> = {
  super_admin: ['*'],
  admin:       ['*'],
  support:     ['users.read', 'users.write', 'billing.read', 'billing.refund', 'support.read', 'support.write', 'notes.read', 'notes.write'],
  finance:     ['billing.read', 'finance.read', 'finance.write', 'analytics.read', 'export.read'],
  content_editor: ['content.read', 'content.write', 'banners.read', 'banners.write', 'announcements.read', 'announcements.write', 'faqs.read', 'faqs.write', 'seo.read', 'seo.write', 'translations.read', 'translations.write', 'email_templates.read', 'email_templates.write'],
  analyst:     ['analytics.read', 'audit.read', 'export.read'],
  user:        [],
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

  // Step 1 — role lookup via service-role (avoids RLS flakes).
  const adm = serviceClient()
  const { data: ur, error: urErr } = await adm
    .from('user_roles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (urErr) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'role lookup failed', detail: urErr.message }, { status: 500 }),
    }
  }
  const urRow = ur as UserRoleRow | null
  if (!urRow?.role) {
    return { ok: false, response: NextResponse.json({ error: 'not an admin' }, { status: 403 }) }
  }

  // Step 2 — permissions list from rbac_roles, with FALLBACK_PERMS
  // as a backstop if the rbac_roles row hasn't been seeded yet.
  const { data: rb } = await adm
    .from('rbac_roles')
    .select('permissions')
    .eq('name', urRow.role)
    .maybeSingle()
  const rbRow = rb as RbacRow | null
  const permissions = (Array.isArray(rbRow?.permissions) ? (rbRow!.permissions as string[]) : null)
                   ?? FALLBACK_PERMS[urRow.role]
                   ?? []

  if (perm && !roleGrants(permissions, perm)) {
    return { ok: false, response: NextResponse.json({ error: `missing permission: ${perm}` }, { status: 403 }) }
  }

  return {
    ok: true,
    sb,
    user: { id: user.id, email: user.email || null },
    role: urRow.role,
    permissions,
  }
}
