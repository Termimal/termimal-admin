'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/secrets — rotation tracker.
 * Never stores secret VALUES — only metadata. Overdue rows go red.
 * Click "Mark rotated" right after you actually rotate the key in
 * the upstream provider's dashboard.
 */
import { useEffect, useState } from 'react'
import { KeySquare, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; name: string; description: string | null; owner: string | null;
  rotation_days: number; last_rotated_at: string | null; notes: string | null;
  is_active: boolean; updated_at: string; overdue: boolean; due_at: string | null
}

export default function SecretsPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/secrets', { cache:'no-store' })
    const j = await res.json()
    setRows(j.rows || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const markRotated = async (id: string) => {
    const notes = prompt('Optional notes about the rotation:')
    await fetch('/api/admin/secrets', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, action:'rotated', notes: notes || undefined }),
    })
    load()
  }

  return (
    <div>
      <HeroCard accent="red" icon={<KeySquare size={28}/>} eyebrow="Security"
        title="Secrets rotation"
        subtitle="Track when each shared secret was last rotated. Values are NEVER stored here — purely metadata."
        metric={{ label: 'Overdue', value: rows.filter(r => r.overdue).length.toString(), secondary: `${rows.length} tracked` }}/>

      <Section accent="red" title="Tracked secrets" description={loading ? 'Loading…' : `${rows.length} entries`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<KeySquare size={20}/>} title="No tracked secrets"/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'12px 16px',
                display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
                borderColor: r.overdue ? 'rgba(248,113,113,0.4)' : 'var(--border)' }}>
                <span style={{ width:32, height:32, borderRadius:9, display:'inline-flex', alignItems:'center', justifyContent:'center',
                  background: r.overdue ? 'rgba(248,113,113,0.14)' : 'rgba(63,185,80,0.14)',
                  color: r.overdue ? 'var(--red)' : 'var(--green-val)',
                  border: `1px solid ${r.overdue ? 'rgba(248,113,113,0.3)' : 'rgba(63,185,80,0.3)'}` }}>
                  {r.overdue ? <AlertTriangle size={14}/> : <ShieldCheck size={14}/>}
                </span>
                <div style={{ flex:1, minWidth:240 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)', fontFamily:'monospace' }}>{r.name}</div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>{r.description || '—'}</div>
                  <div style={{ fontSize:11, color:'var(--t4)', marginTop:4, display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span>last rotated: {r.last_rotated_at ? new Date(r.last_rotated_at).toLocaleDateString() : <strong style={{ color:'var(--red)' }}>never</strong>}</span>
                    <span>·</span><span>every {r.rotation_days}d</span>
                    {r.due_at && <><span>·</span><span style={{ color: r.overdue ? 'var(--red)' : 'var(--t4)' }}>due {new Date(r.due_at).toLocaleDateString()}</span></>}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ fontSize:11 }} onClick={()=>markRotated(r.id)}>Mark rotated</button>
              </div>
            ))}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
