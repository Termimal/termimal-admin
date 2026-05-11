'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/consent — append-only consent ledger viewer.
 * Read-only. Each row is a single grant/revoke event. Filter by
 * user_id, category, or granted=true/false.
 */
import { useEffect, useState } from 'react'
import { Check, X as XIcon, RefreshCw, FileCheck2, Search } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; created_at: string; user_id: string | null;
  anon_id: string | null; category: string; scope: string | null;
  granted: boolean; ip: string | null; user_agent: string | null; source: string | null
}

export default function ConsentPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [cat, setCat]         = useState('')
  const [granted, setGranted] = useState('')

  const load = async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (q)       qs.set('user_id', q)
    if (cat)     qs.set('category', cat)
    if (granted) qs.set('granted', granted)
    const res = await fetch(`/api/admin/consent?${qs}`, { cache: 'no-store' })
    const j = await res.json()
    setRows(j.rows || [])
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <HeroCard accent="acc" icon={<FileCheck2 size={28}/>} eyebrow="Privacy"
        title="Consent ledger"
        subtitle="Append-only record of every cookie / marketing opt-in event. Source of truth for GDPR Art. 7 'consent was freely given'."
        metric={{ label: 'Rows', value: rows.length.toString() }}/>

      <div className="card-premium" style={{ padding:'12px 16px', marginBottom:18, display:'grid', gridTemplateColumns:'1fr 200px 160px auto', gap:8, alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <Search size={13} color="var(--t4)" style={{ position:'absolute', top:'50%', left:11, transform:'translateY(-50%)' }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="user_id" className="input" style={{ paddingLeft:30 }} onKeyDown={e=>{if(e.key==='Enter')load()}}/>
        </div>
        <input value={cat} onChange={e=>setCat(e.target.value)} placeholder="category e.g. cookies.analytics" className="input" onKeyDown={e=>{if(e.key==='Enter')load()}}/>
        <select value={granted} onChange={e=>setGranted(e.target.value)} className="input">
          <option value="">all</option>
          <option value="true">granted</option>
          <option value="false">revoked</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}><RefreshCw size={13}/> Apply</button>
      </div>

      <Section accent="acc" title="Events" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:200, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<FileCheck2 size={20}/>} title="No consent rows" description="Either nothing recorded in this filter, or the cookie banner hasn't been wired to write rows yet."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span style={{
                  width:26, height:26, borderRadius:8,
                  background: r.granted ? 'rgba(63,185,80,0.14)' : 'rgba(248,113,113,0.14)',
                  color: r.granted ? 'var(--green-val)' : 'var(--red)',
                  border: `1px solid ${r.granted ? 'rgba(63,185,80,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}>{r.granted ? <Check size={13}/> : <XIcon size={13}/>}</span>
                <div style={{ flex:1, minWidth:200, fontSize:12.5, color:'var(--t2)' }}>
                  <strong style={{ color:'var(--t1)', fontFamily:'monospace' }}>{r.category}</strong>
                  {r.scope && <span style={{ marginLeft:8, color:'var(--t4)' }}>({r.scope})</span>}
                </div>
                <span style={{ fontSize:11, color:'var(--t4)', fontFamily:'monospace' }}>{r.user_id?.slice(0,8) ?? r.anon_id?.slice(0,12) ?? '—'}</span>
                <span style={{ fontSize:11, color:'var(--t4)' }}>{r.source || '—'}</span>
                <span style={{ fontSize:11, color:'var(--t4)' }}>{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
