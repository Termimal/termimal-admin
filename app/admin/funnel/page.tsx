'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/funnel — conversion funnel from signup to retained customer.
 *
 * Four-step visual:
 *   Signup → Activated → Paid → Retained 30d
 *
 * The width of each bar = users at that step.
 * The conversion % under each step = users / users at previous step.
 *
 * Window defaults to last 30 days; the picker on top lets you scope
 * down to any range (e.g. compare last week vs same week prior).
 *
 * Where each step's count comes from:
 *   - Signup     → profiles.created_at in window
 *   - Activated  → has at least one login_events row OR onboarding done
 *   - Paid       → subscription_status in (active|trialing|past_due)
 *   - Retained   → still active, current_period_end > now, signed >30d ago
 */

import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Users, RefreshCw, Calendar, ArrowDown, Repeat } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Step {
  step:        string
  step_order:  number
  users:       number
  conversion:  number
}

interface RetentionRow {
  cohort_month:   string
  month_offset:   number
  cohort_size:    number
  retained:       number
  retention_pct:  number
}

function fmtPct(n: number): string {
  if (!isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const PRESETS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
  { label: 'YTD', days: -1 }, // special
]

const STEP_COLORS: Record<number, { fg: string; bg: string }> = {
  1: { fg: 'var(--blue)',     bg: 'rgba(56,139,253,0.18)' },
  2: { fg: '#a78bfa',         bg: 'rgba(167,139,250,0.18)' },
  3: { fg: 'var(--acc)',      bg: 'rgba(45,212,164,0.20)' },
  4: { fg: 'var(--green-val)', bg: 'rgba(63,185,80,0.20)' },
}

export default function FunnelPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return isoDate(d)
  })
  const [to, setTo]     = useState(() => isoDate(new Date()))
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [retentionMonths, setRetentionMonths] = useState(6)
  const [retentionRows, setRetentionRows]     = useState<RetentionRow[]>([])
  const [retentionLoad,  setRetentionLoad]    = useState(true)
  const [retentionErr,   setRetentionErr]     = useState('')

  const setPreset = (days: number) => {
    const toD = new Date()
    let fromD: Date
    if (days === -1) {
      fromD = new Date(toD.getFullYear(), 0, 1)
    } else {
      fromD = new Date(toD.getTime() - days * 24 * 60 * 60 * 1000)
    }
    setFrom(isoDate(fromD))
    setTo(isoDate(toD))
  }

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const qs = new URLSearchParams()
      qs.set('from', new Date(from + 'T00:00:00Z').toISOString())
      qs.set('to',   new Date(to   + 'T23:59:59Z').toISOString())
      const res = await fetch(`/api/admin/funnel?${qs}`, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setSteps((j.steps || []).sort((a: Step, b: Step) => a.step_order - b.step_order))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cohort retention — independent of funnel window; uses signup-month
  // bucketing so we always see the last N months of cohorts.
  const loadRetention = async () => {
    setRetentionLoad(true); setRetentionErr('')
    try {
      const r = await fetch(`/api/admin/analytics-extras?view=retention&months=${retentionMonths}`, { cache: 'no-store' })
      const j = await r.json() as { rows?: RetentionRow[]; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRetentionRows(j.rows || [])
    } catch (e) {
      setRetentionErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setRetentionLoad(false)
    }
  }
  useEffect(() => { loadRetention() }, [retentionMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  const top = useMemo(() => steps.find(s => s.step_order === 1)?.users || 0, [steps])

  const headline = useMemo(() => {
    const paid = steps.find(s => s.step_order === 3)
    if (!paid || !top) return { label: 'Signup → Paid', value: '—' }
    return {
      label: 'Signup → Paid',
      value: fmtPct(paid.users / top),
    }
  }, [steps, top])

  return (
    <div>
      <HeroCard
        accent="green"
        icon={<TrendingUp size={28}/>}
        eyebrow="Revenue"
        title="Conversion funnel"
        subtitle="Where do signups actually become paying customers? Track drop-off from each step over any window. Use this to pick which onboarding stage to A/B next."
        metric={{
          label: headline.label,
          value: headline.value,
          secondary: `${top.toLocaleString()} signups in window`,
        }}
      />

      {/* Window controls */}
      <div className="card-premium" style={{ padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <Calendar size={14} color="var(--t4)"/>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setPreset(p.days)} className="btn btn-secondary btn-sm" style={{ fontSize:11, minHeight:30 }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ height:20, width:1, background:'var(--border)' }}/>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
          <span style={{ color:'var(--t4)' }}>From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" style={{ height:30, padding:'0 10px', fontSize:12 }} />
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
          <span style={{ color:'var(--t4)' }}>To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" style={{ height:30, padding:'0 10px', fontSize:12 }} />
        </label>
        <button className="btn btn-primary btn-sm" onClick={load} disabled={loading} style={{ marginLeft:'auto', minHeight:34 }}>
          <RefreshCw size={13}/> Run
        </button>
      </div>

      <Section accent="green" title="Funnel" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${steps.length} steps`}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }} />
            ))}
          </div>
        ) : err ? (
          <EmptyState
            icon={<Users size={20}/>}
            title="Couldn't load funnel"
            description={err}
          />
        ) : top === 0 ? (
          <EmptyState
            icon={<Users size={20}/>}
            title="No signups in this window"
            description="Try widening the date range. The funnel needs at least one signup row to compute anything."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {steps.map((s, idx) => {
              const c = STEP_COLORS[s.step_order] || STEP_COLORS[1]
              const widthPct = top > 0 ? Math.max((s.users / top) * 100, 4) : 0
              const isLast = idx === steps.length - 1
              return (
                <div key={s.step_order}>
                  <div className="card-premium" style={{ padding:'16px 20px', borderColor: c.fg + '40' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:14, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{
                          width:30, height:30, borderRadius:10,
                          background:c.bg, color:c.fg,
                          border:`1px solid ${c.fg}55`,
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:800,
                        }}>{s.step_order}</span>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>{s.step}</div>
                          <div style={{ fontSize:11, color:'var(--t4)', marginTop:2 }}>
                            {s.step_order === 1
                              ? 'Profiles created in this window'
                              : `${fmtPct(s.conversion)} from previous step`}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:22, fontWeight:800, color:'var(--t1)', lineHeight:1 }}>{s.users.toLocaleString()}</div>
                        <div style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.05em', marginTop:4 }}>users</div>
                      </div>
                    </div>
                    {/* Funnel bar */}
                    <div style={{ height:14, borderRadius:7, background:'var(--bg)', overflow:'hidden', border:'1px solid var(--border)' }}>
                      <div style={{
                        height:'100%',
                        width:`${widthPct}%`,
                        background:`linear-gradient(90deg, ${c.fg} 0%, ${c.fg}aa 100%)`,
                        transition:'width 600ms cubic-bezier(0.16,1,0.3,1)',
                      }}/>
                    </div>
                  </div>
                  {!isLast && (
                    <div style={{ display:'flex', justifyContent:'center', padding:'6px 0', color:'var(--t4)' }}>
                      <ArrowDown size={16}/>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <CohortRetentionSection
        rows={retentionRows}
        loading={retentionLoad}
        err={retentionErr}
        months={retentionMonths}
        onMonths={setRetentionMonths}
        onRefresh={loadRetention}
      />
    </div>
  )
}

/**
 * CohortRetentionSection
 *
 * Heatmap: rows are signup months, columns are M0..MN (months since
 * signup). Cell shade encodes retention_pct (0 → red-amber-green ramp).
 * Cohort sizes shown alongside so a single small cohort doesn't get
 * mistaken for a trend.
 *
 * Summary cards on top: average M1 and M3 retention across all
 * cohorts that have data at those offsets, weighted by cohort_size.
 */
function CohortRetentionSection({
  rows, loading, err, months, onMonths, onRefresh,
}: {
  rows: RetentionRow[]; loading: boolean; err: string;
  months: number; onMonths: (n: number) => void; onRefresh: () => void
}) {
  const byMonth = useMemo(() => {
    const m = new Map<string, RetentionRow[]>()
    for (const r of rows) {
      if (!m.has(r.cohort_month)) m.set(r.cohort_month, [])
      m.get(r.cohort_month)!.push(r)
    }
    return m
  }, [rows])

  const cohorts = useMemo(() => {
    return [...byMonth.entries()]
      .map(([month, points]) => ({
        month,
        size: points[0]?.cohort_size || 0,
        byOffset: new Map(points.map(p => [p.month_offset, p])),
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }, [byMonth])

  const maxOffset = useMemo(() => {
    let m = 0
    for (const r of rows) if (r.month_offset > m) m = r.month_offset
    return Math.max(m, 6)
  }, [rows])
  const offsets = useMemo(() => Array.from({ length: maxOffset + 1 }, (_, i) => i), [maxOffset])

  // Weighted averages at M1 / M3 across all cohorts that *could* have
  // reached that offset. A cohort that signed up last week can't have
  // a real M3 reading yet, so we skip them in the denominator.
  const weighted = useMemo(() => {
    const sum = (offset: number) => {
      let retained = 0
      let total    = 0
      for (const c of cohorts) {
        const row = c.byOffset.get(offset)
        if (!row) continue
        retained += row.retained
        total    += c.size
      }
      return total === 0 ? null : (retained / total) * 100
    }
    return { m1: sum(1), m3: sum(3), m6: sum(6) }
  }, [cohorts])

  // Color ramp: 0% → muted red; 50% → amber; ≥80% → green.
  const cellTone = (pct: number) => {
    if (pct <= 0) return { bg: 'transparent', fg: 'var(--t4)' }
    if (pct < 25)  return { bg: 'rgba(248,113,113,0.18)', fg: 'var(--red)' }
    if (pct < 50)  return { bg: 'rgba(245,158,11,0.18)', fg: 'var(--amber)' }
    if (pct < 75)  return { bg: 'rgba(56,139,253,0.18)', fg: 'var(--blue)' }
    return            { bg: 'rgba(45,212,164,0.22)', fg: 'var(--acc)' }
  }

  return (
    <Section
      accent="purple"
      title="Cohort retention"
      description="Each row is a signup month. Each column is months since signup. Brighter green = stickier cohort. Read down each column to see whether retention is improving for newer cohorts."
    >
      {/* Toolbar — month-range picker + refresh */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <Repeat size={13} color="var(--t4)"/>
        {[3, 6, 9, 12].map(n => (
          <button key={n} onClick={() => onMonths(n)} className="btn btn-secondary btn-sm" style={{
            fontSize:11, minHeight:28,
            background: months === n ? 'rgba(167,139,250,0.16)' : undefined,
            color:      months === n ? '#a78bfa' : undefined,
            borderColor:months === n ? 'rgba(167,139,250,0.4)' : undefined,
          }}>{n}m</button>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={loading} style={{ marginLeft:'auto', minHeight:30 }}>
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      {/* Summary trio */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',
        gap:10, marginBottom:16,
      }}>
        {[
          { label: 'M1 retention', value: weighted.m1 },
          { label: 'M3 retention', value: weighted.m3 },
          { label: 'M6 retention', value: weighted.m6 },
        ].map(card => {
          const v = card.value
          const tone = v === null ? cellTone(0) : cellTone(v)
          return (
            <div key={card.label} className="card-premium" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700 }}>{card.label}</div>
              <div style={{ marginTop:6, fontSize:24, fontWeight:800, color: v === null ? 'var(--t4)' : tone.fg, lineHeight:1 }}>
                {v === null ? '—' : `${v.toFixed(1)}%`}
              </div>
              <div style={{ marginTop:4, fontSize:11, color:'var(--t4)' }}>weighted across cohorts</div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height:260, borderRadius:14 }}/>
      ) : err ? (
        <EmptyState icon={<Repeat size={20}/>} title="Couldn't load cohorts" description={err}/>
      ) : cohorts.length === 0 ? (
        <EmptyState
          icon={<Repeat size={20}/>}
          title="No cohort data yet"
          description="Need at least one signup and a few login_events rows. The RPC keys retention off login_events.created_at, so the dashboard has to be receiving sign-ins for this chart to populate."
        />
      ) : (
        <div style={{ overflowX:'auto', borderRadius:14, border:'1px solid var(--border)' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0, fontSize:12 }}>
            <thead>
              <tr style={{ background:'var(--bg3)' }}>
                <th style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.05em', fontSize:10.5, position:'sticky', left:0, background:'var(--bg3)', zIndex:1 }}>Cohort</th>
                <th style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.05em', fontSize:10.5 }}>Size</th>
                {offsets.map(i => (
                  <th key={i} style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.05em', fontSize:10.5, minWidth:54 }}>M{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.month} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px 14px', fontWeight:700, color:'var(--t1)', position:'sticky', left:0, background:'var(--bg2)', zIndex:1, borderTop:'1px solid var(--border)' }}>
                    {new Date(c.month).toLocaleDateString(undefined, { month:'short', year:'numeric' })}
                  </td>
                  <td style={{ padding:'10px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--t2)', fontFamily:'ui-monospace, Menlo, Consolas, monospace' }}>
                    {c.size.toLocaleString()}
                  </td>
                  {offsets.map(i => {
                    const row = c.byOffset.get(i)
                    if (!row) {
                      return <td key={i} style={{ padding:'10px 12px', textAlign:'center', color:'var(--t5,#404040)' }}>·</td>
                    }
                    const tone = cellTone(row.retention_pct)
                    return (
                      <td key={i} title={`${row.retained} of ${row.cohort_size} retained`} style={{
                        padding:'10px 12px', textAlign:'center',
                        background: tone.bg, color: tone.fg,
                        fontVariantNumeric:'tabular-nums', fontWeight:600,
                        borderLeft:'1px solid var(--bg)',
                      }}>
                        {row.retention_pct}%
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}
