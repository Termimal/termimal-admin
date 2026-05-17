'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Search, ChevronLeft, ChevronRight, UserCheck, TestTube2, Building2, Crown, RefreshCw, Download } from 'lucide-react'
import { HeroCard } from '@/components/admin/PageChrome'

type UserRow = {
  id: string; email: string | null; created_at: string | null; last_sign_in_at: string | null
  fullname: string; plan: string; subscription_status: string; account_status: string
  credits: number; subscription_bonus_months: number; is_test_user?: boolean; user_type: string; discount_percent: number
  country?: string; timezone?: string
}

/** ISO-3166 alpha-2 → emoji flag (regional-indicator pair). */
function flag(code: string | null | undefined): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return ''
  const A = 0x1F1E6
  const upper = code.toUpperCase()
  return String.fromCodePoint(A + upper.charCodeAt(0) - 65, A + upper.charCodeAt(1) - 65)
}

const PLAN_BADGE: Record<string,string> = { pro:'badge-acc', starter:'badge-blue', free:'badge-muted', premium:'badge-purple' }
const STATUS_BADGE: Record<string,string> = { active:'badge-green', inactive:'badge-muted', closed:'badge-red', suspended:'badge-amber', trialing:'badge-blue', past_due:'badge-amber', canceled:'badge-red' }
const TYPE_ICONS: Record<string,any> = { normal:<UserCheck size={10}/>, test:<TestTube2 size={10}/>, internal:<Building2 size={10}/>, vip:<Crown size={10}/> }
const TYPE_BADGE: Record<string,string> = { normal:'badge-muted', test:'badge-amber', internal:'badge-blue', vip:'badge-purple' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25

  const load = async (p = page, s = search) => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?page=${p}&perPage=${perPage}&search=${encodeURIComponent(s)}`)
    const json = await res.json()
    setUsers(json.users || [])
    setTotal(json.total || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [page])

  const filtered = planFilter === 'all' ? users : users.filter(u => u.plan === planFilter)
  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<Users size={28} />}
        eyebrow="Accounts"
        title="Users"
        subtitle={`${total.toLocaleString()} total accounts · search, filter, and manage from here`}
        metric={{
          label: 'Total',
          value: total.toLocaleString(),
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <a
          href={`/api/admin/users/export?${new URLSearchParams({ search, plan: planFilter }).toString()}`}
          className="btn btn-secondary btn-sm"
          style={{ minHeight: 38 }}
          title="Download a CSV of every profile matching the current filter (up to 10,000 rows). The export is audit-logged."
        >
          <Download size={13}/> Export CSV
        </a>
        <button
          onClick={() => load()}
          className="btn btn-secondary btn-sm"
          style={{ minHeight: 38 }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="card-premium" style={{
        padding: '20px 24px',
        marginBottom: 20,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
          <input className="input" style={{ paddingLeft: 40 }} value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(1, search) } }}
            placeholder="Search by email, name, ID, plan…" />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all','free','starter','pro','premium'].map(p => {
            const on = planFilter === p
            return (
              <button key={p} onClick={() => setPlanFilter(p)}
                style={{
                  padding: '10px 16px', borderRadius: 999, border: '1.5px solid', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em',
                  background: on ? 'var(--acc-bg)' : 'var(--surface)',
                  borderColor: on ? 'var(--acc-border)' : 'var(--border)',
                  color: on ? 'var(--acc)' : 'var(--t2)',
                  transition: 'all 160ms',
                }}>{p === 'all' ? 'All plans' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
            )
          })}
        </div>
        <button className="btn btn-primary" style={{ minHeight: 40 }} onClick={() => { setPage(1); load(1, search) }}>Search</button>
      </div>

      {/* Card-style user list — each row is a horizontal card with
          avatar, name/email, plan/status pills, secondary metrics, CTA. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-premium" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 14 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ width: 180, height: 14, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 240, height: 12, borderRadius: 6 }} />
              </div>
              <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 999 }} />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="empty-elegant">
            <div className="empty-icon"><Users size={20}/></div>
            <h3>No users match</h3>
            <p>Try a different search term or clear the plan filter.</p>
          </div>
        ) : (
          filtered.map(u => {
            const planLower = (u.plan || 'free').toLowerCase()
            const subLower  = (u.subscription_status || 'inactive').toLowerCase()
            const accLower  = (u.account_status || 'active').toLowerCase()
            const typeLower = u.user_type || 'normal'
            const initial   = (u.fullname || u.email || '?').slice(0, 1).toUpperCase()
            // Avatar gradient varies by plan for visual interest.
            const avatarGrad =
              planLower === 'premium' ? 'linear-gradient(135deg, var(--purple-bg) 0%, var(--acc-bg) 100%)'
            : planLower === 'pro'     ? 'linear-gradient(135deg, var(--acc-bg) 0%, var(--blue-bg) 100%)'
            : planLower === 'starter' ? 'linear-gradient(135deg, var(--blue-bg) 0%, var(--purple-bg) 100%)'
            :                            'linear-gradient(135deg, var(--surface2) 0%, var(--surface) 100%)'
            const avatarColor =
              planLower === 'premium' ? 'var(--purple)'
            : planLower === 'pro'     ? 'var(--acc)'
            : planLower === 'starter' ? 'var(--blue)'
            :                            'var(--t3)'
            return (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="card-premium"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: avatarGrad,
                  border: `1px solid ${avatarColor}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: avatarColor,
                  fontSize: 18, fontWeight: 800,
                  flexShrink: 0,
                  letterSpacing: '-0.02em',
                }}>{initial}</div>

                {/* Identity */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--t1)',
                      letterSpacing: '-0.005em',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                      {u.country && (
                        <span title={u.country} style={{ fontSize: 16, lineHeight: 1 }}>
                          {flag(u.country)}
                        </span>
                      )}
                      {u.fullname || '—'}
                    </span>
                    {typeLower !== 'normal' && (
                      <span className={`badge ${TYPE_BADGE[typeLower] || 'badge-muted'}`} style={{
                        fontSize: 10, padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        {TYPE_ICONS[typeLower]}{typeLower}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 13, color: 'var(--t3)',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {u.email}
                  </div>
                </div>

                {/* Status pills cluster */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
                  flexShrink: 0,
                }}>
                  <span className={`badge ${PLAN_BADGE[planLower] || 'badge-muted'}`} style={{
                    fontSize: 11, padding: '4px 12px', fontWeight: 700,
                  }}>
                    {u.plan || 'free'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge ${STATUS_BADGE[subLower] || 'badge-muted'}`} style={{
                      fontSize: 10, padding: '2px 9px',
                    }}>
                      {u.subscription_status || 'inactive'}
                    </span>
                    {accLower !== 'active' && (
                      <span className={`badge ${STATUS_BADGE[accLower] || 'badge-muted'}`} style={{
                        fontSize: 10, padding: '2px 9px',
                      }}>
                        {accLower}
                      </span>
                    )}
                  </div>
                </div>

                {/* Numeric column */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
                  paddingLeft: 18, borderLeft: '1px solid var(--border)',
                  minWidth: 110, flexShrink: 0,
                }}>
                  {(u.credits ?? 0) > 0 && (
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--amber)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {u.credits} credits
                    </div>
                  )}
                  {u.discount_percent > 0 && (
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--amber)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {u.discount_percent}% off
                    </div>
                  )}
                  <div style={{
                    fontSize: 11, color: 'var(--t4)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {u.last_sign_in_at
                      ? `seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`
                      : 'never signed in'}
                  </div>
                </div>

                {/* CTA chevron */}
                <div
                  aria-hidden
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--t3)',
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={16} />
                </div>
              </Link>
            )
          })
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--t4)' }}>Page {page} of {totalPages || 1} · {total.toLocaleString()} users</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn btn-secondary btn-sm">
            <ChevronLeft size={13} /> Prev
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
