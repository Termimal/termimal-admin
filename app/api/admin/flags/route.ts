/**
 * /api/admin/flags
 *
 *   GET    — list every feature flag
 *   POST   — toggle / create / update (audit-logged)
 *   DELETE — remove flag (audit-logged)
 *
 * Every mutating call writes a row to audit_logs with the previous
 * + next enabled state so the /admin/flags page can render a recent-
 * activity strip and rollback hints. Permission: flags.write for
 * mutations, flags.read for the list.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
)

export async function GET() {
  const gate = await requireAdmin('flags.read')
  if (gate.ok === false) return gate.response
  const { data, error } = await sb().from('feature_flags').select('*').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flags: data || [] })
}

export async function POST(req: Request) {
  const gate = await requireAdmin('flags.write')
  if (gate.ok === false) return gate.response

  const body  = await req.json() as { id?: string; key?: string; enabled?: boolean; description?: string }
  const admin = sb()

  if (body.id) {
    // Capture previous value before update so the audit log can
    // record the actual transition (true→false vs false→true).
    const { data: prev } = await admin
      .from('feature_flags').select('key, enabled').eq('id', body.id).maybeSingle()

    const { data, error } = await admin.from('feature_flags')
      .update({ enabled: body.enabled, description: body.description })
      .eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (prev && prev.enabled !== body.enabled) {
      await admin.from('audit_logs').insert({
        user_id:     gate.user.id,
        action:      body.enabled ? 'flag.enable' : 'flag.disable',
        entity_type: 'feature_flag',
        entity_id:   body.id,
        metadata:    { key: prev.key, from: prev.enabled, to: body.enabled },
      })
    }
    return NextResponse.json({ flag: data })
  }

  // Create
  const { data, error } = await admin.from('feature_flags')
    .insert({ key: body.key, enabled: body.enabled ?? false, description: body.description })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({
    user_id:     gate.user.id,
    action:      'flag.create',
    entity_type: 'feature_flag',
    entity_id:   data?.id ?? null,
    metadata:    { key: body.key, enabled: body.enabled ?? false },
  })
  return NextResponse.json({ flag: data })
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin('flags.write')
  if (gate.ok === false) return gate.response
  const { id } = await req.json() as { id: string }
  const admin = sb()
  const { data: prev } = await admin
    .from('feature_flags').select('key, enabled').eq('id', id).maybeSingle()
  const { error } = await admin.from('feature_flags').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (prev) {
    await admin.from('audit_logs').insert({
      user_id:     gate.user.id,
      action:      'flag.delete',
      entity_type: 'feature_flag',
      entity_id:   id,
      metadata:    { key: prev.key, was_enabled: prev.enabled },
    })
  }
  return NextResponse.json({ ok: true })
}
