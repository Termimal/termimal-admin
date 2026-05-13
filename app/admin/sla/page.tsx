'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/sla — first-response + resolution time by priority bucket.
 * Targets: 1h response (any priority), 24h resolve.
 */
import { useEffect, useState } from 'react'
import { Timer, RefreshCw, AlertTriangle } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  bucket: string; ticket_count: number;
  avg_response_min: number; p50_response_min: number; p95_response_min: number;
  avg_resolve_hours: number; p50_resolve_hours: number; p95_resolve_hours: number;
  unanswered: number; breach_response: number; breach_resolve: number
}

export default function SlaPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/sla?days=${days}`, { cache:'no-store' })
    const j = await r.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [days])

  const totalUnanswered = rows.reduce((s,r) => s + r.unanswered, 0)
  const totalBreachR = rows.reduce((s,r) => s + r.breach_response, 0)
  const totalBreachF = rows.reduce((s,r) => s + r.breach_resolve, 0)

  return (
    <div>
      <HeroCard accent="amber" icon={<Timer size={28}/>} eyebrow="Support"
        title="SLA"
        subtitle="Default targets: ≤1h first response, ≤24h resolution. Per-priority p50/p95 and breach counts over the chosen window."
        metric={{ label: 'Unanswered open', value: totalUnanswered.toString(), secondary: `${totalBreachR}+${totalBreachF} breaches` }}/>

      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {[7,14,30,90].map(d => (
          <button key={d} onClick={()=>setDays(d)} style={{
            padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
            fontSize:12, fontWeight:600,
            background: days === d ? 'rgba(210,153,34,0.14)' : 'var(--surface)',
            borderColor: days === d ? 'rgba(210,153,34,0.4)' : 'var(--border)',
            color: days === d ? 'var(--amber)' : 'var(--t3)',
          }}>{d}d</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft:'auto', minHeight:32 }} onClick={load}><RefreshCw size={13}/></button>
      </div>

      <Section accent="amber" title="By priority" description={loading ? 'Loading…' : `${rows.length} buckets`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<Timer size={20}/>} title="No tickets in window"/>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'var(--bg3)', textAlign:'left' }}>
              <th style={{ padding:'10px 12px' }}>Priority</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>Tickets</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>Avg resp (min)</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>p50 / p95 resp</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>Avg resolve (h)</th>
              <th style={{ padding:'10px 12px', textAlign:'right' }}>p50 / p95 resolve</th>
              <th style={{ padding:'10px 12px' }}>Breach (1h / 24h)</th>
              <th style={{ padding:'10px 12px' }}>Unanswered</th>
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.bucket} style={{ borderTop:'1px solid var(--border)' }}>
                <td style={{ padding:'10px 12px', fontWeight:700, textTransform:'capitalize' }}>{r.bucket}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace' }}>{r.ticket_count}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace' }}>{r.avg_response_min}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace', color:'var(--t3)' }}>{r.p50_response_min} / {r.p95_response_min}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace' }}>{r.avg_resolve_hours}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace', color:'var(--t3)' }}>{r.p50_resolve_hours} / {r.p95_resolve_hours}</td>
                <td style={{ padding:'10px 12px', color: r.breach_response + r.breach_resolve > 0 ? 'var(--red)' : 'var(--t3)' }}>
                  {r.breach_response > 0 && <span><AlertTriangle size={10} style={{ verticalAlign:'middle' }}/> {r.breach_response} / </span>}
                  {r.breach_resolve}
                </td>
                <td style={{ padding:'10px 12px', color: r.unanswered > 0 ? 'var(--amber)' : 'var(--t3)' }}>{r.unanswered}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Section>
    </div>
  )
}
