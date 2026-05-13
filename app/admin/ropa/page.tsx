'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/ropa — Records of Processing Activities (GDPR Art. 30).
 * Internal registry: what data we process, why, for whom, retained
 * how long. Required if you have >250 employees OR process special
 * categories. We maintain it regardless — auditors love it.
 */
import { useEffect, useState } from 'react'
import { FilePlus2, RefreshCw, Trash2, Save } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; category: string; description: string; legal_basis: string;
  purposes: string[]; data_subjects: string[]; recipients: string[];
  retention_days: number | null; transfer_outside_eea: boolean;
  safeguards: string | null; owner: string | null; updated_at: string
}

const LEGAL_BASES = ['contract','consent','legitimate_interest','legal_obligation','vital_interests','public_task']

export default function RopaPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [newRow, setNewRow]   = useState<Partial<Row>>({ category:'', description:'', legal_basis:'contract' })

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/ropa', { cache: 'no-store' })
    const j = await res.json()
    setRows(j.rows || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!newRow.category || !newRow.description || !newRow.legal_basis) return
    const res = await fetch('/api/admin/ropa', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newRow) })
    if (res.ok) { setNewRow({ category:'', description:'', legal_basis:'contract' }); load() }
    else alert((await res.json()).error || 'failed')
  }
  const remove = async (id: string) => {
    if (!confirm('Delete this RoPA entry?')) return
    await fetch(`/api/admin/ropa?id=${id}`, { method:'DELETE' })
    load()
  }

  return (
    <div>
      <HeroCard accent="purple" icon={<FilePlus2 size={28}/>} eyebrow="Privacy"
        title="Records of Processing"
        subtitle="GDPR Article 30 registry. Each row documents one processing activity with its legal basis. Auditors check this first; keep it current."
        metric={{ label: 'Activities', value: rows.length.toString() }}/>

      <Section accent="purple" title="Add activity" description="Category + description + legal basis are required.">
        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr 180px 120px auto', gap:8 }}>
          <input className="input" placeholder="category (e.g. billing)" value={newRow.category || ''} onChange={e=>setNewRow(p=>({...p, category:e.target.value}))}/>
          <input className="input" placeholder="description" value={newRow.description || ''} onChange={e=>setNewRow(p=>({...p, description:e.target.value}))}/>
          <select className="input" value={newRow.legal_basis} onChange={e=>setNewRow(p=>({...p, legal_basis:e.target.value}))}>
            {LEGAL_BASES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input className="input" placeholder="owner" value={newRow.owner || ''} onChange={e=>setNewRow(p=>({...p, owner:e.target.value}))}/>
          <button className="btn btn-primary btn-sm" onClick={add}><Save size={13}/> Add</button>
        </div>
      </Section>

      <Section accent="purple" title="Activities" description={loading ? 'Loading…' : `${rows.length} entries`}>
        {loading ? <div className="skeleton" style={{ height:200, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<FilePlus2 size={20}/>} title="No RoPA entries yet" description="Add at least: Authentication, Billing, Usage analytics, Support, Marketing. One row each."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:260 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{r.category}</div>
                    <div style={{ fontSize:12, color:'var(--t3)', marginTop:3 }}>{r.description}</div>
                    <div style={{ fontSize:11, color:'var(--t4)', marginTop:6, display:'flex', gap:10, flexWrap:'wrap' }}>
                      <span><strong>basis:</strong> {r.legal_basis}</span>
                      {r.owner && <span><strong>owner:</strong> {r.owner}</span>}
                      {r.retention_days != null && <span><strong>retention:</strong> {r.retention_days}d</span>}
                      {r.transfer_outside_eea && <span style={{ color:'var(--amber)' }}><strong>extra-EEA transfer</strong></span>}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ color:'var(--red)' }} onClick={() => remove(r.id)}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
