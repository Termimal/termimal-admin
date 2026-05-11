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
import { TrendingUp, Users, RefreshCw, Calendar, ArrowDown } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Step {
  step:        string
  step_order:  number
  users:       number
  conversion:  number
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
    </div>
  )
}
