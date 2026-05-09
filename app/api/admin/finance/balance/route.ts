/**
 * /api/admin/finance/balance — multi-currency Stripe balance + FX.
 *
 * Returns:
 *   - Stripe `available` and `pending` balances per currency
 *     straight from the Balance API
 *   - ECB euro reference rates so the UI can show an EUR-equivalent
 *     total alongside the per-currency breakdown
 *   - the implied EUR-equivalent for every currency we hold
 *
 * The ECB publishes daily mid-market rates against EUR at
 *   https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
 * Free, no auth, ~30 currencies. We cache them in-memory for an
 * hour because they only update once per day.
 *
 * Permission: finance.read.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'

interface StripeBalance {
  available: Array<{ amount: number; currency: string }>
  pending:   Array<{ amount: number; currency: string }>
  instant_available?: Array<{ amount: number; currency: string }>
}

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

interface RateCache { fetchedAt: number; rates: Record<string, number> }
let RATES_CACHE: RateCache | null = null
const RATES_TTL_MS = 60 * 60 * 1000  // 1 hour

async function fetchEcbRates(): Promise<Record<string, number>> {
  if (RATES_CACHE && Date.now() - RATES_CACHE.fetchedAt < RATES_TTL_MS) {
    return RATES_CACHE.rates
  }
  const res = await fetch(ECB_URL, { headers: { 'User-Agent': 'termimal-admin/1.0' } })
  if (!res.ok) {
    // Network blip — return last cache if we have one, else empty.
    return RATES_CACHE?.rates ?? {}
  }
  const xml = await res.text()
  // ECB XML rows look like: <Cube currency='USD' rate='1.0823'/>
  const rates: Record<string, number> = { EUR: 1 }
  const re = /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]\s*\/>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    rates[m[1]] = parseFloat(m[2])
  }
  RATES_CACHE = { fetchedAt: Date.now(), rates }
  return rates
}

function toEuro(amountMinor: number, currency: string, rates: Record<string, number>): number {
  // Stripe amounts are in minor units (cents). Most currencies are
  // 2-decimal; zero-decimal currencies (JPY, KRW, …) ship without
  // the *100 step. We use Stripe's known list rather than a lookup
  // table — close enough for finance reporting.
  const ZERO_DECIMAL = new Set([
    'BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF',
  ])
  const cu = currency.toUpperCase()
  const major = ZERO_DECIMAL.has(cu) ? amountMinor : amountMinor / 100
  const rate = rates[cu] ?? rates[cu.toUpperCase()]
  if (cu === 'EUR' || !rate) return major  // 1:1 if EUR or unknown
  // ECB rates are EUR → currency. Convert currency → EUR is /rate.
  return major / rate
}

export async function GET() {
  const gate = await requireAdmin('finance.read')
  if (gate.ok === false) return gate.response

  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === '-') {
    return NextResponse.json({
      ok: false, error: 'STRIPE_SECRET_KEY not configured',
    }, { status: 503 })
  }

  // Stripe Balance API — current available + pending across currencies.
  const sRes = await fetch('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!sRes.ok) {
    const err = await sRes.json().catch(() => ({}))
    return NextResponse.json({ ok: false, error: 'stripe balance failed', detail: err }, { status: 502 })
  }
  const balance = await sRes.json() as StripeBalance

  const rates = await fetchEcbRates()

  const buckets: Record<string, { available: number; pending: number; instant: number }> = {}
  const ensure = (c: string) => {
    const k = c.toUpperCase()
    if (!buckets[k]) buckets[k] = { available: 0, pending: 0, instant: 0 }
    return buckets[k]
  }
  for (const r of balance.available)        ensure(r.currency).available += r.amount
  for (const r of balance.pending)          ensure(r.currency).pending   += r.amount
  for (const r of balance.instant_available || []) ensure(r.currency).instant += r.amount

  const lines = Object.entries(buckets).map(([currency, b]) => {
    const ZERO = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'])
    const div = ZERO.has(currency) ? 1 : 100
    return {
      currency,
      available_minor: b.available,
      pending_minor:   b.pending,
      instant_minor:   b.instant,
      available_major: b.available / div,
      pending_major:   b.pending   / div,
      instant_major:   b.instant   / div,
      eur_equivalent_available: toEuro(b.available, currency, rates),
      eur_equivalent_pending:   toEuro(b.pending,   currency, rates),
    }
  }).sort((a, b) => b.eur_equivalent_available - a.eur_equivalent_available)

  const totalEurAvailable = lines.reduce((s, l) => s + l.eur_equivalent_available, 0)
  const totalEurPending   = lines.reduce((s, l) => s + l.eur_equivalent_pending,   0)

  return NextResponse.json({
    ok: true,
    by_currency: lines,
    totals_eur: {
      available: totalEurAvailable,
      pending:   totalEurPending,
      gross:     totalEurAvailable + totalEurPending,
    },
    rates_source: 'ECB daily reference',
    rates_fetched_at: RATES_CACHE?.fetchedAt ? new Date(RATES_CACHE.fetchedAt).toISOString() : null,
  })
}
