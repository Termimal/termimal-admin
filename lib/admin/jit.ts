/**
 * Just-in-time (JIT) admin elevation.
 *
 * The principle: no human walks around with `super_admin` permanently.
 * To do something that requires elevated permissions, an admin calls
 * `requestElevation('super_admin', 'reason', 60)` — they're elevated
 * for 60 minutes, automatically demoted after. Every elevation is
 * logged and visible in /admin/jit so the trail is auditable.
 *
 * `requireAdmin('roles.write')` is the gate that today's UI uses;
 * with JIT we can require the elevation to be ACTIVE on top of that
 * for the most sensitive ops (mass session revoke, role change).
 *
 * Implementation note: we don't actually mutate user_roles. We let the
 * existing role gate stand, and add `jit_elevations` as a parallel
 * check the route can opt into via `hasActiveJit()`. That avoids any
 * window where a half-revoked role could be exploited.
 */
import { serviceClient } from './service-client'

const MAX_DURATION_MIN = 240 // 4h hard cap

export async function requestElevation(args: {
  userId:    string
  role:      string
  reason:    string
  durationMin?: number
}): Promise<{ ok: true; id: string; expires_at: string } | { ok: false; error: string }> {
  if (!args.reason?.trim()) return { ok: false, error: 'reason required' }
  const minutes = Math.max(5, Math.min(args.durationMin ?? 60, MAX_DURATION_MIN))
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000)
  const sb = serviceClient()
  const { data, error } = await sb.from('jit_elevations').insert({
    user_id:      args.userId,
    reason:       args.reason.trim().slice(0, 500),
    granted_role: args.role,
    expires_at:   expiresAt.toISOString(),
  }).select('id, expires_at').single()
  if (error || !data?.id) return { ok: false, error: error?.message || 'insert failed' }
  return { ok: true, id: data.id, expires_at: data.expires_at }
}

export async function revokeElevation(args: {
  approvalId: string
  revokerId:  string
}): Promise<{ ok: boolean }> {
  const sb = serviceClient()
  const { error } = await sb.from('jit_elevations')
    .update({ revoked_at: new Date().toISOString(), revoker_id: args.revokerId })
    .eq('id', args.approvalId)
    .is('revoked_at', null)
  return { ok: !error }
}

export async function hasActiveJit(userId: string, role: string): Promise<boolean> {
  const sb = serviceClient()
  const { data } = await sb.rpc('has_active_jit', { p_user_id: userId, p_role: role })
  return !!data
}
