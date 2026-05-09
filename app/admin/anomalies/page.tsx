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
import { AlertTriangle, ShieldAlert, Activity, RefreshCw, Eye, EyeOff, Users, CreditCard, Globe, MapPin, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react'

import { HeroCard, Section, EmptyState, ItemGrid } from '@/components/admin/PageChrome'

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

const SEVERITY: Record<Anomaly['severity'], { fg: string; bg: string; border: string; label: string; icon: typeof AlertTriangle }> = {
  critical: { fg: 'var(--red)',   bg: 'var(--red-bg)',   border: 'rgba(248,113,113,0.35)', label: 'Critical', icon: ShieldAlert   },
  warn:     { fg: 'var(--amber)', bg: 'var(--amber-bg)', border: 'rgba(251,191,36,0.35)',  label: 'Warning',  icon: AlertTriangle },
  info:     { fg: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'rgba(96,165,250,0.35)',  label: 'Info',     icon: Activity      },
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

  const total = data?.counts.total ?? 0

  return (
    <div>
      <HeroCard
        accent="red"
        icon={<ShieldAlert size={28} />}
        eyebrow="Anomaly detection"
        title="Live alerts"
        subtitle={
          <>
            Seven detectors running over the last 24h of signups, logins, and Stripe events.
            {data?.generated_at && <> Last run {fmtAge(data.generated_at)}.</>}
          </>
        }
        metric={{
          label: 'Open alerts',
          value: total.toString(),
          secondary: `${data?.counts.critical ?? 0} critical · ${data?.counts.warn ?? 0} warn`,
        }}
      />

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={load}
          disabled={loading}
          style={{ minHeight:38 }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <ItemGrid min={200}>
        {(['critical', 'warn', 'info'] as const).map(sev => {
          const meta = SEVERITY[sev]
          const Icon = meta.icon
          const count = data?.counts[sev] ?? 0
          return (
            <div key={sev} className="card-premium" style={{
              padding: '24px 28px',
              borderColor: meta.border,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: meta.fg,
                }}>{meta.label}</span>
                <Icon size={16} style={{ color: meta.fg }} />
              </div>
              <div style={{
                fontSize: 36, fontWeight: 800, color: meta.fg,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1,
              }}>{count}</div>
            </div>
          )
        })}
        <div className="card-premium" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--t4)',
            }}>Total open</span>
            <Activity size={16} style={{ color: 'var(--t4)' }} />
          </div>
          <div style={{
            fontSize: 36, fontWeight: 800, color: 'var(--t1)',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1,
          }}>{total}</div>
        </div>
      </ItemGrid>

      <div style={{ height: 24 }} />

      {error && (
        <div className="card-premium" style={{
          padding: '14px 18px', marginBottom: 20,
          borderColor: 'var(--red)44',
          color: 'var(--red)', fontSize: 13, fontWeight: 600,
        }}>
          {error}
        </div>
      )}
      {data?.detector_errors && data.detector_errors.length > 0 && (
        <div className="card-premium" style={{
          padding: '14px 18px', marginBottom: 20,
          borderColor: 'var(--amber)44',
          color: 'var(--amber)', fontSize: 13, fontWeight: 600,
        }}>
          {data.detector_errors.length} detector{data.detector_errors.length === 1 ? '' : 's'} failed silently this poll. Re-run if needed.
        </div>
      )}

      {!loading && data && total === 0 && !error && (
        <EmptyState
          icon={<CheckCircle2 size={20}/>}
          title="All clear"
          description="No anomalies detected over the last 24 hours."
        />
      )}

      {(['critical', 'warn', 'info'] as const).map(sev => {
        const list = grouped[sev]
        if (list.length === 0) return null
        const meta = SEVERITY[sev]
        return (
          <Section
            key={sev}
            accent={sev === 'critical' ? 'red' : sev === 'warn' ? 'amber' : 'blue'}
            title={`${meta.label} (${list.length})`}
            description={sev === 'critical' ? 'Immediate attention recommended.' : sev === 'warn' ? 'Review when convenient.' : 'Informational signals.'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {list.map(a => {
                const TypeIcon = TYPE_ICON[a.type] ?? AlertTriangle
                const href = drillHref(a)
                const isOpen = reveal[a.id] ?? false
                return (
                  <article key={a.id} className="card-premium" style={{
                    padding: '18px 22px',
                    borderColor: meta.border,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: meta.bg,
                        border: `1px solid ${meta.fg}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: meta.fg, flexShrink: 0,
                      }}>
                        <TypeIcon size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 10, marginBottom: 4, flexWrap: 'wrap',
                        }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{a.title}</span>
                          <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap', fontVariantNumeric:'tabular-nums' }}>{fmtAge(a.observed_at)}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0, lineHeight: 1.55 }}>{a.detail}</p>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 14, marginTop: 12,
                          fontSize: 12, flexWrap: 'wrap',
                        }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 999,
                            background: 'var(--surface2)', border: '1px solid var(--border)',
                            color: 'var(--t3)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                            fontSize: 10, letterSpacing: '0.04em',
                          }}>{a.type}</span>
                          {href && (
                            <Link href={href} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              color: 'var(--acc)', textDecoration: 'none', fontWeight: 600,
                            }}>
                              Drill in <ArrowUpRight size={12} />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setReveal(s => ({ ...s, [a.id]: !s[a.id] }))}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: 'var(--t4)', fontSize: 12, padding: 0, fontWeight: 500,
                            }}
                          >
                            {isOpen ? <EyeOff size={12} /> : <Eye size={12} />}
                            {isOpen ? 'Hide context' : 'Show context'}
                          </button>
                        </div>
                        {isOpen && (
                          <pre style={{
                            margin: '12px 0 0', padding: 12, borderRadius: 10,
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                            fontSize: 11, color: 'var(--t3)', overflow: 'auto',
                            fontFamily: 'ui-monospace, Menlo, Consolas, monospace', lineHeight: 1.55,
                            maxHeight: 240,
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
          </Section>
        )
      })}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        .spin { animation: spin 1s linear infinite }
      `}</style>
    </div>
  )
}
