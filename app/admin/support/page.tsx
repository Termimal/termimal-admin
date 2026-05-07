'use client'

/**
 * /admin/support — customer-support inbox.
 *
 * List of support_tickets with quick triage: change status, change
 * priority, expand to read the full message + reply context.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Inbox, RefreshCw, ChevronDown, Search, Filter,
} from 'lucide-react'
import { PageHeader, Section, Tabs, EmptyState } from '@/components/admin/PageChrome'

interface Ticket {
  id: string
  user_id: string | null
  subject:  string
  message:  string
  status:   'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: string | null
  created_at: string
  updated_at: string
  user?:     { email: string; full_name: string | null } | null
  assignee?: { email: string; full_name: string | null } | null
}

const STATUS_TABS = [
  { key: 'open',        label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved',    label: 'Resolved' },
  { key: 'closed',      label: 'Closed' },
  { key: 'all',         label: 'All' },
] as const

const PRIORITY_LABEL: Record<Ticket['priority'], string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
}
const PRIORITY_COLOR: Record<Ticket['priority'], string> = {
  urgent: 'chip-red', high: 'chip-amber', medium: 'chip-blue', low: 'chip',
}

function fmtAge(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<typeof STATUS_TABS[number]['key']>('open')
  const [q, setQ]             = useState('')
  const [open, setOpen]       = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setError(null)
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (q.trim()) params.set('q', q.trim())
    try {
      const r = await fetch(`/api/admin/support?${params.toString()}`, { cache: 'no-store' })
      const j = await r.json() as { tickets?: Ticket[]; error?: string }
      if (!r.ok || j.error) {
        setError(j.error || `HTTP ${r.status}`)
      } else {
        setTickets(j.tickets || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [tab, q])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  async function patchTicket(id: string, patch: Partial<Ticket>) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    try {
      await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      })
    } catch { /* swallow — local state already updated */ }
  }

  const counts = useMemo(() => {
    const m = { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    for (const t of tickets) m[t.status] = (m[t.status] || 0) + 1
    return m
  }, [tickets])

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Inbox size={14} />}
        eyebrow="Customer support"
        title="Inbox"
        description="Tickets users submit via the contact form, sorted newest first. Update status + priority, assign yourself, expand for the full message."
        accent="green"
        actions={
          <button type="button" className="btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={11} /> Refresh
          </button>
        }
      />

      <Tabs
        items={STATUS_TABS.map(t => ({
          key: t.key,
          label: t.label,
          count: t.key === 'all' ? undefined : (counts[t.key as keyof typeof counts] || undefined),
        }))}
        active={tab}
        onChange={(k) => setTab(k as typeof STATUS_TABS[number]['key'])}
        accent="green"
      />

      <Section flush accent="green">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <Filter size={12} style={{ color: 'var(--t4)' }} />
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
            <input
              className="input"
              style={{ paddingLeft: 30 }}
              placeholder="Search subject / message"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
      </Section>

      {error && <div className="msg-err" style={{ marginBottom: 12 }}>✗ {error}</div>}
      {!loading && !error && tickets.length === 0 && (
        <EmptyState icon={<Inbox size={20} />} title="Inbox zero" description="No tickets in this filter." />
      )}

      {tickets.length > 0 && (
        <Section flush>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {tickets.map(t => {
              const isOpen = open[t.id]
              return (
                <li key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', cursor: 'pointer',
                    }}
                    onClick={() => setOpen(o => ({ ...o, [t.id]: !o[t.id] }))}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={PRIORITY_COLOR[t.priority]}>{PRIORITY_LABEL[t.priority]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{t.subject}</span>
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--t3)', marginBottom: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{t.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 10 }}>
                        <span>{t.user?.full_name || t.user?.email || 'Unknown user'}</span>
                        <span>·</span>
                        <span>{fmtAge(t.created_at)}</span>
                        {t.assignee && (<><span>·</span><span>Assigned: {t.assignee.full_name || t.assignee.email}</span></>)}
                      </div>
                    </div>
                    <select
                      value={t.status}
                      onChange={e => { e.stopPropagation(); patchTicket(t.id, { status: e.target.value as Ticket['status'] }) }}
                      onClick={e => e.stopPropagation()}
                      className="select"
                      style={{ width: 130, fontSize: 11 }}
                    >
                      {(['open','in_progress','resolved','closed'] as const).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                    <select
                      value={t.priority}
                      onChange={e => { e.stopPropagation(); patchTicket(t.id, { priority: e.target.value as Ticket['priority'] }) }}
                      onClick={e => e.stopPropagation()}
                      className="select"
                      style={{ width: 100, fontSize: 11 }}
                    >
                      {(['urgent','high','medium','low'] as const).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={12} style={{ color: 'var(--t4)', marginTop: 6, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }} />
                  </div>
                  {isOpen && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--bg)',
                      borderTop: '1px solid var(--border)',
                      fontSize: 13, color: 'var(--t2)',
                      lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    }}>{t.message}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}
