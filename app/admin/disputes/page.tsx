'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/disputes — Stripe chargeback / dispute viewer.
 * Source of truth is the Stripe dashboard; this is the local mirror
 * so we can answer "open disputes by user" without leaving the admin.
 */
import { useEffect, useState } from 'react'
import { AlertOctagon, RefreshCw, ExternalLink } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; created_at: string; stripe_id: string; user_id: string | null;
  charge_id: string | null; amount_cents: number; currency: string;
  reason: string | null; status: string; evidence_due_by: string | null;
  updated_at: string
}

export default function DisputesPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus]   = useState('')

  const load = async () => {
    setLoading(true)
    const qs = new URLSearchParams(); if (status) qs.set('status', status)
    const res = await fetch(`/api/admin/disputes?${qs}`, { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <HeroCard accent="red" icon={<AlertOctagon size={28}/>} eyebrow="Finance"
        title="Disputes"
        subtitle="Chargebacks and inquiries mirrored from Stripe. Evidence submission still happens in the Stripe dashboard."
        metric={{ label: 'Open', value: rows.filter(r => r.status.includes('needs_response') || r.status === 'under_review').length.toString() }}/>

      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {['','needs_response','warning_needs_response','under_review','won','lost','warning_closed'].map(s => (
          <button key={s || 'all'} onClick={()=>setStatus(s)} style={{
            padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
            fontSize:11.5, fontWeight:600,
            background: status === s ? 'var(--bg3)' : 'var(--surface)',
            borderColor:'var(--border)', color: status === s ? 'var(--t1)' : 'var(--t3)',
          }}>{s || 'all'}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft:'auto', minHeight:32 }} onClick={load}><RefreshCw size={13}/></button>
      </div>

      <Section accent="red" title="Disputes" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:180, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<AlertOctagon size={20}/>} title="No disputes" description="Either there are none in this filter, or the Stripe webhook isn't writing dispute rows yet. Hook charge.dispute.* events into your webhook handler."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => {
              const overdue = r.evidence_due_by && new Date(r.evidence_due_by) < new Date() && r.status.includes('needs_response')
              return (
                <div key={r.id} className="card-premium" style={{ padding:'12px 16px',
                  borderColor: overdue ? 'rgba(248,113,113,0.4)' : 'var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:240 }}>
                      <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>
                        ${(r.amount_cents/100).toLocaleString(undefined,{minimumFractionDigits:2})} {r.currency.toUpperCase()}
                        <span style={{ marginLeft:8, fontSize:11, color:'var(--t4)', fontWeight:500, fontFamily:'monospace' }}>{r.stripe_id}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--t3)', marginTop:3 }}>{r.reason || '—'}</div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:4, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        {r.user_id && <><span>·</span><a href={`/admin/users/${r.user_id}`} style={{ color:'var(--blue)', fontFamily:'monospace' }}>{r.user_id.slice(0,8)}…</a></>}
                        {r.evidence_due_by && <><span>·</span><span style={{ color: overdue ? 'var(--red)' : 'var(--t4)' }}>evidence due {new Date(r.evidence_due_by).toLocaleDateString()}</span></>}
                      </div>
                    </div>
                    <span style={{ padding:'4px 10px', borderRadius:999, fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                      background:'var(--bg3)', color: r.status === 'won' ? 'var(--green-val)' : r.status === 'lost' ? 'var(--red)' : 'var(--amber)' }}>{r.status}</span>
                    <a href={`https://dashboard.stripe.com/disputes/${r.stripe_id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>
                      Stripe <ExternalLink size={10}/>
                    </a>
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
