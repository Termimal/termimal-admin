'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/analytics-extras — four small analytics dashboards in one page:
 *   1. Cohort retention curves (by signup month, month_offset)
 *   2. Top features by usage
 *   3. Geographic revenue (signups vs paying users by country)
 *   4. Channel-split funnel (organic vs referral)
 *
 * Each tab fetches from /api/admin/analytics-extras?view=…
 */
import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw, Globe2, Users, Sparkles, Repeat } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

type View = 'retention' | 'feature-usage' | 'geo' | 'channel-funnel'

interface RetentionRow { cohort_month: string; month_offset: number; cohort_size: number; retained: number; retention_pct: number }
interface FeatureRow   { feature_key: string; surface: string; hits: number; unique_users: number }
interface GeoRow       { country: string; paying_users: number; signups: number }
interface ChannelRow   { channel: string; signups: number; activated: number; paid: number }

export default function AnalyticsExtrasPage() {
  const [view, setView] = useState<View>('retention')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<unknown[]>([])

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/analytics-extras?view=${view}`, { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: Array<{ id: View; label: string; icon: React.ReactNode }> = [
    { id: 'retention',      label: 'Cohort retention', icon: <Repeat size={13}/> },
    { id: 'feature-usage',  label: 'Feature usage',    icon: <Sparkles size={13}/> },
    { id: 'geo',            label: 'Geo revenue',      icon: <Globe2 size={13}/> },
    { id: 'channel-funnel', label: 'Channel funnel',   icon: <Users size={13}/> },
  ]

  return (
    <div>
      <HeroCard accent="purple" icon={<BarChart3 size={28}/>} eyebrow="Analytics depth"
        title="Cohort, feature, geo, channel"
        subtitle="Four lenses on growth. Switch tabs to compare retention by signup month, which features actually get used, where revenue concentrates geographically, and how organic vs referral funnels stack up."
        metric={{ label: 'View', value: view }}/>

      <div style={{ display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setView(t.id)} style={{
            padding:'8px 14px', borderRadius:999, border:'1px solid', cursor:'pointer',
            fontSize:12.5, fontWeight:600,
            background: view === t.id ? 'rgba(167,139,250,0.14)' : 'var(--surface)',
            borderColor: view === t.id ? 'rgba(167,139,250,0.4)' : 'var(--border)',
            color: view === t.id ? '#a78bfa' : 'var(--t3)',
            display:'inline-flex', alignItems:'center', gap:6,
          }}>{t.icon} {t.label}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft:'auto', minHeight:32 }} onClick={load}><RefreshCw size={13}/></button>
      </div>

      {loading ? <div className="skeleton" style={{ height:300, borderRadius:14 }}/>
       : view === 'retention'     ? <RetentionView rows={rows as RetentionRow[]}/>
       : view === 'feature-usage' ? <FeatureView rows={rows as FeatureRow[]}/>
       : view === 'geo'           ? <GeoView rows={rows as GeoRow[]}/>
       :                            <ChannelView rows={rows as ChannelRow[]}/>}
    </div>
  )
}

function RetentionView({ rows }: { rows: RetentionRow[] }) {
  // Group by cohort_month
  const byMonth = new Map<string, RetentionRow[]>()
  for (const r of rows) {
    const k = r.cohort_month
    if (!byMonth.has(k)) byMonth.set(k, [])
    byMonth.get(k)!.push(r)
  }
  if (byMonth.size === 0) return <EmptyState icon={<Repeat size={20}/>} title="No cohort data" description="Need at least a few months of profiles + login_events to compute."/>
  return (
    <Section accent="purple" title="Retention by signup cohort" description={`${byMonth.size} cohorts`}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead><tr style={{ background:'var(--bg3)', textAlign:'left' }}>
          <th style={{ padding:'8px 12px' }}>Cohort</th><th style={{ padding:'8px 12px' }}>Size</th>
          {[0,1,2,3,4,5,6].map(i => <th key={i} style={{ padding:'8px 12px', textAlign:'center' }}>M{i}</th>)}
        </tr></thead>
        <tbody>{[...byMonth.entries()].map(([month, points]) => {
          const size = points[0]?.cohort_size || 0
          const byOffset = new Map(points.map(p => [p.month_offset, p]))
          return (
            <tr key={month} style={{ borderTop:'1px solid var(--border)' }}>
              <td style={{ padding:'8px 12px', fontWeight:600 }}>{new Date(month).toLocaleDateString(undefined,{month:'short', year:'numeric'})}</td>
              <td style={{ padding:'8px 12px', fontFamily:'monospace' }}>{size}</td>
              {[0,1,2,3,4,5,6].map(i => {
                const v = byOffset.get(i)?.retention_pct ?? 0
                const intensity = Math.min(100, Math.max(0, v))/100
                return <td key={i} style={{ padding:'8px 12px', textAlign:'center', background:`rgba(167,139,250,${intensity*0.4})`, fontFamily:'monospace' }}>
                  {v ? `${v}%` : '—'}
                </td>
              })}
            </tr>
          )
        })}</tbody>
      </table>
    </Section>
  )
}

function FeatureView({ rows }: { rows: FeatureRow[] }) {
  if (!rows.length) return <EmptyState icon={<Sparkles size={20}/>} title="No feature events" description="Wire feature_events inserts on the dashboard or terminal client to start collecting."/>
  const max = Math.max(...rows.map(r => r.hits)) || 1
  return (
    <Section accent="purple" title="Top features (last 30d)" description={`${rows.length} feature keys`}>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {rows.slice(0, 30).map(r => (
          <div key={`${r.feature_key}-${r.surface}`} className="card-premium" style={{ padding:'10px 14px' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:240 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', fontFamily:'monospace' }}>{r.feature_key} <span style={{ fontSize:11, color:'var(--t4)' }}>· {r.surface}</span></div>
                <div style={{ marginTop:4, height:6, borderRadius:3, background:'var(--bg)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(r.hits/max)*100}%`, background:'#a78bfa', transition:'width 400ms' }}/>
                </div>
              </div>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:'var(--t1)' }}>{r.hits.toLocaleString()}</span>
              <span style={{ fontSize:11, color:'var(--t4)' }}>{r.unique_users} users</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function GeoView({ rows }: { rows: GeoRow[] }) {
  if (!rows.length) return <EmptyState icon={<Globe2 size={20}/>} title="No revenue by country" description="Make sure profiles.country is populated on signup."/>
  return (
    <Section accent="purple" title="Signups + paying users by country (last 90d)" description={`${rows.length} countries`}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead><tr style={{ background:'var(--bg3)', textAlign:'left' }}>
          <th style={{ padding:'8px 12px' }}>Country</th>
          <th style={{ padding:'8px 12px' }}>Paying</th>
          <th style={{ padding:'8px 12px' }}>Signups</th>
          <th style={{ padding:'8px 12px' }}>Paid %</th>
        </tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.country} style={{ borderTop:'1px solid var(--border)' }}>
            <td style={{ padding:'8px 12px', fontWeight:600 }}>{r.country}</td>
            <td style={{ padding:'8px 12px', fontFamily:'monospace', color:'var(--green-val)' }}>{r.paying_users}</td>
            <td style={{ padding:'8px 12px', fontFamily:'monospace' }}>{r.signups}</td>
            <td style={{ padding:'8px 12px', fontFamily:'monospace' }}>{r.signups ? Math.round((r.paying_users/r.signups)*100) : 0}%</td>
          </tr>
        ))}</tbody>
      </table>
    </Section>
  )
}

function ChannelView({ rows }: { rows: ChannelRow[] }) {
  if (!rows.length) return <EmptyState icon={<Users size={20}/>} title="No channel data" description="Need at least one signup in the window."/>
  return (
    <Section accent="purple" title="Funnel by channel (last 30d)">
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead><tr style={{ background:'var(--bg3)', textAlign:'left' }}>
          <th style={{ padding:'8px 12px' }}>Channel</th>
          <th style={{ padding:'8px 12px' }}>Signups</th>
          <th style={{ padding:'8px 12px' }}>Activated</th>
          <th style={{ padding:'8px 12px' }}>Paid</th>
          <th style={{ padding:'8px 12px' }}>Signup→Paid</th>
        </tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.channel} style={{ borderTop:'1px solid var(--border)' }}>
            <td style={{ padding:'8px 12px', fontWeight:600, textTransform:'capitalize' }}>{r.channel}</td>
            <td style={{ padding:'8px 12px', fontFamily:'monospace' }}>{r.signups}</td>
            <td style={{ padding:'8px 12px', fontFamily:'monospace' }}>{r.activated}</td>
            <td style={{ padding:'8px 12px', fontFamily:'monospace', color:'var(--green-val)' }}>{r.paid}</td>
            <td style={{ padding:'8px 12px', fontFamily:'monospace' }}>{r.signups ? Math.round((r.paid/r.signups)*100) : 0}%</td>
          </tr>
        ))}</tbody>
      </table>
    </Section>
  )
}
