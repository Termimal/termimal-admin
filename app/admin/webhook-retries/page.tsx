'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/webhook-retries — failed inbound webhooks.
 * Reprocess or mark dead. Source webhook handlers should write failures
 * here when an event can't be processed (DB down, etc.).
 */
import { useEffect, useState } from 'react'
import { Webhook, RotateCcw, Skull, RefreshCw } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row { id: string; created_at: string; source: string; event_id: string | null; event_type: string | null; last_error: string | null; attempt_count: number; status: string }

export default function WebhookRetriesPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus]   = useState('queued')

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/webhook-retries?status=${status}`, { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id: string, action: string) => {
    if (action === 'mark_dead' && !confirm('Mark this webhook DEAD? Will not be retried.')) return
    await fetch('/api/admin/webhook-retries', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, action }) })
    load()
  }

  return (
    <div>
      <HeroCard accent="amber" icon={<Webhook size={28}/>} eyebrow="Operations"
        title="Webhook retries"
        subtitle="Failed inbound webhooks waiting for re-processing. Retry pushes them back into the queue; mark dead when you've handled it manually."
        metric={{ label: 'In queue', value: rows.filter(r => r.status === 'queued' || r.status === 'processing').length.toString() }}/>

      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {['queued','processing','done','dead'].map(s => (
          <button key={s} onClick={()=>setStatus(s)} style={{
            padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
            fontSize:12, fontWeight:600, textTransform:'capitalize',
            background: status === s ? 'var(--bg3)' : 'var(--surface)',
            borderColor:'var(--border)', color: status === s ? 'var(--t1)' : 'var(--t3)',
          }}>{s}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft:'auto', minHeight:32 }} onClick={load}><RefreshCw size={13}/></button>
      </div>

      <Section accent="amber" title="Retries" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<Webhook size={20}/>} title={`No ${status} webhooks`}/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:240 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>
                    <span style={{ fontFamily:'monospace' }}>{r.source}</span>
                    {r.event_type && <span style={{ marginLeft:8, color:'var(--t3)' }}>{r.event_type}</span>}
                    {r.event_id && <span style={{ marginLeft:8, fontSize:11, color:'var(--t4)', fontFamily:'monospace' }}>{r.event_id}</span>}
                  </div>
                  {r.last_error && <div style={{ fontSize:11, color:'var(--red)', marginTop:3, maxWidth:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.last_error}</div>}
                  <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10 }}>
                    <span>attempts: {r.attempt_count}</span>
                    <span>·</span><span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {r.status !== 'done' && r.status !== 'dead' && (
                  <button className="btn btn-secondary btn-sm" style={{ fontSize:11 }} onClick={()=>act(r.id, 'retry')}><RotateCcw size={11}/> Retry</button>
                )}
                {r.status !== 'dead' && (
                  <button className="btn btn-secondary btn-sm" style={{ fontSize:11, color:'var(--red)' }} onClick={()=>act(r.id, 'mark_dead')}><Skull size={11}/> Dead</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
