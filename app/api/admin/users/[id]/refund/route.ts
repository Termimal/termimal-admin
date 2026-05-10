/**
 * /api/admin/users/[id]/refund — issue a Stripe refund for an invoice.
 *
 *   POST  body: { invoice_id?: string, charge_id?: string, amount_cents?: number, reason?: string }
 *
 * Either invoice_id (preferred — Stripe in_…) or charge_id (ch_…)
 * must be provided. amount_cents is optional; if omitted Stripe
 * refunds the full remaining amount. The refund is also recorded in
 * customer_notes as kind='billing_event' so the user's timeline
 * shows what happened and who did it.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { serviceClient } from '@/lib/admin/service-client'
import { requireAdmin } from '@/lib/admin/require-admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin('users.write')
  if (gate.ok === false) return gate.response
  try {
    const { id: userId } = await params
    if (!userId) return NextResponse.json({ error: 'user id required' }, { status: 400 })

    // ── Velocity cap — insider-threat control ──────────────────
    // A non-super_admin issuing 3+ refunds in the last hour gets
    // blocked. The threshold catches a compromised support agent
    // (or a legitimate one going off the rails) without slowing
    // down ops on a quiet day. Super_admin is exempt — if we're
    // expediting refunds during an outage, the buck stops with us.
    if (gate.role !== 'super_admin') {
      const sbVel = serviceClient()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: recentByActor } = await sbVel
        .from('customer_notes')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', gate.user.id)
        .eq('kind', 'billing_event')
        .gte('created_at', oneHourAgo)
        .ilike('body', 'Refund issued%')
      if ((recentByActor ?? 0) >= 3) {
        return NextResponse.json({
          error: 'velocity-limited',
          detail: `You have issued ${recentByActor} refund${recentByActor === 1 ? '' : 's'} in the last hour. Further refunds require super-admin approval. If this is urgent, ask a super_admin to process the refund directly.`,
        }, { status: 429 })
      }
    }

    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any })

    const body = await request.json().catch(() => null) as {
      invoice_id?: string; charge_id?: string; amount_cents?: number; reason?: string
    } | null
    if (!body?.invoice_id && !body?.charge_id) {
      return NextResponse.json({ error: 'invoice_id or charge_id required' }, { status: 400 })
    }

    let chargeId   = body.charge_id
    let chargeRow: Stripe.Charge | null = null
    if (!chargeId && body.invoice_id) {
      // Resolve invoice → payment_intent → charge.
      const invoice = await stripe.invoices.retrieve(body.invoice_id, { expand: ['payment_intent'] })
      const pi = invoice.payment_intent as Stripe.PaymentIntent | null
      const ch = pi?.latest_charge
      chargeId = typeof ch === 'string' ? ch : (ch as Stripe.Charge | null)?.id
      if (!chargeId) return NextResponse.json({ error: 'invoice has no associated charge' }, { status: 422 })
    }
    // SECURITY (Critical #3 from audit): the request can hand us any
    // ch_… or in_… in the body. Without this check, a support-tier
    // admin with billing.refund could refund any Stripe charge in
    // the account, not just charges belonging to the user in the URL.
    // Look the charge up, then assert customer === profile.stripe_customer_id.
    chargeRow = await stripe.charges.retrieve(chargeId!)
    const chargeCustomer = typeof chargeRow.customer === 'string' ? chargeRow.customer : chargeRow.customer?.id
    {
      const adm = serviceClient()
      const { data: prof } = await adm.from('profiles').select('stripe_customer_id').eq('id', userId).maybeSingle<{ stripe_customer_id: string | null }>()
      const expectedCustomer = prof?.stripe_customer_id
      if (!expectedCustomer || !chargeCustomer || chargeCustomer !== expectedCustomer) {
        return NextResponse.json({
          error: 'charge does not belong to this user',
          detail: { user_stripe_customer: expectedCustomer, charge_customer: chargeCustomer },
        }, { status: 403 })
      }
    }

    const refund = await stripe.refunds.create({
      charge: chargeId!,
      ...(body.amount_cents ? { amount: body.amount_cents } : {}),
      ...(body.reason ? { reason: body.reason as Stripe.RefundCreateParams.Reason } : {}),
      metadata: { initiated_by: 'admin_panel', user_id: userId },
    })

    // Log in customer_notes timeline.
    const actor = gate.user
    const sb = serviceClient()
    await sb.from('customer_notes').insert({
      user_id:   userId,
      author_id: actor.id,
      kind:      'billing_event',
      body:      `Refund issued: ${refund.id} (${(refund.amount / 100).toFixed(2)} ${refund.currency.toUpperCase()})${body.reason ? ` — ${body.reason}` : ''}`,
      metadata:  { refund_id: refund.id, charge_id: chargeId, amount_cents: refund.amount, currency: refund.currency, reason: body.reason ?? null },
    }).then(() => null, () => null)

    return NextResponse.json({ refund })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
