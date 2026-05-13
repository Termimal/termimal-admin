/**
 * /api/admin/email-templates/render — preview a template with sample data.
 *
 *   POST  { key, variables }   →   { subject, html, text, missing, unused }
 *
 * Used by the admin email-templates page so editors can see how a
 * template renders before they hit save. Render-only — does not send
 * an email.
 */
import { NextResponse } from 'next/server'
import { renderEmailTemplate } from '@/lib/admin/email-template'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {
      key?: string; variables?: Record<string, unknown>
    } | null
    if (!body?.key) return NextResponse.json({ error: 'key required' }, { status: 400 })
    const rendered = await renderEmailTemplate(body.key, body.variables ?? {})
    return NextResponse.json(rendered)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
