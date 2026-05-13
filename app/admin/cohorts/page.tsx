'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users2, Plus, Trash2, RefreshCw } from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Cohort {
  id: string
  name: string
  description: string | null
  definition: Definition
  member_count_cached: number | null
  cached_at: string | null
  created_at: string
}
interface Definition {
  plan?: string[]
  country?: string[]
  role?: string[]
  created_after?: string
  created_before?: string
  has_stripe?: boolean
}

const PLANS = ['free','starter','pro','premium']

export default function CohortsPage() {
  const [rows, setRows] = useState<Cohort[]>([])
  const [draft, setDraft] = useState<{ name: string; description: string; definition: Definition }>({
    name: '', description: '', definition: {},
  })
  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/cohorts', { cache: 'no-store' })
    const j = await r.json() as { rows?: Cohort[] }
    setRows(j.rows || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    if (!draft.name.trim()) return
    setCreating(true)
    await fetch('/api/admin/cohorts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
    setCreating(false)
    setDraft({ name: '', description: '', definition: {} })
    load()
  }
  async function refreshCount(id: string) {
    setRefreshing(id)
    await fetch(`/api/admin/cohorts?id=${id}&preview=true`)
    setRefreshing(null)
    load()
  }
  async function del(id: string) {
    if (!confirm('Delete cohort?')) return
    await fetch(`/api/admin/cohorts?id=${id}`, { method: 'DELETE' })
    load()
  }

  function togglePlan(p: string) {
    const cur = draft.definition.plan || []
    setDraft({ ...draft, definition: { ...draft.definition, plan: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p] } })
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Users2 size={14} />}
        eyebrow="Segmentation"
        title="Cohorts"
        description="Save user-segment definitions you can target with announcements, banners, or email blasts later. Member counts cache in the row; refresh to recompute."
        accent="purple"
      />

      <Section title="Define a cohort" accent="purple">
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <Field label="Name"><input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Pro & Premium · US" /></Field>
            <Field label="Description"><input className="input" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
          </div>
          <Field label="Plans" hint="Pick one or more plans. Leave empty to include all plans.">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLANS.map(p => (
                <button key={p} type="button" className={(draft.definition.plan || []).includes(p) ? 'chip chip-purple' : 'chip'} onClick={() => togglePlan(p)} style={{ cursor: 'pointer' }}>{p}</button>
              ))}
            </div>
          </Field>
          <div className="form-grid form-grid-2">
            <Field label="Country codes" hint="ISO codes, comma-separated. e.g. US, DE, TR">
              <input className="input" value={(draft.definition.country || []).join(', ')}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, country: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) } })} />
            </Field>
            <Field label="Has Stripe customer">
              <select className="select" value={draft.definition.has_stripe === undefined ? 'any' : (draft.definition.has_stripe ? 'yes' : 'no')}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, has_stripe: e.target.value === 'any' ? undefined : e.target.value === 'yes' } })}>
                <option value="any">Any</option>
                <option value="yes">Yes — paying customer</option>
                <option value="no">No — free tier</option>
              </select>
            </Field>
          </div>
          <div className="form-grid form-grid-2">
            <Field label="Created after">
              <input type="date" className="input" value={draft.definition.created_after || ''}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, created_after: e.target.value || undefined } })} />
            </Field>
            <Field label="Created before">
              <input type="date" className="input" value={draft.definition.created_before || ''}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, created_before: e.target.value || undefined } })} />
            </Field>
          </div>
          <button className="btn-primary btn-sm" disabled={!draft.name || creating} onClick={create} style={{ alignSelf: 'flex-start' }}>
            <Plus size={11} /> {creating ? 'Saving…' : 'Save cohort'}
          </button>
        </div>
      </Section>

      {rows.length === 0 ? (
        <EmptyState icon={<Users2 size={20}/>} title="No cohorts yet" />
      ) : (
        <Section flush title={`${rows.length} cohort${rows.length === 1 ? '' : 's'}`}>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table-root">
              <thead><tr><th>Name</th><th>Definition</th><th style={{ textAlign: 'right' }}>Members</th><th></th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.description && <div style={{ fontSize: 11, color: 'var(--t4)' }}>{r.description}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(r.definition.plan || []).map(p => <span key={p} className="chip chip-acc">{p}</span>)}
                        {(r.definition.country || []).map(c => <span key={c} className="chip chip-blue">{c}</span>)}
                        {r.definition.has_stripe === true && <span className="chip chip-green">paying</span>}
                        {r.definition.has_stripe === false && <span className="chip">free</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="chip chip-purple" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        {r.member_count_cached ?? '—'}
                      </span>
                      <button className="btn-ghost btn-sm" onClick={() => refreshCount(r.id)} disabled={refreshing === r.id} style={{ marginLeft: 4 }}>
                        <RefreshCw size={10} className={refreshing === r.id ? 'spin' : ''} />
                      </button>
                    </td>
                    <td><button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => del(r.id)}><Trash2 size={11} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      <style jsx global>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
