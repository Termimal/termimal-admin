'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, UserCheck, TestTube2, Building2, Crown, RefreshCw } from 'lucide-react'

type UserRow = {
  id: string; email: string | null; created_at: string | null; last_sign_in_at: string | null
  fullname: string; plan: string; subscription_status: string; account_status: string
  credits: number; subscription_bonus_months: number; is_test_user?: boolean; user_type: string; discount_percent: number
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
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Users</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>{total.toLocaleString()} total users</p>
        </div>
        <button onClick={() => load()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t3)', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
          <input className="input" style={{ paddingLeft: 32 }} value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(1, search) } }}
            placeholder="Search by email, name, ID, plan…" />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['all','free','starter','pro','premium'].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)}
              style={{
                padding: '7px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: planFilter === p ? 'var(--acc-bg)' : 'var(--surface)',
                borderColor: planFilter === p ? 'var(--acc-border)' : 'var(--border)',
                color: planFilter === p ? 'var(--acc)' : 'var(--t3)',
              }}>{p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => { setPage(1); load(1, search) }}>Search</button>
      </div>

      <div className="table-wrap">
        <table className="table-root">
          <thead>
            <tr>
              <th>User</th><th>Plan</th><th>Sub</th><th>Account</th><th>Type</th>
              <th>Credits</th><th>Discount</th><th>Last active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 9 }).map((__, j) => (
                  <td key={j}><div className="skeleton h-4 rounded" style={{ width: j === 0 ? 140 : 60 }} /></td>
                ))}</tr>
              ))
            ) : filtered.length ? (
              filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{u.fullname || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>{u.email}</div>
                  </td>
                  <td><span className={`badge ${PLAN_BADGE[u.plan?.toLowerCase()] || 'badge-muted'}`}>{u.plan || 'free'}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[u.subscription_status?.toLowerCase()] || 'badge-muted'}`}>{u.subscription_status || 'inactive'}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[u.account_status?.toLowerCase()] || 'badge-muted'}`}>{u.account_status || 'active'}</span></td>
                  <td>
                    <span className={`badge ${TYPE_BADGE[u.user_type || 'normal'] || 'badge-muted'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {TYPE_ICONS[u.user_type || 'normal']} {u.user_type || 'normal'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--amber)', fontVariantNumeric: 'tabular-nums' }}>{u.credits ?? 0}</td>
                  <td style={{ color: u.discount_percent > 0 ? 'var(--amber)' : 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                    {u.discount_percent > 0 ? `${u.discount_percent}%` : '—'}
                  </td>
                  <td style={{ color: 'var(--t4)', fontSize: 12 }}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}</td>
                  <td><Link href={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">Manage</Link></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={9} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t4)' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
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
