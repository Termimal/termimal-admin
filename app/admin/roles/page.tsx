'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field } from '@/components/admin/PageChrome'
import { PERMISSIONS } from '@/lib/admin/permissions'

interface Role {
  name:         string
  display_name: string
  description:  string | null
  permissions:  string[]
  is_system:    boolean
  member_count: number
  updated_at:   string
}

const SECTIONS: Array<{ label: string; perms: string[] }> = [
  { label: 'Users',       perms: ['users.read','users.write','users.close'] },
  { label: 'Billing',     perms: ['billing.read','billing.write','billing.refund','coupons.read','coupons.write','finance.read','finance.write'] },
  { label: 'Content',     perms: ['content.read','content.write','banners.read','banners.write','announcements.read','announcements.write','faqs.read','faqs.write'] },
  { label: 'SEO + i18n',  perms: ['seo.read','seo.write','translations.read','translations.write','email_templates.read','email_templates.write'] },
  { label: 'Workflow',    perms: ['items.read','items.write','support.read','support.write','notes.read','notes.write'] },
  { label: 'Engineering', perms: ['flags.read','flags.write','experiments.read','experiments.write','cohorts.read','cohorts.write','webhooks.read','anomalies.read'] },
  { label: 'Operations',  perms: ['system.read','system.write','maintenance.read','maintenance.write','audit.read','analytics.read','export.read'] },
  { label: 'RBAC',        perms: ['invites.read','invites.write','roles.write'] },
]

function PermPill({ on, children, onClick, accent = 'acc' }: { on: boolean; children: React.ReactNode; onClick: () => void; accent?: 'acc'|'purple' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 999,
        border: `1px solid ${on ? `var(--${accent}-border)` : 'var(--border)'}`,
        background: on ? `var(--${accent}-bg)` : 'transparent',
        color: on ? `var(--${accent})` : 'var(--t3)',
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      }}
    >
      {children}
    </button>
  )
}

export default function RolesPage() {
  const [roles, setRoles]       = useState<Role[]>([])
  const [editing, setEditing]   = useState<string | null>(null)
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set())
  const [draftDisplay, setDraftDisplay] = useState('')
  const [draftDesc, setDraftDesc]       = useState('')
  const [creating, setCreating] = useState(false)
  const [newRole, setNewRole]   = useState({ name: '', display_name: '', description: '' })

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/roles', { cache: 'no-store' })
    const j = await r.json() as { rows?: Role[] }
    setRoles(j.rows || [])
  }, [])
  useEffect(() => { load() }, [load])

  function startEdit(role: Role) {
    setEditing(role.name)
    setDraftPerms(new Set(role.permissions))
    setDraftDisplay(role.display_name)
    setDraftDesc(role.description || '')
  }
  async function save() {
    if (!editing) return
    await fetch('/api/admin/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing, patch: {
        display_name: draftDisplay,
        description:  draftDesc,
        permissions:  [...draftPerms],
      }}),
    })
    setEditing(null)
    load()
  }
  async function create() {
    if (!newRole.name || !newRole.display_name) return
    setCreating(true)
    await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRole, permissions: [] }),
    })
    setCreating(false)
    setNewRole({ name: '', display_name: '', description: '' })
    load()
  }
  async function del(name: string) {
    if (!confirm(`Delete role "${name}"?`)) return
    await fetch(`/api/admin/roles?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    load()
  }

  function togglePerm(p: string) {
    const next = new Set(draftPerms)
    if (next.has(p)) next.delete(p); else next.add(p)
    setDraftPerms(next)
  }
  function toggleSection(perms: string[], on: boolean) {
    const next = new Set(draftPerms)
    for (const p of perms) on ? next.add(p) : next.delete(p)
    setDraftPerms(next)
  }
  const isWildcard = draftPerms.has('*')

  const totalMembers = roles.reduce((s, r) => s + r.member_count, 0)

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Shield size={28}/>}
        eyebrow="RBAC"
        title="Roles & permissions"
        subtitle="Granular access control. Each role has a list of permission slugs (e.g. users.read, billing.refund). Super admin (* wildcard) bypasses all checks."
        metric={{ label: 'Roles', value: roles.length.toString(), secondary: `${totalMembers} members` }}
      />

      <Section title="Create a role" accent="purple" description="System roles seed automatically. Add custom roles for specialised access patterns.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Slug (lowercase, no spaces)" required>
              <input className="input" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="data_analyst" />
            </Field>
            <Field label="Display name" required>
              <input className="input" value={newRole.display_name} onChange={e => setNewRole({ ...newRole, display_name: e.target.value })} placeholder="Data Analyst" />
            </Field>
          </div>
          <Field label="Description">
            <input className="input" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="Read-only access to analytics + audit + export." />
          </Field>
          <div>
            <button className="btn btn-primary btn-sm" disabled={!newRole.name || !newRole.display_name || creating} onClick={create}>
              <Plus size={13}/> {creating ? 'Creating…' : 'Create role'}
            </button>
          </div>
        </div>
      </Section>

      {roles.length === 0
        ? <EmptyState icon={<Shield size={20}/>} title="No roles defined" description="System roles seed automatically — if this is empty re-run the rbac migration." />
        : (
          <Section flush title={`${roles.length} role${roles.length === 1 ? '' : 's'}`}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {roles.map(role => (
                <li key={role.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: 'var(--purple-bg)', border: '1px solid var(--purple)33',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--purple)', flexShrink: 0,
                    }}>
                      <Shield size={18}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{role.display_name}</span>
                        {role.is_system && <span className="badge badge-purple">system</span>}
                        <span className="badge badge-muted" style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{role.name}</span>
                      </div>
                      {role.description && <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 4, lineHeight: 1.5 }}>{role.description}</div>}
                      <div style={{ fontSize: 12, color: 'var(--t4)' }}>
                        {role.member_count} member{role.member_count === 1 ? '' : 's'} ·{' '}
                        {role.permissions.includes('*') ? 'all permissions' : `${role.permissions.length} permission${role.permissions.length === 1 ? '' : 's'}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(role)}>Edit</button>
                      {!role.is_system && (
                        <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }} onClick={() => del(role.name)}>
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                  {editing === role.name && (
                    <div style={{ padding: '20px 24px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 18 }}>
                        <Field label="Display name">
                          <input className="input" value={draftDisplay} onChange={e => setDraftDisplay(e.target.value)} />
                        </Field>
                        <Field label="Description">
                          <input className="input" value={draftDesc} onChange={e => setDraftDesc(e.target.value)} />
                        </Field>
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <PermPill on={isWildcard} accent="purple" onClick={() => togglePerm('*')}>
                          {isWildcard && <CheckCircle size={11}/>} Wildcard (*) — all permissions
                        </PermPill>
                      </div>
                      {!isWildcard && (
                        <>
                          {SECTIONS.map(sec => {
                            const has = sec.perms.filter(p => draftPerms.has(p)).length
                            const all = sec.perms.length
                            return (
                              <div key={sec.label} style={{ marginBottom: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                  <strong style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', fontWeight: 800 }}>{sec.label}</strong>
                                  <span style={{ fontSize: 11, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{has}/{all}</span>
                                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSection(sec.perms, has < all)}>
                                    {has < all ? 'Select all' : 'Clear'}
                                  </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {sec.perms.map(p => {
                                    const on = draftPerms.has(p)
                                    return (
                                      <PermPill key={p} on={on} onClick={() => togglePerm(p)}>
                                        {on ? <CheckCircle size={10}/> : <XCircle size={10} style={{ opacity: 0.3 }}/>} {p}
                                      </PermPill>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                          {(() => {
                            const known = new Set(SECTIONS.flatMap(s => s.perms))
                            const extras = PERMISSIONS.filter(p => !known.has(p))
                            return extras.length > 0 ? (
                              <div style={{ marginBottom: 18 }}>
                                <strong style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', fontWeight: 800 }}>Other</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                  {extras.map(p => {
                                    const on = draftPerms.has(p)
                                    return <PermPill key={p} on={on} onClick={() => togglePerm(p)}>{p}</PermPill>
                                  })}
                                </div>
                              </div>
                            ) : null
                          })()}
                        </>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
    </div>
  )
}
