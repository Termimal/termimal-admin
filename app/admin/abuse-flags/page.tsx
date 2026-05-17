'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/abuse-flags — review clustered signup attempts that
 * matched the device-fingerprint / IP duplicate-account check.
 *
 * Each cluster groups every signup_fingerprints row that shares
 * the same fingerprint_hash. The header shows the count, IPs, and
 * countries; expanding the cluster shows each member row with
 * email_hash truncated, IP, time, and the flag reason.
 *
 * Two actions per row: 'clear' (whitelist this row going forward)
 * and 'block' (force-flag, useful for known bad actors that the
 * precheck soft-allowed). Both write to audit_logs.
 */

import { useEffect, useState } from 'react'
import {
  ShieldAlert, RefreshCw, ChevronDown, Globe, Smartphone, Filter, Check, X,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface FpMember {
  id:                string
  user_id:           string | null
  email_hash:        string
  ip_text:           string | null
  fingerprint_hash:  string
  country:           string | null
  user_agent:        string | null
  flagged:           boolean
  flag_reason:       string | null
  created_at:        string
}

interface Cluster {
  fingerprint_hash:  string
  count:             number
  latest:            FpMember
  ips:               string[]
  countries:         string[]
  members:           FpMember[]
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

export default function AbuseFlagsPage() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState('')
  const [status,   setStatus]   = useState<'flagged' | 'all'>('flagged')
  const [open,     setOpen]     = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`/api/admin/abuse-flags?status=${status}`, { cache: 'no-store' })
      const j = await r.json() as { clusters?: Cluster[]; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setClusters(j.clusters || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id: string, action: 'clear' | 'block') => {
    try {
      await fetch('/api/admin/abuse-flags', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id, action }),
      })
      void load()
    } catch { /* swallow */ }
  }

  const totalAccounts = clusters.reduce((s, c) => s + c.count, 0)

  return (
    <div>
      <HeroCard
        accent="red"
        icon={<ShieldAlert size={28}/>}
        eyebrow="Trust & safety"
        title="Signup abuse flags"
        subtitle="Clusters of signup attempts that matched the device fingerprint or IP of an existing account within the last 60 days. Each cluster represents a single device/network — expand to see every email-hash that tried to register from it."
        metric={{
          label: 'Clusters',
          value: clusters.length.toLocaleString(),
          secondary: `${totalAccounts} flagged signup attempts`,
        }}
      />

      <div className="card-premium" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Filter size={13} color="var(--t4)"/>
        {(['flagged', 'all'] as const).map(s => (
          <button
            key={s}
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

      <Section
        accent="red"
        title="Clusters"
        description={loading ? 'Loading…' : err ? `Error: ${err}` : `${clusters.length} clusters`}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }}/>
            ))}
          </div>
        ) : err ? (
          <EmptyState icon={<ShieldAlert size={20}/>} title="Couldn't load" description={err}/>
        ) : clusters.length === 0 ? (
          <EmptyState
            icon={<Check size={20}/>}
            title="No abuse clusters"
            description={
              status === 'flagged'
                ? "Either nothing is flagged or the signup_fingerprints table is empty. If you just landed the migration, expect data to populate as new signups come in."
                : "No fingerprints recorded yet."
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {clusters.map((c) => {
              const isOpen = !!open[c.fingerprint_hash]
              return (
                <div key={c.fingerprint_hash} style={{ background: 'var(--bg2)' }}>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [c.fingerprint_hash]: !o[c.fingerprint_hash] }))}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                      color: 'inherit',
                    }}
                  >
                    <span style={{
                      padding: '4px 12px', borderRadius: 999,
                      background: 'var(--red-bg)', color: 'var(--red)',
                      border: '1px solid rgba(248,113,113,0.3)',
                      fontSize: 12, fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: 60, textAlign: 'center',
                    }}>×{c.count}</span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, color: 'var(--t1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        fp:{c.fingerprint_hash.slice(0, 16)}…
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Smartphone size={11}/> {c.ips.length} IP{c.ips.length === 1 ? '' : 's'}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Globe size={11}/> {c.countries.join(', ') || '—'}
                        </span>
                        <span>latest {fmtAge(c.latest.created_at)}</span>
                      </div>
                    </div>
                    <ChevronDown size={14} style={{
                      color: 'var(--t4)',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 160ms',
                    }}/>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
                        <thead>
                          <tr style={{ color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10.5, fontWeight: 700 }}>
                            <th style={{ textAlign: 'left',  padding: '6px 8px' }}>Email hash</th>
                            <th style={{ textAlign: 'left',  padding: '6px 8px' }}>IP</th>
                            <th style={{ textAlign: 'left',  padding: '6px 8px' }}>Country</th>
                            <th style={{ textAlign: 'left',  padding: '6px 8px' }}>Reason</th>
                            <th style={{ textAlign: 'left',  padding: '6px 8px' }}>When</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.members.map((m) => (
                            <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color: 'var(--t2)' }}>
                                {m.email_hash.slice(0, 14)}…
                              </td>
                              <td style={{ padding: '8px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color: 'var(--t2)' }}>
                                {m.ip_text || '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--t3)' }}>{m.country || '—'}</td>
                              <td style={{ padding: '8px', color: m.flagged ? 'var(--red)' : 'var(--t4)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 11 }}>
                                {m.flag_reason || '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--t4)' }}>{fmtAge(m.created_at)}</td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => act(m.id, m.flagged ? 'clear' : 'block')}
                                  className="btn btn-secondary btn-sm"
                                  style={{ minHeight: 26, fontSize: 11 }}
                                >
                                  {m.flagged ? <><Check size={11}/> Clear</> : <><X size={11}/> Block</>}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
