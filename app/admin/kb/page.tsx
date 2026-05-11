'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/kb — internal knowledge base + support macros.
 * Quick search + tag filter. Click to view body, copy to clipboard for
 * pasting into support replies.
 */
import { useEffect, useState } from 'react'
import { BookOpen, Save, Trash2, RefreshCw, Copy, Search } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; slug: string; title: string; body_md: string;
  tags: string[]; visibility: string; updated_at: string
}

export default function KbPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [tag, setTag]         = useState('')
  const [draft, setDraft]     = useState({ slug:'', title:'', body_md:'', tags:'' })
  const [open, setOpen]       = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const qs = new URLSearchParams(); if (q) qs.set('q', q); if (tag) qs.set('tag', tag)
    const res = await fetch(`/api/admin/kb?${qs}`, { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!draft.slug || !draft.title || !draft.body_md) return
    await fetch('/api/admin/kb', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...draft, tags: draft.tags.split(',').map(t=>t.trim()).filter(Boolean) }) })
    setDraft({ slug:'', title:'', body_md:'', tags:'' }); load()
  }
  const remove = async (id: string) => {
    if (!confirm('Delete?')) return
    await fetch(`/api/admin/kb?id=${id}`, { method:'DELETE' })
    load()
  }
  const copy = (text: string) => { navigator.clipboard.writeText(text); alert('Copied') }

  return (
    <div>
      <HeroCard accent="blue" icon={<BookOpen size={28}/>} eyebrow="Support"
        title="Knowledge base"
        subtitle="Macros + internal docs for the support team. Search-as-you-type; copy any body to paste into a reply."
        metric={{ label: 'Articles', value: rows.length.toString() }}/>

      <div className="card-premium" style={{ padding:'10px 14px', marginBottom:18, display:'grid', gridTemplateColumns:'1fr 200px auto', gap:8 }}>
        <div style={{ position:'relative' }}>
          <Search size={13} color="var(--t4)" style={{ position:'absolute', top:'50%', left:11, transform:'translateY(-50%)' }}/>
          <input className="input" style={{ paddingLeft:30 }} placeholder="search title or body…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')load()}}/>
        </div>
        <input className="input" placeholder="tag" value={tag} onChange={e=>setTag(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')load()}}/>
        <button className="btn btn-primary btn-sm" onClick={load}>Search</button>
      </div>

      <Section accent="blue" title="Add article">
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:8 }}>
            <input className="input" placeholder="slug (kebab-case)" value={draft.slug} onChange={e=>setDraft(d=>({...d, slug:e.target.value}))}/>
            <input className="input" placeholder="title" value={draft.title} onChange={e=>setDraft(d=>({...d, title:e.target.value}))}/>
            <input className="input" placeholder="tags (csv)" value={draft.tags} onChange={e=>setDraft(d=>({...d, tags:e.target.value}))}/>
          </div>
          <textarea className="input" placeholder="body (markdown)" rows={4} value={draft.body_md} onChange={e=>setDraft(d=>({...d, body_md:e.target.value}))}/>
          <button className="btn btn-primary btn-sm" style={{ alignSelf:'flex-start' }} onClick={add}><Save size={13}/> Save</button>
        </div>
      </Section>

      <Section accent="blue" title="Articles" description={loading ? 'Loading…' : `${rows.length} entries`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<BookOpen size={20}/>} title="No articles"/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => {
              const isOpen = open === r.id
              return (
                <div key={r.id} className="card-premium" style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', cursor:'pointer' }} onClick={()=>setOpen(isOpen ? null : r.id)}>
                    <div style={{ flex:1, minWidth:240 }}>
                      <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{r.title} <span style={{ fontSize:11, color:'var(--t4)', fontWeight:500, fontFamily:'monospace' }}>· {r.slug}</span></div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:3 }}>
                        {r.tags.length > 0 && <span>{r.tags.join(' · ')}</span>}
                        {r.tags.length > 0 && <span> · </span>}
                        <span>updated {new Date(r.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize:11 }} onClick={e=>{e.stopPropagation(); copy(r.body_md)}}><Copy size={11}/> Copy</button>
                    <button className="btn btn-secondary btn-sm" style={{ color:'var(--red)' }} onClick={e=>{e.stopPropagation(); remove(r.id)}}><Trash2 size={11}/></button>
                  </div>
                  {isOpen && (
                    <pre style={{ marginTop:10, padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8,
                      fontSize:12, color:'var(--t2)', whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:280, overflow:'auto' }}>{r.body_md}</pre>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
