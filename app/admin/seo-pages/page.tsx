'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Plus, Trash2, Save } from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface SeoPage {
  id?: string
  path: string
  title: string | null
  description: string | null
  og_image: string | null
  canonical: string | null
  noindex: boolean
}

export default function SeoPagesPage() {
  const [rows, setRows]       = useState<SeoPage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft]     = useState<SeoPage>({ path: '', title: '', description: '', og_image: '', canonical: '', noindex: false })
  const [saving, setSaving]   = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/seo-pages', { cache: 'no-store' })
    const j = await r.json() as { rows?: SeoPage[] }
    setRows(j.rows || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function save(row: SeoPage) {
    setSaving(row.id || row.path)
    await fetch('/api/admin/seo-pages', {
      method: row.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row.id ? { id: row.id, patch: row } : row),
    })
    setSaving(null)
    if (!row.id) setDraft({ path: '', title: '', description: '', og_image: '', canonical: '', noindex: false })
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this SEO override?')) return
    await fetch(`/api/admin/seo-pages?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Search size={14} />}
        eyebrow="SEO · Per-page"
        title="Per-route SEO overrides"
        description="Override the global SEO defaults on specific routes (e.g. /pricing, /features). Anything left blank falls back to the global defaults from the SEO & Meta page."
        accent="blue"
      />

      {/* Add new */}
      <Section title="Add override" accent="blue">
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <Field label="Path" hint="e.g. /pricing">
              <input className="input" value={draft.path} onChange={e => setDraft({ ...draft, path: e.target.value })} placeholder="/pricing" />
            </Field>
            <Field label="Title">
              <input className="input" value={draft.title || ''} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" rows={2} value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <div className="form-grid form-grid-2">
            <Field label="og:image">
              <input className="input" value={draft.og_image || ''} onChange={e => setDraft({ ...draft, og_image: e.target.value })} />
            </Field>
            <Field label="Canonical URL">
              <input className="input" value={draft.canonical || ''} onChange={e => setDraft({ ...draft, canonical: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="toggle" data-checked={draft.noindex} onClick={() => setDraft({ ...draft, noindex: !draft.noindex })}>
              <span className="toggle-thumb" />
            </button>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Noindex this route</span>
            <button
              className="btn-primary btn-sm"
              style={{ marginLeft: 'auto' }}
              disabled={!draft.path.trim() || saving === draft.path}
              onClick={() => save(draft)}
            >
              <Plus size={11} /> {saving === draft.path ? 'Saving…' : 'Add override'}
            </button>
          </div>
        </div>
      </Section>

      {!loading && rows.length === 0 && (
        <EmptyState icon={<Search size={20}/>} title="No per-page overrides yet" description="Use the form above to override SEO for a specific route." />
      )}

      {rows.length > 0 && (
        <Section flush title="Active overrides">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {rows.map(r => (
              <li key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="chip chip-blue" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{r.path}</span>
                  {r.noindex && <span className="chip chip-red">noindex</span>}
                  <button className="btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--red)' }} onClick={() => del(r.id!)}>
                    <Trash2 size={11} />
                  </button>
                </div>
                <div className="form-grid">
                  <div className="form-grid form-grid-2">
                    <input className="input" value={r.title || ''} placeholder="Title"
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, title: e.target.value } : x))} />
                    <input className="input" value={r.canonical || ''} placeholder="Canonical"
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, canonical: e.target.value } : x))} />
                  </div>
                  <textarea className="input" rows={2} value={r.description || ''} placeholder="Description"
                    onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, description: e.target.value } : x))} />
                  <div className="form-grid form-grid-2">
                    <input className="input" value={r.og_image || ''} placeholder="og:image"
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, og_image: e.target.value } : x))} />
                    <button className="btn-secondary btn-sm" onClick={() => save(r)} disabled={saving === r.id}>
                      <Save size={11} /> {saving === r.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
