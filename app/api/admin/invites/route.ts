/**
 * /api/admin/invites — invite new admins.
 *
 *   GET    /api/admin/invites
 *   POST   /api/admin/invites           { email, role: 'admin' | 'super_admin' }
 *   DELETE /api/admin/invites?id=…      revoke a pending invite
 *
 * The accept flow lives at /admin/accept-invite?token=… which:
 *   1. Validates the token (matches `admin_invites.token`, expires_at > now,
 *      not already accepted/revoked)
 *   2. Inserts into user_roles (id, role) using the cookie-session user id
 *   3. Marks accepted_at on the invite
 *
 * Token generation uses crypto.getRandomValues — 32 bytes hex.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

function genToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function GET() {
  try {
    const sb = serviceClient()
    const { data, error } = await sb
      .from('admin_invites')
      .select('id, email, role, invited_by, expires_at, accepted_at, revoked_at, created_at')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const cookieSb = await createSsrClient()
    const { data: { user: actor } } = await cookieSb.auth.getUser()
    if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sb   = serviceClient()
    const body = await request.json().catch(() => null) as { email?: string; role?: 'admin' | 'super_admin' } | null
    if (!body?.email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    const role = body.role === 'super_admin' ? 'super_admin' : 'admin'

    // Only super_admins can mint super_admin invites.
    if (role === 'super_admin') {
      const { data: actorRole } = await sb.from('user_roles').select('role').eq('id', actor.id).maybeSingle()
      if (actorRole?.role !== 'super_admin') {
        return NextResponse.json({ error: 'only super_admin can invite another super_admin' }, { status: 403 })
      }
    }

    const token = genToken()
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString()
    const { data, error } = await sb.from('admin_invites').insert({
      email:      body.email.toLowerCase(),
      role,
      invited_by: actor.id,
      token,
      expires_at: expiresAt,
    }).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Construct the invite URL — admin reads this and copies to the new admin manually.
    const origin = new URL(request.url).origin
    const invite_url = `${origin}/admin/accept-invite?token=${token}`
    return NextResponse.json({ row: data, invite_url })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('admin_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
