/**
 * /api/admin/email-templates — manage transactional email copy.
 *
 *   GET    /api/admin/email-templates
 *   PATCH  /api/admin/email-templates  { id, patch: { subject, body_html, body_text, description, variables } }
 *
 * Note: this stores the copy. The actual email send-path (Supabase
 * Auth, Stripe receipts, custom transactional sender) needs to be
 * pointed at this table separately. Today this acts as the canonical
 * source of truth that future hooks can read.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'

const ALLOWED = ['subject', 'body_html', 'body_text', 'description', 'variables'] as const

export async function GET() {
  try {
    const sb = serviceClient()
    const { data, error } = await sb.from('email_templates').select('*').order('key', { ascending: true })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ALLOWED) if (k in body.patch) update[k] = body.patch[k]
    update.updated_at = new Date().toISOString()
    const { data, error } = await sb.from('email_templates').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
