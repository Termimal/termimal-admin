/**
 * /api/admin/coupons — Stripe-synced coupon manager.
 *
 *   GET    /api/admin/coupons
 *   POST   /api/admin/coupons       — create local row + create on Stripe
 *   DELETE /api/admin/coupons?id=…  — soft-archive locally + delete on Stripe
 *
 * If STRIPE_SECRET_KEY isn't configured we still allow create/list of
 * local rows (useful in test/dev) but skip the Stripe sync. The
 * stripe_coupon_id stays null.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { requireAdmin } from '@/lib/admin/require-admin'
import Stripe from 'stripe'

function maybeStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' as any })
}

export async function GET() {
  const gate = await requireAdmin('coupons.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const { data, error } = await sb.from('coupons').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [], stripe_configured: !!process.env.STRIPE_SECRET_KEY })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  const gate = await requireAdmin('coupons.write')
  if (gate.ok === false) return gate.response
  try {
    const sb     = serviceClient()
    const body   = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body?.code) return NextResponse.json({ error: 'code required' }, { status: 400 })
    const insert: Record<string, unknown> = {
      code:               String(body.code).toUpperCase().slice(0, 50),
      name:               body.name,
      percent_off:        body.percent_off ?? null,
      amount_off_cents:   body.amount_off_cents ?? null,
      currency:           body.currency ?? 'usd',
      duration:           body.duration ?? 'once',
      duration_in_months: body.duration_in_months ?? null,
      max_redemptions:    body.max_redemptions ?? null,
      applies_to_plans:   body.applies_to_plans ?? [],
      valid_from:         body.valid_from ?? null,
      valid_until:        body.valid_until ?? null,
    }

    // Sync to Stripe if configured.
    const stripe = maybeStripe()
    let stripeCouponId: string | null = null
    if (stripe) {
      try {
        const stripeArgs: Stripe.CouponCreateParams = {
          id:       String(insert.code),
          name:     insert.name as string | undefined,
          duration: (insert.duration as 'once' | 'repeating' | 'forever'),
        }
        if (insert.percent_off)        stripeArgs.percent_off    = insert.percent_off as number
        if (insert.amount_off_cents)   stripeArgs.amount_off     = insert.amount_off_cents as number
        if (insert.amount_off_cents)   stripeArgs.currency       = insert.currency as string
        if (insert.duration === 'repeating' && insert.duration_in_months) stripeArgs.duration_in_months = insert.duration_in_months as number
        if (insert.max_redemptions)    stripeArgs.max_redemptions = insert.max_redemptions as number
        if (insert.valid_until)        stripeArgs.redeem_by      = Math.floor(new Date(insert.valid_until as string).getTime() / 1000)
        const created = await stripe.coupons.create(stripeArgs)
        stripeCouponId = created.id
      } catch (err) {
        return NextResponse.json({ error: `Stripe coupon create failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 502 })
      }
    }
    insert.stripe_coupon_id = stripeCouponId

    const { data, error } = await sb.from('coupons').insert(insert).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('coupons.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Pull the local row first so we can delete the Stripe side too.
    const { data: row } = await sb.from('coupons').select('id, stripe_coupon_id').eq('id', id).single()
    const stripe = maybeStripe()
    if (stripe && row?.stripe_coupon_id) {
      try { await stripe.coupons.del(row.stripe_coupon_id) }
      catch { /* swallow — local archive proceeds */ }
    }
    const { error } = await sb.from('coupons').update({ archived_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
