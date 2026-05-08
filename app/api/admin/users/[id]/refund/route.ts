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
import { createClient as createSsrClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params
    if (!userId) return NextResponse.json({ error: 'user id required' }, { status: 400 })

    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any })

    const body = await request.json().catch(() => null) as {
      invoice_id?: string; charge_id?: string; amount_cents?: number; reason?: string
    } | null
    if (!body?.invoice_id && !body?.charge_id) {
      return NextResponse.json({ error: 'invoice_id or charge_id required' }, { status: 400 })
    }

    let chargeId = body.charge_id
    if (!chargeId && body.invoice_id) {
      // Resolve invoice → payment_intent → charge.
      const invoice = await stripe.invoices.retrieve(body.invoice_id, { expand: ['payment_intent'] })
      const pi = invoice.payment_intent as Stripe.PaymentIntent | null
      const ch = pi?.latest_charge
      chargeId = typeof ch === 'string' ? ch : (ch as Stripe.Charge | null)?.id
      if (!chargeId) return NextResponse.json({ error: 'invoice has no associated charge' }, { status: 422 })
    }

    const refund = await stripe.refunds.create({
      charge: chargeId!,
      ...(body.amount_cents ? { amount: body.amount_cents } : {}),
      ...(body.reason ? { reason: body.reason as Stripe.RefundCreateParams.Reason } : {}),
      metadata: { initiated_by: 'admin_panel', user_id: userId },
    })

    // Log in customer_notes timeline.
    const cookieSb = await createSsrClient()
    const { data: { user: actor } } = await cookieSb.auth.getUser()
    const sb = serviceClient()
    await sb.from('customer_notes').insert({
      user_id:   userId,
      author_id: actor?.id ?? null,
      kind:      'billing_event',
      body:      `Refund issued: ${refund.id} (${(refund.amount / 100).toFixed(2)} ${refund.currency.toUpperCase()})${body.reason ? ` — ${body.reason}` : ''}`,
      metadata:  { refund_id: refund.id, charge_id: chargeId, amount_cents: refund.amount, currency: refund.currency, reason: body.reason ?? null },
    }).then(() => null, () => null)

    return NextResponse.json({ refund })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
