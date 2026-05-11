'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/plan-changes — every subscription state transition.
 *
 * Two views in one page:
 *   1. Monthly aggregates (12 months default) — upgrades / downgrades
 *      / cancellations / net MRR delta. Helps spot the month the
 *      retention pipe started leaking.
 *   2. Recent transitions list — last 100 rows with from→to, who did
 *      it (admin or Stripe webhook), and the MRR delta on that row.
 *
 * Rows are written by:
 *   - Stripe webhook handler (subscription.updated / .deleted)
 *   - Admin actions (refund / cancel / plan-change on /admin/users/[id])
 *   - User-initiated changes (Customer Portal, app-side flows)
 */

import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, XCircle, RefreshCw, ArrowRight,
  ArrowUpRight, ArrowDownRight, DollarSign, BarChart3, Filter, Bot,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface MonthRow {
  month:           string
  upgrades:        number
  downgrades:      number
  cancellations:   number
  new_paid:        number
  mrr_delta_cents: number
}
interface ChangeRow {
  id:              string
  created_at:      string
  user_id:         string
  actor_id:        string | null
  from_plan:       string | null
  to_plan:         string | null
  from_status:     string | null
  to_status:       string | null
  from_interval:   string | null
  to_interval:     string | null
  mrr_delta_cents: number | null
  reason:          string | null
  source:          string
  meta:            Record<string, unknown>
}

function fmtUSD(cents: number | null | undefined): string {
  const n = (cents ?? 0) / 100
  const sign = n >= 0 ? '+' : '−'
  const abs = Math.abs(n)
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtMonth(s: string): string {
  return new Date(s + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

const SOURCE_TINTS: Record<string, { fg: string; bg: string }> = {
  system:         { fg: 'var(--t3)',   bg: 'var(--bg3)' },
  admin:          { fg: 'var(--amber)', bg: 'rgba(210,153,34,0.12)' },
  self_service:   { fg: 'var(--blue)',  bg: 'rgba(56,139,253,0.12)' },
  stripe_webhook: { fg: 'var(--acc)',   bg: 'rgba(45,212,164,0.12)' },
}

export default function PlanChangesPage() {
  const [months, setMonths]   = useState(12)
  const [summary, setSummary] = useState<MonthRow[]>([])
  const [recent, setRecent]   = useState<ChangeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetch(`/api/admin/plan-changes?months=${months}`, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setSummary(j.summary || [])
      setRecent(j.recent  || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [months]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lifetime MRR impact = sum across all returned months.
  const totalDelta = useMemo(
    () => summary.reduce((sum, r) => sum + (r.mrr_delta_cents || 0), 0),
    [summary],
  )

  const maxBar = useMemo(() => {
    let m = 0
    for (const r of summary) {
      m = Math.max(m, r.upgrades, r.downgrades, r.cancellations, r.new_paid)
    }
    return m || 1
  }, [summary])

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<BarChart3 size={28}/>}
        eyebrow="Revenue depth"
        title="Plan changes"
        subtitle={`Every subscription transition over the last ${months} months. Upgrades grow MRR; cancellations sink it. Hover any row to see who triggered it (Stripe webhook, admin, or self-service).`}
        metric={{
          label: `MRR delta · ${months}m`,
          value: <span style={{ color: totalDelta >= 0 ? 'var(--green-val)' : 'var(--red)' }}>{fmtUSD(totalDelta)}</span>,
          secondary: `${recent.length} recent rows`,
        }}
      />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <Filter size={13} color="var(--t4)"/>
          {[3, 6, 12, 24].map(m => {
            const on = months === m
            return (
              <button key={m} onClick={() => setMonths(m)} style={{
                padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
                fontSize:12, fontWeight:600,
                background: on ? 'rgba(167,139,250,0.14)' : 'var(--surface)',
                borderColor: on ? 'rgba(167,139,250,0.4)' : 'var(--border)',
                color: on ? '#a78bfa' : 'var(--t3)',
              }}>{m}m</button>
            )
          })}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:36 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Monthly aggregates */}
      <Section accent="purple" title="Monthly aggregates" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${summary.length} months`}>
        {loading ? (
          <div className="skeleton" style={{ height:220, borderRadius:14 }} />
        ) : summary.length === 0 ? (
          <EmptyState
            icon={<BarChart3 size={20}/>}
            title="No plan changes yet"
            description="The plan_changes table is empty for this window. Once Stripe webhooks start writing or admins make changes, rows appear here."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{
              display:'grid', gridTemplateColumns:'120px 1fr 1fr 1fr 1fr 110px',
              gap:10, padding:'6px 14px', fontSize:10.5,
              color:'var(--t4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
            }}>
              <span>Month</span>
              <span>Upgrades</span>
              <span>Downgrades</span>
              <span>New paid</span>
              <span>Cancellations</span>
              <span style={{ textAlign:'right' }}>MRR Δ</span>
            </div>
            {summary.map(r => (
              <div key={r.month} style={{
                display:'grid', gridTemplateColumns:'120px 1fr 1fr 1fr 1fr 110px',
                gap:10, alignItems:'center', padding:'10px 14px',
                background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
              }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--t2)' }}>{fmtMonth(r.month)}</span>
                <MiniBar value={r.upgrades}      max={maxBar} color="var(--green-val)" />
                <MiniBar value={r.downgrades}    max={maxBar} color="var(--amber)" />
                <MiniBar value={r.new_paid}      max={maxBar} color="var(--blue)" />
                <MiniBar value={r.cancellations} max={maxBar} color="var(--red)" />
                <span style={{
                  textAlign:'right', fontSize:12.5, fontWeight:700, fontFamily:'monospace',
                  color: r.mrr_delta_cents >= 0 ? 'var(--green-val)' : 'var(--red)',
                }}>{fmtUSD(r.mrr_delta_cents)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent transitions */}
      <Section accent="acc" title="Recent transitions" description={loading ? 'Loading…' : `${recent.length} row${recent.length === 1 ? '' : 's'}`}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:64, borderRadius:14 }} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={20}/>}
            title="No transitions recorded"
            description="Stripe webhooks + admin actions both write here. Once any user upgrades, downgrades, or cancels you'll see rows in real time."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {recent.map(r => {
              const delta = r.mrr_delta_cents ?? 0
              const isCancel = r.to_status === 'canceled'
              const isUp     = delta > 0 && !isCancel
              const isDown   = delta < 0 && !isCancel
              const accent = isCancel ? 'var(--red)' : isUp ? 'var(--green-val)' : isDown ? 'var(--amber)' : 'var(--t3)'
              const Icon = isCancel ? XCircle : isUp ? TrendingUp : isDown ? TrendingDown : ArrowRight
              const Arrow = isUp ? ArrowUpRight : isDown ? ArrowDownRight : ArrowRight
              const tint = SOURCE_TINTS[r.source] || SOURCE_TINTS.system
              return (
                <div key={r.id} className="card-premium" style={{ padding:'12px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <span style={{
                    width:34, height:34, borderRadius:10,
                    background:'var(--bg3)', color:accent,
                    border:'1px solid var(--border)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>
                    <Icon size={15}/>
                  </span>
                  <div style={{ flex:1, minWidth:260 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'monospace', color:'var(--t3)' }}>{r.from_plan || '—'} / {r.from_status || '—'}</span>
                      <Arrow size={13} color={accent}/>
                      <span style={{ fontFamily:'monospace', color:'var(--t1)' }}>{r.to_plan || '—'} / {r.to_status || '—'}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                      <a href={`/admin/users/${r.user_id}`} style={{ color:'var(--blue)', fontFamily:'monospace' }}>{r.user_id.slice(0, 8)}…</a>
                      <span>·</span>
                      <span style={{
                        padding:'2px 8px', borderRadius:999,
                        background: tint.bg, color: tint.fg,
                        fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                        display:'inline-flex', alignItems:'center', gap:4,
                      }}>
                        {r.source === 'stripe_webhook' ? <DollarSign size={9}/> : r.source === 'admin' ? null : <Bot size={9}/>}
                        {r.source.replace('_', ' ')}
                      </span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      {r.reason && (
                        <>
                          <span>·</span>
                          <span style={{ fontStyle:'italic' }}>{r.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize:14, fontWeight:800, fontFamily:'monospace', flexShrink:0,
                    color: delta >= 0 ? 'var(--green-val)' : 'var(--red)',
                  }}>{fmtUSD(delta)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const widthPct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, borderRadius:3, background:'var(--bg)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${widthPct}%`, background:color, transition:'width 400ms cubic-bezier(0.16,1,0.3,1)' }}/>
      </div>
      <span style={{ fontSize:11.5, fontWeight:700, color:'var(--t2)', minWidth:32, textAlign:'right', fontFamily:'monospace' }}>{value}</span>
    </div>
  )
}
