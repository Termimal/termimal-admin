'use client'

import { useCallback, useEffect, useState } from 'react'
import { Beaker, Plus, Play, Pause, Square, Trash2 } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field, ItemGrid, ItemCard } from '@/components/admin/PageChrome'

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

const STATUS_TONE: Record<Experiment['status'], 'green' | 'amber' | 'red' | 'muted'> = {
  draft: 'muted', running: 'green', paused: 'amber', ended: 'red',
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

  const running = rows.filter(r => r.status === 'running').length

  return (
    <div>
      <HeroCard
        accent="green"
        icon={<Beaker size={28} />}
        eyebrow="Experiments"
        title="A/B testing"
        subtitle="Define experiments admins can read at request time to bucket users into variants. Weights are advisory — assignment lives in code."
        metric={{ label: 'Running', value: running.toString(), secondary: `${rows.length} total` }}
      />

      <Section title="New experiment" accent="green" description="Snake_case key plus a short metric helps anyone reading code understand what's being tested.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Key" required hint="Snake_case identifier read in code.">
              <input className="input" value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="pricing_layout_v2" />
            </Field>
            <Field label="Name" required>
              <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Pricing layout v2" />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" rows={3} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}
              style={{ resize: 'vertical', lineHeight: 1.55 }} />
          </Field>
          <Field label="Primary metric" hint="What you're optimising — e.g. signup_conversion, paid_conversion, churn">
            <input className="input" value={draft.metric} onChange={e => setDraft({ ...draft, metric: e.target.value })} />
          </Field>
          <div>
            <button className="btn btn-primary btn-sm" disabled={!draft.key || !draft.name || creating} onClick={create}>
              <Plus size={13} /> {creating ? 'Saving…' : 'Create experiment'}
            </button>
          </div>
        </div>
      </Section>

      {rows.length === 0 ? (
        <EmptyState icon={<Beaker size={20}/>} title="No experiments" description="Create your first experiment above." />
      ) : (
        <ItemGrid min={320}>
          {rows.map(r => (
            <ItemCard
              key={r.id}
              accent="green"
              icon={<Beaker size={18}/>}
              title={r.name}
              subtitle={r.description || r.key}
              status={{ label: r.status.toUpperCase(), tone: STATUS_TONE[r.status], pulse: r.status === 'running' }}
              meta={
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color: 'var(--t4)', fontSize: 11 }}>{r.key}</span>
                  {r.metric && <span className="badge badge-blue">{r.metric}</span>}
                  {(r.variants || []).map(v => (
                    <span key={v.key} className="badge badge-muted">
                      <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{v.key}</span>
                      <span style={{ marginLeft: 4, color: 'var(--t1)', fontWeight: 700 }}>{v.weight}%</span>
                    </span>
                  ))}
                </div>
              }
              footer={
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.status !== 'running' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setStatus(r.id, 'running')}>
                      <Play size={12}/> Start
                    </button>
                  )}
                  {r.status === 'running' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setStatus(r.id, 'paused')}>
                      <Pause size={12}/> Pause
                    </button>
                  )}
                  {r.status !== 'ended' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setStatus(r.id, 'ended')}>
                      <Square size={12}/> End
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => del(r.id)} style={{ color: 'var(--red)' }}>
                    <Trash2 size={12}/> Delete
                  </button>
                </div>
              }
            />
          ))}
        </ItemGrid>
      )}
    </div>
  )
}
