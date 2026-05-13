'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/broadcasts — segmented announcement composer + log.
 *
 * Compose a message, choose channels (notification, email), optionally
 * restrict to a segment (plan, signup days, status, country).
 * Send-now button fans out one notification per user (and one email
 * per user if email channel is on).
 */
import { useEffect, useState } from 'react'
import { Megaphone, Send, RefreshCw } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; created_at: string; title: string; body: string; channels: string[];
  segment: Record<string, unknown>; status: string; sent_at: string | null; sent_to_count: number | null
}

export default function BroadcastsPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft]     = useState({
    title: '', body: '', channels: ['notification'] as string[],
    plan: '', status: '', min_days: '', country: ''
  })

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/broadcasts', { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const buildSegment = () => {
    const s: Record<string, unknown> = {}
    if (draft.plan)     s.plan    = draft.plan.split(',').map(x=>x.trim()).filter(Boolean)
    if (draft.status)   s.status  = draft.status.split(',').map(x=>x.trim()).filter(Boolean)
    if (draft.country)  s.country = draft.country.split(',').map(x=>x.trim()).filter(Boolean)
    if (draft.min_days) s.min_signup_days = parseInt(draft.min_days, 10)
    return s
  }
  const createDraft = async () => {
    if (!draft.title || !draft.body) { alert('title + body required'); return }
    await fetch('/api/admin/broadcasts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title: draft.title, body: draft.body, channels: draft.channels, segment: buildSegment() }),
    })
    setDraft({ title:'', body:'', channels:['notification'], plan:'', status:'', min_days:'', country:'' })
    load()
  }
  const send = async (id: string) => {
    if (!confirm('Send this broadcast now to every matching user?')) return
    const res = await fetch('/api/admin/broadcasts', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, action:'send' }) })
    const j = await res.json()
    if (!res.ok) alert(j.error || 'failed')
    else alert(`Sent to ${j.sent_to_count} users.`)
    load()
  }
  const toggleChannel = (ch: string) => setDraft(d => ({ ...d, channels: d.channels.includes(ch) ? d.channels.filter(c=>c!==ch) : [...d.channels, ch] }))

  return (
    <div>
      <HeroCard accent="acc" icon={<Megaphone size={28}/>} eyebrow="Communications"
        title="Broadcasts"
        subtitle="Send a notification (and optionally an email) to a segment. Use sparingly — overuse trains users to ignore notifications."
        metric={{ label: 'Drafts', value: rows.filter(r => r.status === 'draft').length.toString(), secondary: `${rows.filter(r => r.status === 'sent').length} sent` }}/>

      <Section accent="acc" title="Compose" description="Title + body. Segment is optional — empty matches all users.">
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <input className="input" placeholder="title" value={draft.title} onChange={e=>setDraft(d=>({...d, title:e.target.value}))}/>
          <textarea className="input" placeholder="body" rows={4} value={draft.body} onChange={e=>setDraft(d=>({...d, body:e.target.value}))}/>
          <div style={{ display:'flex', gap:6, fontSize:12, alignItems:'center' }}>
            <span style={{ color:'var(--t4)' }}>channels:</span>
            {['notification','email'].map(ch => (
              <label key={ch} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                <input type="checkbox" checked={draft.channels.includes(ch)} onChange={()=>toggleChannel(ch)}/> {ch}
              </label>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
            <input className="input" placeholder="plan filter (csv)" value={draft.plan} onChange={e=>setDraft(d=>({...d, plan:e.target.value}))}/>
            <input className="input" placeholder="status filter (csv)" value={draft.status} onChange={e=>setDraft(d=>({...d, status:e.target.value}))}/>
            <input className="input" placeholder="country filter (csv)" value={draft.country} onChange={e=>setDraft(d=>({...d, country:e.target.value}))}/>
            <input className="input" placeholder="min signup days" type="number" value={draft.min_days} onChange={e=>setDraft(d=>({...d, min_days:e.target.value}))}/>
          </div>
          <button className="btn btn-primary btn-sm" onClick={createDraft} style={{ alignSelf:'flex-start' }}>Save draft</button>
        </div>
      </Section>

      <Section accent="acc" title="Broadcasts" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<Megaphone size={20}/>} title="No broadcasts yet"/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:240 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{r.title}</div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:3, maxWidth:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.body}</div>
                  <div style={{ fontSize:11, color:'var(--t4)', marginTop:4, display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span>{r.channels.join(' + ')}</span>
                    <span>·</span><span>{new Date(r.created_at).toLocaleString()}</span>
                    {r.sent_at && <><span>·</span><span style={{ color:'var(--green-val)' }}>sent to {r.sent_to_count}</span></>}
                  </div>
                </div>
                <span style={{ padding:'4px 10px', borderRadius:999, fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                  background:'var(--bg3)', color: r.status === 'sent' ? 'var(--green-val)' : 'var(--t3)' }}>{r.status}</span>
                {r.status === 'draft' && (
                  <button className="btn btn-primary btn-sm" style={{ fontSize:11 }} onClick={()=>send(r.id)}><Send size={11}/> Send now</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
