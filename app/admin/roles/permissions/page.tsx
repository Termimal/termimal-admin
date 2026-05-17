'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/roles/permissions — super_admin matrix for "which sidebar
 * tabs can {role} see?"
 *
 * One column per role (excluding super_admin, who always sees all).
 * One row per nav entry from lib/admin/nav-catalog.ts. Each cell is
 * a toggle that flips a row in role_tab_permissions.
 *
 * Page is gated by middleware (page route requires admin role) AND
 * by the API (POST to /api/admin/role-permissions requires
 * super_admin specifically). Non-super-admin loads get a friendly
 * "you don't have access" rather than a raw 403.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Shield, Loader2, RefreshCw, Check, X } from 'lucide-react'
import { PageHeader, Section, EmptyState } from '@/components/admin/PageChrome'
import { ADMIN_NAV, flatten } from '@/lib/admin/nav-catalog'

interface MatrixRow { role: string; nav_key: string; allowed: boolean }

const NON_SUPER_ROLES = ['admin', 'support', 'finance', 'content_editor', 'analyst'] as const

export default function PermissionsPage() {
  const [meRole, setMeRole]   = useState<string | null>(null)
  const [rows, setRows]       = useState<MatrixRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [meR, rowsR] = await Promise.all([
        fetch('/api/admin/me',                { cache: 'no-store' }),
        fetch('/api/admin/role-permissions',  { cache: 'no-store' }),
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

  // Index the rows by (role|nav_key) for O(1) lookups in the toggle.
  const indexed = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const r of rows) m.set(`${r.role}|${r.nav_key}`, r.allowed)
    return m
  }, [rows])

  const toggle = async (role: string, nav_key: string, next: boolean) => {
    const cellKey = `${role}|${nav_key}`
    setSaving(cellKey)
    // Optimistic update.
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
      const r = await fetch('/api/admin/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, nav_key, allowed: next }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? `HTTP ${r.status}`)
      }
    } catch (e) {
      // Roll back optimistic update.
      void load()
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(null)
    }
  }

  if (meRole && meRole !== 'super_admin') {
    return (
      <div style={{ maxWidth: 1100 }}>
        <PageHeader
          icon={<Shield size={14}/>}
          eyebrow="Access control"
          title="Permissions"
          description="Only super admins can edit the role-tab visibility matrix."
          accent="amber"
        />
        <EmptyState icon={<Shield size={20}/>} title="Super admin only" description="Ask a super admin to grant your role access to more tabs." />
      </div>
    )
  }

  const items = flatten()

  return (
    <div style={{ maxWidth: 1280 }}>
      <PageHeader
        icon={<Shield size={14}/>}
        eyebrow="Access control"
        title="Role permissions"
        description="Toggle which sidebar tabs each non-super-admin role can see. super_admin always sees everything. Changes apply on the role's next page load."
        accent="purple"
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>}
            Refresh
          </button>
        }
      />

      {error && (
        <div className="msg-err" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {ADMIN_NAV.map(group => (
        <Section key={group.title} title={group.title} flush>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table-root">
              <thead>
                <tr>
                  <th>Tab</th>
                  {NON_SUPER_ROLES.map(role => (
                    <th key={role} style={{ textAlign: 'center', width: 110 }}>{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.filter(i => i.group === group.title).map(item => (
                  <tr key={item.nav_key}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--t1)' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{item.nav_key}</div>
                    </td>
                    {NON_SUPER_ROLES.map(role => {
                      const allowed = indexed.get(`${role}|${item.nav_key}`) ?? false
                      const cellKey = `${role}|${item.nav_key}`
                      return (
                        <td key={role} style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggle(role, item.nav_key, !allowed)}
                            disabled={saving === cellKey}
                            aria-pressed={allowed}
                            aria-label={`${allowed ? 'Revoke' : 'Grant'} ${item.label} for ${role}`}
                            style={{
                              width: 36, height: 22, borderRadius: 999,
                              border: `1px solid ${allowed ? 'var(--green)' : 'var(--border2)'}`,
                              background: allowed ? 'var(--green-bg)' : 'var(--surface)',
                              position: 'relative', cursor: saving === cellKey ? 'wait' : 'pointer',
                              transition: 'background 160ms, border-color 160ms',
                              padding: 0,
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                position: 'absolute', top: 2, left: allowed ? 16 : 2,
                                width: 16, height: 16, borderRadius: '50%',
                                background: allowed ? 'var(--green)' : 'var(--t4)',
                                transition: 'left 160ms, background 160ms',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {saving === cellKey ? <Loader2 size={10} className="animate-spin" style={{ color: '#fff' }}/>
                                : allowed ? <Check size={10} style={{ color: '#fff' }}/>
                                : <X size={10} style={{ color: 'var(--bg)' }}/>}
                            </span>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </div>
  )
}
