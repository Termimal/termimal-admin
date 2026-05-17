'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/alerts — server-side critical alerts that blocked real
 * users. Different from /admin/errors which logs client-side
 * uncaught errors; this surface is for backend regressions
 * (middleware crashes, signup precheck failures, adapter outages).
 *
 * Each alert is deduped by source + normalized message — same root
 * cause aggregates into one row with count, first_seen_at,
 * last_seen_at. Super_admins get emailed on first occurrence + at
 * 10×/100×/1000× milestones.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  AlertOctagon, RefreshCw, Check, ChevronDown, Mail, Clock,
  AlertTriangle, Activity,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface AlertRow {
  id:               string
  message_hash:     string
  severity:         string
  source:           string
  message:          string
  stack:            string | null
  url:              string | null
  user_agent:       string | null
  ip_text:          string | null
  count:            number
  first_seen_at:    string
  last_seen_at:     string
  notified_count:   number
  last_notified_at: string | null
  resolved_at:      string | null
  resolved_by:      string | null
  resolved_note:    string | null
  metadata:         Record<string, unknown> | null
}

interface Totals { open: number; resolved: number; critical: number; occurrences_24h: number }

function fmtAge(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const SEVERITY_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  error:    { fg: 'var(--amber)', bg: 'var(--amber-bg)', border: 'rgba(251,191,36,0.3)' },
  critical: { fg: 'var(--red)',   bg: 'var(--red-bg)',   border: 'rgba(248,113,113,0.3)' },
}

export default function AlertsPage() {
  const [alerts,   setAlerts]   = useState<AlertRow[]>([])
  const [totals,   setTotals]   = useState<Totals | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState('')
  const [status,   setStatus]   = useState<'open' | 'resolved'>('open')
  const [openId,   setOpenId]   = useState<string | null>(null)
  const [acting,   setActing]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`/api/admin/alerts?status=${status}`, { cache: 'no-store' })
      const j = await r.json() as { alerts?: AlertRow[]; totals?: Totals; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setAlerts(j.alerts || [])
      setTotals(j.totals || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id: string, action: 'resolve' | 'reopen') => {
    setActing(id)
    try {
      await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      void load()
    } finally {
      setActing(null)
    }
  }

  const grouped = useMemo(() => {
    const m = new Map<string, AlertRow[]>()
    for (const a of alerts) {
      const arr = m.get(a.source) ?? []
      arr.push(a)
      m.set(a.source, arr)
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [alerts])

  return (
    <div>
      <HeroCard
        accent="red"
        icon={<AlertOctagon size={28}/>}
        eyebrow="Reliability"
        title="Critical alerts"
        subtitle="Server-side errors that blocked real users. Deduped by source + message; super_admins get emailed on first occurrence and at 10×/100×/1000× milestones. Resolve here to dismiss notifications."
        metric={{
          label:     'Open',
          value:     (totals?.open ?? 0).toLocaleString(),
          secondary: totals?.critical
            ? <span style={{ color: 'var(--red)', fontWeight: 700 }}>{totals.critical} critical</span>
            : `${(totals?.occurrences_24h ?? 0).toLocaleString()} occurrences`,
        }}
      />

      <div className="card-premium" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {(['open', 'resolved'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: 11, minHeight: 28, textTransform: 'capitalize',
              background:   status === s ? 'var(--red-bg)' : undefined,
              color:        status === s ? 'var(--red)'    : undefined,
              borderColor:  status === s ? 'rgba(248,113,113,0.4)' : undefined,
            }}
          >{s}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', minHeight: 30 }} onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }}/>
          ))}
        </div>
      ) : err ? (
        <EmptyState icon={<AlertOctagon size={20}/>} title="Couldn't load" description={err}/>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Check size={20}/>}
          title={status === 'open' ? 'No open alerts' : 'No resolved alerts'}
          description={status === 'open' ? 'Nothing blocking users right now.' : 'Resolved alerts will appear here for retrospection.'}
        />
      ) : (
        grouped.map(([source, rows]) => (
          <Section
            key={source}
            accent="red"
            title={source}
            description={`${rows.length} ${rows.length === 1 ? 'alert' : 'alerts'} · ${rows.reduce((s, r) => s + r.count, 0)} total occurrences`}
            flush
          >
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden',
            }}>
              {rows.map(a => {
                const tone   = SEVERITY_TONE[a.severity] ?? SEVERITY_TONE.error
                const isOpen = openId === a.id
                return (
                  <div key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : a.id)}
                      style={{
                        width: '100%', textAlign: 'left',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                        color: 'inherit',
                      }}
                    >
                      <span style={{
                        padding: '3px 10px', borderRadius: 999,
                        background: tone.bg, color: tone.fg,
                        border: `1px solid ${tone.border}`,
                        fontSize: 10.5, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        flexShrink: 0,
                      }}>{a.severity}</span>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{
                          fontSize: 13.5, fontWeight: 600, color: 'var(--t1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{a.message}</div>
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Activity size={10}/> ×{a.count}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={10}/> last {fmtAge(a.last_seen_at)}
                          </span>
                          <span>first {fmtAge(a.first_seen_at)}</span>
                          {a.notified_count > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--blue)' }}>
                              <Mail size={10}/> emailed ×{a.notified_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown size={14} style={{ color: 'var(--t4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }}/>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '12px 18px 16px', background: 'var(--bg3)' }}>
                        {a.url && (
                          <div style={{ marginBottom: 8, fontSize: 11.5 }}>
                            <strong style={{ color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10.5, marginRight: 6 }}>URL</strong>
                            <span style={{ color: 'var(--t2)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{a.url}</span>
                          </div>
                        )}
                        {a.ip_text && (
                          <div style={{ marginBottom: 8, fontSize: 11.5 }}>
                            <strong style={{ color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10.5, marginRight: 6 }}>IP</strong>
                            <span style={{ color: 'var(--t2)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{a.ip_text}</span>
                          </div>
                        )}
                        {a.stack && (
                          <pre style={{
                            margin: '10px 0 0', padding: '12px 14px',
                            borderRadius: 10,
                            background: 'var(--bg)', border: '1px solid var(--border)',
                            fontSize: 11, color: 'var(--t2)',
                            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                            overflow: 'auto', maxHeight: 320,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          }}>{a.stack}</pre>
                        )}
                        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                          {a.resolved_at ? (
                            <button
                              type="button"
                              onClick={() => act(a.id, 'reopen')}
                              disabled={acting === a.id}
                              className="btn btn-secondary btn-sm"
                              style={{ minHeight: 30 }}
                            >
                              <AlertTriangle size={12}/> Re-open
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => act(a.id, 'resolve')}
                              disabled={acting === a.id}
                              className="btn btn-secondary btn-sm"
                              style={{ minHeight: 30, color: 'var(--green)', borderColor: 'rgba(52,211,153,0.4)' }}
                            >
                              <Check size={12}/> Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>
        ))
      )}
    </div>
  )
}
