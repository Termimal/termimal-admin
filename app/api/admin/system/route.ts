/**
 * /api/admin/system — read + write system_settings rows.
 *
 *   GET  /api/admin/system        → { settings: { key: value }, _raw: rows }
 *   PATCH /api/admin/system        body: { key: string, value: any }
 */
import { NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('missing supabase env')
  return createSb(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET() {
  try {
    const sb = adminClient()
    const { data, error } = await sb.from('system_settings').select('*')
    if (error) return NextResponse.json({ error: error.message, settings: {} }, { status: 500 })
    const settings: Record<string, unknown> = {}
    for (const row of data ?? []) settings[row.key] = row.value
    return NextResponse.json({ settings, _raw: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', settings: {} }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const sb = adminClient()
    const body = await request.json().catch(() => null) as { key?: string; value?: unknown } | null
    if (!body?.key) return NextResponse.json({ error: 'missing key' }, { status: 400 })
    const { error } = await sb.from('system_settings').upsert({
      key:        body.key,
      value:      body.value,
      updated_at: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
