'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/tax — tax registrations + revenue by country.
 * Lightweight registry. Connect Stripe Tax for full automation; this
 * is the compliance-team view.
 */
import { useEffect, useMemo, useState } from 'react'
import { Calculator, Save, Trash2, RefreshCw } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Reg { id: string; country: string; region: string | null; vat_number: string | null; threshold_local: number | null; registered_at: string | null; notes: string | null }
interface RevRow { amount: number; currency: string; period_end: string; user_id: string; profiles: { country: string | null } | { country: string | null }[] }

function pickCountry(p: RevRow['profiles']): string {
  if (Array.isArray(p)) return p[0]?.country || 'Unknown'
  return p?.country || 'Unknown'
}

export default function TaxPage() {
  const [regs, setRegs]   = useState<Reg[]>([])
  const [rev, setRev]     = useState<RevRow[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Partial<Reg>>({})

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/tax', { cache:'no-store' })
    const j = await res.json()
    setRegs(j.registrations || []); setRev(j.revenue || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const byCountry = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rev) {
      const c = pickCountry(r.profiles)
      m.set(c, (m.get(c) || 0) + (r.amount || 0))
    }
    return [...m.entries()].sort((a,b) => b[1]-a[1])
  }, [rev])

  const add = async () => {
    if (!draft.country) return
    await fetch('/api/admin/tax', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(draft) })
    setDraft({}); load()
  }
  const remove = async (id: string) => {
    if (!confirm('Delete registration?')) return
    await fetch(`/api/admin/tax?id=${id}`, { method:'DELETE' })
    load()
  }

  return (
    <div>
      <HeroCard accent="green" icon={<Calculator size={28}/>} eyebrow="Finance"
        title="Tax registrations"
        subtitle="Track where we're registered for VAT / sales tax and 90-day revenue by country. Cross-check against thresholds (EU OSS €10k, US state-specific) to know when to register next."
        metric={{ label: 'Registrations', value: regs.length.toString() }}/>

      <Section accent="green" title="Add registration" description="Country + optional region (US state) + VAT #">
        <div style={{ display:'grid', gridTemplateColumns:'120px 120px 200px 1fr auto', gap:8 }}>
          <input className="input" placeholder="country" value={draft.country || ''} onChange={e=>setDraft(d=>({...d, country:e.target.value}))}/>
          <input className="input" placeholder="region" value={draft.region || ''} onChange={e=>setDraft(d=>({...d, region:e.target.value}))}/>
          <input className="input" placeholder="VAT #" value={draft.vat_number || ''} onChange={e=>setDraft(d=>({...d, vat_number:e.target.value}))}/>
          <input className="input" placeholder="notes" value={draft.notes || ''} onChange={e=>setDraft(d=>({...d, notes:e.target.value}))}/>
          <button className="btn btn-primary btn-sm" onClick={add}><Save size={13}/> Add</button>
        </div>
      </Section>

      <Section accent="green" title="Registrations" description={loading ? 'Loading…' : `${regs.length} entries`}>
        {regs.length === 0 ? <EmptyState icon={<Calculator size={20}/>} title="No registrations yet"/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {regs.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{r.country}{r.region ? ` · ${r.region}` : ''}</span>
                {r.vat_number && <span style={{ fontSize:12, color:'var(--t3)', fontFamily:'monospace' }}>{r.vat_number}</span>}
                {r.notes && <span style={{ fontSize:11, color:'var(--t4)', fontStyle:'italic' }}>{r.notes}</span>}
                <span style={{ marginLeft:'auto' }}/>
                <button className="btn btn-secondary btn-sm" style={{ color:'var(--red)' }} onClick={()=>remove(r.id)}><Trash2 size={11}/></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section accent="blue" title="Revenue by country (90d)" description={`${byCountry.length} countries · ${rev.length} invoices`}>
        {byCountry.length === 0 ? <EmptyState icon={<Calculator size={20}/>} title="No invoices in window"/>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'var(--bg3)', textAlign:'left' }}>
              <th style={{ padding:'8px 12px' }}>Country</th><th style={{ padding:'8px 12px' }}>Revenue (USD-equiv)</th>
            </tr></thead>
            <tbody>{byCountry.map(([c, amt]) => (
              <tr key={c} style={{ borderTop:'1px solid var(--border)' }}>
                <td style={{ padding:'8px 12px' }}>{c}</td>
                <td style={{ padding:'8px 12px', fontFamily:'monospace' }}>${amt.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Section>

      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
