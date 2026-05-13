/**
 * /api/admin/dsar/[id]/erase
 *
 * POST → GDPR Article 17 (right to erasure). Deletes the user from
 * auth + cascades. Body must include `{ confirm: 'ERASE' }` to avoid
 * accidental fires. Every erasure is audit-logged with the table-row
 * counts captured BEFORE deletion.
 *
 * This is the most dangerous endpoint in the admin. Two safety rails:
 *   - super_admin permission required (roles.write).
 *   - The DSAR row must already be `in_progress` — you can't go from
 *     'open' straight to deletion in one click.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin('roles.write') // super_admin in practice
  if (gate.ok === false) return gate.response
  const { id } = await ctx.params
  const body = await request.json().catch(() => null) as { confirm?: string } | null
  if (body?.confirm !== 'ERASE') return NextResponse.json({ error: "must POST { confirm: 'ERASE' }" }, { status: 400 })

  const sb = serviceClient()
  const { data: dsar } = await sb.from('dsar_requests')
    .select('id, user_id, email, status, kind')
    .eq('id', id)
    .maybeSingle() as { data: { id: string; user_id: string | null; email: string; status: string; kind: string } | null }
  if (!dsar) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (dsar.kind !== 'erasure') return NextResponse.json({ error: 'not an erasure request' }, { status: 400 })
  if (dsar.status !== 'in_progress') {
    return NextResponse.json({ error: "DSAR must be 'in_progress' before erase" }, { status: 400 })
  }

  let userId = dsar.user_id
  if (!userId) {
    const { data: p } = await sb.from('profiles').select('id').eq('email', dsar.email).maybeSingle()
    userId = (p as { id?: string } | null)?.id ?? null
  }
  if (!userId) return NextResponse.json({ error: 'no user matches DSAR' }, { status: 404 })

  // Count rows before deletion for audit evidence.
  const counts: Record<string, number> = {}
  for (const t of ['profiles','login_events','audit_logs','notifications','invoices','plan_changes','email_log','api_tokens','trusted_devices']) {
    try {
      const { count } = await sb.from(t).select('id', { count: 'exact', head: true }).eq('user_id', userId)
      counts[t] = count ?? 0
    } catch { counts[t] = -1 }
  }

  // Auth deletion cascades thanks to ON DELETE CASCADE on most FKs.
  const { error: authErr } = await sb.auth.admin.deleteUser(userId)
  if (authErr) return NextResponse.json({ error: 'auth delete failed: ' + authErr.message }, { status: 500 })

  // Best-effort row-level cleanup of tables that may not cascade.
  await sb.from('profiles').delete().eq('id', userId)

  // Audit log entry (this row will reference a now-deleted user_id;
  // we deliberately keep the row for legal-defense purposes).
  await sb.from('audit_logs').insert({
    user_id: gate.user.id,
    action:  'dsar.erase',
    entity_type: 'user',
    entity_id: userId,
    metadata: { dsar_id: dsar.id, email_redacted: dsar.email.replace(/(.).+@/, '$1****@'), counts },
  })

  await sb.from('dsar_requests').update({
    status: 'complete', responded_at: new Date().toISOString(), responded_by: gate.user.id,
    meta: { erased: true, counts },
  }).eq('id', dsar.id)

  return NextResponse.json({ ok: true, deleted_user: userId, counts })
}
