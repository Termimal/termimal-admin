/**
 * /api/admin/invites — invite new admins.
 *
 *   GET    /api/admin/invites
 *   POST   /api/admin/invites           { email, role: 'admin' | 'super_admin' }
 *   DELETE /api/admin/invites?id=…      revoke a pending invite
 *
 * Flow (POST):
 *   1. Validate caller. Only super_admins can mint super_admin invites.
 *   2. Generate a secure invite token.
 *   3. If no Supabase auth user exists with the invitee's email, create
 *      one via the admin API with a randomly-generated temporary
 *      password and email_confirm:true (we vouched for the email).
 *      If a user already exists, do NOT touch their password — the
 *      email will just contain the link.
 *   4. Insert the invite row in admin_invites.
 *   5. Email the invitee via Resend (through sendAndLog so the send
 *      appears in /admin/email-log) with role, temp password (if any),
 *      and the accept-invite URL.
 *   6. Return { ok, email_status, invite_url } so the admin UI can
 *      surface "email sent" + fall back to copying the URL if Resend
 *      was unhappy.
 *
 * The accept flow lives at /admin/accept-invite?token=… which:
 *   1. Validates the token (matches `admin_invites.token`, expires_at > now,
 *      not already accepted/revoked)
 *   2. Inserts into user_roles (id, role) using the cookie-session user id
 *   3. Marks accepted_at on the invite
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'
import { sendAndLog }    from '@/lib/admin/email-log'

function genToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a temporary password the new admin can sign in with on
 * first visit. 18 chars, mixed-case + digits + a few symbols. Passes
 * the standard Supabase auth password policy (≥6 chars) by a wide
 * margin and is high-entropy enough to resist brute-force during the
 * 7-day invite window.
 */
function genTempPassword(): string {
  // The character set avoids ambiguous glyphs (0/O, 1/l/I) so a user
  // retyping from email doesn't tilt at the wrong char.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*'
  const arr = new Uint8Array(18)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ))
}

function buildInviteEmail(opts: {
  inviteUrl:    string
  role:         'admin' | 'super_admin'
  tempPassword: string | null
  email:        string
  adminUrl:     string
  invitedByLabel: string
}): { subject: string; html: string; text: string } {
  const { inviteUrl, role, tempPassword, email, adminUrl, invitedByLabel } = opts
  const roleLabel = role === 'super_admin' ? 'super_admin' : 'admin'
  const subject = `You've been invited to the Termimal admin panel`

  const credBlockHtml = tempPassword
    ? `
      <p style="margin:0 0 8px;font-size:14px;color:#444">We created an account for you. Sign in with:</p>
      <table role="presentation" style="margin:0 0 18px;border-collapse:collapse;background:#f7f8fa;border:1px solid #e3e5ea;border-radius:8px;padding:14px 16px;font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace">
        <tr><td style="padding:2px 0;color:#666">Email</td><td style="padding:2px 0 2px 18px;color:#111;font-weight:600">${htmlEscape(email)}</td></tr>
        <tr><td style="padding:2px 0;color:#666">Temporary password</td><td style="padding:2px 0 2px 18px;color:#111;font-weight:600">${htmlEscape(tempPassword)}</td></tr>
      </table>
      <p style="margin:0 0 18px;font-size:13px;color:#666">Change your password once you've signed in.</p>
    `
    : `
      <p style="margin:0 0 18px;font-size:14px;color:#444">An account already exists for this email — sign in with your existing password.</p>
    `

  const credBlockText = tempPassword
    ? [
        `Sign in with:`,
        `  Email:    ${email}`,
        `  Password: ${tempPassword}`,
        ``,
        `Change your password once you've signed in.`,
      ].join('\n')
    : `An account already exists for this email — sign in with your existing password.`

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h1 style="font-size:20px;font-weight:700;margin:0 0 6px;color:#0e1117">Welcome to the Termimal admin panel</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#666">${htmlEscape(invitedByLabel)} invited you to join as <strong>${roleLabel}</strong>.</p>

      ${credBlockHtml}

      <p style="margin:0 0 14px;font-size:14px;color:#444">After signing in, click the button below to claim your admin role:</p>
      <p style="margin:0 0 22px">
        <a href="${inviteUrl}" style="display:inline-block;background:#388bfd;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Accept admin invite →</a>
      </p>

      <p style="margin:0 0 6px;font-size:12px;color:#888">If the button doesn't work, paste this URL into your browser:</p>
      <p style="margin:0 0 22px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#666;word-break:break-all">${htmlEscape(inviteUrl)}</p>

      <p style="margin:0;font-size:11px;color:#aaa">This invite expires in 7 days. Admin panel: <a href="${adminUrl}" style="color:#aaa">${htmlEscape(adminUrl)}</a></p>
    </div>
  `.trim()

  const text = [
    `Welcome to the Termimal admin panel`,
    ``,
    `${invitedByLabel} invited you to join as ${roleLabel}.`,
    ``,
    credBlockText,
    ``,
    `After signing in, claim your admin role here:`,
    inviteUrl,
    ``,
    `This invite expires in 7 days.`,
  ].join('\n')

  return { subject, html, text }
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
    const body = await request.json().catch(() => null) as {
      email?: string;
      role?: 'admin' | 'super_admin';
      /** Optional admin-chosen password. ≥10 chars or the request 400s. */
      password?: string;
    } | null
    if (!body?.email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    const email = body.email.trim().toLowerCase()
    const role  = body.role === 'super_admin' ? 'super_admin' : 'admin'

    // Custom password support. The admin can specify a password they
    // want to give to the new admin — useful when you're standing
    // next to them or onboarding via a secure channel that isn't
    // email. Empty/missing → we auto-generate one. ≥10 chars is a
    // light sanity check on top of Supabase's default ≥6.
    const customPassword = (body.password || '').trim()
    if (customPassword && customPassword.length < 10) {
      return NextResponse.json({ error: 'custom password must be at least 10 characters' }, { status: 400 })
    }

    // Only super_admins can mint super_admin invites.
    if (role === 'super_admin') {
      const { data: actorRole } = await sb.from('user_roles').select('role').eq('id', actor.id).maybeSingle()
      if (actorRole?.role !== 'super_admin') {
        return NextResponse.json({ error: 'only super_admin can invite another super_admin' }, { status: 403 })
      }
    }

    const token     = genToken()
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString()

    // ── Provision the auth user (or update existing) ───────────────
    //
    // Behavior matrix:
    //   custom pw  +  user new      → create user with custom pw, email it
    //   custom pw  +  user exists   → updateUserById to overwrite pw, email it
    //   auto pw    +  user new      → create user with auto pw, email it
    //   auto pw    +  user exists   → do NOT change pw (could be a real
    //                                  customer); email says "use existing"
    //
    // The "auto + exists → don't reset" rule prevents an admin from
    // silently bricking a customer's account by inviting their email.
    // If you explicitly type a password in the form, you've opted in.
    let tempPassword: string | null = customPassword || genTempPassword()
    let passwordReset = false   // true when we overwrote an existing user's pw

    // First, look up whether the user already exists (paginate first
    // page — admin invites are rare so this is fine).
    let existingUserId: string | null = null
    try {
      const { data: listed } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
      const found = listed?.users?.find((u: { email?: string | null }) => (u.email || '').toLowerCase() === email)
      existingUserId = found?.id ?? null
    } catch { /* fall through — createUser will tell us */ }

    if (existingUserId) {
      if (customPassword) {
        // Admin explicitly chose a password — overwrite.
        const { error: updErr } = await sb.auth.admin.updateUserById(existingUserId, {
          password:      customPassword,
          email_confirm: true,
        })
        if (updErr) {
          return NextResponse.json({ error: `auth.admin.updateUserById failed: ${updErr.message}` }, { status: 500 })
        }
        passwordReset = true
      } else {
        // Auto-gen + existing user → don't touch their password.
        tempPassword = null
      }
    } else {
      // Create fresh user.
      try {
        const { error: createErr } = await sb.auth.admin.createUser({
          email,
          password:      tempPassword!,
          email_confirm: true,
          user_metadata: { source: 'admin_invite', invited_role: role },
        })
        if (createErr) {
          // Race: listUsers said "no", createUser said "yes" — handle it
          // gracefully by falling back to update-or-null based on whether
          // a custom pw was given.
          const msg = createErr.message || ''
          if (/already (registered|exists)/i.test(msg) || createErr.status === 422) {
            if (!customPassword) tempPassword = null
          } else {
            return NextResponse.json({ error: `auth.admin.createUser failed: ${msg}` }, { status: 500 })
          }
        }
      } catch (e) {
        return NextResponse.json({ error: `auth.admin.createUser threw: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 500 })
      }
    }

    // ── Insert the invite row ──────────────────────────────────────
    const { data, error } = await sb.from('admin_invites').insert({
      email,
      role,
      invited_by: actor.id,
      token,
      expires_at: expiresAt,
    }).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ── Send the invite email ──────────────────────────────────────
    //
    // origin is the panel's external base, e.g. https://bo.termimal.com.
    // We trust the request URL because the middleware already
    // authenticated this caller and we serve this route only from the
    // admin panel's hostname.
    const origin     = new URL(request.url).origin
    const inviteUrl  = `${origin}/admin/accept-invite?token=${token}`
    const { subject, html, text } = buildInviteEmail({
      inviteUrl,
      role,
      tempPassword,
      email,
      adminUrl: origin,
      invitedByLabel: actor.email || 'A Termimal admin',
    })

    const result = await sendAndLog({
      to:           email,
      subject,
      html,
      text,
      templateKey:  'admin_invite',
      trigger:      'admin_invite',
      actorId:      actor.id,
      meta:         { invite_id: data.id, role, user_created: tempPassword !== null },
    })

    return NextResponse.json({
      row: data,
      invite_url:    inviteUrl,                 // fallback for the admin UI
      email_sent:    result.ok,
      email_error:   result.ok ? null : (result.error || 'email send failed'),
      user_created:  tempPassword !== null && !passwordReset,
      password_reset: passwordReset,
    })
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
