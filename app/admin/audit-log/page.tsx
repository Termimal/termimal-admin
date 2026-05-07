'use client'

/**
 * /admin/audit-log — read-only audit trail.
 *
 * Filters: free-text search, actor user, action, since-date.
 * Each row has expandable raw JSON metadata + IP address.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  History, Search, RefreshCw, Filter, X, ChevronDown, Globe,
} from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id:   string | null
  metadata:    unknown
  ip_address:  string | null
  created_at:  string
  actor_email: string | null
}

const SINCE_PRESETS = [
  { label: 'Last hour',  ms: 60 * 60 * 1000 },
  { label: '24 hours',   ms: 24 * 60 * 60 * 1000 },
  { label: '7 days',     ms: 7  * 24 * 60 * 60 * 1000 },
  { label: '30 days',    ms: 30 * 24 * 60 * 60 * 1000 },
] as const

function fmtAge(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [q, setQ]             = useState('')
  const [sinceMs, setSinceMs] = useState<number | null>(7 * 86400 * 1000)
  const [open, setOpen]       = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setError(null)
    const params = new URLSearchParams()
    if (q.trim())  params.set('q', q.trim())
    if (sinceMs)   params.set('since', new Date(Date.now() - sinceMs).toISOString())
    params.set('limit', '200')
    try {
      const r = await fetch(`/api/admin/audit-log?${params.toString()}`, { cache: 'no-store' })
      const j = await r.json() as { logs?: AuditLog[]; error?: string }
      if (!r.ok || j.error) {
        setError(j.error || `HTTP ${r.status}`)
      } else {
        setLogs(j.logs || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [q, sinceMs])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const actionStats = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of logs) m.set(r.action, (m.get(r.action) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [logs])

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<History size={14} />}
        eyebrow="Audit Log"
        title="Activity history"
        description="Every admin action and security-relevant event in the system. Read-only — for incident response and compliance."
        accent="purple"
        actions={
          <button type="button" className="btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={11} /> Refresh
          </button>
        }
      />

      {/* Filter strip */}
      <Section flush accent="purple">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flexWrap: 'wrap' }}>
          <Filter size={14} style={{ color: 'var(--t4)' }} />
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
            <input
              className="input"
              style={{ paddingLeft: 30 }}
              placeholder="Search action / entity / id"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)' }}>
                <X size={11} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {SINCE_PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setSinceMs(p.ms)}
                className={sinceMs === p.ms ? 'chip chip-purple' : 'chip'}
                style={{ cursor: 'pointer' }}
              >{p.label}</button>
            ))}
            <button
              type="button"
              onClick={() => setSinceMs(null)}
              className={sinceMs === null ? 'chip chip-purple' : 'chip'}
              style={{ cursor: 'pointer' }}
            >All</button>
          </div>
        </div>
      </Section>

      {/* Top actions stat strip */}
      {actionStats.length > 0 && (
        <Section flush>
          <div style={{ display: 'flex', gap: 8, padding: 12, flexWrap: 'wrap' }}>
            {actionStats.map(([a, n]) => (
              <span key={a} className="chip">
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{a}</span>
                <span style={{ fontWeight: 700, color: 'var(--t1)' }}>×{n}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {error && (
        <div className="msg-err" style={{ marginBottom: 12 }}>✗ {error}</div>
      )}

      {!loading && !error && logs.length === 0 && (
        <EmptyState icon={<History size={20} />} title="No audit events" description="Either nothing happened in this window or the filter is too tight." />
      )}

      {logs.length > 0 && (
        <Section flush>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {logs.map(log => {
              const isOpen = open[log.id]
              return (
                <li key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setOpen(o => ({ ...o, [log.id]: !o[log.id] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '10px 16px', textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--t1)',
                    }}
                  >
                    <span style={{
                      fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace',
                      color: 'var(--purple)', fontWeight: 600,
                      minWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{log.action}</span>
                    <span style={{ fontSize: 12, color: 'var(--t3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.entity_type ? <><span style={{ color: 'var(--t4)' }}>{log.entity_type}</span>{log.entity_id ? <> · <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{log.entity_id}</span></> : null}</> : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 110 }}>
                      {log.actor_email || <span style={{ color: 'var(--t4)' }}>system</span>}
                    </span>
                    {log.ip_address && (
                      <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, monospace', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Globe size={10} /> {log.ip_address}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--t4)', minWidth: 70, textAlign: 'right' }}>{fmtAge(log.created_at)}</span>
                    <ChevronDown size={12} style={{ color: 'var(--t4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }} />
                  </button>
                  {isOpen && (
                    <pre style={{
                      margin: 0, padding: 12,
                      fontSize: 11, color: 'var(--t2)',
                      background: 'var(--bg)', borderTop: '1px solid var(--border)',
                      fontFamily: 'ui-monospace, Menlo, monospace',
                      overflow: 'auto', maxHeight: 280,
                    }}>{JSON.stringify({ ...log, metadata: log.metadata }, null, 2)}</pre>
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
