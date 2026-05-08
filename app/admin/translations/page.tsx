'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Languages, Plus, Trash2, Filter, Search } from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Row {
  id: string
  key: string
  namespace: string
  locale: string
  value: string
  updated_at: string
}

export default function TranslationsPage() {
  const [rows, setRows]             = useState<Row[]>([])
  const [locales, setLocales]       = useState<string[]>([])
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterLocale, setFilterLocale]       = useState('all')
  const [filterNamespace, setFilterNamespace] = useState('all')
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState({ key: '', namespace: '', locale: 'en', value: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterLocale !== 'all')    params.set('locale',    filterLocale)
    if (filterNamespace !== 'all') params.set('namespace', filterNamespace)
    const r = await fetch(`/api/admin/translations?${params.toString()}`, { cache: 'no-store' })
    const j = await r.json() as { rows?: Row[]; locales?: string[]; namespaces?: string[] }
    setRows(j.rows || [])
    setLocales(j.locales || [])
    setNamespaces(j.namespaces || [])
    setLoading(false)
  }, [filterLocale, filterNamespace])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!q.trim()) return rows
    const s = q.toLowerCase()
    return rows.filter(r => r.key.toLowerCase().includes(s) || r.value.toLowerCase().includes(s))
  }, [rows, q])

  async function add() {
    if (!draft.key || !draft.namespace || !draft.locale) return
    setSaving(true)
    await fetch('/api/admin/translations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
    setSaving(false)
    setDraft({ key: '', namespace: draft.namespace, locale: draft.locale, value: '' })
    load()
  }
  async function patch(row: Row) {
    await fetch('/api/admin/translations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) })
  }
  async function del(id: string) {
    if (!confirm('Delete translation?')) return
    await fetch(`/api/admin/translations?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Languages size={14} />}
        eyebrow="i18n"
        title="Translations"
        description="Per-locale strings consumed by the marketing site + terminal. Keys are dot-namespaced (e.g. `home.hero.title`)."
        accent="purple"
      />

      <Section title="Add or update string" accent="purple">
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <Field label="Namespace" hint="Logical bucket — marketing, dashboard, errors…">
              <input className="input" value={draft.namespace} onChange={e => setDraft({ ...draft, namespace: e.target.value })} placeholder="marketing" />
            </Field>
            <Field label="Locale" hint="ISO 639 code: en / de / fr / tr / ja…">
              <input className="input" value={draft.locale} onChange={e => setDraft({ ...draft, locale: e.target.value })} />
            </Field>
          </div>
          <Field label="Key">
            <input className="input" value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="home.hero.title" />
          </Field>
          <Field label="Value">
            <textarea className="input" rows={2} value={draft.value} onChange={e => setDraft({ ...draft, value: e.target.value })} />
          </Field>
          <button className="btn-primary btn-sm" onClick={add} disabled={!draft.key || !draft.namespace || !draft.locale || saving} style={{ alignSelf: 'flex-start' }}>
            <Plus size={11} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Section>

      <Section flush>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flexWrap: 'wrap' }}>
          <Filter size={12} style={{ color: 'var(--t4)' }} />
          <select className="select" value={filterLocale} onChange={e => setFilterLocale(e.target.value)} style={{ minWidth: 130 }}>
            <option value="all">All locales</option>
            {locales.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="select" value={filterNamespace} onChange={e => setFilterNamespace(e.target.value)} style={{ minWidth: 160 }}>
            <option value="all">All namespaces</option>
            {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
          </select>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
            <input className="input" style={{ paddingLeft: 30 }} placeholder="Search key / value" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t4)' }}>{filtered.length} rows</span>
        </div>
      </Section>

      {!loading && filtered.length === 0 && (
        <EmptyState icon={<Languages size={20}/>} title="No translations" description="Add your first string above." />
      )}

      {filtered.length > 0 && (
        <Section flush>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table-root">
              <thead><tr><th>Namespace</th><th>Key</th><th>Locale</th><th>Value</th><th></th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><span className="chip">{r.namespace}</span></td>
                    <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}>{r.key}</td>
                    <td><span className="chip chip-blue">{r.locale}</span></td>
                    <td style={{ minWidth: 320 }}>
                      <input
                        className="input"
                        value={r.value}
                        onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, value: e.target.value } : x))}
                        onBlur={() => patch(r)}
                      />
                    </td>
                    <td><button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => del(r.id)}><Trash2 size={11} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
