import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })

/**
 * Strip every HTML tag from user-supplied strings. Banner content is
 * stored as plain text so we don't have to trust whatever component
 * renders it later — even if a future renderer uses
 * dangerouslySetInnerHTML, the worst it can render is a literal
 * `<script>` shown as text, not an executed script.
 *
 * Closes audit HIGH #6 (stored XSS via banner.message).
 */
function stripTags(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    // Drop entire <script>/<style>/<iframe> nodes including their content.
    .replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // Drop any other tag.
    .replace(/<[^>]+>/g, '')
    // Drop on*= event-handler-looking attribute fragments that survived
    // (e.g. if the input was just `onerror="x"` without a tag).
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    // Drop javascript: pseudo-protocol urls.
    .replace(/javascript:/gi, '')
    .trim()
}
function sanitiseUrl(s: string | null | undefined): string | null {
  if (!s) return null
  const v = String(s).trim()
  // Allow only http(s), mailto, and relative paths.
  if (/^(https?:|mailto:|\/[^\/])/i.test(v)) return v.slice(0, 2048)
  return null
}

export async function GET() {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const { data, error } = await sb().from('banners').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ banners: data || [] })
}
export async function POST(req: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const body = await req.json()
  // Sanitise on write so the DB column is always safe — we don't have
  // to trust every downstream renderer.
  const safe = {
    title:      stripTags(body.title).slice(0, 240),
    message:    stripTags(body.message).slice(0, 1000),
    type:       /^(info|warning|success|error|promo)$/.test(body.type) ? body.type : 'info',
    active:     !!body.active,
    link_url:   sanitiseUrl(body.link_url),
    link_label: stripTags(body.link_label).slice(0, 80) || null,
  }
  if (body.id) {
    const { data, error } = await sb().from('banners').update(safe).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ banner: data })
  }
  const { data, error } = await sb().from('banners').insert(safe).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ banner: data })
}
export async function DELETE(req: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const { id } = await req.json()
  const { error } = await sb().from('banners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
