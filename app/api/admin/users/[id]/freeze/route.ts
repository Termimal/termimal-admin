/**
 * /api/admin/users/[id]/freeze — Account-Takeover Response playbook.
 *
 * One-click "lock down this account" sequence used during a
 * suspected ATO incident. Performs in order:
 *
 *   1. Set admin_user_profiles.account_status = 'suspended' so
 *      Supabase login is blocked (middleware checks this).
 *   2. Sign out every active session via
 *      supabase.auth.admin.signOut(scope: 'global'). All refresh
 *      tokens become invalid; on next API call the user is bounced
 *      to /login.
 *   3. Send a password-reset email to the user's email of record so
 *      they can take the account back when ready.
 *   4. Write a customer_notes timeline row (kind='security_event')
 *      with the actor + reason for the audit trail.
 *
 * Permission: super_admin OR users.close.
 *
 * Idempotent — running it twice on an already-frozen account is a
 * no-op for steps 1+2 and re-sends the password reset for step 3.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin('users.close')
  if (gate.ok === false) return gate.response

  const { id: userId } = await params
  if (!userId) return NextResponse.json({ error: 'user id required' }, { status: 400 })

  const body = await request.json().catch(() => null) as { reason?: string } | null
  const reason = (body?.reason || '').slice(0, 500) || 'admin-initiated freeze (no reason given)'

  const sb = serviceClient()

  // 1. Suspend the account.
  const now = new Date().toISOString()
  await sb.from('admin_user_profiles').upsert({
    user_id:               userId,
    account_status:        'suspended',
    last_admin_action:     `freeze · ${reason}`,
    last_admin_action_at:  now,
    updated_at:            now,
  })

  // 2. Sign out everywhere.
  let signedOut = false
  try {
    await sb.auth.admin.signOut(userId, 'global')
    signedOut = true
  } catch { /* best-effort */ }

  // 3. Look up the email + send password reset.
  let resetSent = false
  let userEmail: string | null = null
  try {
    const { data: u } = await sb.auth.admin.getUserById(userId)
    userEmail = u?.user?.email ?? null
    if (userEmail) {
      const { error: rpErr } = await sb.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://termimal.com'}/dashboard/reset-password`,
      })
      resetSent = !rpErr
    }
  } catch { /* best-effort */ }

  // 4. Audit log.
  await sb.from('customer_notes').insert({
    user_id:   userId,
    author_id: gate.user.id,
    kind:      'security_event',
    body:      `🚨 Account FROZEN by ${gate.user.email || gate.user.id}. Reason: ${reason}. Global sign-out: ${signedOut ? '✓' : '✗'}. Password-reset email: ${resetSent ? '✓ sent to ' + userEmail : '✗'}.`,
  }).then(() => null, () => null)

  return NextResponse.json({
    ok:               true,
    suspended:        true,
    signed_out:       signedOut,
    password_reset:   resetSent,
    user_email:       userEmail,
  })
}
