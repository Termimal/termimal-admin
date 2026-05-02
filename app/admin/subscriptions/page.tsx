'use client'

import { useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
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
  useEffect(() => { load() }, [page])

  const filtered = users.filter(u => {
    if (planFilter !== 'all' && u.plan !== planFilter) return false
    if (statusFilter !== 'all' && u.subscription_status !== statusFilter) return false
    return true
  })

  const stats = { free: 0, starter: 0, pro: 0, premium: 0 }
  users.forEach(u => { if (u.plan in stats) (stats as any)[u.plan]++ })
  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Subscriptions</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>All user subscription plans and statuses</p>
        </div>
        <button onClick={() => load()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t3)', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { plan: 'free',    label: 'Free',    count: stats.free,    color: 'var(--t4)'     },
          { plan: 'starter', label: 'Starter', count: stats.starter, color: 'var(--blue)'   },
          { plan: 'pro',     label: 'Pro',     count: stats.pro,     color: 'var(--acc)'    },
          { plan: 'premium', label: 'Premium', count: stats.premium, color: 'var(--purple)' },
        ].map(s => (
          <button key={s.plan} onClick={() => setPlanFilter(planFilter === s.plan ? 'all' : s.plan)}
            className="kpi-card"
            style={{ border: planFilter === s.plan ? `1.5px solid ${s.color}55` : '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div className="kpi-value" style={{ color: s.color }}>{loading ? '…' : s.count}</div>
            <div className="kpi-label">{s.label} users</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
          <input className="input" style={{ paddingLeft: 32 }} value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(1, search) } }}
            placeholder="Search email, name…" />
        </div>
        <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {['active','trialing','past_due','canceled','unpaid','inactive'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => { setPage(1); load(1, search) }}>Search</button>
      </div>

      <div className="table-wrap">
        <table className="table-root">
          <thead>
            <tr>
              <th>User</th><th>Plan</th><th>Sub status</th><th>Billing</th><th>Period end</th><th>Bonus mo</th><th>Discount</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j}><div className="skeleton h-4 rounded" style={{ width: j === 0 ? 140 : 60 }} /></td>)}</tr>
              ))
            ) : filtered.length ? (
              filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{u.fullname || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>{u.email}</div>
                  </td>
                  <td><span className={`badge ${PLAN_BADGE[u.plan] || 'badge-muted'}`}>{u.plan || 'free'}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[u.subscription_status] || 'badge-muted'}`}>{u.subscription_status || 'inactive'}</span></td>
                  <td style={{ color: 'var(--t3)', fontSize: 12 }}>{u.billing_interval || '—'}</td>
                  <td style={{ color: 'var(--t4)', fontSize: 12 }}>{u.current_period_end ? new Date(u.current_period_end).toLocaleDateString() : '—'}</td>
                  <td style={{ color: 'var(--acc)', fontVariantNumeric: 'tabular-nums' }}>{u.subscription_bonus_months || 0}</td>
                  <td style={{ color: 'var(--amber)', fontVariantNumeric: 'tabular-nums' }}>{u.discount_percent ? `${u.discount_percent}%` : '—'}</td>
                  <td><Link href={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">Manage</Link></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t4)' }}>No subscriptions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--t4)' }}>Page {page} · {total.toLocaleString()} users total</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn btn-secondary btn-sm"><ChevronLeft size={13}/> Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">Next <ChevronRight size={13}/></button>
        </div>
      </div>
    </div>
  )
}
