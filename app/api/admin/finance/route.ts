/**
 * /api/admin/finance — P&L summary across the last N months.
 *
 *   GET  /api/admin/finance?months=6
 *
 * Returns per-month buckets:
 *   { period, revenue, stripe_fees, infra, api_costs, net,
 *     paying_customers, mrr_estimate }
 *
 * Revenue: SUM of invoices.amount where status='paid' grouped by
 *   period_start month.
 * Stripe fees: estimated as 2.9% + $0.30 per paid invoice (Stripe's
 *   public US rate). Override by writing real `application_fee_amount`
 *   into invoices if you have it.
 * Infra + API: from infrastructure_costs table by period.
 * Net: revenue − fees − infra − api.
 * MRR: sum of monthly-cycle subscription amounts active during the period.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'

interface Bucket {
  period:           string                    // 'YYYY-MM'
  revenue_usd:      number
  stripe_fees_usd:  number
  invoice_count:    number
  refunds_usd:      number
  infra_usd:        number
  api_costs_usd:    number
  tooling_usd:      number
  marketing_usd:    number
  salaries_usd:     number
  other_costs_usd:  number
  total_costs_usd:  number
  net_usd:          number
}

function periodKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: Request) {
  try {
    const sb = serviceClient()
    const u  = new URL(request.url)
    const months = Math.min(36, Math.max(1, Number(u.searchParams.get('months')) || 6))
    const since  = new Date()
    since.setUTCDate(1)
    since.setUTCMonth(since.getUTCMonth() - (months - 1))
    since.setUTCHours(0, 0, 0, 0)
    const sinceIso = since.toISOString()

    // Pull invoices.
    const { data: invoices, error: invErr } = await sb
      .from('invoices')
      .select('id, amount, currency, status, period_start, created_at, refunded_amount')
      .gte('created_at', sinceIso)
    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

    // Pull cost ledger.
    const { data: costs } = await sb
      .from('infrastructure_costs')
      .select('category, amount_usd, period')
      .gte('period', periodKey(since))

    // Pull paying customers count for MRR estimate.
    const { count: payingCount } = await sb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('plan', ['starter', 'pro', 'premium'])
      .eq('subscription_status', 'active')

    // Build month buckets.
    const buckets = new Map<string, Bucket>()
    const cursor = new Date(since)
    for (let i = 0; i < months; i++) {
      const k = periodKey(cursor)
      buckets.set(k, {
        period: k,
        revenue_usd: 0, stripe_fees_usd: 0, invoice_count: 0, refunds_usd: 0,
        infra_usd: 0, api_costs_usd: 0, tooling_usd: 0, marketing_usd: 0,
        salaries_usd: 0, other_costs_usd: 0, total_costs_usd: 0, net_usd: 0,
      })
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }

    // Accumulate revenue + fees from invoices (status='paid' only).
    for (const inv of (invoices as Array<Record<string, unknown>> | null) ?? []) {
      const status = String(inv.status ?? '')
      const periodStart = (inv.period_start as string | null) || (inv.created_at as string | null)
      if (!periodStart) continue
      const k = periodKey(new Date(periodStart))
      const b = buckets.get(k)
      if (!b) continue
      const amount = Number(inv.amount ?? 0)
      const refunded = Number((inv as { refunded_amount?: number }).refunded_amount ?? 0)
      if (status === 'paid' && amount > 0) {
        b.revenue_usd     += amount
        b.invoice_count   += 1
        // Stripe US standard: 2.9% + $0.30.
        b.stripe_fees_usd += Math.round((amount * 0.029 + 0.30) * 100) / 100
      }
      if (refunded > 0) b.refunds_usd += refunded
    }

    // Accumulate cost rows.
    for (const c of (costs as Array<Record<string, unknown>> | null) ?? []) {
      const k = String(c.period ?? '')
      const b = buckets.get(k)
      if (!b) continue
      const amt = Number(c.amount_usd ?? 0)
      switch (String(c.category)) {
        case 'infrastructure': b.infra_usd      += amt; break
        case 'api':            b.api_costs_usd  += amt; break
        case 'tooling':        b.tooling_usd    += amt; break
        case 'marketing':      b.marketing_usd  += amt; break
        case 'salaries':       b.salaries_usd   += amt; break
        default:               b.other_costs_usd += amt; break
      }
    }

    for (const b of buckets.values()) {
      b.total_costs_usd = b.stripe_fees_usd + b.refunds_usd + b.infra_usd + b.api_costs_usd
                        + b.tooling_usd + b.marketing_usd + b.salaries_usd + b.other_costs_usd
      b.net_usd = b.revenue_usd - b.total_costs_usd
    }

    const series = [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period))

    // Headline numbers (latest month + last 30 days).
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000)
    let revenue30 = 0, refunds30 = 0
    for (const inv of (invoices as Array<Record<string, unknown>> | null) ?? []) {
      if (String(inv.status) === 'paid') {
        const t = Date.parse(String(inv.created_at))
        if (Number.isFinite(t) && t >= thirtyDaysAgo.getTime()) revenue30 += Number(inv.amount ?? 0)
      }
      const refunded = Number((inv as { refunded_amount?: number }).refunded_amount ?? 0)
      if (refunded > 0) {
        const t = Date.parse(String(inv.created_at))
        if (Number.isFinite(t) && t >= thirtyDaysAgo.getTime()) refunds30 += refunded
      }
    }

    return NextResponse.json({
      series,
      summary: {
        revenue_30d:        Math.round(revenue30 * 100) / 100,
        refunds_30d:        Math.round(refunds30 * 100) / 100,
        paying_customers:   payingCount ?? 0,
        // Crude MRR — assume all paying customers pay monthly.
        // Real MRR would need to read subscription items.
        mrr_estimate:       Math.round((revenue30 / 30) * 30.4 * 100) / 100,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
