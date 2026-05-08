'use client'

import { useCallback, useEffect, useState } from 'react'
import { Calendar, Plus, Trash2, Pause } from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Window {
  id: string
  starts_at: string
  ends_at: string
  message: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  created_at: string
}

const STATUS_CHIP: Record<Window['status'], string> = {
  scheduled: 'chip chip-blue',
  active:    'chip chip-amber',
  completed: 'chip chip-green',
  cancelled: 'chip',
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

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Calendar size={14} />}
        eyebrow="Operations"
        title="Scheduled maintenance"
        description="Schedule advance-notice maintenance windows. The site can show banners + a status page during the window. For ad-hoc downtime use the Maintenance Mode toggle on the System page instead."
        accent="amber"
      />
      <Section title="Schedule a window" accent="amber">
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <Field label="Starts at"><input type="datetime-local" className="input" value={draft.starts_at} onChange={e => setDraft({ ...draft, starts_at: e.target.value })} /></Field>
            <Field label="Ends at"><input type="datetime-local" className="input" value={draft.ends_at} onChange={e => setDraft({ ...draft, ends_at: e.target.value })} /></Field>
          </div>
          <Field label="User-facing message"><textarea className="input" rows={2} value={draft.message} onChange={e => setDraft({ ...draft, message: e.target.value })} placeholder="Database upgrade — site briefly read-only." /></Field>
          {error && <div className="msg-err">✗ {error}</div>}
          <button className="btn-primary btn-sm" onClick={create} disabled={!draft.starts_at || !draft.ends_at || !draft.message || creating} style={{ alignSelf: 'flex-start' }}>
            <Plus size={11}/> {creating ? 'Saving…' : 'Schedule window'}
          </button>
        </div>
      </Section>
      {rows.length === 0
        ? <EmptyState icon={<Calendar size={20}/>} title="No scheduled windows" />
        : (
          <Section flush title={`${rows.length} window${rows.length === 1 ? '' : 's'}`}>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table-root">
                <thead><tr><th>Status</th><th>Starts</th><th>Ends</th><th>Message</th><th></th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><span className={STATUS_CHIP[r.status]}>{r.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--t3)' }}>{new Date(r.starts_at).toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: 'var(--t3)' }}>{new Date(r.ends_at).toLocaleString()}</td>
                      <td style={{ fontSize: 12 }}>{r.message}</td>
                      <td>
                        {r.status === 'scheduled' && (
                          <button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => cancel(r.id)}><Pause size={11}/> Cancel</button>
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
