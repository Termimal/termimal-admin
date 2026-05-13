'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/testimonials — customer-quote manager.
 *
 * Cards display on /pricing and (when `featured`) on the homepage.
 * Hidden ones stay in the DB but disappear from the public site.
 * Sort order controls display order — lowest first.
 */

import { useEffect, useState } from 'react'
import { Quote, Plus, RefreshCw, Trash2, Star, Eye, EyeOff } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Row {
  id:             string
  author_name:    string
  author_role:    string | null
  author_company: string | null
  body:           string
  avatar_url:     string | null
  plan:           string | null
  rating:         number
  featured:       boolean
  visible:        boolean
  sort_order:     number
  created_at:     string
}

const blank = {
  author_name: '', author_role: '', author_company: '', body: '', avatar_url: '',
  plan: '', rating: 5, featured: false, visible: true, sort_order: 100,
}

export default function TestimonialsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState({ ...blank })

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/admin/testimonials', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.rows || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const reset = () => { setEditing(null); setDraft({ ...blank }) }
  const editRow = (r: Row) => {
    setEditing(r.id)
    setDraft({
      author_name: r.author_name, author_role: r.author_role || '', author_company: r.author_company || '',
      body: r.body, avatar_url: r.avatar_url || '', plan: r.plan || '',
      rating: r.rating, featured: r.featured, visible: r.visible, sort_order: r.sort_order,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!draft.author_name.trim() || !draft.body.trim()) {
      setError('Author name and body are required'); return
    }
    setBusy('save'); setError('')
    try {
      const r = await fetch('/api/admin/testimonials', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, ...(editing ? { id: editing } : {}) }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      reset(); await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setBusy(null) }
  }

  const patch = async (id: string, fields: Partial<Row>) => {
    setBusy(id)
    try {
      await fetch('/api/admin/testimonials', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      })
      await load()
    } finally { setBusy(null) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return
    setBusy(id)
    try {
      await fetch(`/api/admin/testimonials?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await load()
    } finally { setBusy(null) }
  }

  const visibleCount = rows.filter(r => r.visible).length
  const featuredCount = rows.filter(r => r.featured && r.visible).length

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Quote size={28}/>}
        eyebrow="Social proof"
        title="Testimonials"
        subtitle="Customer quotes shown on the homepage hero and /pricing. Featured ones land on the homepage; the rest appear on /pricing only."
        metric={{ label: 'Visible', value: visibleCount.toString(), secondary: `${featuredCount} featured · ${rows.length} total` }}
      />

      {error && (
        <div role="alert" style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 16,
          background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
          color: 'var(--red)', fontSize: 13, fontWeight: 600,
        }}>{error}</div>
      )}

      <Section accent="purple" title={editing ? 'Edit testimonial' : 'Add testimonial'} description="Body should be one or two punchy sentences. Long quotes get cut off in the card UI.">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14 }}>
          <Field label="Author name" required>
            <input className="input" value={draft.author_name} onChange={e => setDraft({ ...draft, author_name: e.target.value })} placeholder="Sarah Chen" />
          </Field>
          <Field label="Role">
            <input className="input" value={draft.author_role} onChange={e => setDraft({ ...draft, author_role: e.target.value })} placeholder="Quant trader" />
          </Field>
          <Field label="Company">
            <input className="input" value={draft.author_company} onChange={e => setDraft({ ...draft, author_company: e.target.value })} placeholder="Anchor Capital" />
          </Field>
          <Field label="Avatar URL (optional)">
            <input className="input" value={draft.avatar_url} onChange={e => setDraft({ ...draft, avatar_url: e.target.value })} placeholder="https://…" />
          </Field>
        </div>
        <div style={{ marginTop:14 }}>
          <Field label="Quote" required hint={`${draft.body.length} / 1200 chars`}>
            <textarea
              className="input"
              rows={3}
              value={draft.body}
              onChange={e => setDraft({ ...draft, body: e.target.value })}
              style={{ resize:'vertical', fontFamily:'inherit', lineHeight:1.55 }}
              placeholder="The chart workspace + COT positioning in one tab cut my prep time in half. Best research tool I've paid for since Bloomberg."
            />
          </Field>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginTop:14 }}>
          <Field label="Plan (optional)">
            <select className="input" value={draft.plan} onChange={e => setDraft({ ...draft, plan: e.target.value })}>
              <option value="">—</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </Field>
          <Field label="Rating">
            <div style={{ display:'flex', gap:4 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setDraft({ ...draft, rating: n })}
                  style={{ background:'transparent', border:'none', cursor:'pointer', padding:2 }}>
                  <Star size={20} fill={n <= draft.rating ? 'var(--amber)' : 'transparent'} color={n <= draft.rating ? 'var(--amber)' : 'var(--t4)'}/>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Sort order" hint="Lower = earlier on the page.">
            <input className="input" type="number" value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: parseInt(e.target.value) || 100 })} />
          </Field>
          <Field label="Flags">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button type="button" onClick={() => setDraft({ ...draft, featured: !draft.featured })}
                style={{
                  padding:'8px 14px', borderRadius:999, border:'1px solid', cursor:'pointer',
                  fontSize:12, fontWeight:600,
                  background: draft.featured ? 'var(--amber-bg)' : 'var(--surface)',
                  borderColor: draft.featured ? 'rgba(251,191,36,0.4)' : 'var(--border)',
                  color: draft.featured ? 'var(--amber)' : 'var(--t3)',
                }}>★ Featured</button>
              <button type="button" onClick={() => setDraft({ ...draft, visible: !draft.visible })}
                style={{
                  padding:'8px 14px', borderRadius:999, border:'1px solid', cursor:'pointer',
                  fontSize:12, fontWeight:600,
                  background: draft.visible ? 'var(--green-bg)' : 'var(--surface)',
                  borderColor: draft.visible ? 'rgba(63,185,80,0.4)' : 'var(--border)',
                  color: draft.visible ? 'var(--green-val)' : 'var(--t3)',
                }}>{draft.visible ? <><Eye size={11}/> Visible</> : <><EyeOff size={11}/> Hidden</>}</button>
            </div>
          </Field>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
          {editing && (
            <button type="button" onClick={reset} className="btn btn-secondary" style={{ minHeight:38 }}>
              Cancel edit
            </button>
          )}
          <button type="button" onClick={save} disabled={busy === 'save'} className="btn btn-primary" style={{ minHeight:38 }}>
            <Plus size={13}/> {busy === 'save' ? 'Saving…' : (editing ? 'Save changes' : 'Add testimonial')}
          </button>
        </div>
      </Section>

      <Section accent="acc" title="All testimonials"
        actions={<button className="btn btn-secondary btn-sm" style={{ minHeight:36 }} onClick={load} disabled={loading}><RefreshCw size={13}/> Refresh</button>}
      >
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 14 }} />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Quote size={20}/>} title="No testimonials yet" description="Add your first quote above. Featured ones appear on the homepage; the rest land on /pricing." />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(380px, 1fr))', gap:14 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{
                padding:'18px 22px',
                borderColor: !r.visible ? 'var(--border)' : r.featured ? 'rgba(251,191,36,0.4)' : 'var(--border)',
                opacity: r.visible ? 1 : 0.55,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill={i < r.rating ? 'var(--amber)' : 'transparent'} color={i < r.rating ? 'var(--amber)' : 'var(--t4)'}/>
                  ))}
                  {r.featured && (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, background:'var(--amber-bg)', color:'var(--amber)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginLeft:'auto' }}>
                      Featured
                    </span>
                  )}
                </div>
                <p style={{ fontSize:13, color:'var(--t1)', lineHeight:1.55, margin:'0 0 12px', fontStyle:'italic' }}>"{r.body}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" width={32} height={32} style={{ borderRadius:'50%', flexShrink:0 }} />
                  ) : (
                    <div style={{
                      width:32, height:32, borderRadius:'50%', flexShrink:0,
                      background:'var(--bg3)', color:'var(--t3)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight:700,
                    }}>{r.author_name.charAt(0).toUpperCase()}</div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{r.author_name}</div>
                    <div style={{ fontSize:11.5, color:'var(--t4)' }}>
                      {[r.author_role, r.author_company].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, marginTop:12 }}>
                  <button onClick={() => editRow(r)} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>Edit</button>
                  <button onClick={() => patch(r.id, { visible: !r.visible })} disabled={busy === r.id} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>
                    {r.visible ? <><EyeOff size={11}/> Hide</> : <><Eye size={11}/> Show</>}
                  </button>
                  <button onClick={() => patch(r.id, { featured: !r.featured })} disabled={busy === r.id} className="btn btn-secondary btn-sm" style={{ fontSize:11, color: r.featured ? 'var(--amber)' : undefined }}>
                    <Star size={11}/> {r.featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button onClick={() => remove(r.id)} disabled={busy === r.id} className="btn btn-secondary btn-sm" style={{ fontSize:11, color:'var(--red)', marginLeft:'auto' }}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
