/**
 * /api/admin/role-permissions — read + write the role/tab matrix.
 *
 * GET  → { rows: { role, nav_key, allowed }[] }
 * POST   body { role, nav_key, allowed } → upsert one cell
 *
 * Only super_admin can read or write. Regular admins read their own
 * subset via /api/admin/me — they never touch this endpoint directly.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

async function gate() {
  const g = await requireAdmin('roles.write')
  if (g.ok === false) return { ok: false as const, response: g.response }
  if (g.role !== 'super_admin') {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'super_admin only' }, { status: 403 }),
    }
  }
  return { ok: true as const, user: g.user }
}

export async function GET() {
  const gr = await gate()
  if (gr.ok === false) return gr.response
  try {
    const sb = serviceClient()
    const { data, error } = await sb
      .from('role_tab_permissions')
      .select('role, nav_key, allowed, updated_at, updated_by')
      .order('role')
      .order('nav_key')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const gr = await gate()
  if (gr.ok === false) return gr.response
  try {
    const body = await request.json().catch(() => null) as
      { role?: string; nav_key?: string; allowed?: boolean } | null
    if (!body?.role || !body?.nav_key || typeof body.allowed !== 'boolean') {
      return NextResponse.json({ error: 'role, nav_key, allowed (bool) required' }, { status: 400 })
    }
    // super_admin row never disabled (matrix UI hides it; this is a
    // belt-and-braces guard against a hand-crafted POST).
    if (body.role === 'super_admin') {
      return NextResponse.json({ error: 'super_admin always allowed' }, { status: 400 })
    }
    const sb = serviceClient()
    const { error } = await sb.from('role_tab_permissions').upsert({
      role:       body.role,
      nav_key:    body.nav_key,
      allowed:    body.allowed,
      updated_at: new Date().toISOString(),
      updated_by: gr.user.id,
    }, { onConflict: 'role,nav_key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
