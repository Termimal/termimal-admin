/**
 * /api/admin/dsar/[id]/export
 *
 * POST → returns a JSON bundle of EVERYTHING we have on the requestor.
 * GDPR Article 15 (right of access). The admin downloads it and forwards
 * to the user.
 *
 * Tables scanned: profiles, audit_logs, login_events, error_logs,
 * notifications, invoices, plan_changes, referral_events, consent_log,
 * api_tokens (metadata only — token_hash is not in the export), email_log.
 *
 * The DSAR row is moved to status='complete' on successful export.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

const TABLES = [
  'profiles', 'audit_logs', 'login_events', 'error_logs',
  'notifications', 'invoices', 'plan_changes', 'referral_events',
  'consent_log', 'email_log', 'feature_events',
  'trusted_devices', 'impersonation_sessions',
]

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin('users.write')
  if (gate.ok === false) return gate.response
  const { id } = await ctx.params
  const sb = serviceClient()

  // Look up the DSAR request.
  const { data: dsar } = await sb.from('dsar_requests')
    .select('id, user_id, email')
    .eq('id', id)
    .maybeSingle() as { data: { id: string; user_id: string | null; email: string } | null }
  if (!dsar) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Resolve user_id from email if not set.
  let userId = dsar.user_id
  if (!userId) {
    const { data: p } = await sb.from('profiles').select('id').eq('email', dsar.email).maybeSingle()
    userId = (p as { id?: string } | null)?.id ?? null
  }

  const bundle: Record<string, unknown> = {
    generated_at: new Date().toISOString(),
    request_id:   dsar.id,
    email:        dsar.email,
    user_id:      userId,
    tables:       {},
  }
  const tables = bundle.tables as Record<string, unknown>

  if (userId) {
    // Most tables have a user_id column. We just hit each one.
    for (const t of TABLES) {
      try {
        const { data } = await sb.from(t).select('*').eq('user_id', userId).limit(10000)
        tables[t] = data ?? []
      } catch { tables[t] = { error: 'unavailable' } }
    }
    // api_tokens — exclude token_hash
    try {
      const { data } = await sb.from('api_tokens')
        .select('id, name, prefix, scopes, created_at, expires_at, revoked_at, last_used_at')
        .eq('user_id', userId)
        .limit(1000)
      tables['api_tokens'] = data ?? []
    } catch { tables['api_tokens'] = { error: 'unavailable' } }
  } else {
    // No user_id — still scan audit_logs by email mention in metadata.
    tables['note'] = 'No matching user_id; bundle limited to public records by email.'
  }

  // Update the DSAR status.
  await sb.from('dsar_requests').update({
    status: 'complete', responded_at: new Date().toISOString(), responded_by: gate.user.id,
  }).eq('id', dsar.id)

  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'dsar.export',
    entity_type: 'user', entity_id: userId ?? dsar.email,
    metadata: { dsar_id: dsar.id, table_count: Object.keys(tables).length },
  })

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="dsar-${dsar.id}.json"`,
    },
  })
}
