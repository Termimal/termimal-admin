import { NextResponse } from 'next/server'
import Stripe from 'stripe'
const getStripe = () => {
  const k = process.env.STRIPE_SECRET_KEY
  if (!k) throw new Error('STRIPE_SECRET_KEY not configured in Worker environment variables')
  return new Stripe(k, { apiVersion: '2025-01-27.acacia' as any })
}
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const days = Number(url.searchParams.get('days') || '30')
    const s = getStripe()
    const since = Math.floor(Date.now() / 1000) - days * 86400
    const charges = await s.charges.list({ limit: 100, created: { gte: since } })
    let grossVolume = 0, netRevenue = 0, refunded = 0, failed = 0, failedAmount = 0
    const dailyMap: Record<string, any> = {}
    const errorCodes: Record<string, number> = {}
    for (const ch of charges.data) {
      const date = new Date(ch.created * 1000).toISOString().slice(0, 10)
      if (!dailyMap[date]) dailyMap[date] = { gross: 0, net: 0, failed: 0, count: 0, failedCount: 0 }
      if (ch.status === 'succeeded') {
        const gross = ch.amount / 100
        grossVolume += gross; netRevenue += gross
        dailyMap[date].gross += gross; dailyMap[date].net += gross; dailyMap[date].count++
        if (ch.refunded) { refunded += ch.amount_refunded / 100; netRevenue -= ch.amount_refunded / 100 }
      } else if (ch.status === 'failed') {
        failed++; failedAmount += ch.amount / 100
        dailyMap[date].failed += ch.amount / 100; dailyMap[date].failedCount++
        const code = ch.failure_code || ch.outcome?.reason || 'unknown'
        errorCodes[code] = (errorCodes[code] || 0) + 1
      }
    }
    const dailySeries = Object.entries(dailyMap).sort(([a],[b])=>a.localeCompare(b)).map(([date,v])=>({date,...v}))
    const successCount = charges.data.filter(c => c.status === 'succeeded').length
    const successRate = charges.data.length > 0 ? Math.round((successCount / charges.data.length) * 1000) / 10 : 100
    const transactions = charges.data.map(ch => ({
      id: ch.id, amount: ch.amount / 100, currency: ch.currency, status: ch.status,
      email: ch.billing_details?.email || ch.receipt_email || '',
      description: ch.description || '', created: ch.created,
      failure_code: ch.failure_code || null, failure_message: ch.failure_message || null,
      outcome_reason: ch.outcome?.reason || null, refunded: ch.refunded,
      amount_refunded: ch.amount_refunded / 100,
      card_brand: (ch.payment_method_details as any)?.card?.brand || null,
      card_last4: (ch.payment_method_details as any)?.card?.last4 || null,
      country: (ch.payment_method_details as any)?.card?.country || null,
    }))
    return NextResponse.json({
      metrics: { grossVolume, netRevenue, refunded, failed, failedAmount, successRate, totalCharges: charges.data.length },
      dailySeries, transactions,
      errorCodes: Object.entries(errorCodes).map(([code,count])=>({code,count})).sort((a,b)=>b.count-a.count),
    })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
