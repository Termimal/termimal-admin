'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Plus, Trash2, Save } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field } from '@/components/admin/PageChrome'

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
    <div>
      <HeroCard
        accent="blue"
        icon={<Search size={28}/>}
        eyebrow="SEO · per page"
        title="Per-route overrides"
        subtitle="Override the global SEO defaults on specific routes (e.g. /pricing, /features). Anything left blank falls back to the global defaults."
        metric={{ label: 'Overrides', value: rows.length.toString(), secondary: rows.filter(r => r.noindex).length ? `${rows.filter(r => r.noindex).length} noindex` : 'all indexable' }}
      />

      <Section title="Add override" accent="blue" description="Each path can have its own title, description, OG image, canonical, and noindex setting.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Path" required hint="e.g. /pricing">
              <input className="input" value={draft.path} onChange={e => setDraft({ ...draft, path: e.target.value })} placeholder="/pricing" />
            </Field>
            <Field label="Title">
              <input className="input" value={draft.title || ''} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" rows={3} value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} style={{ resize: 'vertical', lineHeight: 1.55 }}/>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="og:image">
              <input className="input" value={draft.og_image || ''} onChange={e => setDraft({ ...draft, og_image: e.target.value })} />
            </Field>
            <Field label="Canonical URL">
              <input className="input" value={draft.canonical || ''} onChange={e => setDraft({ ...draft, canonical: e.target.value })} />
            </Field>
          </div>
          <Field label="Noindex">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
              <input
                type="checkbox"
                checked={draft.noindex}
                onChange={e => setDraft({ ...draft, noindex: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
              />
              Block this route from search engines
            </label>
          </Field>
          <div>
            <button
              className="btn btn-primary btn-sm"
              disabled={!draft.path.trim() || saving === draft.path}
              onClick={() => save(draft)}
            >
              <Plus size={13}/> {saving === draft.path ? 'Saving…' : 'Add override'}
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
              <li key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue" style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{r.path}</span>
                  {r.noindex && <span className="badge badge-red">noindex</span>}
                  <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', color: 'var(--red)' }} onClick={() => del(r.id!)}>
                    <Trash2 size={12}/>
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    <input className="input" value={r.title || ''} placeholder="Title"
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, title: e.target.value } : x))} />
                    <input className="input" value={r.canonical || ''} placeholder="Canonical"
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, canonical: e.target.value } : x))} />
                  </div>
                  <textarea className="input" rows={2} value={r.description || ''} placeholder="Description"
                    onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, description: e.target.value } : x))}
                    style={{ resize: 'vertical', lineHeight: 1.55 }}/>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" value={r.og_image || ''} placeholder="og:image" style={{ flex: 1, minWidth: 240 }}
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, og_image: e.target.value } : x))} />
                    <button className="btn btn-primary btn-sm" onClick={() => save(r)} disabled={saving === r.id}>
                      <Save size={12}/> {saving === r.id ? 'Saving…' : 'Save'}
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
