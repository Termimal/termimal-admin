/**
 * /api/admin/approvals — 4-eyes approval queue.
 *
 *   GET                       → list pending + recent
 *   POST { action, payload, reason }  → propose
 *   PATCH { id, decision }    → approve or reject (NOT the proposer)
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { proposeApproval, decideApproval } from '@/lib/admin/approvals'

export async function GET(request: Request) {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || ''
  const sb = serviceClient()
  let q = sb.from('admin_approvals').select('*').order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as {
    action?: string; target_kind?: string; target_id?: string;
    payload?: Record<string, unknown>; reason?: string; expires_in_hours?: number;
  } | null
  if (!body?.action || !body.reason) return NextResponse.json({ error: 'action + reason required' }, { status: 400 })
  const res = await proposeApproval({
    proposerId: gate.user.id,
    action:     body.action,
    targetKind: body.target_kind,
    targetId:   body.target_id,
    payload:    body.payload,
    reason:     body.reason,
    expiresInHours: body.expires_in_hours,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true, id: res.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; decision?: 'approve' | 'reject' } | null
  if (!body?.id || !body.decision) return NextResponse.json({ error: 'id + decision required' }, { status: 400 })
  const res = await decideApproval({ approverId: gate.user.id, approvalId: body.id, decision: body.decision })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true, status: res.status })
}
