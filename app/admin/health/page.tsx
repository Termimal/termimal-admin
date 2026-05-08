'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, RefreshCw, CheckCircle2, XCircle, Calendar, Database, Globe } from 'lucide-react'
import { PageHeader, Section, EmptyState } from '@/components/admin/PageChrome'

interface ProbeResult { name: string; ok: boolean; latency_ms: number; status?: number; error?: string }
interface Health {
  generated_at:     string
  overall_ok:       boolean
  total_latency_ms: number
  probes:           Record<string, ProbeResult>
  audit_events_24h: number
  next_maintenance: { id: string; starts_at: string; ends_at: string; message: string; status: string } | null
}

export default function HealthPage() {
  const [data, setData]       = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await fetch('/api/admin/health', { cache: 'no-store' })
      const j = await r.json() as Health
      setData(j)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally    { setLoading(false) }
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Activity size={14} />}
        eyebrow="System Health"
        title="Live status"
        description="Probes Supabase + every upstream we depend on. Auto-refreshes every 30s."
        accent={data?.overall_ok ? 'green' : 'red'}
        actions={<button className="btn-secondary btn-sm" onClick={load} disabled={loading}><RefreshCw size={11}/> Refresh</button>}
      />

      {error && <div className="msg-err" style={{ marginBottom: 12 }}>✗ {error}</div>}

      {data && (
        <>
          {/* Overall card */}
          <Section accent={data.overall_ok ? 'green' : 'red'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {data.overall_ok ? <CheckCircle2 size={28} style={{ color: 'var(--green)' }} /> : <XCircle size={28} style={{ color: 'var(--red)' }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: data.overall_ok ? 'var(--green)' : 'var(--red)' }}>
                  {data.overall_ok ? 'All systems operational' : 'Degraded — see failing probe'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                  Probed in {data.total_latency_ms} ms · last check {new Date(data.generated_at).toLocaleTimeString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)' }}>{data.audit_events_24h}</div>
                <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>audit events 24h</div>
              </div>
            </div>
          </Section>

          {/* Per-probe cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            {Object.entries(data.probes).map(([name, p]) => {
              const ok = p.ok
              return (
                <div key={name} className="kpi-card" style={{ borderColor: ok ? 'var(--border)' : 'rgba(248,113,113,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    {name.includes('supabase') ? <Database size={13} style={{ color: ok ? 'var(--green)' : 'var(--red)' }} />
                                              : <Globe size={13}    style={{ color: ok ? 'var(--green)' : 'var(--red)' }} />}
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: ok ? 'var(--green)' : 'var(--red)' }}>
                      {ok ? 'OK' : 'DOWN'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                    {p.latency_ms} ms{p.status ? ` · ${p.status}` : ''}
                  </div>
                  {p.error && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{p.error}</div>}
                </div>
              )
            })}
          </div>

          {/* Next maintenance */}
          {data.next_maintenance && (
            <Section accent="amber" title="Next scheduled maintenance">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Calendar size={16} style={{ color: 'var(--amber)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{data.next_maintenance.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                    {new Date(data.next_maintenance.starts_at).toLocaleString()} → {new Date(data.next_maintenance.ends_at).toLocaleString()}
                  </div>
                </div>
                <span className="chip chip-amber" style={{ marginLeft: 'auto' }}>{data.next_maintenance.status}</span>
              </div>
            </Section>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <EmptyState icon={<Activity size={20}/>} title="No health data" description="Probe didn't return — try refresh." />
      )}
    </div>
  )
}
