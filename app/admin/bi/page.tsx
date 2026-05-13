'use client'
export const dynamic = 'force-dynamic'

/**
 * Business Intelligence — the "what's the business doing" dashboard.
 *
 * Pulls every aggregate metric we care about in one fetch (see
 * /api/admin/bi/route.ts) and renders it as a Tableau-style grid:
 *   - 4 hero KPIs (MRR, ARR, paying, churn-30d)
 *   - signups-per-day spark + bar chart
 *   - plan distribution donut
 *   - top countries bar list
 *   - revenue by currency table (filterable + CSV export)
 *   - referral source breakdown
 *   - cohort retention table
 *
 * No chart library — every visualization is hand-rolled SVG to
 * keep the bundle tiny and the design consistent. Tableau's edge
 * is interactivity; ours is integration (everything is one auth
 * scope away, exportable, themed).
 */

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, RefreshCw, Download, Calendar, Users, TrendingUp,
  Globe, Repeat, ArrowDown, DollarSign, Sparkles, AlertTriangle, Layers,
} from 'lucide-react'
import { HeroCard, Section } from '@/components/admin/PageChrome'

interface BiResponse {
  ok: boolean
  range: { since: string; days: number }
  signups_by_day: Array<{ day: string; count: number }>
  plan_counts: Record<string, number>
  country_counts: Array<{ country: string; count: number }>
  mrr_eur: number
  arr_eur: number
  churned_30d: number
  revenue_by_currency: Array<{ currency: string; gross: number; net: number; count: number }>
  referrals_by_source: Array<{ source: string; count: number; converted: number }>
  cohorts: Array<{ month: string; signups: number; active_now: number }>
  paying_count: number
  total_signups: number
}

const PLAN_COLOR: Record<string, string> = {
  premium: 'var(--purple)',
  pro:     'var(--acc)',
  starter: 'var(--blue)',
  free:    'var(--t4)',
}

// ──────────────────────────────────────────────────────────────
//   Component
// ──────────────────────────────────────────────────────────────

export default function BiPage() {
  const [data, setData]     = useState<BiResponse | null>(null)
  const [loading, setLoad]  = useState(true)
  const [days, setDays]     = useState(90)
  const [err, setErr]       = useState('')
  const [currencyFilter, setCurrencyFilter] = useState<string>('all')

  const load = async () => {
    setLoad(true); setErr('')
    try {
      const res = await fetch(`/api/admin/bi?days=${days}`, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setData(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load BI data')
    } finally {
      setLoad(false)
    }
  }
  useEffect(() => { load() }, [days])  // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = (rows: Record<string, unknown>[], filename: string) => {
    if (rows.length === 0) return
    const cols = Object.keys(rows[0])
    const csv = [
      cols.join(','),
      ...rows.map(r => cols.map(c => {
        const v = r[c]
        if (v === null || v === undefined) return ''
        const s = String(v)
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const currencies = useMemo(() => ['all', ...(data?.revenue_by_currency.map(r => r.currency) || [])], [data])
  const filteredRevenue = useMemo(() => {
    if (!data) return []
    if (currencyFilter === 'all') return data.revenue_by_currency
    return data.revenue_by_currency.filter(r => r.currency === currencyFilter)
  }, [data, currencyFilter])

  const totalEurEquivalent = useMemo(() => {
    // Naive aggregation — assume EUR for non-EUR rows we'd need
    // an FX table. Until we wire ECB rates, sum gross as-is and
    // flag the assumption in the UI. Stripe also provides settled
    // amounts in our payout currency on /v1/balance — TODO.
    if (!data) return 0
    return data.revenue_by_currency.reduce((s, r) => s + (r.currency === 'EUR' ? r.gross : r.gross), 0)
  }, [data])

  if (loading && !data) {
    return (
      <div>
        <HeroCard
          accent="blue"
          icon={<BarChart3 size={28} />}
          eyebrow="Analytics"
          title="Business Intelligence"
          subtitle="Loading every metric in one shot — give it a moment."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    )
  }

  if (err && !data) {
    return (
      <div>
        <HeroCard accent="red" icon={<AlertTriangle size={28} />} eyebrow="Error" title="BI failed to load" subtitle={err} />
        <button className="btn btn-primary btn-sm" onClick={load}><RefreshCw size={13} /> Retry</button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<BarChart3 size={28} />}
        eyebrow="Analytics"
        title="Business Intelligence"
        subtitle={`Aggregated across the last ${data.range.days} days. Switch range below — every panel re-aggregates server-side.`}
        metric={{
          label: 'MRR',
          value: `€${Math.round(data.mrr_eur).toLocaleString()}`,
          secondary: `ARR €${Math.round(data.arr_eur).toLocaleString()} · ${data.paying_count} paying`,
        }}
      />

      {/* Range + refresh + export-all */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)', marginRight: 4 }}>Range</span>
          {[7, 30, 90, 180, 365].map(d => {
            const on = days === d
            return (
              <button key={d} onClick={() => setDays(d)} style={{
                padding: '6px 12px', borderRadius: 999, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: on ? 'var(--blue-bg)' : 'var(--surface)',
                borderColor: on ? 'rgba(96,165,250,0.4)' : 'var(--border)',
                color: on ? 'var(--blue)' : 'var(--t3)',
              }}>{d}d</button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" style={{ minHeight: 36 }} onClick={() => exportCsv(
            [
              { metric: 'MRR (EUR)',    value: data.mrr_eur },
              { metric: 'ARR (EUR)',    value: data.arr_eur },
              { metric: 'Paying users', value: data.paying_count },
              { metric: 'Total signups (range)', value: data.total_signups },
              { metric: 'Churned 30d',  value: data.churned_30d },
            ],
            `termimal-bi-summary-${new Date().toISOString().slice(0,10)}.csv`,
          )}>
            <Download size={13} /> Summary CSV
          </button>
          <button className="btn btn-secondary btn-sm" style={{ minHeight: 36 }} onClick={load} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* 4 hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <Kpi icon={<TrendingUp size={20} />} accent="acc"    label="MRR (EUR)"      value={`€${Math.round(data.mrr_eur).toLocaleString()}`} sub={`ARR €${Math.round(data.arr_eur).toLocaleString()}`} />
        <Kpi icon={<Users size={20} />}      accent="blue"   label="Paying users"   value={data.paying_count.toLocaleString()}              sub={`${data.total_signups.toLocaleString()} new in range`} />
        <Kpi icon={<ArrowDown size={20} />}  accent="red"    label="Churn (30d)"    value={data.churned_30d.toLocaleString()}               sub="cancelled subs" />
        <Kpi icon={<Sparkles size={20} />}   accent="purple" label="Premium share"  value={`${Math.round(((data.plan_counts['premium'] || 0) / Math.max(data.total_signups, 1)) * 100)}%`} sub={`${data.plan_counts['premium'] || 0} on Premium`} />
      </div>

      {/* Signups bar chart */}
      <Section
        accent="blue"
        title="Signups per day"
        description={`${data.signups_by_day.length} days of data — bar height is the count for that day.`}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => exportCsv(data.signups_by_day, `signups-${days}d.csv`)}>
            <Download size={12}/> CSV
          </button>
        }
      >
        <Sparkline data={data.signups_by_day.map(d => d.count)} labels={data.signups_by_day.map(d => d.day)} />
      </Section>

      {/* Plan distribution + Top countries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 20 }}>
        <Section accent="purple" title="Plan distribution" description="Across new signups in this range.">
          <PlanDonut counts={data.plan_counts} />
        </Section>
        <Section accent="green" title="Top countries" description="Where new signups come from."
          actions={
            <button className="btn btn-secondary btn-sm" onClick={() => exportCsv(data.country_counts, `countries-${days}d.csv`)}>
              <Download size={12}/> CSV
            </button>
          }
        >
          <CountryBars rows={data.country_counts} />
        </Section>
      </div>

      {/* Revenue by currency — filterable + CSV */}
      <Section
        accent="acc"
        title="Revenue by currency"
        description={`Invoiced revenue, grouped by Stripe charge currency. Total ≈ €${Math.round(totalEurEquivalent).toLocaleString()} (raw sum — proper FX conversion comes from the Stripe Balance API, TODO).`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)} className="input" style={{ minHeight: 34, padding: '4px 12px', fontSize: 12 }}>
              {currencies.map(c => <option key={c} value={c}>{c === 'all' ? 'All currencies' : c}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCsv(filteredRevenue, `revenue-by-currency-${days}d.csv`)}>
              <Download size={12}/> CSV
            </button>
          </div>
        }
      >
        {filteredRevenue.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
            No invoice rows for this range. (Are we mirroring Stripe invoices into the `invoices` table? See /api/stripe/webhook.)
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredRevenue.map(r => (
              <div key={r.currency} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 16, alignItems: 'center',
                padding: '14px 18px', borderRadius: 12,
                background: 'var(--surface)', border: '1px solid var(--border)',
              }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--acc-bg)', border: '1px solid var(--acc-border)',
                  color: 'var(--acc)', fontWeight: 800, letterSpacing: '0.04em',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>{r.currency}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>{r.count.toLocaleString()} invoices</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>net of Stripe fees: {r.currency} {r.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>gross</span>
                <span style={{
                  fontSize: 18, fontWeight: 800, color: 'var(--t1)',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.015em',
                }}>{r.currency} {r.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 10.5 }}
                  onClick={() => exportCsv([r], `revenue-${r.currency}.csv`)}>
                  <Download size={11}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Referrals + Cohorts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <Section accent="amber" title="Referral sources"
          actions={data.referrals_by_source.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => exportCsv(data.referrals_by_source, 'referrals.csv')}><Download size={12}/> CSV</button>
          )}
        >
          {data.referrals_by_source.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
              No referrals tracked yet — wire the `referrals` table or the Tolt/Rewardful webhook.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.referrals_by_source.sort((a, b) => b.count - a.count).map(r => {
                const rate = r.count > 0 ? Math.round((r.converted / r.count) * 100) : 0
                return (
                  <div key={r.source} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{r.source}</span>
                    <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>{r.converted}/{r.count}</span>
                    <span style={{ color: rate >= 10 ? 'var(--green)' : 'var(--t3)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{rate}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section accent="purple" title="Cohort retention" description="Signups by month vs still-active now."
          actions={data.cohorts.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => exportCsv(data.cohorts, 'cohorts.csv')}><Download size={12}/> CSV</button>
          )}
        >
          {data.cohorts.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>No cohort data yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.cohorts.map(c => {
                const retention = c.signups > 0 ? Math.round((c.active_now / c.signups) * 100) : 0
                return (
                  <div key={c.month} style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 12, alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--t2)', fontFamily: 'ui-monospace,monospace' }}>{c.month}</span>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--bg2)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${retention}%`,
                        background: `linear-gradient(90deg, var(--purple) 0%, var(--acc) 100%)`,
                      }} />
                    </div>
                    <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{c.active_now}/{c.signups}</span>
                    <span style={{ color: retention >= 30 ? 'var(--green)' : 'var(--t3)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{retention}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//   Sub-components
// ──────────────────────────────────────────────────────────────

function Kpi({ icon, accent, label, value, sub }: { icon: React.ReactNode; accent: 'acc' | 'blue' | 'red' | 'purple' | 'amber' | 'green'; label: string; value: string; sub?: string }) {
  const c = `var(--${accent})`
  return (
    <div className="card-premium" style={{ padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 14, borderColor: c + '33' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `var(--${accent}-bg)`, border: `1px solid ${c}55`, color: c,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Sparkline({ data, labels }: { data: number[]; labels: string[] }) {
  if (data.length === 0) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>No data.</div>
  const max = Math.max(...data, 1)
  const W = 100
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, padding: '8px 0' }}>
      {data.map((v, i) => {
        const h = (v / max) * 100
        return (
          <div key={i} title={`${labels[i]}: ${v}`} style={{
            flex: '1 1 0', minWidth: 4, height: '100%',
            display: 'flex', alignItems: 'flex-end',
          }}>
            <div style={{
              width: '100%', height: `${h}%`,
              borderRadius: 4,
              background: `linear-gradient(180deg, var(--blue) 0%, color-mix(in srgb, var(--blue) 30%, transparent) 100%)`,
              transition: 'all 200ms',
              minHeight: v > 0 ? 4 : 0,
            }} />
          </div>
        )
      })}
    </div>
  )
}

function PlanDonut({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1
  const order = ['premium', 'pro', 'starter', 'free']
  let acc = 0
  const radius = 70
  const cx = 100, cy = 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg viewBox="0 0 200 200" width={180} height={180} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--bg2)" strokeWidth={28} />
        {order.map(plan => {
          const v = counts[plan] || 0
          if (v === 0) return null
          const portion = v / total
          const dash = portion * 2 * Math.PI * radius
          const gap  = 2 * Math.PI * radius - dash
          const offset = -acc * 2 * Math.PI * radius
          acc += portion
          return (
            <circle
              key={plan}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={PLAN_COLOR[plan]}
              strokeWidth={28}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', fill: 'var(--t4)', textTransform: 'uppercase' }}>signups</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
        {order.map(p => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: PLAN_COLOR[p], flexShrink: 0 }} />
            <span style={{ color: 'var(--t2)', textTransform: 'capitalize', flex: 1 }}>{p}</span>
            <span style={{ color: 'var(--t1)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{counts[p] || 0}</span>
            <span style={{ color: 'var(--t4)', fontSize: 11, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
              {Math.round(((counts[p] || 0) / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountryBars({ rows }: { rows: Array<{ country: string; count: number }> }) {
  if (rows.length === 0) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>No country data yet.</div>
  const max = Math.max(...rows.map(r => r.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(r => (
        <div key={r.country} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: 10, alignItems: 'center' }}>
          <span style={{ color: 'var(--t3)', fontSize: 12, fontFamily: 'ui-monospace,monospace' }}>{r.country}</span>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--bg2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(r.count / max) * 100}%`, background: 'var(--green)' }} />
          </div>
          <span style={{ color: 'var(--t1)', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{r.count}</span>
        </div>
      ))}
    </div>
  )
}
