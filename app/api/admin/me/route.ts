/**
 * GET /api/admin/me — returns the current admin's role + the set of
 * sidebar nav_keys they're allowed to see.
 *
 * The AdminLayout fetches this on mount and filters its navGroups so
 * non-super-admins only see what's been granted to their role via
 * /admin/roles/permissions.
 *
 * super_admin always sees everything; the API returns
 * `allowed_nav_keys: null` as a sentinel meaning "all".
 *
 * 200 — { role, email, allowed_nav_keys: string[] | null }
 * 401 — when no session / role lookup fails
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { getAllowedNavKeys } from '@/lib/admin/role-permissions'

export async function GET() {
  const gate = await requireAdmin(null)
  if (gate.ok === false) return gate.response

  const keys = await getAllowedNavKeys(gate.role)
  return NextResponse.json({
    role:              gate.role,
    email:             gate.user.email,
    allowed_nav_keys:  keys === null ? null : Array.from(keys),
  }, { headers: { 'cache-control': 'no-store' } })
}
