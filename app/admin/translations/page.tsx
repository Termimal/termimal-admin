'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Languages, Plus, Trash2, Search } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field } from '@/components/admin/PageChrome'

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
    <div>
      <HeroCard
        accent="purple"
        icon={<Languages size={28}/>}
        eyebrow="i18n"
        title="Translations"
        subtitle="Per-locale strings consumed by the marketing site + terminal. Keys are dot-namespaced (e.g. home.hero.title)."
        metric={{ label: 'Strings', value: rows.length.toString(), secondary: `${locales.length} locales · ${namespaces.length} namespaces` }}
      />

      <Section title="Add or update string" accent="purple">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            <Field label="Namespace" required hint="Logical bucket — marketing, dashboard, errors…">
              <input className="input" value={draft.namespace} onChange={e => setDraft({ ...draft, namespace: e.target.value })} placeholder="marketing" />
            </Field>
            <Field label="Locale" required hint="ISO 639 code: en / de / fr / tr / ja…">
              <input className="input" value={draft.locale} onChange={e => setDraft({ ...draft, locale: e.target.value })} />
            </Field>
            <Field label="Key" required>
              <input className="input" value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="home.hero.title" />
            </Field>
          </div>
          <Field label="Value">
            <textarea className="input" rows={3} value={draft.value} onChange={e => setDraft({ ...draft, value: e.target.value })}
              style={{ resize: 'vertical', lineHeight: 1.55 }}/>
          </Field>
          <div>
            <button className="btn btn-primary btn-sm" onClick={add} disabled={!draft.key || !draft.namespace || !draft.locale || saving}>
              <Plus size={13}/> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Filters">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select className="input" value={filterLocale} onChange={e => setFilterLocale(e.target.value)} style={{ minWidth: 160 }}>
            <option value="all">All locales</option>
            {locales.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="input" value={filterNamespace} onChange={e => setFilterNamespace(e.target.value)} style={{ minWidth: 200 }}>
            <option value="all">All namespaces</option>
            {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
          </select>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input className="input" style={{ paddingLeft: 36 }} placeholder="Search key / value" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{filtered.length} rows</span>
        </div>
      </Section>

      {!loading && filtered.length === 0 && (
        <EmptyState icon={<Languages size={20}/>} title="No translations" description="Add your first string above." />
      )}

      {filtered.length > 0 && (
        <Section flush title={`${filtered.length} string${filtered.length === 1 ? '' : 's'}`}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-root" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Namespace','Key','Locale','Value',''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '14px 24px',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--t4)',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 24px' }}><span className="badge badge-muted">{r.namespace}</span></td>
                    <td style={{ padding: '14px 24px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, color: 'var(--t1)' }}>{r.key}</td>
                    <td style={{ padding: '14px 24px' }}><span className="badge badge-blue">{r.locale}</span></td>
                    <td style={{ padding: '14px 24px', minWidth: 320 }}>
                      <input
                        className="input"
                        value={r.value}
                        onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, value: e.target.value } : x))}
                        onBlur={() => patch(r)}
                      />
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }} onClick={() => del(r.id)}>
                        <Trash2 size={12}/>
                      </button>
                    </td>
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
