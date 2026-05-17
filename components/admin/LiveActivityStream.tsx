'use client'

/**
 * LiveActivityStream — dashboard widget that shows the most recent
 * 12 audit_log entries and polls every 10s while the tab is focused.
 *
 * Pauses when the document is hidden so a backgrounded tab doesn't
 * burn calls to /api/admin/audit-log. Rows that arrived since the
 * last fetch get a soft fade-in so it's obvious what just happened.
 *
 * Each row shows: action (color-coded by family), actor email,
 * entity type/id, and relative timestamp. Clicking the row jumps
 * to the actor's profile if we have a user_id, otherwise to the
 * full audit log filtered to that action.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Activity, RefreshCw, Pause, Play, ArrowRight } from 'lucide-react'

interface AuditRow {
  id:           string
  user_id:      string | null
  action:       string
  entity_type:  string | null
  entity_id:    string | null
  created_at:   string
  actor_email:  string | null
}

const POLL_MS = 10_000

// Color buckets by action prefix. Anything not matched defaults to
// neutral. Keeping this tiny so adding new actions doesn't require
// touching the renderer.
function toneFor(action: string): { fg: string; bg: string } {
  if (action.startsWith('auth.')      ) return { fg: 'var(--blue)',  bg: 'var(--blue-bg)'  }
  if (action.startsWith('payment.')   ) return { fg: 'var(--green)', bg: 'var(--green-bg)' }
  if (action.startsWith('refund.')    ) return { fg: 'var(--amber)', bg: 'var(--amber-bg)' }
  if (action.startsWith('admin.')     ) return { fg: 'var(--purple)',bg: 'var(--purple-bg)'}
  if (action.startsWith('user.')      ) return { fg: 'var(--acc)',   bg: 'var(--acc-bg)'   }
  if (action.startsWith('social.')    ) return { fg: 'var(--purple)',bg: 'var(--purple-bg)'}
  if (action.startsWith('cron.')      ) return { fg: 'var(--blue)',  bg: 'var(--blue-bg)'  }
  if (action.startsWith('security.')  ) return { fg: 'var(--red)',   bg: 'var(--red-bg)'   }
  if (action.startsWith('subscription.')) return { fg: 'var(--green)',bg: 'var(--green-bg)' }
  return { fg: 'var(--t3)', bg: 'var(--surface2)' }
}

function fmtAge(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 5)     return 'just now'
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function LiveActivityStream() {
  const [rows,    setRows]    = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [paused,  setPaused]  = useState(false)
  const [err,     setErr]     = useState('')
  const lastIdsRef = useRef<Set<string>>(new Set())
  // Tracks which rows arrived since the last successful fetch so we
  // can animate them in. Set, not array, because lookups are hot in
  // render and we don't care about ordering here.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())

  const fetchRows = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/audit-log?limit=12', { cache: 'no-store' })
      const j = await r.json() as { logs?: AuditRow[]; error?: string }
      if (!r.ok || j.error) {
        setErr(j.error || `HTTP ${r.status}`)
        setLoading(false)
        return
      }
      const next = j.logs || []
      // Compute which IDs are new compared to what we had.
      const prev = lastIdsRef.current
      const fresh = new Set<string>()
      for (const row of next) {
        if (!prev.has(row.id)) fresh.add(row.id)
      }
      // First load is not "fresh" — only animate from the 2nd tick on.
      if (prev.size === 0) fresh.clear()
      lastIdsRef.current = new Set(next.map(r => r.id))
      setRows(next)
      setFreshIds(fresh)
      setErr('')
      // Clear fade-in highlights after 1.5s.
      if (fresh.size > 0) {
        setTimeout(() => setFreshIds(new Set()), 1500)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + polling. Polling pauses when the doc is hidden so
  // a backgrounded tab doesn't burn quota.
  useEffect(() => {
    fetchRows()
    if (paused) return
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (!timer) timer = setInterval(() => {
        if (document.visibilityState === 'visible') fetchRows()
      }, POLL_MS)
    }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }
    start()
    const onVis = () => {
      if (document.visibilityState === 'visible') { fetchRows(); start() } else { stop() }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [fetchRows, paused])

  return (
    <div className="card-premium" style={{ padding: 0, overflow: 'hidden', marginBottom: 32 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', borderBottom: '1px solid var(--border)',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'var(--acc-bg)', border: '1px solid var(--acc-border)',
            color: 'var(--acc)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={17}/>
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.015em' }}>
              Live activity
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--t4)' }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: paused ? 'var(--t4)' : 'var(--green)',
                marginRight: 6, verticalAlign: 'middle',
                boxShadow: paused ? 'none' : '0 0 6px var(--green)',
                animation: paused ? 'none' : 'admin-pulse 1.6s ease-in-out infinite',
              }}/>
              {paused ? 'Paused' : 'Streaming · refreshes every 10s'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setPaused(p => !p)}
            className="btn btn-secondary btn-sm"
            style={{ minHeight: 32 }}
            aria-label={paused ? 'Resume polling' : 'Pause polling'}
          >
            {paused ? <Play size={12}/> : <Pause size={12}/>} {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={fetchRows}
            className="btn btn-secondary btn-sm"
            style={{ minHeight: 32 }}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
          <Link
            href="/admin/audit-log"
            className="btn btn-secondary btn-sm"
            style={{ minHeight: 32, color: 'var(--acc)' }}
          >
            Full log <ArrowRight size={11}/>
          </Link>
        </div>
      </div>

      {/* Body */}
      {err && (
        <div style={{ padding: '14px 24px', color: 'var(--red)', fontSize: 12.5, fontWeight: 600 }}>{err}</div>
      )}

      {!err && loading && (
        <div style={{ padding: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 38, borderRadius: 10, marginBottom: 6 }}/>
          ))}
        </div>
      )}

      {!err && !loading && rows.length === 0 && (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
          No activity in the audit log yet.
        </div>
      )}

      {!err && !loading && rows.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {rows.map((row) => {
            const tone = toneFor(row.action)
            const isFresh = freshIds.has(row.id)
            const href = row.user_id
              ? `/admin/users/${row.user_id}`
              : `/admin/audit-log?q=${encodeURIComponent(row.action)}`
            return (
              <li key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                <Link
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 24px',
                    textDecoration: 'none', color: 'inherit',
                    background: isFresh ? 'var(--acc-bg)' : 'transparent',
                    transition: 'background 1.2s ease-out',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 10px', borderRadius: 999,
                    background: tone.bg, color: tone.fg,
                    border: `1px solid ${tone.fg}33`,
                    fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                    flexShrink: 0, minWidth: 0, maxWidth: 200,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {row.action}
                  </span>
                  <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: 13, color: 'var(--t2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {row.actor_email ? (
                      <>
                        <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{row.actor_email}</span>
                        {row.entity_type && (
                          <>
                            <span style={{ color: 'var(--t4)' }}>{' on '}</span>
                            <span style={{ color: 'var(--t3)' }}>{row.entity_type}</span>
                          </>
                        )}
                      </>
                    ) : row.entity_type ? (
                      <>
                        <span style={{ color: 'var(--t4)' }}>system · </span>
                        <span style={{ color: 'var(--t3)' }}>{row.entity_type}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--t4)' }}>system</span>
                    )}
                  </span>
                  <span style={{
                    fontSize: 11.5, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}>
                    {fmtAge(row.created_at)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
