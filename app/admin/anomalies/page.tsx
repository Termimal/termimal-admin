'use client'

/**
 * /admin/anomalies — anomaly detection feed.
 *
 * Polls /api/admin/anomalies every 30 s, renders alerts grouped by
 * severity. Every alert has a title (the headline), a detail
 * paragraph (the why), and a context object that the user can
 * inspect inline. Some alert types render a "Drill in" link that
 * deep-links to the relevant admin page (e.g. EMAIL_DOMAIN_CLUSTER
 * → /admin/users?search=@domain).
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ShieldAlert, Activity, RefreshCw, Eye, EyeOff, Users, CreditCard, Globe, MapPin, Clock, ArrowUpRight } from 'lucide-react'

import { HeroCard } from '@/components/admin/PageChrome'
interface Anomaly {
  id:           string
  type:         string
  severity:     'info' | 'warn' | 'critical'
  title:        string
  detail:       string
  observed_at:  string
  context:      Record<string, unknown>
}

interface ApiResponse {
  anomalies:        Anomaly[]
  counts:           { critical: number; warn: number; info: number; total: number }
  detector_errors:  string[]
  generated_at:     string
}

const SEVERITY: Record<Anomaly['severity'], { color: string; bg: string; border: string; label: string; icon: typeof AlertTriangle }> = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.35)', label: 'Critical', icon: ShieldAlert },
  warn:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.35)',  label: 'Warning',  icon: AlertTriangle },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.35)',  label: 'Info',     icon: Activity },
}

const TYPE_ICON: Record<string, typeof AlertTriangle> = {
  SIGNUP_BURST:         Users,
  EMAIL_DOMAIN_CLUSTER: Users,
  DISPOSABLE_ESCAPE:    ShieldAlert,
  TRIAL_STRANDED:       Clock,
  FAILED_PAYMENT_SURGE: CreditCard,
  IP_DENSITY:           Globe,
  CROSS_COUNTRY_LOGIN:  MapPin,
}

function fmtAge(ts: string): string {
  const ms = Date.now() - Date.parse(ts)
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60)        return 'just now'
  if (s < 3600)      return `${Math.floor(s / 60)}m ago`
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** Build a context-aware deep link for an anomaly type. */
function drillHref(a: Anomaly): string | null {
  const ctx = a.context as Record<string, unknown>
  switch (a.type) {
    case 'EMAIL_DOMAIN_CLUSTER':
      return `/admin/users?search=${encodeURIComponent('@' + (ctx.domain as string))}`
    case 'DISPOSABLE_ESCAPE':
    case 'CROSS_COUNTRY_LOGIN':
      return ctx.user_id ? `/admin/users/${ctx.user_id}` : null
    case 'IP_DENSITY':
      return ctx.user_ids ? `/admin/users?search=${encodeURIComponent((ctx.user_ids as string[])[0] || '')}` : null
    case 'TRIAL_STRANDED':
      return `/admin/users?search=trialing`
    case 'FAILED_PAYMENT_SURGE':
      return `/admin/payments`
    default:
      return null
  }
}

export default function AnomaliesPage() {
  const [data, setData]       = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [reveal, setReveal]   = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await fetch('/api/admin/anomalies', { cache: 'no-store' })
      const j = await r.json() as ApiResponse | { error?: string }
      if (!r.ok || (j as { error?: string }).error) {
        setError((j as { error?: string }).error || `HTTP ${r.status}`)
      } else {
        setData(j as ApiResponse)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  const grouped = useMemo(() => {
    const out: Record<Anomaly['severity'], Anomaly[]> = { critical: [], warn: [], info: [] }
    for (const a of data?.anomalies ?? []) out[a.severity].push(a)
    return out
  }, [data])

  return (
    <div style={{ maxWidth: 1100 }}>
      <HeroCard
        accent='red'
        icon={<ShieldAlert size={28} />}
        eyebrow='Detection'
        title='Anomalies'
        subtitle='Suspicious signups, abuse patterns, and integrity flags computed from profiles.'
      />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <ShieldAlert size={16} style={{ color: 'var(--acc)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--acc)', letterSpacing: '1px', textTransform: 'uppercase' }}>Anomaly Detection</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Live alerts</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            Seven detectors running over the last 24 h of signups, logins, and Stripe events.{' '}
            {data?.generated_at && <span style={{ color: 'var(--t4)' }}>Last run {fmtAge(data.generated_at)}.</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
        {(['critical', 'warn', 'info'] as const).map(sev => {
          const meta = SEVERITY[sev]
          const Icon = meta.icon
          const count = data?.counts[sev] ?? 0
          return (
            <div key={sev} style={{
              padding: 16, borderRadius: 12,
              background: meta.bg, border: `1px solid ${meta.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: meta.color }}>{meta.label}</span>
                <Icon size={14} style={{ color: meta.color }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: meta.color }}>{count}</div>
            </div>
          )
        })}
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--t4)' }}>Total open</span>
            <Activity size={14} style={{ color: 'var(--t4)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--t1)' }}>{data?.counts.total ?? 0}</div>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 8,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171', fontSize: 12,
        }}>
          ✗ {error}
        </div>
      )}
      {data?.detector_errors && data.detector_errors.length > 0 && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 8,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24', fontSize: 12,
        }}>
          {data.detector_errors.length} detector{data.detector_errors.length === 1 ? '' : 's'} failed silently this poll. Re-run if needed.
        </div>
      )}

      {/* Alert list */}
      {!loading && data && data.counts.total === 0 && !error && (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>All clear</h2>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>No anomalies detected over the last 24 hours.</p>
        </div>
      )}

      {(['critical', 'warn', 'info'] as const).map(sev => {
        const list = grouped[sev]
        if (list.length === 0) return null
        const meta = SEVERITY[sev]
        return (
          <section key={sev} style={{ marginBottom: 24 }}>
            <h2 style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
              color: meta.color, marginBottom: 10,
            }}>
              {meta.label} ({list.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {list.map(a => {
                const TypeIcon = TYPE_ICON[a.type] ?? AlertTriangle
                const href = drillHref(a)
                const isOpen = reveal[a.id] ?? false
                return (
                  <article key={a.id} style={{
                    padding: 14, borderRadius: 10,
                    background: 'var(--surface)', border: `1px solid ${meta.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ padding: 8, borderRadius: 8, background: meta.bg, flexShrink: 0 }}>
                        <TypeIcon size={14} style={{ color: meta.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 10, marginBottom: 4,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{a.title}</span>
                          <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>{fmtAge(a.observed_at)}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0, lineHeight: 1.5 }}>{a.detail}</p>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12, marginTop: 8,
                          fontSize: 11,
                        }}>
                          <span style={{
                            padding: '2px 6px', borderRadius: 4,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            color: 'var(--t4)', fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 10, letterSpacing: '0.04em',
                          }}>{a.type}</span>
                          {href && (
                            <Link href={href} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              color: 'var(--acc)', textDecoration: 'none',
                            }}>
                              Drill in <ArrowUpRight size={11} />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setReveal(s => ({ ...s, [a.id]: !s[a.id] }))}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: 'var(--t4)', fontSize: 11, padding: 0,
                            }}
                          >
                            {isOpen ? <EyeOff size={11} /> : <Eye size={11} />}
                            {isOpen ? 'Hide context' : 'Show context'}
                          </button>
                        </div>
                        {isOpen && (
                          <pre style={{
                            margin: '10px 0 0', padding: 10, borderRadius: 6,
                            background: 'var(--bg, #0d1117)', border: '1px solid var(--border)',
                            fontSize: 10, color: 'var(--t3)', overflow: 'auto',
                            fontFamily: 'var(--font-mono, monospace)', lineHeight: 1.5,
                            maxHeight: 220,
                          }}>
                            {JSON.stringify(a.context, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        .spin { animation: spin 1s linear infinite }
      `}</style>
    </div>
  )
}
