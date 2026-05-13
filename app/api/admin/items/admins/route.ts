/**
 * /api/admin/items/admins — assignable admin list.
 * Returns id + name + email + role for everyone in user_roles, so the
 * assignee picker can render a real dropdown.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET() {
  const gate = await requireAdmin('items.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const { data: roles } = await sb.from('user_roles').select('id, role').limit(500)
  const ids = (roles ?? []).map((r: { id: string }) => r.id)
  let admins: unknown[] = []
  if (ids.length) {
    const { data } = await sb.from('profiles').select('id, full_name, email, avatar_url').in('id', ids)
    const byId = new Map<string, { role: string }>((roles ?? []).map((r: { id: string; role: string }) => [r.id, { role: r.role }]))
    admins = (data ?? []).map((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }) => ({
      ...p, role: byId.get(p.id)?.role ?? 'user',
    }))
  }
  return NextResponse.json({ admins })
}
