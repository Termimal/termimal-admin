/**
 * /api/admin/users/[id]/impersonate — mint a magic-link sign-in URL
 * for a target user so an admin can "view as them" in a new tab.
 *
 *   POST  → { url: 'https://termimal.com/auth/callback?token_hash=…' }
 *
 * Implementation notes:
 *
 * - We use supabase.auth.admin.generateLink({ type: 'magiclink' })
 *   which issues a one-time hashed token. We DO NOT send the user
 *   an email — the URL is returned to the admin who opens it in a
 *   private tab. When the admin's browser hits the callback, the
 *   target user's cookie is set and they're treated as that user
 *   for the duration of that session.
 *
 * - To make the impersonation OBVIOUS to the admin (and recoverable),
 *   we redirect through a wrapper URL that sets a separate
 *   `tt_impersonating` cookie containing the admin's own id. The
 *   public site's dashboard layout reads this cookie and renders a
 *   sticky "You are impersonating <email>" banner with a "Return
 *   to admin" button.
 *
 * - Every impersonation writes an audit_log entry so we can later
 *   answer "who impersonated whom, when".
 *
 * Permission: users.write + super_admin only. Impersonation is a
 * VERY powerful tool — restricting it to super_admin keeps the
 * blast-radius tight.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin('users.write')
  if (gate.ok === false) return gate.response
  // Belt-and-braces: limit to super_admin even though users.write
  // is the gate. Impersonation should never be granted casually.
  if (gate.role !== 'super_admin') {
    return NextResponse.json({ error: 'impersonation restricted to super_admin' }, { status: 403 })
  }

  const { id: userId } = await ctx.params
  if (!userId) return NextResponse.json({ error: 'user id required' }, { status: 400 })

  const sb = serviceClient()

  // Look up the target's email — generateLink needs it.
  const { data: targetRes, error: targetErr } = await sb.auth.admin.getUserById(userId)
  if (targetErr || !targetRes?.user?.email) {
    return NextResponse.json({ error: 'target user not found or has no email' }, { status: 404 })
  }
  const targetEmail = targetRes.user.email

  // Mint a magic-link. We bypass email by not sending it; we just
  // grab the action_link from the response and return it to the
  // admin. The action_link is a hashed-token URL that consumes
  // exactly once.
  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({
    type:    'magiclink',
    email:   targetEmail,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://termimal.com'}/dashboard?impersonating=${gate.user.id}`,
    },
  })
  if (linkErr || !link?.properties?.action_link) {
    return NextResponse.json({ error: linkErr?.message || 'could not mint magic-link' }, { status: 500 })
  }

  // Audit-log every impersonation.
  await sb.from('audit_log').insert({
    actor_id:  gate.user.id,
    action:    'user.impersonate',
    entity:    'auth.users',
    entity_id: userId,
    payload:   { target_email: targetEmail, admin_email: gate.user.email },
  }).then(() => null, () => null)

  // Open an impersonation_sessions row so the dashboard banner can
  // append events to it (page navs, clicks). The session is closed
  // when the admin clicks "Return to admin" → POST /api/auth/logout.
  await sb.from('impersonation_sessions').insert({
    admin_id:       gate.user.id,
    target_user_id: userId,
    ip:             null,
    user_agent:     null,
    events:         [{ ts: new Date().toISOString(), kind: 'start' }],
  }).then(() => null, () => null)

  // Optional: drop a notification in the target user's feed so
  // they can see admin activity on their account (transparency).
  await sb.from('notifications').insert({
    user_id: userId,
    kind:    'security',
    title:   'An admin signed in to your account',
    body:    `${gate.user.email || 'A super-admin'} accessed your account for support. If you didn't request this, contact security@termimal.com.`,
    link:    '/dashboard/profile',
    priority: 'high',
  }).then(() => null, () => null)

  return NextResponse.json({
    ok:           true,
    url:          link.properties.action_link,
    target_email: targetEmail,
    admin_id:     gate.user.id,
  })
}
