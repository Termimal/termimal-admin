'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, RefreshCw, CreditCard } from 'lucide-react'
import { HeroCard, Section } from '@/components/admin/PageChrome'
import Link from 'next/link'

const PLAN_BADGE: Record<string,string> = { free:'badge-muted', starter:'badge-blue', pro:'badge-acc', premium:'badge-purple' }
const STATUS_BADGE: Record<string,string> = { active:'badge-green', trialing:'badge-blue', past_due:'badge-amber', canceled:'badge-red', unpaid:'badge-red', inactive:'badge-muted' }

export default function AdminSubscriptionsPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
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
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page])

  const filtered = users.filter(u => {
    if (planFilter !== 'all' && u.plan !== planFilter) return false
    if (statusFilter !== 'all' && u.subscription_status !== statusFilter) return false
    return true
  })

  const stats = { free: 0, starter: 0, pro: 0, premium: 0 }
  users.forEach(u => { if (u.plan in stats) (stats as any)[u.plan]++ })
  const totalPages = Math.ceil(total / perPage)

  const totalPaying = stats.starter + stats.pro + stats.premium

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<CreditCard size={28} />}
        eyebrow="Recurring"
        title="Subscriptions"
        subtitle="Active Stripe subscriptions, trial windows, billing intervals, and renewals."
        metric={{ label: 'Paying', value: totalPaying.toString(), secondary: `${total.toLocaleString()} total users` }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => load()} className="btn btn-secondary btn-sm" style={{ minHeight: 38 }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { plan: 'free',    label: 'Free',    count: stats.free,    accent: 'muted'  as const },
          { plan: 'starter', label: 'Starter', count: stats.starter, accent: 'blue'   as const },
          { plan: 'pro',     label: 'Pro',     count: stats.pro,     accent: 'acc'    as const },
          { plan: 'premium', label: 'Premium', count: stats.premium, accent: 'purple' as const },
        ].map(s => {
          const colorVar = s.accent === 'muted' ? 'var(--t3)' : `var(--${s.accent})`
          const on = planFilter === s.plan
          return (
            <button
              key={s.plan}
              onClick={() => setPlanFilter(planFilter === s.plan ? 'all' : s.plan)}
              className="card-premium"
              style={{
                padding: '24px 28px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                background: on ? (s.accent === 'muted' ? 'var(--surface)' : `var(--${s.accent}-bg)`) : undefined,
                borderColor: on ? `${colorVar}55` : 'var(--border)',
              }}
            >
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 12,
              }}>{s.label} users</div>
              <div style={{
                fontSize: 32, fontWeight: 800, color: colorVar,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', lineHeight: 1,
              }}>{loading ? '…' : s.count}</div>
            </button>
          )
        })}
      </div>

      <Section title="Filters">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(1, search) } }}
              placeholder="Search email, name…"
            />
          </div>
          <select className="input" style={{ minWidth: 200 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {['active','trialing','past_due','canceled','unpaid','inactive'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" style={{ minHeight: 38 }} onClick={() => { setPage(1); load(1, search) }}>Search</button>
        </div>
      </Section>

      <Section flush title={`Subscribers (${filtered.length})`} description="Click any row to manage the user.">
        <div style={{ overflowX: 'auto' }}>
          <table className="table-root" style={{ width: '100%' }}>
            <thead>
              <tr>
                {['User','Plan','Status','Billing','Period end','Bonus mo','Discount',''].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '14px 24px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--t4)',
                    borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>{Array.from({ length: 8 }).map((__, j) => <td key={j} style={{ padding: '14px 24px' }}><div className="skeleton" style={{ width: j === 0 ? 140 : 60, height: 14, borderRadius: 6 }} /></td>)}</tr>
                ))
              ) : filtered.length ? (
                filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{u.fullname || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--t4)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 24px' }}><span className={`badge ${PLAN_BADGE[u.plan] || 'badge-muted'}`}>{u.plan || 'free'}</span></td>
                    <td style={{ padding: '14px 24px' }}><span className={`badge ${STATUS_BADGE[u.subscription_status] || 'badge-muted'}`}>{u.subscription_status || 'inactive'}</span></td>
                    <td style={{ padding: '14px 24px', color: 'var(--t3)', fontSize: 13 }}>{u.billing_interval || '—'}</td>
                    <td style={{ padding: '14px 24px', color: 'var(--t4)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{u.current_period_end ? new Date(u.current_period_end).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '14px 24px', color: 'var(--acc)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{u.subscription_bonus_months || 0}</td>
                    <td style={{ padding: '14px 24px', color: 'var(--amber)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{u.discount_percent ? `${u.discount_percent}%` : '—'}</td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <Link href={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">Manage</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--t4)' }}>No subscriptions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>Page {page} · {total.toLocaleString()} users total</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn btn-secondary btn-sm">
            <ChevronLeft size={13}/> Prev
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">
            Next <ChevronRight size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}
