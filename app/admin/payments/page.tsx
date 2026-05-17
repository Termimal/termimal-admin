'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/payments — Stripe charges, refunds, and invoice ledger.
 *
 * Previously the page rendered hardcoded "$40,700" KPIs, three fake
 * email rows, and a seven-bar mock graph that never moved. Now it
 * fetches /api/admin/payments (server-side Stripe call, gated by
 * users.read permission) and renders the real ledger.
 *
 * The API returns:
 *   - metrics: { grossVolume, netRevenue, refunded, failed, failedAmount,
 *                successRate, totalCharges }
 *   - dailySeries: [{ date, gross, net, failed, count, failedCount }]
 *   - transactions: [{ id, amount, currency, status, email, description,
 *                      created, failure_code, failure_message, refunded,
 *                      amount_refunded, card_brand, card_last4, country }]
 *   - errorCodes: [{ code, count }]
 *
 * Window selector (7/30/90 days) reloads with ?days=N.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, DollarSign, RefreshCcw, AlertTriangle, CreditCard, Search, RefreshCw,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Metrics {
  grossVolume:   number
  netRevenue:    number
  refunded:      number
  failed:        number
  failedAmount:  number
  successRate:   number
  totalCharges:  number
}
interface DailyRow {
  date:        string
  gross:       number
  net:         number
  failed:      number
  count:       number
  failedCount: number
}
interface Txn {
  id:              string
  amount:          number
  currency:        string
  status:          string
  email:           string
  description:     string
  created:         number
  failure_code:    string | null
  failure_message: string | null
  outcome_reason:  string | null
  refunded:        boolean
  amount_refunded: number
  card_brand:      string | null
  card_last4:      string | null
  country:         string | null
}
interface ApiResp {
  metrics:    Metrics
  dailySeries: DailyRow[]
  transactions: Txn[]
  errorCodes: Array<{ code: string; count: number }>
  error?:      string
}

const WINDOWS = [
  { days: 7,  label: '7d'  },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
] as const

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtUsdCents(n: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}
function fmtAge(unixSec: number): string {
  const ms = Date.now() - unixSec * 1000
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function KPI({ label, value, sub, icon: Icon, accent }: {
  label:  string
  value:  string
  sub?:   string
  icon:   typeof DollarSign
  accent: 'green' | 'acc' | 'amber' | 'red'
}) {
  return (
    <div className="card-premium" style={{
      padding: '24px 28px',
      borderColor: `var(--${accent})44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--t4)',
        }}>{label}</span>
        <Icon size={16} style={{ color: `var(--${accent})` }}/>
      </div>
      <div style={{
        fontSize: 32, fontWeight: 800, color: 'var(--t1)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t3)' }}>{sub}</div>
      )}
    </div>
  )
}

function statusBadge(t: Txn): { label: string; tone: 'green' | 'red' | 'amber' | 'muted' } {
  if (t.refunded || t.amount_refunded > 0) return { label: 'Refunded', tone: 'amber' }
  if (t.status === 'succeeded')            return { label: 'Succeeded', tone: 'green' }
  if (t.status === 'failed')               return { label: 'Failed', tone: 'red' }
  if (t.status === 'pending')              return { label: 'Pending', tone: 'muted' }
  return { label: t.status, tone: 'muted' }
}

export default function PaymentsPage() {
  const [days,   setDays]   = useState<number>(7)
  const [data,   setData]   = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,    setErr]    = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async (windowDays: number) => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch(`/api/admin/payments?days=${windowDays}`, { cache: 'no-store' })
      const j = await r.json() as ApiResp
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setData(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load(days) }, [days])

  const filteredTxns = useMemo(() => {
    if (!data?.transactions) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.transactions
    return data.transactions.filter(t =>
      t.email.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q),
    )
  }, [data, search])

  // dailySeries from API is ordered by date asc. Use the peak count as
  // the scale so the bar heights are meaningful, not relative to a
  // hardcoded 100% denominator like the old mock chart.
  const chartRows = data?.dailySeries ?? []
  const maxGross  = chartRows.reduce((m, r) => Math.max(m, r.gross), 0) || 1

  const m = data?.metrics

  return (
    <div>
      <HeroCard
        accent="green"
        icon={<CreditCard size={28}/>}
        eyebrow="Billing"
        title="Payments"
        subtitle="Stripe charges, refunds, and invoice ledger. Numbers refresh on every load — no caching."
        metric={m
          ? {
              label: `Volume · ${days}d`,
              value: fmtUsd(m.grossVolume),
              secondary: `${m.successRate.toFixed(1)}% success`,
            }
          : { label: `Volume · ${days}d`, value: loading ? '…' : '—', secondary: loading ? 'loading' : 'no data' }
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div role="tablist" aria-label="Time window" style={{
          display: 'inline-flex', padding: 4, gap: 4,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999,
        }}>
          {WINDOWS.map(w => (
            <button
              key={w.days}
              role="tab"
              aria-selected={days === w.days}
              onClick={() => setDays(w.days)}
              type="button"
              className="btn-xs"
              style={{
                background: days === w.days ? 'var(--surface3)' : 'transparent',
                border: 'none', minHeight: 26,
                color: days === w.days ? 'var(--t1)' : 'var(--t3)',
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => load(days)} disabled={loading} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {err && (
        <div className="msg-err" style={{ marginBottom: 18 }}>
          <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }}/>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, marginBottom: 28 }}>
        <KPI
          label={`Gross volume · ${days}d`}
          value={m ? fmtUsd(m.grossVolume) : '—'}
          sub={m ? `${m.totalCharges} charges` : undefined}
          icon={DollarSign} accent="green"
        />
        <KPI
          label="Success rate"
          value={m ? `${m.successRate.toFixed(1)}%` : '—'}
          sub={m ? `net ${fmtUsd(m.netRevenue)}` : undefined}
          icon={Activity} accent="acc"
        />
        <KPI
          label="Refunds"
          value={m ? fmtUsd(m.refunded) : '—'}
          icon={RefreshCcw} accent="amber"
        />
        <KPI
          label="Failed charges"
          value={m ? `${m.failed}` : '—'}
          sub={m && m.failedAmount > 0 ? fmtUsd(m.failedAmount) : undefined}
          icon={AlertTriangle} accent="red"
        />
      </div>

      <Section
        title="Daily gross volume"
        description={`Last ${days} days. Bars scaled against the peak day.`}
        accent="green"
      >
        {loading && !data ? (
          <div className="skeleton" style={{ height: 220, borderRadius: 14 }}/>
        ) : chartRows.length === 0 ? (
          <EmptyState
            icon={<DollarSign size={20}/>}
            title="No charges in this window"
            description="Stripe returned zero rows. Try a longer window."
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 220 }}>
            {chartRows.map(r => {
              const pct = (r.gross / maxGross) * 100
              return (
                <div
                  key={r.date}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}
                  title={`${r.date} — ${fmtUsd(r.gross)} (${r.count} charges, ${r.failedCount} failed)`}
                >
                  <div
                    style={{
                      width: '100%', borderRadius: '6px 6px 0 0',
                      background: r.failedCount > 0 && r.failedCount >= r.count ? 'var(--red)'
                                : r.failedCount > 0 ? 'var(--amber)'
                                : 'var(--acc)',
                      height: `${Math.max(pct, 2)}%`,
                      transition: 'opacity 200ms',
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.date.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {data && data.errorCodes.length > 0 && (
        <Section
          title="Top failure reasons"
          description="Decline codes from failed charges in this window."
          accent="red"
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.errorCodes.slice(0, 8).map(e => (
              <span
                key={e.code}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: 'var(--red-bg)',
                  border: '1px solid rgba(248,113,113,0.18)',
                  borderRadius: 999, fontSize: 12,
                  color: 'var(--red)', fontWeight: 600,
                }}
              >
                <code style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 11 }}>{e.code}</code>
                <span style={{ color: 'var(--t3)', fontWeight: 500 }}>· {e.count}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Recent transactions"
        description={loading
          ? 'Loading…'
          : `${filteredTxns.length}${data && filteredTxns.length !== data.transactions.length ? ` of ${data.transactions.length}` : ''} charges`}
        actions={
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input
              type="text"
              className="input"
              placeholder="Search email, charge ID, description…"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        }
        flush
      >
        {loading && !data ? (
          <div className="skeleton" style={{ height: 240, borderRadius: 14 }}/>
        ) : filteredTxns.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={20}/>}
            title={search ? 'No matches' : 'No charges'}
            description={search ? 'Try clearing the search or widening the window.' : 'No Stripe charges in this window yet.'}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-root" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Email / user', 'Amount', 'Status', 'Card', 'Date'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '14px 24px',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--t4)',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTxns.slice(0, 100).map(t => {
                  const b = statusBadge(t)
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--t1)' }}>
                        <div style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
                          {t.email || <em style={{ color: 'var(--t4)' }}>no email</em>}
                        </div>
                        {t.description && (
                          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{t.description}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--t1)', fontSize: 13 }}>
                        {fmtUsdCents(t.amount, t.currency)}
                        {t.amount_refunded > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>
                            -{fmtUsdCents(t.amount_refunded, t.currency)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span className={`badge badge-${b.tone}`}>{b.label}</span>
                        {t.failure_message && (
                          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, maxWidth: 220 }}>
                            {t.failure_message}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: 12, color: 'var(--t3)' }}>
                        {t.card_brand && t.card_last4
                          ? <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{t.card_brand} ····{t.card_last4}</span>
                          : <span style={{ color: 'var(--t4)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '14px 24px', color: 'var(--t4)', fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {fmtAge(t.created)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredTxns.length > 100 && (
              <div style={{ padding: 14, fontSize: 12, color: 'var(--t4)', textAlign: 'center' }}>
                Showing first 100 of {filteredTxns.length}. Narrow with search or pick a shorter window.
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}
