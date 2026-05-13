'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/customer-health — composite health score (0-100).
 * Sort low→high to spot churn risk before users cancel.
 * Recompute is slow (full table scan) — run once a day or after
 * material changes.
 */
import { useEffect, useState } from 'react'
import { HeartPulse, RefreshCw, Sparkles } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Profile { email: string; full_name: string | null; plan: string; subscription_status: string }
interface Row { user_id: string; score: number; band: string; signals: Record<string, number>; reasons: string[]; updated_at: string; profiles: Profile | Profile[] }

function pickProfile(p: Row['profiles']): Profile {
  return Array.isArray(p) ? p[0] : p
}

const BAND_TINT: Record<string, { fg: string; bg: string }> = {
  red:    { fg: 'var(--red)',      bg: 'rgba(248,113,113,0.14)' },
  yellow: { fg: 'var(--amber)',    bg: 'rgba(210,153,34,0.14)' },
  green:  { fg: 'var(--green-val)',bg: 'rgba(63,185,80,0.14)' },
}

export default function HealthPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [band, setBand]       = useState('')
  const [recomputing, setRec] = useState(false)

  const load = async () => {
    setLoading(true)
    const qs = new URLSearchParams(); if (band) qs.set('band', band)
    const res = await fetch(`/api/admin/customer-health?${qs}`, { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [band]) // eslint-disable-line react-hooks/exhaustive-deps

  const recompute = async () => {
    setRec(true)
    const res = await fetch('/api/admin/customer-health', { method:'POST' })
    const j = await res.json()
    setRec(false)
    if (!res.ok) alert(j.error || 'failed')
    else { alert(`Recomputed: ${j.total} users · ${j.red} red · ${j.yellow} yellow · ${j.green} green`); load() }
  }

  return (
    <div>
      <HeroCard accent="red" icon={<HeartPulse size={28}/>} eyebrow="Retention"
        title="Customer health"
        subtitle="0–100 composite of login recency, onboarding completion, plan, support burden, billing. Sort low→high to spot churn risk weeks before it shows up in MRR."
        metric={{ label: 'Visible', value: rows.length.toString() }}/>

      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {['','red','yellow','green'].map(b => (
          <button key={b || 'all'} onClick={()=>setBand(b)} style={{
            padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
            fontSize:12, fontWeight:600, textTransform:'capitalize',
            background: band === b ? (BAND_TINT[b]?.bg || 'var(--bg3)') : 'var(--surface)',
            borderColor:'var(--border)', color: band === b ? (BAND_TINT[b]?.fg || 'var(--t1)') : 'var(--t3)',
          }}>{b || 'all'}</button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft:'auto', minHeight:32 }} onClick={recompute} disabled={recomputing}>
          <Sparkles size={13}/> {recomputing ? 'Recomputing…' : 'Recompute all'}
        </button>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:32 }} onClick={load}><RefreshCw size={13}/></button>
      </div>

      <Section accent="red" title="Users by health" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:200, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<HeartPulse size={20}/>} title="No health snapshots" description="Click 'Recompute all' to compute the first snapshot. Takes ~30s for 10k users."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {rows.map(r => {
              const p = pickProfile(r.profiles)
              const t = BAND_TINT[r.band]
              return (
                <div key={r.user_id} className="card-premium" style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <span style={{ width:42, height:42, borderRadius:11, display:'inline-flex', alignItems:'center', justifyContent:'center',
                    background: t.bg, color: t.fg, border:`1px solid ${t.fg}55`, fontSize:14, fontWeight:800 }}>
                    {r.score}
                  </span>
                  <div style={{ flex:1, minWidth:240 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{p?.full_name || p?.email}</div>
                    <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'monospace' }}>{p?.email}</span>
                      <span>·</span><span>plan: {p?.plan}</span>
                      <span>·</span><span>{p?.subscription_status}</span>
                    </div>
                    {r.reasons.length > 0 && (
                      <div style={{ fontSize:11, color: t.fg, marginTop:4 }}>
                        ⚠ {r.reasons.join(' · ')}
                      </div>
                    )}
                  </div>
                  <a href={`/admin/users/${r.user_id}`} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>View user</a>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
