'use client'

/**
 * /admin/audit-log — read-only audit trail.
 *
 * Filters: free-text search, actor user, action, since-date.
 * Each row has expandable raw JSON metadata + IP address.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  History, Search, RefreshCw, X, ChevronDown, Globe,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

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

function PillBtn({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 999,
        border: `1px solid ${on ? 'var(--purple-bg)' : 'var(--border)'}`,
        background: on ? 'var(--purple-bg)' : 'transparent',
        color: on ? 'var(--purple)' : 'var(--t3)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  )
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
    <div>
      <HeroCard
        accent="red"
        icon={<History size={28} />}
        eyebrow="Audit log"
        title="Activity history"
        subtitle="Every admin action and security-relevant event in the system. Read-only — for incident response and compliance."
        metric={{ label: 'Events', value: logs.length.toString(), secondary: sinceMs ? `last ${SINCE_PRESETS.find(p => p.ms === sinceMs)?.label.toLowerCase() || ''}` : 'all time' }}
      />

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight:38 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Filter strip */}
      <Section accent="red" title="Filters" description="Narrow the timeline by free-text search and time window.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search action / entity / id"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SINCE_PRESETS.map(p => (
              <PillBtn key={p.label} on={sinceMs === p.ms} onClick={() => setSinceMs(p.ms)}>{p.label}</PillBtn>
            ))}
            <PillBtn on={sinceMs === null} onClick={() => setSinceMs(null)}>All time</PillBtn>
          </div>
        </div>
      </Section>

      {actionStats.length > 0 && (
        <Section title="Top actions" description="Most frequent action types in the current window.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {actionStats.map(([a, n]) => (
              <span key={a} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 999,
                background: 'var(--surface)', border: '1px solid var(--border)',
                fontSize: 12,
              }}>
                <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color: 'var(--purple)', fontWeight: 600 }}>{a}</span>
                <span style={{ fontWeight: 700, color: 'var(--t1)', fontVariantNumeric:'tabular-nums' }}>×{n}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {error && (
        <div className="card-premium" style={{
          padding: '14px 18px', marginBottom: 20,
          borderColor: 'var(--red)44', color: 'var(--red)',
          fontSize: 13, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <EmptyState icon={<History size={20} />} title="No audit events" description="Either nothing happened in this window or the filter is too tight." />
      )}

      {logs.length > 0 && (
        <Section flush title={`Events (${logs.length})`} description="Click any row to expand the raw JSON metadata.">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {logs.map(log => {
              const isOpen = open[log.id]
              return (
                <li key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setOpen(o => ({ ...o, [log.id]: !o[log.id] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                      padding: '14px 24px', textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--t1)',
                    }}
                  >
                    <span style={{
                      fontSize: 12, fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                      color: 'var(--purple)', fontWeight: 700,
                      minWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{log.action}</span>
                    <span style={{ fontSize: 12, color: 'var(--t3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.entity_type
                        ? <><span style={{ color: 'var(--t4)' }}>{log.entity_type}</span>{log.entity_id ? <> · <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{log.entity_id}</span></> : null}</>
                        : <span style={{ color: 'var(--t4)' }}>—</span>}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--t3)', minWidth: 140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {log.actor_email || <span style={{ color: 'var(--t4)' }}>system</span>}
                    </span>
                    {log.ip_address && (
                      <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Globe size={11} /> {log.ip_address}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--t4)', minWidth: 80, textAlign: 'right', fontVariantNumeric:'tabular-nums' }}>{fmtAge(log.created_at)}</span>
                    <ChevronDown size={14} style={{ color: 'var(--t4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }} />
                  </button>
                  {isOpen && (
                    <pre style={{
                      margin: 0, padding: 16,
                      fontSize: 11, color: 'var(--t2)',
                      background: 'var(--bg2)', borderTop: '1px solid var(--border)',
                      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                      overflow: 'auto', maxHeight: 320, lineHeight: 1.55,
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
