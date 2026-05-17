import { supabaseUrl } from '@/lib/supabase/env'
/**
 * /api/admin/ip-allowlist — CRUD for the admin-area IP allowlist.
 *
 * Storage: a single `system_settings` row (`admin_ip_allowlist`) whose
 * value is a JSON array of `{ cidr, label, added_at, added_by }`. This
 * avoids a dedicated table for a feature that's rarely edited and only
 * ever read by the admin middleware.
 *
 *   GET    → { rules: AllowRule[] }
 *   POST   body: { cidr, label }          → { ok, rules }
 *   DELETE ?cidr=...                       → { ok, rules }
 *
 * Enforcement (middleware-level rejection of non-allowlisted IPs hitting
 * /admin/*) is intentionally NOT part of this route — that's a separate
 * task that would change auth behaviour and needs explicit approval.
 * For now, edits here just persist intent so the surface exists and the
 * admin can stage a list before flipping enforcement on.
 */
import { NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'

interface AllowRule {
  cidr:      string
  label:     string
  added_at:  string
  added_by:  string | null
}

const KEY = 'admin_ip_allowlist'

function adminClient() {
  const url = supabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('missing supabase env')
  return createSb(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function readRules(): Promise<AllowRule[]> {
  const sb = adminClient()
  const { data, error } = await sb
    .from('system_settings')
    .select('value')
    .eq('key', KEY)
    .maybeSingle()
  if (error || !data) return []
  const v = (data as { value: unknown }).value
  return Array.isArray(v) ? (v as AllowRule[]) : []
}

async function writeRules(rules: AllowRule[]) {
  const sb = adminClient()
  const { error } = await sb.from('system_settings').upsert({
    key:        KEY,
    value:      rules,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

// Permissive validation. We accept either a bare IPv4 (`1.2.3.4`),
// IPv4 CIDR (`1.2.3.0/24`), or IPv6/CIDR. Anything obviously not an
// address (spaces, letters that aren't hex, multiple slashes) is
// rejected. Real CIDR parsing happens at enforcement time.
function looksLikeCidr(s: string): boolean {
  const t = s.trim()
  if (!t || t.length > 64) return false
  if (/[\s]/.test(t)) return false
  if ((t.match(/\//g) || []).length > 1) return false
  // IPv4 or IPv4/CIDR
  if (/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(t)) return true
  // IPv6 (very loose — colons + hex)
  if (/^[0-9a-fA-F:]+(\/\d{1,3})?$/.test(t) && t.includes(':')) return true
  return false
}

export async function GET() {
  const gate = await requireAdmin('system.write')
  if (gate.ok === false) return gate.response
  try {
    const rules = await readRules()
    return NextResponse.json({ rules })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', rules: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin('system.write')
  if (gate.ok === false) return gate.response
  try {
    const body = await request.json().catch(() => null) as { cidr?: string; label?: string } | null
    const cidr  = (body?.cidr || '').trim()
    const label = (body?.label || '').trim() || cidr
    if (!cidr || !looksLikeCidr(cidr)) {
      return NextResponse.json({ error: 'invalid CIDR or IP' }, { status: 400 })
    }
    const rules = await readRules()
    if (rules.some(r => r.cidr === cidr)) {
      return NextResponse.json({ error: 'already in allowlist' }, { status: 409 })
    }
    const actor = gate.user?.email ?? gate.user?.id ?? null
    rules.push({ cidr, label, added_at: new Date().toISOString(), added_by: actor })
    await writeRules(rules)
    return NextResponse.json({ ok: true, rules })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('system.write')
  if (gate.ok === false) return gate.response
  try {
    const url = new URL(request.url)
    const cidr = url.searchParams.get('cidr')
    if (!cidr) return NextResponse.json({ error: 'cidr required' }, { status: 400 })
    const rules = (await readRules()).filter(r => r.cidr !== cidr)
    await writeRules(rules)
    return NextResponse.json({ ok: true, rules })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
