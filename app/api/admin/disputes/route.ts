/**
 * /api/admin/disputes — Stripe dispute mirror.
 *
 * Rows are written by the Stripe webhook on charge.dispute.* events.
 * This is a viewer; submit-evidence still happens via the Stripe
 * dashboard (their dispute UI is the source of truth + has the proof
 * upload widget).
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('billing.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || ''
  const sb = serviceClient()
  let q = sb.from('disputes')
    .select('id, created_at, stripe_id, user_id, charge_id, amount_cents, currency, reason, status, evidence_due_by, meta, updated_at')
    .order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}
