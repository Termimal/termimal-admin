/**
 * /api/admin/affiliate-payouts — record + (optionally) execute payouts.
 *
 * Backed by `admin_items` with category='affiliate_payout' so we don't
 * need a fresh schema migration. Each row stores:
 *   title       → "{name} · {amount} {currency}"
 *   description → notes
 *   tags        → [`method:${method}`, `currency:${cur}`,
 *                   `amt:${amount}`, optionally `acct:${stripe_acct}`]
 *   status      → 'todo' (queued) → 'in_progress' (sent) → 'done' (paid)
 *
 * If method=stripe_transfer AND stripe_acct=acct_… is provided AND
 * Stripe Connect is configured, the POST handler will actually execute
 * a Stripe Transfer. Otherwise the row is recorded as a manual payout
 * the admin will pay outside the system (SEPA, PayPal, USDC, …).
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import Stripe from 'stripe'

interface PayoutBody {
  affiliate_name:  string
  affiliate_email: string | null
  amount:          number
  currency:        string
  method:          'stripe_transfer' | 'sepa' | 'paypal' | 'usdc' | 'wire' | 'other'
  stripe_acct?:    string | null
  notes?:          string | null
}

export async function GET() {
  const gate = await requireAdmin('referrals.read')
  if (gate.ok === false) return gate.response

  const sb = serviceClient()
  const { data, error } = await sb
    .from('admin_items')
    .select('*')
    .eq('category', 'affiliate_payout')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message, payouts: [] }, { status: 500 })
  return NextResponse.json({ payouts: data || [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('referrals.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as PayoutBody | null
  if (!body || !body.affiliate_name || !body.amount || !body.currency || !body.method) {
    return NextResponse.json({ error: 'affiliate_name, amount, currency, method required' }, { status: 400 })
  }

  // Optional Stripe Transfer execution.
  let transferId: string | null = null
  let transferError: string | null = null
  if (body.method === 'stripe_transfer' && body.stripe_acct?.startsWith('acct_')) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      transferError = 'STRIPE_SECRET_KEY not configured'
    } else {
      try {
        const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any })
        const t = await stripe.transfers.create({
          amount:     Math.round(body.amount * 100),
          currency:   body.currency.toLowerCase(),
          destination: body.stripe_acct,
          description: `Affiliate payout · ${body.affiliate_name}`,
          metadata: {
            affiliate_email: body.affiliate_email || '',
            initiated_by:    gate.user.email || gate.user.id,
          },
        })
        transferId = t.id
      } catch (e) {
        transferError = e instanceof Error ? e.message : 'transfer failed'
      }
    }
  }

  // Record in admin_items regardless of transfer outcome.
  const sb = serviceClient()
  const tags = [
    `method:${body.method}`,
    `currency:${body.currency.toUpperCase()}`,
    `amt:${body.amount}`,
    ...(body.affiliate_email ? [`email:${body.affiliate_email}`] : []),
    ...(body.stripe_acct      ? [`acct:${body.stripe_acct}`]      : []),
    ...(transferId            ? [`transfer:${transferId}`]        : []),
  ]
  const { data: row, error } = await sb.from('admin_items').insert({
    title:       `${body.affiliate_name} · ${body.amount} ${body.currency.toUpperCase()}`,
    description: body.notes || null,
    status:      transferId ? 'in_progress' : 'todo',
    priority:    'medium',
    category:    'affiliate_payout',
    tags,
    reporter_id: gate.user.id,
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payout: row, transfer_id: transferId, transfer_error: transferError })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('referrals.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as { id: string; status: 'todo' | 'in_progress' | 'done' } | null
  if (!body?.id || !body.status) return NextResponse.json({ error: 'id + status required' }, { status: 400 })

  const sb = serviceClient()
  const { data, error } = await sb
    .from('admin_items')
    .update({ status: body.status })
    .eq('id', body.id)
    .eq('category', 'affiliate_payout')
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payout: data })
}
