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
import { createClient as createSsrClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const cookieSb = await createSsrClient()
    const { data: { user: actor } } = await cookieSb.auth.getUser()
    if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await request.json().catch(() => null) as {
      key?: string; to?: string; variables?: Record<string, unknown>
    } | null
    if (!body?.key || !body.to) return NextResponse.json({ error: 'key and to required' }, { status: 400 })

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
