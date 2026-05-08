'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Calendar,
  Database, Globe, Clock, TrendingUp,
} from 'lucide-react'
import { PageHeader, Section, EmptyState } from '@/components/admin/PageChrome'

interface ProbeResult {
  name:        string
  critical:    boolean
  ok:          boolean
  latency_ms:  number
  status?:     number
  error?:      string
}
interface Health {
  generated_at:     string
  overall_status:   'operational' | 'degraded' | 'down'
  overall_ok:       boolean
  total_latency_ms: number
  probes:           Record<string, ProbeResult>
  audit_events_24h: number
  next_maintenance: { id: string; starts_at: string; ends_at: string; message: string; status: string } | null
}

const PROBE_META: Record<string, { title: string; subtitle: string; icon: 'database' | 'globe' }> = {
  supabase:           { title: 'Supabase',          subtitle: 'Auth & primary database',     icon: 'database' },
  'polymarket-gamma': { title: 'Polymarket Gamma',  subtitle: 'Prediction-market data feed', icon: 'globe'    },
  'fred-csv':         { title: 'FRED Economic Data', subtitle: 'Macro indicators (St Louis Fed)', icon: 'globe' },
  dbnomics:           { title: 'DBnomics',          subtitle: 'Macro data backup',           icon: 'globe'    },
}

function statusColor(status: Health['overall_status']) {
  return status === 'operational' ? 'var(--green)'
       : status === 'degraded'    ? 'var(--amber)'
       : 'var(--red)'
}
function statusBg(status: Health['overall_status']) {
  return status === 'operational' ? 'var(--green-bg)'
       : status === 'degraded'    ? 'var(--amber-bg)'
       : 'var(--red-bg)'
}
function statusLabel(status: Health['overall_status']) {
  return status === 'operational' ? 'All systems operational'
       : status === 'degraded'    ? 'Operational with degraded upstreams'
       : 'Critical outage'
}
function statusIcon(status: Health['overall_status']) {
  return status === 'operational' ? <CheckCircle2 size={32} />
       : status === 'degraded'    ? <AlertTriangle size={32} />
       : <XCircle        size={32} />
}

export default function HealthPage() {
  const [data, setData]       = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setRefreshing(true)
    try {
      const r = await fetch('/api/admin/health', { cache: 'no-store' })
      const j = await r.json() as Health
      setData(j)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally    { setLoading(false); setRefreshing(false) }
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const status = data?.overall_status ?? 'operational'
  const accent = status === 'operational' ? 'green' : status === 'degraded' ? 'amber' : 'red'

  return (
    <div>
      <PageHeader
        icon={<Activity size={16} />}
        eyebrow="System health"
        title="Live status"
        description="Continuous probes of Supabase + every upstream we depend on. Auto-refreshes every 30 seconds."
        accent={accent}
        actions={
          <button
            className="btn btn-secondary btn-sm"
            onClick={load}
            disabled={refreshing}
            style={{ minHeight: 38 }}
          >
            <RefreshCw size={13} style={refreshing ? { animation: 'admin-spin 1s linear infinite' } : undefined} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 'var(--r-md)',
          background: 'var(--red-bg)',
          color: 'var(--red)',
          marginBottom: 28,
          fontSize: 14,
          fontWeight: 600,
        }}>✗ {error}</div>
      )}

      {data && (
        <>
          {/* Hero status panel */}
          <div
            className="card-premium"
            style={{
              padding: '36px 40px',
              marginBottom: 28,
              borderColor: statusColor(status) + '44',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{
                width: 64, height: 64,
                borderRadius: 20,
                background: statusBg(status),
                border: `1px solid ${statusColor(status)}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: statusColor(status),
                boxShadow: `0 0 24px -4px ${statusColor(status)}55`,
                flexShrink: 0,
              }}>
                {statusIcon(status)}
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: statusColor(status), marginBottom: 6,
                }}>
                  {status}
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 800, color: 'var(--t1)',
                  letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 8,
                }}>
                  {statusLabel(status)}
                </div>
                <div style={{ fontSize: 14, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} />
                  Probed in {data.total_latency_ms} ms · last check {new Date(data.generated_at).toLocaleTimeString()}
                </div>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                paddingLeft: 24, borderLeft: '1px solid var(--border)',
                minWidth: 140,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 8,
                }}>
                  Audit · 24h
                </div>
                <div style={{
                  fontSize: 36, fontWeight: 800, color: 'var(--t1)',
                  letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>
                  {data.audit_events_24h.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={11} /> events
                </div>
              </div>
            </div>
          </div>

          {/* Per-probe grid */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <h2 style={{
                fontSize: 18, fontWeight: 700, color: 'var(--t1)',
                letterSpacing: '-0.015em', margin: 0,
              }}>
                Probes
              </h2>
              <div style={{ fontSize: 13, color: 'var(--t3)' }}>
                {Object.values(data.probes).filter(p => p.ok).length} of {Object.values(data.probes).length} healthy
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {Object.entries(data.probes).map(([name, p]) => {
                const meta = PROBE_META[name] ?? { title: name, subtitle: '', icon: 'globe' as const }
                const tone = p.ok ? 'green' : p.critical ? 'red' : 'amber'
                const toneColor = tone === 'green' ? 'var(--green)' : tone === 'amber' ? 'var(--amber)' : 'var(--red)'
                const toneBg    = tone === 'green' ? 'var(--green-bg)' : tone === 'amber' ? 'var(--amber-bg)' : 'var(--red-bg)'
                const Icon = meta.icon === 'database' ? Database : Globe
                return (
                  <div
                    key={name}
                    className="card-premium"
                    style={{
                      padding: '22px 24px',
                      borderColor: !p.ok ? toneColor + '44' : 'var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: toneBg,
                        border: `1px solid ${toneColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: toneColor,
                        flexShrink: 0,
                      }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 15, fontWeight: 700, color: 'var(--t1)',
                            letterSpacing: '-0.005em',
                          }}>
                            {meta.title}
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 999,
                            background: toneBg, color: toneColor,
                            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: toneColor,
                              boxShadow: p.ok ? `0 0 6px ${toneColor}` : 'none',
                              animation: p.ok ? 'admin-pulse 1.6s ease-in-out infinite' : undefined,
                            }} />
                            {p.ok ? 'OK' : p.critical ? 'DOWN' : 'DEGRADED'}
                          </span>
                        </div>
                        {meta.subtitle && (
                          <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 10, lineHeight: 1.5 }}>
                            {meta.subtitle}
                          </div>
                        )}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          fontSize: 12, color: 'var(--t4)',
                          fontFamily: 'ui-monospace, Menlo, monospace',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          <span>⏱ {p.latency_ms} ms</span>
                          {p.status && <span>· HTTP {p.status}</span>}
                          {!p.critical && <span style={{ color: 'var(--t4)' }}>· third-party</span>}
                        </div>
                        {p.error && (
                          <div style={{
                            marginTop: 10, padding: '8px 12px',
                            background: 'var(--red-bg)', color: 'var(--red)',
                            borderRadius: 8, fontSize: 11,
                            fontFamily: 'ui-monospace, Menlo, monospace',
                            wordBreak: 'break-word',
                          }}>
                            {p.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Next maintenance */}
          {data.next_maintenance && (
            <Section accent="amber" title="Next scheduled maintenance">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'var(--amber-bg)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--amber)',
                  flexShrink: 0,
                }}>
                  <Calendar size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
                    {data.next_maintenance.message}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--t3)' }}>
                    {new Date(data.next_maintenance.starts_at).toLocaleString()} → {new Date(data.next_maintenance.ends_at).toLocaleString()}
                  </div>
                </div>
                <span className="chip chip-amber" style={{ fontSize: 12, padding: '6px 14px' }}>
                  {data.next_maintenance.status}
                </span>
              </div>
            </Section>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <EmptyState
          icon={<Activity size={20}/>}
          title="No health data yet"
          description="Probe didn't return — try refresh."
        />
      )}

      <style>{`
        @keyframes admin-spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
