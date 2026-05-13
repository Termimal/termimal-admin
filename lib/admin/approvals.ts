/**
 * 4-eyes approval workflow.
 *
 * High-risk admin actions (large refunds, bulk deletes, role changes,
 * mass session revoke) are NOT executed directly. They land in
 * `admin_approvals` as a proposal and only execute when a SECOND admin
 * approves. This bounds the damage one compromised credential can do.
 *
 * Conventions:
 *   - action slugs: '<area>.<verb>', e.g. 'refund.large', 'role.change',
 *     'user.bulk_delete', 'mass_session_revoke'.
 *   - payload jsonb carries everything the executor needs.
 *   - The executor is a switch in /api/admin/approvals/[id]/execute.
 */
import { serviceClient } from './service-client'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed' | 'failed'

export interface ApprovalRow {
  id:           string
  created_at:   string
  proposer_id:  string
  action:       string
  target_kind:  string | null
  target_id:    string | null
  payload:      Record<string, unknown>
  reason:       string
  expires_at:   string
  status:       ApprovalStatus
  approver_id:  string | null
  approved_at:  string | null
  executed_at:  string | null
  exec_result:  Record<string, unknown> | null
}

/** Insert a proposal. Caller is responsible for the gate (requireAdmin). */
export async function proposeApproval(args: {
  proposerId: string
  action:     string
  targetKind?: string | null
  targetId?:   string | null
  payload?:    Record<string, unknown>
  reason:      string
  expiresInHours?: number
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!args.reason?.trim()) return { ok: false, error: 'reason required' }
  const sb = serviceClient()
  const expiresAt = new Date(Date.now() + (args.expiresInHours ?? 24) * 60 * 60 * 1000)
  const { data, error } = await sb.from('admin_approvals').insert({
    proposer_id: args.proposerId,
    action:      args.action,
    target_kind: args.targetKind ?? null,
    target_id:   args.targetId   ?? null,
    payload:     args.payload    ?? {},
    reason:      args.reason.trim().slice(0, 500),
    expires_at:  expiresAt.toISOString(),
  }).select('id').single()
  if (error || !data?.id) return { ok: false, error: error?.message || 'insert failed' }
  return { ok: true, id: data.id }
}

/** Approve OR reject — caller must NOT be the proposer (enforced here). */
export async function decideApproval(args: {
  approverId: string
  approvalId: string
  decision:   'approve' | 'reject'
}): Promise<{ ok: true; status: ApprovalStatus } | { ok: false; error: string }> {
  const sb = serviceClient()
  const { data: row } = await sb.from('admin_approvals')
    .select('id, proposer_id, status, expires_at')
    .eq('id', args.approvalId)
    .maybeSingle() as { data: ApprovalRow | null }
  if (!row) return { ok: false, error: 'not found' }
  if (row.status !== 'pending') return { ok: false, error: `already ${row.status}` }
  if (new Date(row.expires_at) < new Date()) {
    await sb.from('admin_approvals').update({ status: 'expired' }).eq('id', row.id)
    return { ok: false, error: 'expired' }
  }
  if (row.proposer_id === args.approverId) {
    return { ok: false, error: '4-eyes: cannot self-approve' }
  }
  const nextStatus: ApprovalStatus = args.decision === 'approve' ? 'approved' : 'rejected'
  await sb.from('admin_approvals').update({
    status:      nextStatus,
    approver_id: args.approverId,
    approved_at: new Date().toISOString(),
  }).eq('id', row.id)
  return { ok: true, status: nextStatus }
}
