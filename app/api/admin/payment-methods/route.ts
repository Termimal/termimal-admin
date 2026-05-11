/**
 * /api/admin/payment-methods — admin read + upsert for the
 * payment-method feature flags.
 *
 *   GET  → all rows (including disabled)
 *   PATCH { id, enabled?, visibility?, notes?, setup_state? } → updates one row
 *
 * Updates write an audit_log entry (kind='admin_action') so we can
 * later answer "who flipped crypto on at 3am".
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

interface PatchBody {
  id?: string
  enabled?: boolean
  visibility?: 'public' | 'test_users' | 'admin_only'
  notes?: string
  setup_state?: string
}

export async function GET() {
  const gate = await requireAdmin('system.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const { data, error } = await sb
    .from('payment_method_configs')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message, methods: [] }, { status: 500 })
  return NextResponse.json({ methods: data ?? [] })
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin('system.write')
  if (gate.ok === false) return gate.response

  const body = (await req.json().catch(() => null)) as PatchBody | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (body.visibility && !['public', 'test_users', 'admin_only'].includes(body.visibility)) {
    return NextResponse.json({ error: 'invalid visibility' }, { status: 400 })
  }

  const sb = serviceClient()
  // Read prior state for the audit log.
  const { data: prior } = await sb
    .from('payment_method_configs')
    .select('enabled, visibility, setup_state, notes')
    .eq('id', body.id)
    .maybeSingle()
  if (!prior) return NextResponse.json({ error: 'method not found' }, { status: 404 })

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: gate.user.id,
  }
  if (typeof body.enabled === 'boolean')     patch.enabled     = body.enabled
  if (body.visibility)                       patch.visibility  = body.visibility
  if (typeof body.notes === 'string')        patch.notes       = body.notes.slice(0, 500)
  if (body.setup_state)                      patch.setup_state = body.setup_state.slice(0, 50)

  const { data: row, error } = await sb
    .from('payment_method_configs')
    .update(patch)
    .eq('id', body.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit-log entry — best-effort. Captures the before/after for the
  // changed fields only.
  const changes: Record<string, unknown> = {}
  if (typeof body.enabled === 'boolean'  && body.enabled    !== prior.enabled)    changes.enabled     = { from: prior.enabled,    to: body.enabled }
  if (body.visibility                    && body.visibility !== prior.visibility) changes.visibility  = { from: prior.visibility, to: body.visibility }
  if (body.setup_state                   && body.setup_state!== prior.setup_state) changes.setup_state = { from: prior.setup_state, to: body.setup_state }
  if (Object.keys(changes).length > 0) {
    await sb.from('audit_log').insert({
      actor_id:  gate.user.id,
      action:    'payment_method.update',
      entity:    'payment_method_configs',
      entity_id: body.id,
      payload:   changes,
    }).then(() => null, () => null)
  }

  return NextResponse.json({ method: row })
}
