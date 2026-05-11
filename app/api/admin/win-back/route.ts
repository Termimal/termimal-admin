/**
 * /api/admin/win-back
 *
 *   GET                 →  list cancelled subs eligible for win-back
 *   POST { user_id }    →  send the 'win_back' template + log + audit
 *
 * "Eligible" = cancelled in the last 7-90 days, has an email, and we
 * haven't already sent them a win-back email in the past 180 days
 * (so we don't pester the same user repeatedly).
 *
 * Sending uses sendAndLog() with trigger='win_back' so the email
 * appears in /admin/email-log and the next list view marks the user
 * as `contacted_before=true`.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { sendAndLog } from '@/lib/admin/email-log'
import { renderEmailTemplate } from '@/lib/admin/email-template'

export async function GET() {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response

  const sb = serviceClient()
  const { data, error } = await sb.rpc('admin_win_back_queue', { p_limit: 500 })
  if (error) return NextResponse.json({ error: error.message, queue: [] }, { status: 500 })
  return NextResponse.json({ queue: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('support.write')
  if (gate.ok === false) return gate.response
  const actor = gate.user

  const body = await request.json().catch(() => null) as { user_id?: string } | null
  if (!body?.user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const sb = serviceClient()

  // Resolve the recipient.
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, email, full_name, plan')
    .eq('id', body.user_id)
    .maybeSingle()
  if (pErr || !profile?.email) {
    return NextResponse.json({ error: pErr?.message || 'user has no email' }, { status: 404 })
  }

  // Render the win_back template if it exists; fall back to a generic
  // body so a missing template doesn't block the operator.
  let subject = 'We miss you — come back to Termimal'
  let html = `<p>Hi ${profile.full_name || 'there'},</p>
              <p>It's been a few weeks since you cancelled your subscription. We've been busy shipping new features — would love to win you back.</p>
              <p><a href="https://termimal.com/login">Reactivate your account →</a></p>`
  let text = `Hi ${profile.full_name || 'there'},

It's been a few weeks since you cancelled your subscription. We've been busy shipping new features — would love to win you back.

Reactivate: https://termimal.com/login`
  try {
    const rendered = await renderEmailTemplate('win_back', {
      full_name: profile.full_name || '',
      plan:      profile.plan      || '',
    })
    if (rendered.subject) subject = rendered.subject
    if (rendered.html)    html    = rendered.html
    if (rendered.text)    text    = rendered.text
  } catch { /* template not found — use defaults */ }

  const result = await sendAndLog({
    to:           profile.email,
    subject,
    html,
    text,
    templateKey:  'win_back',
    trigger:      'win_back',
    userId:       profile.id,
    actorId:      actor.id,
    meta:         { source: 'admin_winback_queue' },
  })

  // Audit log — best-effort.
  sb.from('audit_logs').insert({
    user_id:      actor.id,
    action:       'win_back.sent',
    entity_type:  'user',
    entity_id:    profile.id,
    metadata:     { to: profile.email, ok: result.ok, error: result.error ?? null, provider_id: result.provider_id },
  }).then(() => null, () => null)

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'send failed', log_id: result.log_id }, { status: 502 })
  }
  return NextResponse.json({ ok: true, log_id: result.log_id, provider_id: result.provider_id })
}
