'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/ip-allowlist — manage CIDR rules that may eventually gate
 * access to /admin/*. Persisted in system_settings as a JSON array so
 * we don't need a new table for a list that changes once a month.
 *
 * Enforcement is not yet wired (middleware still authenticates by
 * cookie/role only); this page exists so an admin can stage a list
 * ahead of flipping that on.
 */
import { useEffect, useState } from 'react'
import { Shield, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface AllowRule {
  cidr:      string
  label:     string
  added_at:  string
  added_by:  string | null
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

export default function IpAllowlistPage() {
  const [rules,   setRules]   = useState<AllowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')
  const [cidr,    setCidr]    = useState('')
  const [label,   setLabel]   = useState('')
  const [busy,    setBusy]    = useState(false)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/ip-allowlist', { cache: 'no-store' })
      const j = await r.json() as { rules?: AllowRule[]; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRules(j.rules || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!cidr.trim()) return
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/admin/ip-allowlist', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ cidr: cidr.trim(), label: label.trim() }),
      })
      const j = await r.json() as { rules?: AllowRule[]; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRules(j.rules || [])
      setCidr(''); setLabel('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'add failed')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (target: string) => {
    if (!confirm(`Remove ${target} from the allowlist?`)) return
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/admin/ip-allowlist?cidr=${encodeURIComponent(target)}`, { method: 'DELETE' })
      const j = await r.json() as { rules?: AllowRule[]; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRules(j.rules || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'remove failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Shield size={28}/>}
        eyebrow="Security"
        title="IP allowlist"
        subtitle="CIDR ranges and single IPs that should retain access to /admin/* if and when we turn on IP-level gating. Adding rules here is safe — they're only enforced once the middleware switch is flipped."
        metric={{ label: 'Rules', value: rules.length.toString(), secondary: rules.length === 1 ? 'entry' : 'entries' }}
      />

      <Section
        accent="amber"
        title="Add rule"
        description="Accepts a bare IP (1.2.3.4) or a CIDR range (1.2.3.0/24 or ::1/128). The label is optional and only used for humans."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="1.2.3.0/24"
            value={cidr}
            onChange={e => setCidr(e.target.value)}
            spellCheck={false}
            style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
          />
          <input
            className="input"
            placeholder="Office VPN — Istanbul"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={add}
            disabled={busy || !cidr.trim()}
          >
            <Plus size={13}/> Add rule
          </button>
        </div>
        {err && (
          <div className="msg-err" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14}/> {err}
          </div>
        )}
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      <Section
        accent="amber"
        title="Current rules"
        description={loading ? 'Loading…' : rules.length === 0 ? 'No rules yet.' : `${rules.length} entr${rules.length === 1 ? 'y' : 'ies'} active`}
      >
        {loading ? (
          <div className="skeleton" style={{ height: 160, borderRadius: 14 }}/>
        ) : rules.length === 0 ? (
          <EmptyState
            icon={<Shield size={20}/>}
            title="No allowlist rules"
            description="Add your office and home IPs first. We're not enforcing yet — adding rules is non-destructive."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rules.map(r => (
              <div
                key={r.cidr}
                className="card-premium"
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
              >
                <span
                  style={{
                    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                    fontSize: 13, fontWeight: 700, color: 'var(--t1)', minWidth: 180,
                  }}
                >
                  {r.cidr}
                </span>
                <span style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: 'var(--t2)' }}>
                  {r.label || <em style={{ color: 'var(--t4)' }}>no label</em>}
                </span>
                <span style={{ fontSize: 11, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.added_by ? `${r.added_by} · ` : ''}{fmtAge(r.added_at)}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => remove(r.cidr)}
                  disabled={busy}
                  style={{ color: 'var(--red)' }}
                  aria-label={`Remove ${r.cidr} from allowlist`}
                >
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
