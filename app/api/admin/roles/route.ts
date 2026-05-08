/**
 * /api/admin/roles — RBAC role management.
 *
 *   GET    /api/admin/roles                — list role definitions + member counts
 *   POST   /api/admin/roles                — create role { name, display_name, description, permissions }
 *   PATCH  /api/admin/roles                — { name, patch: { display_name?, description?, permissions? } }
 *   DELETE /api/admin/roles?name=…          — delete (only non-system roles, super_admin only)
 *
 *   POST   /api/admin/roles/assign         — { user_id, role }  (assign role to a user)
 *
 * Only super_admin can mutate; defence-in-depth re-checks role.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

async function requireSuperAdmin(): Promise<{ user_id: string } | NextResponse> {
  const cookieSb = await createSsrClient()
  const { data: { user } } = await cookieSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { data: role } = await cookieSb.from('user_roles').select('role').eq('id', user.id).maybeSingle()
  if (role?.role !== 'super_admin') return NextResponse.json({ error: 'super_admin required' }, { status: 403 })
  return { user_id: user.id }
}

export async function GET() {
  try {
    const sb = serviceClient()
    const [{ data: roles }, { data: assignments }] = await Promise.all([
      sb.from('rbac_roles').select('*').order('name', { ascending: true }),
      sb.from('user_roles').select('role'),
    ])
    const memberCounts = new Map<string, number>()
    for (const a of (assignments as Array<{ role: string }> | null) ?? []) {
      memberCounts.set(a.role, (memberCounts.get(a.role) || 0) + 1)
    }
    return NextResponse.json({
      rows: ((roles as Array<Record<string, unknown>> | null) ?? []).map(r => ({
        ...r,
        member_count: memberCounts.get(String(r.name)) || 0,
      })),
    })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const guard = await requireSuperAdmin()
    if (guard instanceof NextResponse) return guard

    const sb   = serviceClient()
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body?.name || !body.display_name) return NextResponse.json({ error: 'name + display_name required' }, { status: 400 })
    const { data, error } = await sb.from('rbac_roles').insert({
      name:         String(body.name).toLowerCase().replace(/\s+/g, '_').slice(0, 60),
      display_name: body.display_name,
      description:  body.description ?? null,
      permissions:  body.permissions ?? [],
      is_system:    false,
    }).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireSuperAdmin()
    if (guard instanceof NextResponse) return guard

    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { name?: string; patch?: Record<string, unknown> } | null
    if (!body?.name || !body.patch) return NextResponse.json({ error: 'missing name or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ['display_name', 'description', 'permissions'] as const) {
      if (k in body.patch) update[k] = body.patch[k]
    }
    const { data, error } = await sb.from('rbac_roles').update(update).eq('name', body.name).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  try {
    const guard = await requireSuperAdmin()
    if (guard instanceof NextResponse) return guard

    const sb   = serviceClient()
    const name = new URL(request.url).searchParams.get('name')
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    // Don't let admins delete system roles even if super_admin.
    const { data: row } = await sb.from('rbac_roles').select('is_system').eq('name', name).maybeSingle()
    if ((row as { is_system?: boolean } | null)?.is_system) {
      return NextResponse.json({ error: 'cannot delete system role' }, { status: 400 })
    }
    const { error } = await sb.from('rbac_roles').delete().eq('name', name)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
