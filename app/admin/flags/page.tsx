'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/flags — feature-flag management with audit history.
 *
 * Toggles route through /api/admin/flags (audit-logged) instead of
 * the raw Supabase client. Recent flag.* audit entries are surfaced
 * at the bottom so the team can spot accidental toggles or compare
 * against incident windows.
 */

import { useEffect, useState } from 'react'
import { Flag, Power, History, RefreshCw } from 'lucide-react'
import { HeroCard, Section, EmptyState, ItemGrid, ItemCard } from '@/components/admin/PageChrome'

interface FlagRow {
  id:          string
  key:         string
  description: string | null
  enabled:     boolean
  created_at:  string | null
}

interface AuditRow {
  id:           string
  action:       string
  created_at:   string
  metadata:     unknown
  actor_email:  string | null
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

const ACTION_TONE: Record<string, { fg: string; bg: string }> = {
  'flag.enable':  { fg: 'var(--green)', bg: 'var(--green-bg)'  },
  'flag.disable': { fg: 'var(--amber)', bg: 'var(--amber-bg)'  },
  'flag.create':  { fg: 'var(--blue)',  bg: 'var(--blue-bg)'   },
  'flag.delete':  { fg: 'var(--red)',   bg: 'var(--red-bg)'    },
}

export default function FlagsPage() {
  const [flags,   setFlags]   = useState<FlagRow[]>([])
  const [audits,  setAudits]  = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  const loadAll = async () => {
    setLoading(true); setErr('')
    try {
      const [fr, ar] = await Promise.all([
        fetch('/api/admin/flags', { cache: 'no-store' }),
        // Pull last ~50 flag.* audit rows; client filters since the
        // audit-log API uses substring ilike on action.
        fetch('/api/admin/audit-log?q=flag.&limit=50', { cache: 'no-store' }),
      ])
      const fj = await fr.json() as { flags?: FlagRow[]; error?: string }
      const aj = await ar.json() as { logs?: AuditRow[]; error?: string }
      if (!fr.ok || fj.error) throw new Error(fj.error || `flags HTTP ${fr.status}`)
      setFlags(fj.flags || [])
      setAudits((aj.logs || []).filter(r => r.action.startsWith('flag.')).slice(0, 12))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadAll() }, [])

  async function toggle(row: FlagRow, next: boolean) {
    // Optimistic update — revert if the server rejects.
    setFlags(prev => prev.map(f => f.id === row.id ? { ...f, enabled: next } : f))
    try {
      const r = await fetch('/api/admin/flags', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id: row.id, enabled: next, description: row.description }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      // Pull fresh audit history so the new entry shows immediately.
      void loadAll()
    } catch {
      setFlags(prev => prev.map(f => f.id === row.id ? { ...f, enabled: !next } : f))
    }
  }

  const enabled = flags.filter(f => f.enabled).length

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Flag size={28}/>}
        eyebrow="Feature flags"
        title="Module toggles"
        subtitle="Switch product modules on or off. Changes take effect on the next request — no redeploy required. Every toggle writes an audit log entry."
        metric={{ label: 'Enabled', value: `${enabled}/${flags.length}`, secondary: 'live flags' }}
      />

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 18 }}>
        <button className="btn btn-secondary btn-sm" style={{ minHeight: 32 }} onClick={loadAll} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {err && <div className="msg-err" style={{ marginBottom: 16 }}>{err}</div>}

      {loading ? (
        <Section flush>
          <div style={{ padding: 40, fontSize: 13, color: 'var(--t3)', textAlign:'center' }}>Loading flags…</div>
        </Section>
      ) : flags.length === 0 ? (
        <EmptyState icon={<Flag size={20}/>} title="No feature flags defined" description="Add rows to public.feature_flags to manage them here." />
      ) : (
        <ItemGrid min={300}>
          {flags.map(f => (
            <ItemCard
              key={f.id}
              accent="amber"
              icon={<Flag size={18}/>}
              title={f.key}
              subtitle={f.description || 'No description'}
              status={{
                label: f.enabled ? 'ENABLED' : 'DISABLED',
                tone: f.enabled ? 'green' : 'muted',
                pulse: f.enabled,
              }}
              meta={
                <>
                  <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 11 }}>{f.key}</span>
                  {f.created_at && (
                    <>
                      <span>·</span>
                      <span>created {new Date(f.created_at).toLocaleDateString()}</span>
                    </>
                  )}
                </>
              }
              footer={
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggle(f, !f.enabled)}
                >
                  <Power size={12}/> {f.enabled ? 'Disable' : 'Enable'}
                </button>
              }
            />
          ))}
        </ItemGrid>
      )}

      {/* Recent flag audit activity */}
      {audits.length > 0 && (
        <Section
          accent="amber"
          title="Recent flag activity"
          description="Last 12 flag.* events from the audit log. Click any row to see the full event in the audit log."
        >
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {audits.map((a) => {
              const tone = ACTION_TONE[a.action] ?? { fg: 'var(--t3)', bg: 'var(--surface2)' }
              const m    = (a.metadata ?? {}) as Record<string, unknown>
              const key  = typeof m.key === 'string' ? m.key : null
              const from = m.from
              const to   = m.to
              return (
                <a
                  key={a.id}
                  href={`/admin/audit-log?q=${encodeURIComponent(a.action)}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderTop: '1px solid var(--border)',
                    textDecoration: 'none', color: 'inherit',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{
                    padding: '3px 10px', borderRadius: 999,
                    background: tone.bg, color: tone.fg,
                    border: `1px solid ${tone.fg}33`,
                    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                    fontWeight: 700, fontSize: 11,
                  }}>{a.action}</span>
                  {key && (
                    <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color: 'var(--t1)', fontWeight: 600 }}>{key}</span>
                  )}
                  {from !== undefined && to !== undefined && (
                    <span style={{ color: 'var(--t3)' }}>
                      {String(from)} → <strong style={{ color: tone.fg }}>{String(to)}</strong>
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontWeight: 600 }}>{a.actor_email || 'system'}</span>
                  <span style={{ color: 'var(--t4)', fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right' }}>{fmtAge(a.created_at)}</span>
                </a>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
