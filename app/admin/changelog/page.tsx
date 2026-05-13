'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/changelog — author + publish "What's new" entries.
 *
 * Drafts stay in the table with published_at=null and are
 * invisible on the public site. Click Publish to set published_at
 * to now() and surface on /changelog + via the public API.
 */

import { useEffect, useState } from 'react'
import {
  Newspaper, Plus, Trash2, RefreshCw, Sparkles, Bug, AlertTriangle, ShieldCheck, Zap, Eye, EyeOff,
} from 'lucide-react'
import { HeroCard, Section, Field } from '@/components/admin/PageChrome'

interface Row {
  id:           string
  slug:         string
  version:      string | null
  title:        string
  body_md:      string
  kind:         'feature' | 'fix' | 'breaking' | 'security' | 'perf'
  published_at: string | null
  created_at:   string
  updated_at:   string
}

const KIND_META: Record<Row['kind'], { label: string; color: string; icon: any }> = {
  feature:  { label: 'Feature',   color: 'var(--blue)',   icon: Sparkles },
  fix:      { label: 'Fix',       color: 'var(--green)',  icon: Bug },
  breaking: { label: 'Breaking',  color: 'var(--red)',    icon: AlertTriangle },
  security: { label: 'Security',  color: 'var(--amber)',  icon: ShieldCheck },
  perf:     { label: 'Perf',      color: 'var(--purple)', icon: Zap },
}

export default function ChangelogAdminPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Editor state (used for both new and edit)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    slug: '', version: '', title: '', body_md: '', kind: 'feature' as Row['kind'],
  })

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/admin/changelog', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.rows || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const reset = () => { setDraft({ slug:'', version:'', title:'', body_md:'', kind:'feature' }); setEditingId(null) }

  const save = async (publish: boolean) => {
    if (!draft.slug.trim() || !draft.title.trim() || !draft.body_md.trim()) {
      setError('slug + title + body required'); return
    }
    setBusy('save'); setError('')
    try {
      const r = await fetch('/api/admin/changelog', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          slug: draft.slug, version: draft.version || null, title: draft.title,
          body_md: draft.body_md, kind: draft.kind, publish,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      reset()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  const togglePublish = async (row: Row) => {
    setBusy(row.id)
    try {
      await fetch('/api/admin/changelog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, publish: !row.published_at }),
      })
      await load()
    } finally { setBusy(null) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this entry? Cannot be undone.')) return
    setBusy(id)
    try {
      await fetch(`/api/admin/changelog?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await load()
    } finally { setBusy(null) }
  }

  const editRow = (r: Row) => {
    setEditingId(r.id)
    setDraft({ slug: r.slug, version: r.version || '', title: r.title, body_md: r.body_md, kind: r.kind })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const publishedCount = rows.filter(r => r.published_at).length

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<Newspaper size={28}/>}
        eyebrow="Communications"
        title="Changelog"
        subtitle="Publish 'what's new' entries. Drafts (published_at = null) stay invisible on the public site until you Publish. Users see a red-dot badge on the bell when something new lands since their last visit."
        metric={{ label: 'Published', value: publishedCount.toString(), secondary: `${rows.length} total` }}
      />

      {error && (
        <div role="alert" style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 16,
          background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
          color: 'var(--red)', fontSize: 13, fontWeight: 600,
        }}>{error}</div>
      )}

      <Section accent="blue" title={editingId ? 'Edit entry' : 'New entry'} description="Markdown supported: **bold**, *italic*, `code`, - bullets, [link](url).">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <Field label="Slug" hint="lowercase-hyphenated identifier. Becomes /changelog#slug.">
            <input className="input" value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })} placeholder="multi-currency-finance" />
          </Field>
          <Field label="Version (optional)">
            <input className="input" value={draft.version} onChange={e => setDraft({ ...draft, version: e.target.value })} placeholder="v2.4" />
          </Field>
          <Field label="Kind">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {(Object.keys(KIND_META) as Row['kind'][]).map(k => {
                const m = KIND_META[k]
                const on = draft.kind === k
                const Icon = m.icon
                return (
                  <button key={k} type="button" onClick={() => setDraft({ ...draft, kind: k })}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      padding:'8px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
                      fontSize:12, fontWeight:600,
                      background: on ? `${m.color}1A` : 'var(--surface)',
                      borderColor: on ? `${m.color}66` : 'var(--border)',
                      color: on ? m.color : 'var(--t3)',
                    }}>
                    <Icon size={12}/> {m.label}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Title">
            <input className="input" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Multi-currency Stripe balance + EUR equivalents" />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Body (Markdown)">
            <textarea
              className="input"
              rows={8}
              value={draft.body_md}
              onChange={e => setDraft({ ...draft, body_md: e.target.value })}
              style={{ resize: 'vertical', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12.5, lineHeight: 1.55 }}
              placeholder="Finance page now shows the live Stripe balance with **EUR-equivalent** rows..."
            />
          </Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          {editingId && (
            <button type="button" onClick={reset} className="btn btn-secondary" style={{ minHeight: 38 }}>
              Cancel edit
            </button>
          )}
          <button type="button" onClick={() => save(false)} disabled={busy === 'save'} className="btn btn-secondary" style={{ minHeight: 38 }}>
            {busy === 'save' ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" onClick={() => save(true)} disabled={busy === 'save'} className="btn btn-primary" style={{ minHeight: 38 }}>
            <Eye size={13}/> {busy === 'save' ? 'Publishing…' : (editingId ? 'Save + publish' : 'Publish now')}
          </button>
        </div>
      </Section>

      <Section accent="acc" title="Entries"
        actions={<button className="btn btn-secondary btn-sm" style={{ minHeight: 36 }} onClick={load} disabled={loading}><RefreshCw size={13}/> Refresh</button>}
      >
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
            No entries yet. Author the first one above.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {rows.map(r => {
              const m = KIND_META[r.kind] || KIND_META.feature
              const Icon = m.icon
              const published = !!r.published_at
              return (
                <div key={r.id} className="card-premium" style={{ padding: '14px 18px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'center' }}>
                    <span style={{
                      width:34, height:34, borderRadius:10,
                      background:`${m.color}1A`, color: m.color,
                      border:`1px solid ${m.color}33`,
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Icon size={14}/>
                    </span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>
                        {r.title} {r.version && <span style={{ color:'var(--t4)', fontFamily:'monospace', fontSize:11, fontWeight:500, marginLeft:6 }}>{r.version}</span>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color: m.color }}>{m.label}</span>
                        <span>·</span>
                        <span style={{ fontFamily:'monospace' }}>{r.slug}</span>
                        <span>·</span>
                        <span>{published ? `Published ${new Date(r.published_at!).toLocaleDateString()}` : `Draft, edited ${new Date(r.updated_at).toLocaleDateString()}`}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => editRow(r)} style={{ fontSize:11 }}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => togglePublish(r)} disabled={busy === r.id} style={{ fontSize:11 }}>
                        {published ? <><EyeOff size={11}/> Unpublish</> : <><Eye size={11}/> Publish</>}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => remove(r.id)} disabled={busy === r.id} style={{ fontSize:11, color:'var(--red)' }}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
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
