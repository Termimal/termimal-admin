/**
 * /api/admin/invites/accept — claim an admin invite by token.
 *
 *   POST { token: string } → { ok: true, role }
 *
 * Flow:
 *   1. Caller must already have a Supabase session (invitee signed up
 *      with their personal account first).
 *   2. We look up the invite by token. Reject if expired / accepted /
 *      revoked / email mismatch.
 *   3. Insert (or upsert) into user_roles with the invite's role.
 *   4. Mark accepted_at on the invite.
 *   5. Audit log the role grant.
 *
 * This route is exempted from the middleware perm-check (see
 * middleware.ts) so an invitee with no role can hit it.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const cookieSb = await createSsrClient()
    const { data: { user } } = await cookieSb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await request.json().catch(() => null) as { token?: string } | null
    if (!body?.token) return NextResponse.json({ error: 'token required' }, { status: 400 })

    const sb = serviceClient()
    const { data: invite, error: lookupErr } = await sb
      .from('admin_invites')
      .select('id, email, role, expires_at, accepted_at, revoked_at')
      .eq('token', body.token)
      .maybeSingle()
    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 })
    if (!invite)   return NextResponse.json({ error: 'invite not found' }, { status: 404 })

    if (invite.revoked_at)  return NextResponse.json({ error: 'invite has been revoked' }, { status: 410 })
    if (invite.accepted_at) return NextResponse.json({ error: 'invite has already been accepted' }, { status: 410 })
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'invite has expired' }, { status: 410 })
    }

    // Email match: caller's email must match the invited email.
    const callerEmail = (user.email || '').toLowerCase()
    if (callerEmail !== (invite.email || '').toLowerCase()) {
      return NextResponse.json({
        error: `this invite was issued to ${invite.email} — sign in as that user first`,
      }, { status: 403 })
    }

    // Grant the role.
    const { error: roleErr } = await sb
      .from('user_roles')
      .upsert({ id: user.id, role: invite.role }, { onConflict: 'id' })
    if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 })

    // Mark accepted.
    await sb
      .from('admin_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', invite.id)
      .then(() => null, () => null)

    // Audit.
    await sb.from('audit_logs').insert({
      user_id:     user.id,
      action:      'invite_accepted',
      entity_type: 'admin_invite',
      entity_id:   invite.id,
      metadata:    { role: invite.role, email: invite.email },
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true, role: invite.role })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
