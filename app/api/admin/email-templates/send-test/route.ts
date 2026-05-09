/**
 * /api/admin/email-templates/send-test — render a template and send to a single recipient.
 *
 *   POST  { key, to, variables? }
 *
 * Tries (in order):
 *   1. Resend  — if RESEND_API_KEY is set
 *   2. Falls back with HTTP 503 + a helpful message
 *
 * Wraps the rendered template in a one-line "TEST EMAIL — sent from
 * the admin panel by <admin email>" footer so accidental sends from
 * production templates are obvious to recipients.
 */
import { NextResponse } from 'next/server'
import { renderEmailTemplate } from '@/lib/admin/email-template'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

// Per-actor rate-limit: max 5 test sends per hour per admin. Resend
// has spam thresholds and a single compromised admin shouldn't be
// able to spray hundreds of emails before someone notices.
const SEND_BUCKETS = new Map<string, number[]>()
const SEND_MAX_PER_HOUR = 5
const HOUR_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  const gate = await requireAdmin('email_templates.write')
  if (gate.ok === false) return gate.response
  try {
    const actor = gate.user

    const body = await request.json().catch(() => null) as {
      key?: string; to?: string; variables?: Record<string, unknown>
    } | null
    if (!body?.key || !body.to) return NextResponse.json({ error: 'key and to required' }, { status: 400 })

    // ── Recipient allowlist (closes audit HIGH #5) ─────────────
    // The recipient must be EITHER:
    //   (a) the actor's own email, OR
    //   (b) another active admin's email (so admins can preview-send
    //       templates to each other), OR
    //   (c) an outstanding admin-invite email.
    // This prevents a content_editor / compromised admin from using
    // our Resend sender domain to spam arbitrary inboxes.
    const targetEmail = body.to.trim().toLowerCase()
    const sb = serviceClient()
    // user_roles schema is (id uuid PK = auth.uid, role text). Don't
    // query user_id — that column doesn't exist on this table.
    const [{ data: admins }, { data: invites }] = await Promise.all([
      sb.from('user_roles').select('id, role').limit(500),
      sb.from('admin_invites').select('email, accepted_at').is('accepted_at', null).limit(500).then(
        (r: { data: { email: string }[] | null }) => r,
        () => ({ data: [] as { email: string }[] }),
      ),
    ])
    let adminEmails: string[] = []
    if (admins?.length) {
      const ids = admins.map((a: { id: string }) => a.id)
      const { data: profs } = await sb.from('profiles').select('id, email').in('id', ids)
      adminEmails = (profs || []).map((p: { email: string | null }) => (p.email || '').toLowerCase()).filter(Boolean)
    }
    const inviteEmails = (invites || []).map((i: { email: string }) => (i.email || '').toLowerCase()).filter(Boolean)
    const allowlist = new Set<string>([
      (actor.email || '').toLowerCase(),
      ...adminEmails,
      ...inviteEmails,
    ].filter(Boolean))
    if (!allowlist.has(targetEmail)) {
      return NextResponse.json({
        error: 'recipient not in allowlist',
        detail: 'Test sends are restricted to your own email, other admins, or pending invitees. Forward the rendered HTML manually if you need to preview-send to a customer.',
      }, { status: 403 })
    }

    // Per-actor rate limit.
    const now = Date.now()
    const arr = SEND_BUCKETS.get(actor.id) ?? []
    while (arr.length && arr[0] < now - HOUR_MS) arr.shift()
    if (arr.length >= SEND_MAX_PER_HOUR) {
      const retry = Math.ceil((arr[0] + HOUR_MS - now) / 1000)
      return NextResponse.json({ error: `rate-limited — ${SEND_MAX_PER_HOUR} test sends per hour. Retry in ~${Math.round(retry / 60)} min.` }, { status: 429 })
    }
    arr.push(now)
    SEND_BUCKETS.set(actor.id, arr)

    // Audit log entry — best-effort, doesn't block the send.
    sb.from('audit_log').insert({
      actor_id: actor.id,
      action:   'email_template.test_send',
      entity:   'email_template',
      entity_id: body.key,
      payload:  { to: targetEmail, key: body.key },
    }).then(() => null, () => null)

    const rendered = await renderEmailTemplate(body.key, body.variables ?? {})

    const footer = `\n\n— Test email sent from the Termimal admin panel by ${actor.email ?? actor.id}`
    const htmlFooter = `<hr style="margin-top:24px;border:0;border-top:1px solid #eee"/><div style="font-size:11px;color:#888;margin-top:8px">${footer.trim()}</div>`

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const fromAddr = process.env.EMAIL_FROM || 'Termimal <onboarding@resend.dev>'
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body:    JSON.stringify({
          from:    fromAddr,
          to:      [body.to],
          subject: `[TEST] ${rendered.subject}`,
          html:    rendered.html + htmlFooter,
          text:    rendered.text + footer,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return NextResponse.json({ error: 'resend rejected', detail: json }, { status: res.status })
      return NextResponse.json({ ok: true, provider: 'resend', id: (json as { id?: string }).id })
    }

    return NextResponse.json({
      error: 'no email provider configured — set RESEND_API_KEY in Worker env vars',
      rendered,
    }, { status: 503 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
