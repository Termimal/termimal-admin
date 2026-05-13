'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/approvals — 4-eyes queue.
 * High-risk actions land here as proposals. A DIFFERENT admin approves
 * or rejects. Approved proposals must then be executed by the proposer
 * (or anyone) via the matching action endpoint. Never self-approve.
 */
import { useEffect, useState } from 'react'
import { Users2, Check, X, RefreshCw, Clock } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; created_at: string; proposer_id: string; action: string;
  target_kind: string | null; target_id: string | null; payload: Record<string, unknown>;
  reason: string; expires_at: string; status: string;
  approver_id: string | null; approved_at: string | null;
}

const STATUS_TINT: Record<string, string> = {
  pending: 'var(--amber)', approved: 'var(--blue)', rejected: 'var(--red)',
  expired: 'var(--t4)', executed: 'var(--green-val)', failed: 'var(--red)',
}

export default function ApprovalsPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('pending')

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/approvals?status=${filter}`, { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    const res = await fetch('/api/admin/approvals', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, decision }),
    })
    if (!res.ok) alert((await res.json()).error || 'failed')
    load()
  }

  return (
    <div>
      <HeroCard accent="amber" icon={<Users2 size={28}/>} eyebrow="Security"
        title="Approval queue"
        subtitle="Two-person rule for high-risk actions. Never self-approve. Proposals expire after 24h by default."
        metric={{ label: 'Pending', value: rows.filter(r => r.status === 'pending').length.toString() }}/>

      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {['pending','approved','rejected','executed','expired'].map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{
            padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
            fontSize:12, fontWeight:600, textTransform:'capitalize',
            background: filter === s ? 'var(--bg3)' : 'var(--surface)',
            borderColor: 'var(--border)',
            color: filter === s ? 'var(--t1)' : 'var(--t3)',
          }}>{s}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft:'auto', minHeight:32 }} onClick={load}><RefreshCw size={13}/></button>
      </div>

      <Section accent="amber" title="Proposals" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<Users2 size={20}/>} title={`No ${filter} proposals`} description="When a high-risk action triggers, it lands here for a second admin to approve."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => {
              const expired = new Date(r.expires_at) < new Date() && r.status === 'pending'
              return (
                <div key={r.id} className="card-premium" style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:260 }}>
                      <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>
                        <span style={{ fontFamily:'monospace' }}>{r.action}</span>
                        {r.target_kind && <span style={{ marginLeft:8, fontSize:11, color:'var(--t4)', fontWeight:500 }}>{r.target_kind}: {r.target_id?.slice(0,8)}…</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--t3)', marginTop:3 }}>{r.reason}</div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:6, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'monospace' }}>proposer: {r.proposer_id.slice(0,8)}…</span>
                        <span>·</span><span>{new Date(r.created_at).toLocaleString()}</span>
                        <span>·</span><span style={{ display:'inline-flex', alignItems:'center', gap:4, color: expired ? 'var(--red)' : 'var(--t4)' }}><Clock size={10}/> exp {new Date(r.expires_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <span style={{ padding:'4px 10px', borderRadius:999, fontSize:10.5, fontWeight:700,
                      textTransform:'uppercase', letterSpacing:'0.05em',
                      background: 'var(--bg3)', color: STATUS_TINT[r.status] || 'var(--t3)' }}>{r.status}</span>
                    {r.status === 'pending' && !expired && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-primary btn-sm" style={{ fontSize:11 }} onClick={() => decide(r.id, 'approve')}><Check size={11}/> Approve</button>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize:11, color:'var(--red)' }} onClick={() => decide(r.id, 'reject')}><X size={11}/> Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
