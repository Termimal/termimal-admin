'use client'

import Link from 'next/link'
import { Search, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = {
  id: string
  email: string | null
  fullname?: string | null
  full_name?: string | null
  plan?: string | null
  subscriptionstatus?: string | null
  referralcode?: string | null
  createdat?: string | null
  created_at?: string | null
}

type AdminProfileRow = {
  user_id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  phone: string | null
  account_status: string | null
  credits: number | null
  notes: string | null
  linked_accounts: string[] | null
  last_admin_action: string | null
  last_admin_action_at: string | null
}

type AuthMetaRow = {
  id: string
  email?: string | null
  last_sign_in_at?: string | null
  phone?: string | null
  app_metadata?: {
    provider?: string
    providers?: string[]
  } | null
}

type UserView = {
  id: string
  fullName: string
  email: string
  plan: string
  status: string
  credits: number
  joinedAt: string | null
  lastSignInAt: string | null
  phone: string
  providerList: string[]
}

export default function UsersPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [adminProfiles, setAdminProfiles] = useState<AdminProfileRow[]>([])
  const [authMeta, setAuthMeta] = useState<AuthMetaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')

    const [
      { data: profilesData, error: profilesError },
      { data: adminData, error: adminError },
      { data: authData, error: authError },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, fullname, full_name, plan, subscriptionstatus, referralcode, createdat, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('admin_user_profiles')
        .select('user_id, first_name, last_name, date_of_birth, phone, account_status, credits, notes, linked_accounts, last_admin_action, last_admin_action_at'),
      supabase.from('admin_auth_users').select('id, email, last_sign_in_at, phone, app_metadata'),
    ])

    const anyError = profilesError || adminError || authError
    if (anyError) {
      setError(anyError.message || 'Failed to load users')
      setProfiles([])
      setAdminProfiles([])
      setAuthMeta([])
    } else {
      setProfiles((profilesData || []) as ProfileRow[])
      setAdminProfiles((adminData || []) as AdminProfileRow[])
      setAuthMeta((authData || []) as AuthMetaRow[])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const rows = useMemo<UserView[]>(() => {
    const adminMap = new Map(adminProfiles.map((a) => [a.user_id, a]))
    const authMap = new Map(authMeta.map((a) => [a.id, a]))

    return profiles.map((p) => {
      const admin = adminMap.get(p.id)
      const auth = authMap.get(p.id)
      const rawProviders =
        auth?.app_metadata?.providers ||
        (auth?.app_metadata?.provider ? [auth.app_metadata.provider] : [])

      const fullName =
        [admin?.first_name, admin?.last_name].filter(Boolean).join(' ').trim() ||
        p.fullname ||
        p.full_name ||
        'Unnamed user'

      return {
        id: p.id,
        fullName,
        email: p.email || auth?.email || '—',
        plan: p.plan || 'free',
        status: (admin?.account_status || p.subscriptionstatus || 'active').toLowerCase(),
        credits: admin?.credits ?? 0,
        joinedAt: p.createdat || p.created_at || null,
        lastSignInAt: auth?.last_sign_in_at || null,
        phone: admin?.phone || auth?.phone || '—',
        providerList: rawProviders,
      }
    })
  }, [profiles, adminProfiles, authMeta])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!q) return true
      return [
        row.id,
        row.fullName,
        row.email,
        row.plan,
        row.status,
        row.phone,
        row.providerList.join(' '),
      ].some((value) => String(value).toLowerCase().includes(q))
    })
  }, [rows, search, statusFilter])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--t1)' }}>
            Users
          </h1>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>
            Real user accounts only. No dummy data.
          </p>
        </div>
        <button onClick={load} className="btn-secondary px-3 py-2 text-sm inline-flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Search size={14} style={{ color: 'var(--t4)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, provider or account ID"
            className="bg-transparent outline-none text-[0.82rem] w-full"
            style={{ color: 'var(--t1)' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-[0.78rem]"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
          <option value="review">Review</option>
        </select>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>
          {error}
        </div>
      ) : null}

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {['User', 'Email', 'Plan', 'Credits', 'Last login', 'Providers', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[0.62rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--t3)' }}>
                  Loading users...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--t3)' }}>
                  No users found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: 'var(--t1)' }}>
                      {row.fullName}
                    </div>
                    <Link href={`/admin/users/${row.id}`} className="font-mono text-[0.68rem] hover:underline" style={{ color: 'var(--acc)' }}>
                      {row.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--t2)' }}>
                    {row.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-[0.63rem]" style={{ background: 'var(--surface)', color: 'var(--t2)' }}>
                      {row.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.credits}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--t3)' }}>
                    {row.lastSignInAt ? new Date(row.lastSignInAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--t3)' }}>
                    {row.providerList.length ? row.providerList.join(', ') : 'email'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${row.id}`} className="btn-secondary px-3 py-2 text-xs inline-flex">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}