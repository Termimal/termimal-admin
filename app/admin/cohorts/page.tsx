'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users2, Plus, Trash2, RefreshCw } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field, ItemGrid, ItemCard } from '@/components/admin/PageChrome'

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

function PillBtn({ on, children, onClick, accent = 'purple' }: { on: boolean; children: React.ReactNode; onClick: () => void; accent?: 'purple' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 999,
        border: `1px solid ${on ? `var(--${accent}-bg)` : 'var(--border)'}`,
        background: on ? `var(--${accent}-bg)` : 'transparent',
        color: on ? `var(--${accent})` : 'var(--t3)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >{children}</button>
  )
}

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

  const totalMembers = rows.reduce((s, r) => s + (r.member_count_cached || 0), 0)

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Users2 size={28} />}
        eyebrow="Segmentation"
        title="Cohorts"
        subtitle="Save user-segment definitions you can target with announcements, banners, or email blasts later."
        metric={{ label: 'Cohorts', value: rows.length.toString(), secondary: `${totalMembers.toLocaleString()} cached members` }}
      />

      <Section
        title="Define a cohort"
        description="Member counts cache in the row; refresh to recompute."
        accent="purple"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Name" required>
              <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Pro & Premium · US" />
            </Field>
            <Field label="Description">
              <input className="input" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Optional"/>
            </Field>
          </div>

          <Field label="Plans" hint="Pick one or more plans. Leave empty to include all plans.">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PLANS.map(p => (
                <PillBtn key={p} on={(draft.definition.plan || []).includes(p)} onClick={() => togglePlan(p)}>{p}</PillBtn>
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Country codes" hint="ISO codes, comma-separated. e.g. US, DE, TR">
              <input className="input" value={(draft.definition.country || []).join(', ')}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, country: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) } })} />
            </Field>
            <Field label="Has Stripe customer">
              <select className="input" value={draft.definition.has_stripe === undefined ? 'any' : (draft.definition.has_stripe ? 'yes' : 'no')}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, has_stripe: e.target.value === 'any' ? undefined : e.target.value === 'yes' } })}>
                <option value="any">Any</option>
                <option value="yes">Yes — paying customer</option>
                <option value="no">No — free tier</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Created after">
              <input type="date" className="input" value={draft.definition.created_after || ''}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, created_after: e.target.value || undefined } })} />
            </Field>
            <Field label="Created before">
              <input type="date" className="input" value={draft.definition.created_before || ''}
                onChange={e => setDraft({ ...draft, definition: { ...draft.definition, created_before: e.target.value || undefined } })} />
            </Field>
          </div>

          <div>
            <button className="btn btn-primary btn-sm" disabled={!draft.name || creating} onClick={create}>
              <Plus size={13} /> {creating ? 'Saving…' : 'Save cohort'}
            </button>
          </div>
        </div>
      </Section>

      {rows.length === 0 ? (
        <EmptyState icon={<Users2 size={20}/>} title="No cohorts yet" description="Define one above to get started." />
      ) : (
        <ItemGrid min={320}>
          {rows.map(r => (
            <ItemCard
              key={r.id}
              accent="purple"
              icon={<Users2 size={18}/>}
              title={r.name}
              subtitle={r.description || 'No description'}
              status={{
                label: `${r.member_count_cached ?? '—'} MEMBERS`,
                tone: 'purple',
              }}
              meta={
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(r.definition.plan || []).map(p => <span key={p} className="badge badge-acc">{p}</span>)}
                  {(r.definition.country || []).map(c => <span key={c} className="badge badge-blue">{c}</span>)}
                  {r.definition.has_stripe === true && <span className="badge badge-green">paying</span>}
                  {r.definition.has_stripe === false && <span className="badge badge-muted">free</span>}
                  {!r.definition.plan?.length && !r.definition.country?.length && r.definition.has_stripe === undefined && (
                    <span className="badge badge-muted">all users</span>
                  )}
                </div>
              }
              footer={
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => refreshCount(r.id)} disabled={refreshing === r.id}>
                    <RefreshCw size={12} className={refreshing === r.id ? 'spin' : ''}/> Refresh count
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => del(r.id)} style={{ color: 'var(--red)' }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              }
            />
          ))}
        </ItemGrid>
      )}

      <style jsx global>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
