'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/sub-processors — DPA registry for vendors that touch user data.
 * Public version of this list is published on the marketing site as
 * required by GDPR Art. 28 transparency. Edits here update both.
 */
import { useEffect, useState } from 'react'
import { Building2, RefreshCw, Trash2, Save, ExternalLink } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; name: string; purpose: string; data_processed: string;
  region: string | null; dpa_url: string | null; dpa_signed_at: string | null;
  dpa_expires_at: string | null; is_active: boolean; notes: string | null;
  updated_at: string
}

export default function SubProcPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft]     = useState<Partial<Row>>({ is_active: true })

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/sub-processors', { cache:'no-store' })
    const j = await res.json()
    setRows(j.rows || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!draft.name || !draft.purpose || !draft.data_processed) return
    const res = await fetch('/api/admin/sub-processors', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(draft),
    })
    if (res.ok) { setDraft({ is_active: true }); load() } else alert((await res.json()).error || 'failed')
  }
  const toggleActive = async (r: Row) => {
    await fetch('/api/admin/sub-processors', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: r.id, patch: { is_active: !r.is_active } }),
    })
    load()
  }
  const remove = async (id: string) => {
    if (!confirm('Delete this sub-processor entry?')) return
    await fetch(`/api/admin/sub-processors?id=${id}`, { method:'DELETE' })
    load()
  }

  return (
    <div>
      <HeroCard accent="blue" icon={<Building2 size={28}/>} eyebrow="Privacy"
        title="Sub-processors"
        subtitle="Vendors that process customer data on our behalf. Each needs a signed DPA. Public version of this list is published; users get 30-day notice on additions."
        metric={{ label: 'Active', value: rows.filter(r => r.is_active).length.toString(), secondary: `${rows.length} total` }}/>

      <Section accent="blue" title="Add sub-processor" description="Name + purpose + data_processed are required.">
        <div style={{ display:'grid', gridTemplateColumns:'180px 1fr 1fr 120px 120px auto', gap:8 }}>
          <input className="input" placeholder="name (e.g. Stripe)" value={draft.name || ''} onChange={e=>setDraft(d=>({...d, name:e.target.value}))}/>
          <input className="input" placeholder="purpose" value={draft.purpose || ''} onChange={e=>setDraft(d=>({...d, purpose:e.target.value}))}/>
          <input className="input" placeholder="data processed" value={draft.data_processed || ''} onChange={e=>setDraft(d=>({...d, data_processed:e.target.value}))}/>
          <input className="input" placeholder="region" value={draft.region || ''} onChange={e=>setDraft(d=>({...d, region:e.target.value}))}/>
          <input className="input" placeholder="DPA URL" value={draft.dpa_url || ''} onChange={e=>setDraft(d=>({...d, dpa_url:e.target.value}))}/>
          <button className="btn btn-primary btn-sm" onClick={add}><Save size={13}/> Add</button>
        </div>
      </Section>

      <Section accent="blue" title="List" description={loading ? 'Loading…' : `${rows.length} sub-processors`}>
        {loading ? <div className="skeleton" style={{ height:200, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<Building2 size={20}/>} title="No sub-processors registered" description="Seeded list should include Stripe, Supabase, Cloudflare, Resend. Refresh or re-seed."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', opacity: r.is_active ? 1 : 0.5 }}>
                <div style={{ flex:1, minWidth:240 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>
                    {r.name} {r.region && <span style={{ fontSize:11, color:'var(--t4)', fontWeight:500 }}>· {r.region}</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>{r.purpose} — <em>{r.data_processed}</em></div>
                </div>
                {r.dpa_url && (
                  <a href={r.dpa_url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--blue)', fontSize:11, display:'inline-flex', alignItems:'center', gap:4 }}>
                    DPA <ExternalLink size={10}/>
                  </a>
                )}
                <button className="btn btn-secondary btn-sm" onClick={()=>toggleActive(r)} style={{ fontSize:11, minHeight:28 }}>
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={()=>remove(r.id)} style={{ color:'var(--red)' }}>
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
