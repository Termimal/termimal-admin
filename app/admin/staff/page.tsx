'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/staff — every account with a non-default role.
 *
 * Lets a super_admin change a teammate's role inline (via the
 * existing /api/admin/roles/assign endpoint) or remove staff
 * access entirely (demotes to `user`).
 *
 * Read-side permission: `roles.write` (super_admin sees it via
 * the wildcard). Removal requires actual super_admin — enforced
 * server-side in /api/admin/staff DELETE.
 *
 * Sister surface to /admin/roles (role definitions) and
 * /admin/invites (pending invites). Together those three form
 * the team-management triplet.
 */

import { useCallback, useEffect, useState } from 'react'
import { Users, RefreshCw, ShieldOff, Save, AlertTriangle } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface StaffRow {
  id:               string
  email:            string | null
  role:             string
  created_at:       string | null
  last_sign_in_at:  string | null
}

interface RoleDef { name: string; display_name: string }

const ROLE_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  super_admin:    { fg: 'var(--purple)', bg: 'var(--purple-bg)', border: 'rgba(167,139,250,0.3)' },
  admin:          { fg: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'rgba(96,165,250,0.3)' },
  finance:        { fg: 'var(--green)',  bg: 'var(--green-bg)',  border: 'rgba(52,211,153,0.3)' },
  support:        { fg: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'rgba(251,191,36,0.3)' },
  content_editor: { fg: 'var(--acc)',    bg: 'var(--acc-bg)',    border: 'var(--acc-border)' },
  developer:      { fg: 'var(--acc)',    bg: 'var(--acc-bg)',    border: 'var(--acc-border)' },
  analyst:        { fg: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'rgba(96,165,250,0.3)' },
  readonly:       { fg: 'var(--t3)',     bg: 'var(--surface2)',  border: 'var(--border)' },
}

function fmtAge(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function StaffPage() {
  const [rows,    setRows]    = useState<StaffRow[]>([])
  const [roles,   setRoles]   = useState<RoleDef[]>([])
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)
  const [pending, setPending] = useState<Record<string, string>>({}) // user_id → role draft
  const [busy,    setBusy]    = useState<string | null>(null)        // user_id currently mutating

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const [staffRes, rolesRes] = await Promise.all([
        fetch('/api/admin/staff', { cache: 'no-store' }),
        fetch('/api/admin/roles', { cache: 'no-store' }),
      ])
      const sJ = await staffRes.json() as { rows?: StaffRow[]; error?: string }
      const rJ = await rolesRes.json() as { rows?: RoleDef[] }
      if (!staffRes.ok || sJ.error) throw new Error(sJ.error || `HTTP ${staffRes.status}`)
      setRows(sJ.rows || [])
      setRoles((rJ.rows || []).map(r => ({ name: r.name, display_name: r.display_name || r.name })))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function saveRole(userId: string) {
    const role = pending[userId]
    if (!role) return
    setBusy(userId); setErr(null)
    try {
      const r = await fetch('/api/admin/roles/assign', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ user_id: userId, role }),
      })
      const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(prev => prev.map(p => p.id === userId ? { ...p, role } : p))
      setPending(prev => { const n = { ...prev }; delete n[userId]; return n })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'save failed')
    } finally {
      setBusy(null)
    }
  }

  async function removeStaff(row: StaffRow) {
    if (!confirm(`Remove ${row.email || row.id} from staff (demote to plain user)?`)) return
    setBusy(row.id); setErr(null)
    try {
      const r = await fetch(`/api/admin/staff?user_id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(prev => prev.filter(p => p.id !== row.id))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'remove failed')
    } finally {
      setBusy(null)
    }
  }

  const totalSuper = rows.filter(r => r.role === 'super_admin').length

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Users size={28}/>}
        eyebrow="Team"
        title="Admin panel users"
        subtitle="Everyone in user_roles with a non-default role. Pick a new role from the dropdown to change theirs (super_admin only). Remove takes them back to a plain user."
        metric={{
          label: 'Staff',
          value: rows.length.toString(),
          secondary: `${totalSuper} super_admin${totalSuper === 1 ? '' : 's'}`,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {err && (
        <div className="msg-err" style={{ marginBottom: 18 }}>
          <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }}/>
          {err}
        </div>
      )}

      <Section
        accent="purple"
        title="Roster"
        description={loading ? 'Loading…' : rows.length === 0 ? 'No staff yet — invite some from /admin/invites.' : 'Sorted by tier, then email.'}
        flush
      >
        {loading ? (
          <div className="skeleton" style={{ height: 240, borderRadius: 14 }}/>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users size={20}/>}
            title="No admin-panel users"
            description="Send an invite from /admin/invites — once accepted they'll appear here."
          />
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {rows.map(row => {
              const draft = pending[row.id] ?? row.role
              const dirty = draft !== row.role
              const tone  = ROLE_TONE[row.role] ?? ROLE_TONE.readonly
              return (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 2.2fr) 1fr 1.4fr 1fr auto auto',
                    gap: 14, alignItems: 'center',
                    padding: '14px 20px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: 600, color: 'var(--t1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {row.email || <em style={{ color: 'var(--t4)' }}>email unknown</em>}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--t4)', marginTop: 2,
                      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                    }}>
                      {row.id.slice(0, 8)}…{row.id.slice(-4)}
                    </div>
                  </div>

                  {/* Current role */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 999,
                      background: tone.bg, color: tone.fg,
                      border: `1px solid ${tone.border}`,
                      fontSize: 11, fontWeight: 700,
                      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                    }}>
                      {row.role}
                    </span>
                  </div>

                  {/* Role picker */}
                  <div>
                    <select
                      value={draft}
                      onChange={e => setPending(prev => ({ ...prev, [row.id]: e.target.value }))}
                      disabled={busy === row.id}
                      style={{
                        width: '100%', fontFamily: 'inherit', minHeight: 32,
                        fontSize: 12.5, padding: '6px 10px',
                      }}
                    >
                      {roles.length === 0 && (
                        <option value={row.role}>{row.role}</option>
                      )}
                      {roles.map(r => (
                        <option key={r.name} value={r.name}>
                          {r.display_name} ({r.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Last sign-in */}
                  <div style={{ fontSize: 11.5, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {fmtAge(row.last_sign_in_at)}
                  </div>

                  {/* Save action */}
                  <div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => saveRole(row.id)}
                      disabled={!dirty || busy === row.id}
                      style={{ minHeight: 30 }}
                    >
                      <Save size={12}/> Save
                    </button>
                  </div>

                  {/* Remove action */}
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeStaff(row)}
                      disabled={busy === row.id}
                      style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.3)', minHeight: 30 }}
                      aria-label={`Remove ${row.email || row.id} from staff`}
                      title="Demote to plain user"
                    >
                      <ShieldOff size={12}/>
                    </button>
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
