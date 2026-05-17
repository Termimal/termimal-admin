/**
 * Role-based nav permissions.
 *
 * Single source of truth for "which sidebar entries can {role} see?".
 * Reads from public.role_tab_permissions. super_admin bypasses the
 * table entirely (always allowed). For any other role, a nav key is
 * allowed iff a row { role, nav_key, allowed: true } exists.
 *
 * Identifying nav entries: each AdminLayout nav item has an `href`
 * like /admin/users or /admin/marketing/social. We use the path
 * AFTER /admin/ as the nav_key (`users`, `marketing/social`), with
 * the empty string normalized to 'dashboard' for the root /admin
 * route.
 */
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/** Convert an admin nav item href to its canonical nav_key. */
export function hrefToNavKey(href: string): string {
  const stripped = href.replace(/^\/admin\/?/, '').replace(/\/$/, '')
  return stripped || 'dashboard'
}

/**
 * Returns the full set of nav_keys this role is allowed to see.
 * super_admin → null (sentinel meaning "all keys").
 * Any other role → Set<string> of explicit allowed keys.
 */
export async function getAllowedNavKeys(role: string | null | undefined): Promise<Set<string> | null> {
  if (role === 'super_admin') return null
  if (!role) return new Set()

  try {
    const sb = adminClient()
    const { data, error } = await sb
      .from('role_tab_permissions')
      .select('nav_key, allowed')
      .eq('role', role)
    if (error || !data) return new Set()
    return new Set(data.filter((r) => r.allowed).map((r) => r.nav_key as string))
  } catch {
    // Fail-CLOSED — if the lookup itself fails, give the role nothing
    // rather than accidentally exposing everything. super_admin is
    // unaffected (bypasses this call upstream).
    return new Set()
  }
}

/**
 * Check whether a given role can see a single nav key. Cheap when
 * caller already has the set; otherwise issues one DB call.
 */
export async function canSee(role: string | null | undefined, navKey: string): Promise<boolean> {
  const keys = await getAllowedNavKeys(role)
  if (keys === null) return true
  return keys.has(navKey)
}
