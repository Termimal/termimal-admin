'use client'

import { useCallback, useEffect, useState } from 'react'
import { Beaker, Plus, Play, Pause, Square, Trash2 } from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Experiment {
  id: string
  key: string
  name: string
  description: string | null
  variants: Array<{ key: string; weight: number }>
  status: 'draft' | 'running' | 'paused' | 'ended'
  started_at: string | null
  ended_at: string | null
  metric: string | null
  notes: string | null
  created_at: string
}

const STATUS_COLOR: Record<Experiment['status'], string> = {
  draft: 'chip', running: 'chip chip-green', paused: 'chip chip-amber', ended: 'chip chip-red',
}

export default function ExperimentsPage() {
  const [rows, setRows] = useState<Experiment[]>([])
  const [draft, setDraft] = useState({ key: '', name: '', description: '', metric: '' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/experiments', { cache: 'no-store' })
    const j = await r.json() as { rows?: Experiment[] }
    setRows(j.rows || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    if (!draft.key || !draft.name) return
    setCreating(true)
    await fetch('/api/admin/experiments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
    setCreating(false)
    setDraft({ key: '', name: '', description: '', metric: '' })
    load()
  }
  async function setStatus(id: string, status: Experiment['status']) {
    await fetch('/api/admin/experiments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch: { status } }) })
    load()
  }
  async function del(id: string) {
    if (!confirm('Delete experiment?')) return
    await fetch(`/api/admin/experiments?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Beaker size={14} />}
        eyebrow="Experiments"
        title="A/B testing"
        description="Define experiments admins can read at request time to bucket users into variants. The weights are advisory — your assignment hash should respect them but the exact split lives in code."
        accent="green"
      />

      <Section title="New experiment" accent="green">
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <Field label="Key" hint="Snake_case identifier read in code.">
              <input className="input" value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="pricing_layout_v2" />
            </Field>
            <Field label="Name">
              <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Pricing layout v2" />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" rows={2} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <Field label="Primary metric" hint="What you're optimising — e.g. signup_conversion, paid_conversion, churn">
            <input className="input" value={draft.metric} onChange={e => setDraft({ ...draft, metric: e.target.value })} />
          </Field>
          <button className="btn-primary btn-sm" disabled={!draft.key || !draft.name || creating} onClick={create} style={{ alignSelf: 'flex-start' }}>
            <Plus size={11} /> {creating ? 'Saving…' : 'Create'}
          </button>
        </div>
      </Section>

      {rows.length === 0 ? (
        <EmptyState icon={<Beaker size={20}/>} title="No experiments" />
      ) : (
        <Section flush title={`${rows.length} experiment${rows.length === 1 ? '' : 's'}`}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {rows.map(r => (
              <li key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={STATUS_COLOR[r.status]}>{r.status}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{r.key}</span>
                    </div>
                    {r.description && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>{r.description}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(r.variants || []).map(v => (
                        <span key={v.key} className="chip">
                          <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{v.key}</span>
                          <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{v.weight}%</span>
                        </span>
                      ))}
                      {r.metric && <span className="chip chip-blue">metric: {r.metric}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {r.status !== 'running' && <button className="btn-ghost btn-sm" title="Start" onClick={() => setStatus(r.id, 'running')}><Play size={11}/></button>}
                    {r.status === 'running' && <button className="btn-ghost btn-sm" title="Pause" onClick={() => setStatus(r.id, 'paused')}><Pause size={11}/></button>}
                    {r.status !== 'ended' && <button className="btn-ghost btn-sm" title="End" onClick={() => setStatus(r.id, 'ended')}><Square size={11}/></button>}
                    <button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => del(r.id)}><Trash2 size={11}/></button>
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
