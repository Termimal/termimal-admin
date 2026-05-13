/**
 * /api/admin/audit-verify — verify the audit_logs hash chain.
 *
 *   POST → walks the chain from oldest → newest, computes each row's
 *   expected hash, and stops at the first mismatch. Returns
 *   `{ rows_checked, bad_row_id }`. Clean chain returns bad_row_id=null.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function POST(request: Request) {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50000', 10) || 50000, 100), 200000)
  const sb = serviceClient()
  const { data, error } = await sb.rpc('audit_log_verify_chain', { p_limit: limit })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const row = (data?.[0] ?? null) as null | { bad_row_id: string | null; bad_row_at: string | null; expected: string | null; actual: string | null; rows_checked: number }
  return NextResponse.json({ ok: !row?.bad_row_id, result: row })
}
