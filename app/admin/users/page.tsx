'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, UserCheck, TestTube } from 'lucide-react'

type UserRow = {
  id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  fullname: string
  plan: string
  subscription_status: string
  account_status: string
  credits: number
  subscription_bonus_months: number
  notes: string
  is_test_user?: boolean
}

const PLAN_BADGE: Record<string, string> = {
  pro: 'badge-acc',
  starter: 'badge-blue',
  free: 'badge-muted',
  enterprise: 'badge-purple',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-muted',
  closed: 'badge-red',
  suspended: 'badge-amber',
  trialing: 'badge-blue',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25

  const load = async (pageOverride?: number, searchOverride?: string) => {
    setLoading(true)
    const p = pageOverride ?? page
    const s = searchOverride ?? search
    const res = await fetch(`/api/admin/users?page=${p}&perPage=${perPage}&search=${encodeURIComponent(s)}`)
    const json = await res.json()
    setUsers(json.users || [])
    setTotal(json.total || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [page])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold mb-0.5" style={{ color: 'var(--t1)' }}>Users</h1>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>
            {total.toLocaleString()} total users
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t4)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(1, search) } }}
            placeholder="Search email, name, plan..."
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => { setPage(1); load(1, search) }}
          className="btn btn-primary"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table-root">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Sub status</th>
              <th>Account</th>
              <th>Type</th>
              <th>Credits</th>
              <th>Last active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}><div className="skeleton h-4 rounded" style={{ width: j === 0 ? 140 : 60 }} /></td>
                  ))}
                </tr>
              ))
            ) : users.length ? (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="font-medium text-sm" style={{ color: 'var(--t1)' }}>
                      {u.fullname || '—'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--t4)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${PLAN_BADGE[u.plan?.toLowerCase()] || 'badge-muted'}`}>
                      {u.plan || 'free'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[u.subscription_status?.toLowerCase()] || 'badge-muted'}`}>
                      {u.subscription_status || 'inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[u.account_status?.toLowerCase()] || 'badge-muted'}`}>
                      {u.account_status || 'active'}
                    </span>
                  </td>
                  <td>
                    {u.is_test_user ? (
                      <span className="badge badge-amber">
                        <TestTube size={10} /> test
                      </span>
                    ) : (
                      <span className="badge badge-muted">
                        <UserCheck size={10} /> normal
                      </span>
                    )}
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--t2)' }}>
                    {u.credits ?? 0}
                  </td>
                  <td style={{ color: 'var(--t3)' }} className="text-xs">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center" style={{ color: 'var(--t3)' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs" style={{ color: 'var(--t4)' }}>
          Page {page} of {totalPages || 1} &bull; {total.toLocaleString()} users
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-secondary btn-sm"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
