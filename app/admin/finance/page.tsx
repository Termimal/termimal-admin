'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { PageHeader, Section, Tabs, EmptyState, Field } from '@/components/admin/PageChrome'

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

export default function FinancePage() {
  const [series, setSeries]     = useState<Bucket[]>([])
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [costs, setCosts]       = useState<Cost[]>([])
  const [tab, setTab]           = useState<'overview' | 'costs'>('overview')
  const [months, setMonths]     = useState(6)
  const [loading, setLoading]   = useState(true)
  const [draft, setDraft]       = useState({ category: 'infrastructure' as typeof CATEGORIES[number], provider: '', period: thisPeriod(), amount_usd: '', notes: '' })
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, c] = await Promise.all([
      fetch(`/api/admin/finance?months=${months}`,    { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/admin/finance/costs',                { cache: 'no-store' }).then(r => r.json()),
    ])
    setSeries(s.series ?? []); setSummary(s.summary ?? null); setCosts(c.rows ?? [])
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

  // Chart bounds.
  const chartMax = Math.max(1, ...series.map(b => Math.max(b.revenue_usd, b.total_costs_usd)))
  const chartMin = Math.min(0, ...series.map(b => b.net_usd))

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Wallet size={14} />}
        eyebrow="Finance"
        title="P&L overview"
        description="Revenue, Stripe fees, infrastructure, API costs — net P&L per month. Costs other than Stripe fees come from the manual ledger you maintain on the Costs tab."
        accent="green"
        actions={
          <>
            <select className="select" value={months} onChange={e => setMonths(Number(e.target.value))} style={{ width: 110 }}>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
            <button className="btn-secondary btn-sm" onClick={load} disabled={loading}><RefreshCw size={11} /> Refresh</button>
          </>
        }
      />

      <Tabs
        items={[{ key: 'overview', label: 'Overview' }, { key: 'costs', label: 'Cost ledger', count: costs.length || undefined }]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        accent="green"
      />

      {tab === 'overview' && (
        <>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
            <div className="kpi-card kpi-green">
              <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Revenue · 30d</div>
              <div className="kpi-value">{summary ? fmt(summary.revenue_30d) : '—'}</div>
            </div>
            <div className="kpi-card kpi-amber">
              <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Refunds · 30d</div>
              <div className="kpi-value">{summary ? fmt(summary.refunds_30d) : '—'}</div>
            </div>
            <div className="kpi-card kpi-acc">
              <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>MRR estimate</div>
              <div className="kpi-value">{summary ? fmt(summary.mrr_estimate) : '—'}</div>
            </div>
            <div className="kpi-card kpi-blue">
              <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Paying customers</div>
              <div className="kpi-value">{summary?.paying_customers ?? '—'}</div>
            </div>
            {headlineNet && (
              <div className={`kpi-card ${headlineNet.value >= 0 ? 'kpi-green' : 'kpi-red'}`}>
                <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Net · last month</div>
                <div className="kpi-value">{fmt(headlineNet.value)}</div>
                <div style={{ fontSize: 11, color: headlineNet.change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {headlineNet.change > 0 ? <TrendingUp size={11} /> : headlineNet.change < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                  {headlineNet.change >= 0 ? '+' : ''}{fmt(headlineNet.change)}
                </div>
              </div>
            )}
          </div>

          {/* Bar chart */}
          <Section title="Monthly P&L" accent="green">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 260, padding: '8px 0' }}>
              {series.map(b => {
                const revH    = (b.revenue_usd / chartMax) * 220
                const costH   = (b.total_costs_usd / chartMax) * 220
                const netH    = (Math.abs(b.net_usd) / chartMax) * 220
                return (
                  <div key={b.period} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${b.period} · revenue ${fmt(b.revenue_usd)} · costs ${fmt(b.total_costs_usd)} · net ${fmt(b.net_usd)}`}>
                    <div style={{ display: 'flex', gap: 2, height: 230, alignItems: 'flex-end' }}>
                      <div style={{ width: 14, height: revH, background: 'var(--green)', borderRadius: '3px 3px 0 0' }} />
                      <div style={{ width: 14, height: costH, background: 'var(--red)', opacity: 0.6, borderRadius: '3px 3px 0 0' }} />
                      <div style={{ width: 14, height: netH, background: b.net_usd >= 0 ? 'var(--acc)' : 'var(--amber)', borderRadius: '3px 3px 0 0' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{b.period.slice(5)}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--green)', verticalAlign: 'middle', marginRight: 4 }}></span> Revenue</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--red)', opacity: 0.6, verticalAlign: 'middle', marginRight: 4 }}></span> Costs</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--acc)', verticalAlign: 'middle', marginRight: 4 }}></span> Net</span>
            </div>
          </Section>

          <Section flush title="Per-month detail">
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table-root">
                <thead><tr>
                  <th>Period</th><th>Revenue</th><th>Stripe fees</th><th>Refunds</th>
                  <th>Infra</th><th>API</th><th>Other costs</th><th style={{ textAlign: 'right' }}>Net</th>
                </tr></thead>
                <tbody>
                  {[...series].reverse().map(b => (
                    <tr key={b.period}>
                      <td style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{b.period}</td>
                      <td style={{ color: 'var(--green)' }}>{fmt(b.revenue_usd)}</td>
                      <td style={{ color: 'var(--t3)' }}>{fmt(b.stripe_fees_usd)}</td>
                      <td style={{ color: 'var(--amber)' }}>{fmt(b.refunds_usd)}</td>
                      <td style={{ color: 'var(--t3)' }}>{fmt(b.infra_usd)}</td>
                      <td style={{ color: 'var(--t3)' }}>{fmt(b.api_costs_usd)}</td>
                      <td style={{ color: 'var(--t3)' }}>{fmt(b.tooling_usd + b.marketing_usd + b.salaries_usd + b.other_costs_usd)}</td>
                      <td style={{ textAlign: 'right', color: b.net_usd >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fmt(b.net_usd)}</td>
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
          <Section title="Add a cost row" accent="amber">
            <div className="form-grid">
              <div className="form-grid form-grid-2">
                <Field label="Category">
                  <select className="select" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as typeof CATEGORIES[number] })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Provider">
                  <input className="input" value={draft.provider} onChange={e => setDraft({ ...draft, provider: e.target.value })} placeholder="Cloudflare / Supabase / Stripe / OpenAI / …" />
                </Field>
              </div>
              <div className="form-grid form-grid-2">
                <Field label="Period (YYYY-MM)">
                  <input className="input" value={draft.period} onChange={e => setDraft({ ...draft, period: e.target.value })} placeholder="2026-05" />
                </Field>
                <Field label="Amount (USD)">
                  <input className="input" type="number" step="0.01" value={draft.amount_usd} onChange={e => setDraft({ ...draft, amount_usd: e.target.value })} />
                </Field>
              </div>
              <Field label="Notes (optional)">
                <input className="input" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
              <button className="btn-primary btn-sm" disabled={!draft.provider || !draft.amount_usd || saving} onClick={saveCost} style={{ alignSelf: 'flex-start' }}>
                <Plus size={11} /> {saving ? 'Saving…' : 'Add cost'}
              </button>
            </div>
          </Section>

          {costs.length === 0 ? (
            <EmptyState icon={<Wallet size={20} />} title="No costs logged yet" description="Add monthly infrastructure / API / marketing spend so the P&L view can subtract them from revenue." />
          ) : (
            <Section flush title={`${costs.length} cost row${costs.length === 1 ? '' : 's'}`}>
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table-root">
                  <thead><tr><th>Period</th><th>Category</th><th>Provider</th><th>Amount</th><th>Notes</th><th></th></tr></thead>
                  <tbody>
                    {costs.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{r.period}</td>
                        <td><span className="chip" style={{ color: CAT_COLOR[r.category], borderColor: `${CAT_COLOR[r.category]}33` }}>{r.category}</span></td>
                        <td>{r.provider}</td>
                        <td style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>${r.amount_usd.toFixed(2)}</td>
                        <td style={{ color: 'var(--t4)', fontSize: 11 }}>{r.notes || ''}</td>
                        <td><button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => delCost(r.id)}><Trash2 size={11} /></button></td>
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
