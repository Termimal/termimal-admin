'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/api-health — live latency + status probe across the admin
 * API surface. Refreshes every 30s. Auto-pauses when the tab is
 * hidden to stop burning Workers requests.
 *
 * Different from /admin/health (which probes upstream Supabase /
 * Stripe / external services). This one is "is OUR admin API
 * surface healthy and responsive".
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Activity, RefreshCw, CheckCircle2, XCircle, Zap, Pause, Play,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Probe {
  name:        string
  path:        string
  ok:          boolean
  status:      number | null
  latency_ms:  number
  error?:      string
}

interface Summary {
  total:        number
  ok:           number
  failed:       number
  avg_latency:  number
  slowest:      { name: string; latency_ms: number } | null
  generated_at: string
  total_ms:     number
}

const POLL_MS = 30_000

function toneFor(p: Probe): { fg: string; bg: string } {
  if (!p.ok)               return { fg: 'var(--red)',   bg: 'var(--red-bg)'    }
  if (p.latency_ms > 2000) return { fg: 'var(--amber)', bg: 'var(--amber-bg)'  }
  if (p.latency_ms > 800)  return { fg: 'var(--blue)',  bg: 'var(--blue-bg)'   }
  return                          { fg: 'var(--green)', bg: 'var(--green-bg)'  }
}

export default function ApiHealthPage() {
  const [probes,  setProbes]  = useState<Probe[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')
  const [paused,  setPaused]  = useState(false)

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await fetch('/api/admin/api-health', { cache: 'no-store' })
      const j = await r.json() as { probes?: Probe[]; summary?: Summary; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setProbes(j.probes || [])
      setSummary(j.summary || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    if (paused) return
    let t: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!t) t = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS) }
    const stop  = () => { if (t) { clearInterval(t); t = null } }
    start()
    const onVis = () => {
      if (document.visibilityState === 'visible') { load(); start() } else { stop() }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [load, paused])

  const overallOk = summary ? summary.failed === 0 : true

  return (
    <div>
      <HeroCard
        accent={overallOk ? 'green' : 'red'}
        icon={<Activity size={28}/>}
        eyebrow="Observability"
        title="API health"
        subtitle="Live latency and status across the admin API surface. Probes from the Workers runtime against this same deployment, so the round-trip mirrors a real client. Polls every 30s; pauses when the tab is hidden."
        metric={{
          label: overallOk ? 'All green' : 'Failing probes',
          value: summary ? `${summary.ok}/${summary.total}` : '—',
          secondary: summary ? `avg ${summary.avg_latency}ms` : '—',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="btn btn-secondary btn-sm"
          style={{ minHeight: 32 }}
        >
          {paused ? <Play size={12}/> : <Pause size={12}/>} {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={load}
          className="btn btn-secondary btn-sm"
          style={{ minHeight: 32 }}
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {err && <div className="msg-err" style={{ marginBottom: 16 }}>{err}</div>}

      {summary && (
        <div className="card-premium" style={{
          padding: '18px 22px', marginBottom: 22,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 18,
        }}>
          <Stat label="Probes" icon={<Activity size={14}/>} value={`${summary.total}`} sub="endpoints" tone="blue"/>
          <Stat label="Healthy" icon={<CheckCircle2 size={14}/>} value={`${summary.ok}`} sub={`of ${summary.total}`} tone="green"/>
          <Stat label="Failed"  icon={<XCircle size={14}/>}      value={`${summary.failed}`}
            sub={summary.failed === 0 ? 'none' : 'see below'}
            tone={summary.failed === 0 ? 'green' : 'red'}/>
          <Stat label="Avg latency" icon={<Zap size={14}/>} value={`${summary.avg_latency}ms`}
            sub={summary.slowest ? `slowest: ${summary.slowest.name} ${summary.slowest.latency_ms}ms` : '—'}
            tone={summary.avg_latency > 1500 ? 'amber' : 'green'}/>
        </div>
      )}

      <Section
        accent={overallOk ? 'green' : 'red'}
        title="Endpoint probes"
        description={
          loading && probes.length === 0
            ? 'Probing…'
            : `${probes.length} endpoints · last at ${summary ? new Date(summary.generated_at).toLocaleTimeString() : '—'}`
        }
      >
        {loading && probes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 50, borderRadius: 12 }}/>
            ))}
          </div>
        ) : probes.length === 0 ? (
          <EmptyState icon={<Activity size={20}/>} title="No probes" description="The probe list is empty — that's odd. Check api-health route."/>
        ) : (
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '0.5fr 1.5fr 2.5fr 0.7fr 0.7fr 1fr',
              gap: 12, padding: '10px 18px',
              background: 'var(--bg3)', fontSize: 10.5, fontWeight: 700,
              color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              <div></div>
              <div>Name</div>
              <div>Path</div>
              <div style={{ textAlign: 'right' }}>Status</div>
              <div style={{ textAlign: 'right' }}>Latency</div>
              <div>Bar</div>
            </div>
            {probes.map((p) => {
              const tone = toneFor(p)
              const barPct = Math.min(100, (p.latency_ms / 3000) * 100)
              return (
                <div key={p.path} style={{
                  display: 'grid', gridTemplateColumns: '0.5fr 1.5fr 2.5fr 0.7fr 0.7fr 1fr',
                  gap: 12, padding: '12px 18px',
                  borderTop: '1px solid var(--border)',
                  alignItems: 'center',
                  fontSize: 12.5,
                }}>
                  {p.ok ? <CheckCircle2 size={16} style={{ color: tone.fg }}/> : <XCircle size={16} style={{ color: tone.fg }}/>}
                  <div style={{ fontWeight: 700, color: 'var(--t1)' }}>{p.name}</div>
                  <div style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color: p.ok ? 'var(--t2)' : 'var(--red)' }}>
                    {p.status ?? p.error ?? '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: tone.fg, fontVariantNumeric: 'tabular-nums' }}>
                    {p.latency_ms}ms
                  </div>
                  <div style={{ position: 'relative', height: 8, background: 'var(--surface2)', borderRadius: 4 }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      width: `${barPct}%`, background: tone.bg,
                      border: `1px solid ${tone.fg}55`,
                      borderRadius: 4,
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Stat({
  label, icon, value, sub, tone,
}: { label: string; icon: React.ReactNode; value: string; sub: string; tone: 'green'|'red'|'blue'|'amber' }) {
  const colors: Record<string, { fg: string; bg: string }> = {
    green: { fg: 'var(--green)', bg: 'var(--green-bg)' },
    red:   { fg: 'var(--red)',   bg: 'var(--red-bg)'   },
    blue:  { fg: 'var(--blue)',  bg: 'var(--blue-bg)'  },
    amber: { fg: 'var(--amber)', bg: 'var(--amber-bg)' },
  }
  const c = colors[tone]
  return (
    <div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 999,
        background: c.bg, color: c.fg,
        border: `1px solid ${c.fg}33`,
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}
