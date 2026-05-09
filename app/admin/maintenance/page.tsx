'use client'

import { useCallback, useEffect, useState } from 'react'
import { Calendar, Plus, Pause } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Window {
  id: string
  starts_at: string
  ends_at: string
  message: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  created_at: string
}

const STATUS_BADGE: Record<Window['status'], string> = {
  scheduled: 'badge-blue',
  active:    'badge-amber',
  completed: 'badge-green',
  cancelled: 'badge-muted',
}

export default function MaintenancePage() {
  const [rows, setRows]       = useState<Window[]>([])
  const [draft, setDraft]     = useState({ starts_at: '', ends_at: '', message: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/maintenance', { cache: 'no-store' })
    const j = await r.json() as { rows?: Window[] }
    setRows(j.rows || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    setError(null); setCreating(true)
    const r = await fetch('/api/admin/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at:   new Date(draft.ends_at).toISOString(),
      message:   draft.message,
    })})
    const j = await r.json()
    if (j.row) {
      setDraft({ starts_at: '', ends_at: '', message: '' })
      load()
    } else if (j.error) {
      setError(j.error)
    }
    setCreating(false)
  }
  async function cancel(id: string) {
    if (!confirm('Cancel this maintenance window?')) return
    await fetch(`/api/admin/maintenance?id=${id}`, { method: 'DELETE' })
    load()
  }

  const upcoming = rows.filter(r => r.status === 'scheduled' || r.status === 'active').length

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Calendar size={28}/>}
        eyebrow="Operations"
        title="Scheduled maintenance"
        subtitle="Schedule advance-notice maintenance windows. For ad-hoc downtime use the Maintenance Mode toggle on the System page instead."
        metric={{ label: 'Upcoming', value: upcoming.toString(), secondary: `${rows.length} total` }}
      />
      <Section title="Schedule a window" accent="amber" description="Show banners + a status page automatically during the window.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            <Field label="Starts at" required>
              <input type="datetime-local" className="input" value={draft.starts_at} onChange={e => setDraft({ ...draft, starts_at: e.target.value })}/>
            </Field>
            <Field label="Ends at" required>
              <input type="datetime-local" className="input" value={draft.ends_at} onChange={e => setDraft({ ...draft, ends_at: e.target.value })}/>
            </Field>
          </div>
          <Field label="User-facing message" required>
            <textarea className="input" rows={3} value={draft.message} onChange={e => setDraft({ ...draft, message: e.target.value })}
              placeholder="Database upgrade — site briefly read-only."
              style={{ resize: 'vertical', lineHeight: 1.55 }}/>
          </Field>
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--red)', fontSize: 13, fontWeight: 600,
            }}>{error}</div>
          )}
          <div>
            <button className="btn btn-primary btn-sm" onClick={create} disabled={!draft.starts_at || !draft.ends_at || !draft.message || creating}>
              <Plus size={13}/> {creating ? 'Saving…' : 'Schedule window'}
            </button>
          </div>
        </div>
      </Section>

      {rows.length === 0 ? (
        <EmptyState icon={<Calendar size={20}/>} title="No scheduled windows" description="Schedule one above to give users advance notice." />
      ) : (
        <Section flush title={`${rows.length} window${rows.length === 1 ? '' : 's'}`}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-root" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Status','Starts','Ends','Message',''].map(h => (
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
                {rows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 24px' }}>
                      <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>{new Date(r.starts_at).toLocaleString()}</td>
                    <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>{new Date(r.ends_at).toLocaleString()}</td>
                    <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--t1)' }}>{r.message}</td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      {r.status === 'scheduled' && (
                        <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }} onClick={() => cancel(r.id)}>
                          <Pause size={12}/> Cancel
                        </button>
                      )}
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
