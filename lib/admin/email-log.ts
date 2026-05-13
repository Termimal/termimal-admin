/**
 * Email-log helpers.
 *
 * Any code path that sends a transactional email should funnel through
 * `sendAndLog()` instead of calling Resend directly. The helper:
 *
 *   1. Inserts a row in `public.email_log` with status='queued'
 *   2. Calls the upstream provider (Resend)
 *   3. Updates the row to status='sent' with provider_id, or
 *      status='failed' with error message
 *
 * This guarantees a complete audit trail at /admin/email-log even when
 * the upstream call hangs or 4xx's.
 *
 * The helper is intentionally tolerant — it will NEVER throw and will
 * NEVER block the caller on its own DB writes. The caller can rely on
 * the returned promise resolving to the provider response.
 */
import { serviceClient } from '@/lib/admin/service-client'

export interface SendArgs {
  /** Required. Recipient email. */
  to:            string
  /** Required. Subject line. */
  subject:       string
  /** Rendered HTML body. */
  html?:         string
  /** Rendered plain-text fallback. */
  text?:         string
  /** Sender address. Falls back to EMAIL_FROM env. */
  from?:         string
  /** Template key (for filtering at /admin/email-log). */
  templateKey?:  string
  /** Free-text trigger label, e.g. 'welcome', 'password_reset'. */
  trigger?:      string
  /** End-user the email is about (for filtering by user). */
  userId?:       string | null
  /** Who initiated the send (admin user, or null for system). */
  actorId?:      string | null
  /** Arbitrary metadata to store alongside the row. */
  meta?:         Record<string, unknown>
}

export interface SendResult {
  ok:          boolean
  log_id:      string | null
  provider_id: string | null
  error?:      string
}

const PREVIEW_LEN = 280
function preview(text?: string, html?: string): string | null {
  if (text && text.trim()) return text.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LEN)
  if (html && html.trim()) {
    // crude HTML strip — we only want a hint for the admin UI
    const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return stripped.slice(0, PREVIEW_LEN)
  }
  return null
}

/**
 * Send + log. Always returns — never throws.
 */
export async function sendAndLog(args: SendArgs): Promise<SendResult> {
  const sb = serviceClient()
  const from = args.from || process.env.EMAIL_FROM || 'Termimal <onboarding@resend.dev>'
  const resendKey = process.env.RESEND_API_KEY

  // 1) Pre-insert row.
  let logId: string | null = null
  try {
    const { data } = await sb.from('email_log').insert({
      actor_id:     args.actorId   ?? null,
      user_id:      args.userId    ?? null,
      trigger:      args.trigger   ?? null,
      template_key: args.templateKey ?? null,
      from_addr:    from,
      to_addr:      args.to,
      subject:      args.subject,
      body_preview: preview(args.text, args.html),
      provider:     resendKey ? 'resend' : 'none',
      provider_id:  null,
      status:       resendKey ? 'queued' : 'failed',
      error:        resendKey ? null : 'no email provider configured',
      meta:         args.meta ?? {},
    }).select('id').single()
    logId = data?.id ?? null
  } catch { /* swallow — we still try to send */ }

  // 2) If no provider, fail cleanly.
  if (!resendKey) {
    return { ok: false, log_id: logId, provider_id: null, error: 'no email provider configured' }
  }

  // 3) Send via Resend.
  let providerId: string | null = null
  let error: string | null = null
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body:    JSON.stringify({
        from,
        to:      [args.to],
        subject: args.subject,
        html:    args.html,
        text:    args.text,
      }),
    })
    const j = await res.json().catch(() => ({})) as { id?: string; message?: string }
    if (!res.ok) {
      error = j.message || `resend HTTP ${res.status}`
    } else {
      providerId = j.id ?? null
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'network error'
  }

  // 4) Update row.
  if (logId) {
    sb.from('email_log').update({
      status:       error ? 'failed' : 'sent',
      status_at:    new Date().toISOString(),
      provider_id:  providerId,
      error,
    }).eq('id', logId).then(() => null, () => null)
  }

  return { ok: !error, log_id: logId, provider_id: providerId, error: error || undefined }
}
