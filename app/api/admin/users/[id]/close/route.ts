/**
 * /api/admin/users/[id]/close — full account closure (GDPR right-to-erasure).
 *
 *   DELETE  /api/admin/users/[id]/close   body: { reason?: string }
 *
 * Cascading deletion order (reverse-FK):
 *   1. Cancel any active Stripe subscription (best-effort).
 *   2. Delete user-owned rows where the FK is on delete cascade
 *      (handled automatically once we delete from auth.users).
 *   3. Delete the auth user via admin API. profiles, watchlists,
 *      alerts, paper_positions, customer_notes, etc. cascade.
 *   4. Final audit row (kind='admin_action') keeps a record without
 *      identifying the deleted user (subject_user_id stored as text).
 *
 * This is destructive — middleware ensures only super_admin can hit
 * the route. We additionally re-check the role inside the handler
 * because a permission slip-through here would be irrecoverable.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params
    if (!userId) return NextResponse.json({ error: 'user id required' }, { status: 400 })

    // Defence-in-depth: the route handler re-checks the role.
    const cookieSb = await createSsrClient()
    const { data: { user: actor } } = await cookieSb.auth.getUser()
    if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { data: role } = await cookieSb.from('user_roles').select('role').eq('id', actor.id).maybeSingle()
    if (role?.role !== 'super_admin') {
      return NextResponse.json({ error: 'super_admin role required to close accounts' }, { status: 403 })
    }
    if (actor.id === userId) {
      return NextResponse.json({ error: 'cannot close your own account from the admin panel' }, { status: 400 })
    }

    const body = await request.json().catch(() => null) as { reason?: string } | null
    const reason = body?.reason?.slice(0, 500) ?? 'closed by admin'

    const sb = serviceClient()

    // Best-effort Stripe sub cancel.
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' as any })
      const { data: profile } = await sb.from('profiles')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.stripe_subscription_id) {
        try { await stripe.subscriptions.cancel(profile.stripe_subscription_id) }
        catch { /* swallow — proceed with closure */ }
      }
    }

    // Pre-deletion audit row (we lose the user_id FK once auth.users
    // is gone, so we record the closure here with subject_user_id as
    // a text field for compliance trail).
    await sb.from('audit_logs').insert({
      user_id:     actor.id,
      action:      'account_closed',
      entity_type: 'user',
      entity_id:   userId,
      metadata:    { reason, by: actor.email },
    }).then(() => null, () => null)

    // Delete the auth user. profiles row + every cascade-FK table is
    // wiped automatically by Postgres.
    const { error } = await sb.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, deleted_user_id: userId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
