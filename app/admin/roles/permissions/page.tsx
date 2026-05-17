'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/roles/permissions — Revolut-style matrix for "which sidebar
 * tabs can {role} see?"
 *
 * Each nav group renders as a card with the role columns aligned via
 * CSS Grid. Per-row toggles are pill switches (.toggle). Each role
 * column gets a "Grant all in this group" / "Revoke all" bulk action
 * so admins don't click 60+ toggles individually.
 *
 * Page is gated by middleware (admin role) AND by the API
 * (super_admin specifically). Non-super-admin loads get a friendly
 * "Super admin only" empty state.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Shield, RefreshCw, CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'
import { ADMIN_NAV, flatten } from '@/lib/admin/nav-catalog'

interface MatrixRow { role: string; nav_key: string; allowed: boolean }

const NON_SUPER_ROLES = ['admin', 'support', 'finance', 'content_editor', 'analyst'] as const
type NonSuperRole = (typeof NON_SUPER_ROLES)[number]

const ROLE_META: Record<NonSuperRole, { label: string; color: string; bg: string; description: string }> = {
  admin: {
    label: 'Admin',
    color: 'var(--acc)',
    bg: 'var(--acc-bg)',
    description: 'Trusted operators — sees everything except super-admin tools',
  },
  support: {
    label: 'Support',
    color: 'var(--blue)',
    bg: 'var(--blue-bg)',
    description: 'Customer-facing tools, no billing mutation, no roles',
  },
  finance: {
    label: 'Finance',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
    description: 'Revenue + reporting; users read-only',
  },
  content_editor: {
    label: 'Content',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    description: 'Marketing + content surfaces, no users/billing',
  },
  analyst: {
    label: 'Analyst',
    color: 'var(--purple)',
    bg: 'var(--purple-bg)',
    description: 'Read-only insights, no mutations',
  },
}

export default function PermissionsPage() {
  const [meRole,   setMeRole]   = useState<string | null>(null)
  const [rows,     setRows]     = useState<MatrixRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [meR, rowsR] = await Promise.all([
        fetch('/api/admin/me',               { cache: 'no-store' }),
        fetch('/api/admin/role-permissions', { cache: 'no-store' }),
      ])
      if (meR.ok) {
        const j = await meR.json() as { role: string }
        setMeRole(j.role)
      }
      if (!rowsR.ok) {
        const j = await rowsR.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? `HTTP ${rowsR.status}`)
      }
      const j = await rowsR.json() as { rows: MatrixRow[] }
      setRows(j.rows ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const indexed = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const r of rows) m.set(`${r.role}|${r.nav_key}`, r.allowed)
    return m
  }, [rows])

  const totals = useMemo(() => {
    const out: Record<string, number> = {}
    for (const role of NON_SUPER_ROLES) {
      out[role] = rows.filter(r => r.role === role && r.allowed).length
    }
    return out
  }, [rows])

  const persistOne = async (role: string, nav_key: string, allowed: boolean) => {
    const r = await fetch('/api/admin/role-permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, nav_key, allowed }),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => ({})) as { error?: string }
      throw new Error(j.error ?? `HTTP ${r.status}`)
    }
  }

  const toggle = async (role: string, nav_key: string, next: boolean) => {
    const cellKey = `${role}|${nav_key}`
    setSavingCells(prev => new Set(prev).add(cellKey))
    setRows(prev => {
      const idx = prev.findIndex(r => r.role === role && r.nav_key === nav_key)
      if (idx >= 0) {
        const out = prev.slice()
        out[idx] = { ...out[idx], allowed: next }
        return out
      }
      return [...prev, { role, nav_key, allowed: next }]
    })
    try {
      await persistOne(role, nav_key, next)
    } catch (e) {
      void load()
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSavingCells(prev => { const n = new Set(prev); n.delete(cellKey); return n })
    }
  }

  /** Bulk action: set every nav_key in a group for one role. */
  const bulkSetGroup = async (role: string, groupTitle: string, next: boolean) => {
    const groupItems = flatten().filter(i => i.group === groupTitle)
    const keys = groupItems.map(i => i.nav_key)
    const cellKeys = keys.map(k => `${role}|${k}`)

    // Optimistic update
    setSavingCells(prev => {
      const n = new Set(prev)
      cellKeys.forEach(k => n.add(k))
      return n
    })
    setRows(prev => {
      const out = prev.slice()
      for (const k of keys) {
        const idx = out.findIndex(r => r.role === role && r.nav_key === k)
        if (idx >= 0) out[idx] = { ...out[idx], allowed: next }
        else out.push({ role, nav_key: k, allowed: next })
      }
      return out
    })

    try {
      // Persist serially — keeps API simple and works fine for ~15
      // rows per group.
      for (const k of keys) await persistOne(role, k, next)
    } catch (e) {
      void load()
      setError(e instanceof Error ? e.message : 'bulk save failed')
    } finally {
      setSavingCells(prev => {
        const n = new Set(prev)
        cellKeys.forEach(k => n.delete(k))
        return n
      })
    }
  }

  if (meRole && meRole !== 'super_admin') {
    return (
      <div>
        <HeroCard
          accent="amber"
          icon={<Shield size={28}/>}
          eyebrow="Access control"
          title="Permissions"
          subtitle="Only super admins can edit the role-tab visibility matrix."
        />
        <EmptyState icon={<Shield size={20}/>} title="Super admin only" description="Ask a super admin to grant your role access to more tabs."/>
      </div>
    )
  }

  const totalRows = flatten().length
  const cssVar = { '--perm-cols': NON_SUPER_ROLES.length } as React.CSSProperties

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Shield size={28}/>}
        eyebrow="Access control"
        title="Role permissions"
        subtitle="Toggle which sidebar tabs each non-super-admin role can see. super_admin always sees everything. Changes apply on the role's next page load. Use the bulk-set arrows in each section header to grant or revoke an entire group at once."
        metric={{
          label: 'Total tabs',
          value: totalRows.toString(),
          secondary: `${NON_SUPER_ROLES.length} configurable roles`,
        }}
      />

      {/* Role summary strip */}
      <div className="card-premium" style={{ padding: '20px 24px', marginBottom: 24, display: 'grid', gridTemplateColumns: `repeat(${NON_SUPER_ROLES.length}, 1fr)`, gap: 16 }}>
        {NON_SUPER_ROLES.map(role => {
          const meta = ROLE_META[role]
          const granted = totals[role] ?? 0
          const pct = totalRows > 0 ? Math.round((granted / totalRows) * 100) : 0
          return (
            <div key={role} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: meta.color, boxShadow: `0 0 8px ${meta.color}`,
                }}/>
                <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {granted}
                </span>
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>/ {totalRows}</span>
                <span style={{ fontSize: 11, color: meta.color, marginLeft: 4 }}>{pct}%</span>
              </div>
              <div style={{ marginTop: 8, height: 4, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}88 100%)`,
                  borderRadius: 999, transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
                }}/>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t4)', lineHeight: 1.4 }}>
                {meta.description}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--t4)', margin: 0 }}>
          {loading ? 'Loading permissions…' : `${rows.length} configured rows`}
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ minHeight: 34 }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {error && (
        <div className="card-premium" style={{
          padding: '12px 16px', marginBottom: 16,
          borderColor: 'rgba(248,113,113,0.4)',
          color: 'var(--red)', fontSize: 13, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14}/> {error}
        </div>
      )}

      {ADMIN_NAV.map(group => {
        const groupItems = flatten().filter(i => i.group === group.title)
        return (
          <Section
            key={group.title}
            title={group.title}
            description={`${groupItems.length} ${groupItems.length === 1 ? 'item' : 'items'}`}
            flush
          >
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
            }}>
              {/* Header row with role labels + bulk actions */}
              <div className="perm-row" style={{ ...cssVar, background: 'var(--bg3)', borderTop: 'none', padding: '12px 18px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t4)' }}>
                  Tab
                </div>
                {NON_SUPER_ROLES.map(role => {
                  const meta = ROLE_META[role]
                  const allowedInGroup = groupItems.filter(i => indexed.get(`${role}|${i.nav_key}`)).length
                  const allOn = allowedInGroup === groupItems.length
                  return (
                    <div key={role} className="perm-cell" style={{ flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {meta.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => bulkSetGroup(role, group.title, !allOn)}
                        className="btn-ghost btn-xs"
                        style={{
                          padding: '2px 8px',
                          fontSize: 9.5, fontWeight: 600, letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'var(--t4)',
                          border: '1px solid var(--border)',
                          borderRadius: 999,
                          minHeight: 'auto',
                        }}
                        title={allOn ? `Revoke ${group.title} for ${meta.label}` : `Grant ${group.title} for ${meta.label}`}
                      >
                        {allowedInGroup}/{groupItems.length} {allOn ? '✓' : ''}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Data rows */}
              {groupItems.map(item => (
                <div key={item.nav_key} className="perm-row" style={cssVar}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', marginTop: 2 }}>
                      {item.nav_key}
                    </div>
                  </div>
                  {NON_SUPER_ROLES.map(role => {
                    const allowed = indexed.get(`${role}|${item.nav_key}`) ?? false
                    const cellKey = `${role}|${item.nav_key}`
                    const saving  = savingCells.has(cellKey)
                    return (
                      <div key={role} className="perm-cell">
                        <button
                          type="button"
                          className="toggle"
                          aria-pressed={allowed}
                          aria-label={`${allowed ? 'Revoke' : 'Grant'} ${item.label} for ${role}`}
                          disabled={saving}
                          onClick={() => toggle(role, item.nav_key, !allowed)}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </Section>
        )
      })}

      {/* Footer help */}
      <div className="card-premium" style={{ padding: '16px 20px', marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <CheckCircle2 size={16} color="var(--acc)"/>
        <div style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--t2)' }}>Granting</strong> a tab lets the role see it in the sidebar.
          The action button INSIDE each page still checks fine-grained write permissions
          (e.g. <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>users.write</code>),
          so visibility is the floor — not the ceiling — of access.
        </div>
      </div>
    </div>
  )
}
