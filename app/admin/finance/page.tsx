'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { HeroCard, Section, Tabs, EmptyState, Field } from '@/components/admin/PageChrome'

interface Bucket {
  period:           string
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
interface Summary { revenue_30d: number; refunds_30d: number; paying_customers: number; mrr_estimate: number }
interface Cost {
  id: string; category: string; provider: string; period: string;
  amount_usd: number; notes: string | null; created_at: string
}

const CATEGORIES = ['infrastructure', 'api', 'tooling', 'marketing', 'salaries', 'other'] as const
const CAT_COLOR: Record<string, string> = {
  infrastructure: 'var(--blue)', api: 'var(--purple)', tooling: 'var(--acc)',
  marketing: 'var(--amber)', salaries: 'var(--red)', other: 'var(--t4)',
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}
function thisPeriod(): string {
  const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function KPI({ label, value, accent, trend }: { label: string; value: React.ReactNode; accent: 'green'|'amber'|'acc'|'blue'|'red'; trend?: { change: number; positive: boolean } }) {
  return (
    <div className="card-premium" style={{
      padding: '24px 28px',
      borderColor: `var(--${accent})44`,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 12,
      }}>{label}</div>
      <div style={{
        fontSize: 32, fontWeight: 800, color: 'var(--t1)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', lineHeight: 1,
      }}>{value}</div>
      {trend && (
        <div style={{
          marginTop: 10, fontSize: 12, color: trend.positive ? 'var(--green)' : 'var(--red)',
          display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
        }}>
          {trend.change > 0 ? <TrendingUp size={12}/> : trend.change < 0 ? <TrendingDown size={12}/> : <Minus size={12}/>}
          {trend.change >= 0 ? '+' : ''}{fmt(trend.change)}
        </div>
      )}
    </div>
  )
}

interface Balance {
  ok: boolean
  by_currency: Array<{
    currency: string
    available_major: number
    pending_major:   number
    eur_equivalent_available: number
    eur_equivalent_pending:   number
  }>
  totals_eur: { available: number; pending: number; gross: number }
  rates_fetched_at: string | null
}

export default function FinancePage() {
  const [series, setSeries]     = useState<Bucket[]>([])
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [costs, setCosts]       = useState<Cost[]>([])
  const [balance, setBalance]   = useState<Balance | null>(null)
  const [balanceFilter, setBalanceFilter] = useState<string>('all')
  const [tab, setTab]           = useState<'overview' | 'costs'>('overview')
  const [months, setMonths]     = useState(6)
  const [loading, setLoading]   = useState(true)
  const [draft, setDraft]       = useState({ category: 'infrastructure' as typeof CATEGORIES[number], provider: '', period: thisPeriod(), amount_usd: '', notes: '' })
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, c, b] = await Promise.all([
      fetch(`/api/admin/finance?months=${months}`, { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/admin/finance/costs',             { cache: 'no-store' }).then(r => r.json()),
      // Stripe Balance API + ECB FX rates. Soft-fails if Stripe isn't
      // configured — the panel just shows a setup hint.
      fetch('/api/admin/finance/balance',           { cache: 'no-store' }).then(r => r.json()).catch(() => null),
    ])
    setSeries(s.series ?? []); setSummary(s.summary ?? null); setCosts(c.rows ?? [])
    setBalance(b && b.ok ? b : null)
    setLoading(false)
  }, [months])
  useEffect(() => { load() }, [load])

  const headlineNet = useMemo(() => {
    const last = series[series.length - 1]
    const prev = series[series.length - 2]
    if (!last) return null
    const change = prev ? last.net_usd - prev.net_usd : 0
    return { value: last.net_usd, change }
  }, [series])

  async function saveCost() {
    if (!draft.provider || !draft.amount_usd) return
    setSaving(true)
    await fetch('/api/admin/finance/costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, amount_usd: Number(draft.amount_usd) }),
    })
    setDraft({ ...draft, provider: '', amount_usd: '', notes: '' })
    setSaving(false)
    load()
  }
  async function delCost(id: string) {
    if (!confirm('Delete this cost row?')) return
    await fetch(`/api/admin/finance/costs?id=${id}`, { method: 'DELETE' })
    load()
  }

  const chartMax = Math.max(1, ...series.map(b => Math.max(b.revenue_usd, b.total_costs_usd)))

  return (
    <div>
      <HeroCard
        accent="green"
        icon={<Wallet size={28}/>}
        eyebrow="Finance"
        title="P&L overview"
        subtitle="Revenue, Stripe fees, infrastructure, API costs — net P&L per month. Manual costs come from the Cost ledger tab."
        metric={summary ? { label: 'MRR estimate', value: fmt(summary.mrr_estimate), secondary: `${summary.paying_customers} paying` } : undefined}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
        <select className="input" value={months} onChange={e => setMonths(Number(e.target.value))} style={{ width: 160 }}>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
        <button className="btn btn-secondary btn-sm" style={{ minHeight: 38 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Tabs
        items={[{ key: 'overview', label: 'Overview' }, { key: 'costs', label: 'Cost ledger', count: costs.length || undefined }]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        accent="green"
      />

      {tab === 'overview' && (
        <>
          {/* ── Stripe live balance, multi-currency, with EUR-equivalent ── */}
          {balance && balance.by_currency.length > 0 && (
            <Section
              accent="green"
              title="Stripe balance · live"
              description={
                <>
                  Available + pending across every currency Stripe holds for us.
                  EUR-equivalent uses ECB daily reference rates
                  {balance.rates_fetched_at ? ` (fetched ${new Date(balance.rates_fetched_at).toLocaleString()})` : ''}.
                </>
              }
              actions={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={balanceFilter}
                    onChange={e => setBalanceFilter(e.target.value)}
                    className="input"
                    style={{ minHeight: 34, padding: '4px 12px', fontSize: 12 }}
                  >
                    <option value="all">All currencies</option>
                    {balance.by_currency.map(b => (
                      <option key={b.currency} value={b.currency}>{b.currency}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const cols = ['currency','available_major','pending_major','eur_equivalent_available','eur_equivalent_pending']
                      const rows = balance.by_currency
                        .filter(r => balanceFilter === 'all' || r.currency === balanceFilter)
                      const csv = [cols.join(','), ...rows.map(r => cols.map(c => (r as any)[c] ?? '').join(','))].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `stripe-balance-${new Date().toISOString().slice(0,10)}.csv`
                      a.click()
                      URL.revokeObjectURL(a.href)
                    }}
                  >Export CSV</button>
                </div>
              }
            >
              {/* Aggregate strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14,
              }}>
                <div style={{
                  padding: '16px 18px', borderRadius: 14,
                  background: 'var(--green-bg)', border: '1px solid rgba(52,211,153,0.3)',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 6 }}>
                    Available · EUR equivalent
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    €{balance.totals_eur.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  padding: '16px 18px', borderRadius: 14,
                  background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.3)',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 6 }}>
                    Pending · EUR equivalent
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    €{balance.totals_eur.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  padding: '16px 18px', borderRadius: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6 }}>
                    Total · EUR equivalent
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    €{balance.totals_eur.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Per-currency rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {balance.by_currency
                  .filter(r => balanceFilter === 'all' || r.currency === balanceFilter)
                  .map(r => (
                  <div key={r.currency} style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 16, alignItems: 'center',
                    padding: '12px 16px', borderRadius: 12,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }}>
                    <span style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'var(--green-bg)', color: 'var(--green)',
                      border: '1px solid rgba(52,211,153,0.3)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
                    }}>{r.currency}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        Available {r.currency} {r.available_major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 2 }}>
                        Pending {r.currency} {r.pending_major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>≈</span>
                    <span style={{
                      fontSize: 16, fontWeight: 800, color: 'var(--t1)',
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.015em',
                    }}>€{r.eur_equivalent_available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
            <KPI label="Revenue · 30d" value={summary ? fmt(summary.revenue_30d) : '—'} accent="green"/>
            <KPI label="Refunds · 30d" value={summary ? fmt(summary.refunds_30d) : '—'} accent="amber"/>
            <KPI label="MRR estimate" value={summary ? fmt(summary.mrr_estimate) : '—'} accent="acc"/>
            <KPI label="Paying customers" value={summary?.paying_customers ?? '—'} accent="blue"/>
            {headlineNet && (
              <KPI
                label="Net · last month"
                value={fmt(headlineNet.value)}
                accent={headlineNet.value >= 0 ? 'green' : 'red'}
                trend={{ change: headlineNet.change, positive: headlineNet.change >= 0 }}
              />
            )}
          </div>

          <Section title="Monthly P&L" accent="green" description="Revenue, costs, and net profit per period.">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 280, padding: '8px 0' }}>
              {series.map(b => {
                const revH    = (b.revenue_usd / chartMax) * 240
                const costH   = (b.total_costs_usd / chartMax) * 240
                const netH    = (Math.abs(b.net_usd) / chartMax) * 240
                return (
                  <div key={b.period} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${b.period} · revenue ${fmt(b.revenue_usd)} · costs ${fmt(b.total_costs_usd)} · net ${fmt(b.net_usd)}`}>
                    <div style={{ display: 'flex', gap: 3, height: 250, alignItems: 'flex-end' }}>
                      <div style={{ width: 14, height: revH, background: 'var(--green)', borderRadius: '4px 4px 0 0' }} />
                      <div style={{ width: 14, height: costH, background: 'var(--red)', opacity: 0.7, borderRadius: '4px 4px 0 0' }} />
                      <div style={{ width: 14, height: netH, background: b.net_usd >= 0 ? 'var(--acc)' : 'var(--amber)', borderRadius: '4px 4px 0 0' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontVariantNumeric: 'tabular-nums' }}>{b.period.slice(5)}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--t3)', marginTop: 10 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--green)', borderRadius: 3 }}></span> Revenue</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--red)', opacity: 0.7, borderRadius: 3 }}></span> Costs</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--acc)', borderRadius: 3 }}></span> Net</span>
            </div>
          </Section>

          <Section flush title="Per-month detail">
            <div style={{ overflowX: 'auto' }}>
              <table className="table-root" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {['Period','Revenue','Stripe fees','Refunds','Infra','API','Other costs','Net'].map((h, i) => (
                      <th key={h} style={{
                        textAlign: i === 7 ? 'right' : 'left', padding: '14px 24px',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--t4)',
                        borderBottom: '1px solid var(--border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...series].reverse().map(b => (
                    <tr key={b.period} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 24px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13, color: 'var(--t1)' }}>{b.period}</td>
                      <td style={{ padding: '14px 24px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(b.revenue_usd)}</td>
                      <td style={{ padding: '14px 24px', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(b.stripe_fees_usd)}</td>
                      <td style={{ padding: '14px 24px', color: 'var(--amber)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(b.refunds_usd)}</td>
                      <td style={{ padding: '14px 24px', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(b.infra_usd)}</td>
                      <td style={{ padding: '14px 24px', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(b.api_costs_usd)}</td>
                      <td style={{ padding: '14px 24px', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(b.tooling_usd + b.marketing_usd + b.salaries_usd + b.other_costs_usd)}</td>
                      <td style={{ padding: '14px 24px', textAlign: 'right', color: b.net_usd >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmt(b.net_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {tab === 'costs' && (
        <>
          <Section title="Add a cost row" accent="amber" description="Log monthly infra / API / marketing spend so the P&L view can subtract them from revenue.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                <Field label="Category">
                  <select className="input" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as typeof CATEGORIES[number] })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Provider" required>
                  <input className="input" value={draft.provider} onChange={e => setDraft({ ...draft, provider: e.target.value })} placeholder="Cloudflare / Supabase / Stripe / OpenAI / …" />
                </Field>
                <Field label="Period (YYYY-MM)">
                  <input className="input" value={draft.period} onChange={e => setDraft({ ...draft, period: e.target.value })} placeholder="2026-05" />
                </Field>
                <Field label="Amount (USD)" required>
                  <input className="input" type="number" step="0.01" value={draft.amount_usd} onChange={e => setDraft({ ...draft, amount_usd: e.target.value })} />
                </Field>
              </div>
              <Field label="Notes (optional)">
                <input className="input" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
              <div>
                <button className="btn btn-primary btn-sm" disabled={!draft.provider || !draft.amount_usd || saving} onClick={saveCost}>
                  <Plus size={13}/> {saving ? 'Saving…' : 'Add cost'}
                </button>
              </div>
            </div>
          </Section>

          {costs.length === 0 ? (
            <EmptyState icon={<Wallet size={20}/>} title="No costs logged yet" description="Add monthly infrastructure / API / marketing spend so the P&L view can subtract them from revenue." />
          ) : (
            <Section flush title={`${costs.length} cost row${costs.length === 1 ? '' : 's'}`}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-root" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      {['Period','Category','Provider','Amount','Notes',''].map(h => (
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
                    {costs.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 24px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13, color: 'var(--t1)' }}>{r.period}</td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '4px 10px', borderRadius: 999,
                            background: 'var(--surface2)',
                            border: `1px solid ${CAT_COLOR[r.category]}33`,
                            color: CAT_COLOR[r.category],
                            fontSize: 11, fontWeight: 600,
                          }}>{r.category}</span>
                        </td>
                        <td style={{ padding: '14px 24px', color: 'var(--t2)', fontSize: 13 }}>{r.provider}</td>
                        <td style={{ padding: '14px 24px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--t1)', fontSize: 13 }}>${r.amount_usd.toFixed(2)}</td>
                        <td style={{ padding: '14px 24px', color: 'var(--t4)', fontSize: 12 }}>{r.notes || ''}</td>
                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }} onClick={() => delCost(r.id)}>
                            <Trash2 size={12}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
