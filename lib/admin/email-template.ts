/**
 * Email-template renderer.
 *
 * Fetches a row from `email_templates` by `key`, interpolates the
 * provided `variables` object into `{{ var }}` placeholders inside the
 * subject / html / text bodies, and returns a ready-to-send payload.
 *
 * This is the single point of consumption for any code that wants to
 * send a transactional email. The actual SMTP / API delivery (Resend,
 * Postmark, AWS SES, Supabase) is intentionally NOT coupled here — the
 * caller passes the rendered subject/html/text to whichever sender the
 * environment provides.
 *
 * Example:
 *
 *   const tpl = await renderEmailTemplate('refund_confirmation', {
 *     full_name: 'Jordan',
 *     amount: '$49.00',
 *     invoice_id: 'in_3Q…',
 *   })
 *   await resend.emails.send({
 *     from: 'support@termimal.com',
 *     to:   user.email,
 *     subject: tpl.subject,
 *     html:    tpl.html,
 *     text:    tpl.text,
 *   })
 *
 * Missing keys interpolate to an empty string. Unknown placeholder
 * names are left in place so admins notice during preview that they
 * haven't been wired up yet.
 *
 * Caching: not cached on purpose — the render is cheap and admins
 * expect their edits in the back office to take effect immediately.
 */
import { serviceClient } from '@/lib/admin/service-client'

export interface RenderedEmail {
  key:       string
  subject:   string
  html:      string
  text:      string
  variables: string[]            // declared in the template
  missing:   string[]            // declared but not supplied
  unused:    string[]            // supplied but not in template body
  is_active: boolean
}

interface EmailTemplateRow {
  id:          string
  key:         string
  subject:     string | null
  body_html:   string | null
  body_text:   string | null
  variables:   string[] | null
  is_active:   boolean | null
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*\}\}/g

function interpolate(input: string | null | undefined, vars: Record<string, unknown>, used: Set<string>): string {
  if (!input) return ''
  return input.replace(PLACEHOLDER_RE, (match, name: string) => {
    if (!(name in vars)) return match // leave intact so admin notices the gap
    used.add(name)
    const v = vars[name]
    return v == null ? '' : String(v)
  })
}

function declaredPlaceholders(input: string | null | undefined): Set<string> {
  const out = new Set<string>()
  if (!input) return out
  let m: RegExpExecArray | null
  PLACEHOLDER_RE.lastIndex = 0
  while ((m = PLACEHOLDER_RE.exec(input)) !== null) out.add(m[1])
  return out
}

export async function renderEmailTemplate(
  key: string,
  variables: Record<string, unknown> = {},
): Promise<RenderedEmail> {
  const sb = serviceClient()
  const { data, error } = await sb
    .from('email_templates')
    .select('id, key, subject, body_html, body_text, variables, is_active')
    .eq('key', key)
    .maybeSingle()
  if (error) throw new Error(`email-template lookup failed: ${error.message}`)
  if (!data)  throw new Error(`email-template not found: ${key}`)

  const tpl = data as EmailTemplateRow
  const used = new Set<string>()
  const subject = interpolate(tpl.subject,   variables, used)
  const html    = interpolate(tpl.body_html, variables, used)
  const text    = interpolate(tpl.body_text, variables, used)

  // Compute drift: what placeholders does the template actually use vs.
  // what variables did the caller supply.
  const allPlaceholders = new Set<string>([
    ...declaredPlaceholders(tpl.subject),
    ...declaredPlaceholders(tpl.body_html),
    ...declaredPlaceholders(tpl.body_text),
  ])
  const supplied = new Set(Object.keys(variables))
  const missing  = [...allPlaceholders].filter(n => !supplied.has(n))
  const unused   = [...supplied].filter(n => !allPlaceholders.has(n))

  return {
    key:       tpl.key,
    subject,
    html,
    text,
    variables: tpl.variables ?? [],
    missing,
    unused,
    is_active: tpl.is_active ?? true,
  }
}
