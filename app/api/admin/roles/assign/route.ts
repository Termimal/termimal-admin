/**
 * /api/admin/roles/assign — set a user's role.
 *
 *   POST  body: { user_id: uuid, role: string }
 *
 * Only super_admin can assign or change roles. The role must exist in
 * rbac_roles or be one of the always-valid system names.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

const VALID_ROLE_FALLBACKS = ['user','admin','super_admin','finance','support','content_editor','developer','readonly']

export async function POST(request: Request) {
  try {
    const cookieSb = await createSsrClient()
    const { data: { user: actor } } = await cookieSb.auth.getUser()
    if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sb = serviceClient()

    // Defence-in-depth: require super_admin.
    const { data: actorRole } = await sb.from('user_roles').select('role').eq('id', actor.id).maybeSingle()
    if ((actorRole as { role?: string } | null)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'super_admin required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null) as { user_id?: string; role?: string } | null
    if (!body?.user_id || !body.role) return NextResponse.json({ error: 'user_id + role required' }, { status: 400 })

    // Validate role name.
    let valid = VALID_ROLE_FALLBACKS.includes(body.role)
    if (!valid) {
      const { data: row } = await sb.from('rbac_roles').select('name').eq('name', body.role).maybeSingle()
      valid = !!row
    }
    if (!valid) return NextResponse.json({ error: `unknown role: ${body.role}` }, { status: 400 })

    // upsert into user_roles (id is the PK so this works as INSERT or UPDATE).
    const { error } = await sb.from('user_roles').upsert({ id: body.user_id, role: body.role })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit row.
    await sb.from('audit_logs').insert({
      user_id:     actor.id,
      action:      'role_assigned',
      entity_type: 'user',
      entity_id:   body.user_id,
      metadata:    { role: body.role },
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
