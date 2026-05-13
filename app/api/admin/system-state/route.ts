/**
 * /api/admin/system-state — emergency readonly mode + banner.
 *
 *   GET   → current state
 *   PATCH { readonly_mode?, banner_message?, reason? }
 *
 * Flipping readonly_mode=true makes the public site refuse writes
 * (the middleware reads this row and returns 503 on mutating routes).
 * Use during incidents. Auto-revert is NOT automatic — admin must
 * explicitly turn it off when the incident is resolved.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET() {
  const sb = serviceClient()
  const { data } = await sb.from('system_state').select('*').eq('id', 1).maybeSingle()
  return NextResponse.json({ state: data ?? { id: 1, readonly_mode: false } })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('system.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as {
    readonly_mode?: boolean; banner_message?: string | null; reason?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const sb = serviceClient()
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    readonly_by: gate.user.id,
  }
  if (typeof body.readonly_mode === 'boolean') {
    patch.readonly_mode = body.readonly_mode
    if (body.readonly_mode) {
      patch.readonly_since  = new Date().toISOString()
      patch.readonly_reason = body.reason ?? null
    } else {
      patch.readonly_since  = null
      patch.readonly_reason = null
    }
  }
  if ('banner_message' in body) patch.banner_message = body.banner_message

  const { error } = await sb.from('system_state').update(patch).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'system.state_change',
    entity_type: 'system', entity_id: 'system_state',
    metadata: patch,
  })
  return NextResponse.json({ ok: true })
}
