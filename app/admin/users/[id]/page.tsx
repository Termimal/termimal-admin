'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
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
  billinginterval?: string | null
}

type AdminProfileRow = {
  user_id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  phone: string | null
  account_status: string
  credits: number
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

type CreditAdjustment = {
  id: string
  amount: number
  reason: string | null
  created_at: string
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [adminProfile, setAdminProfile] = useState<AdminProfileRow | null>(null)
  const [authMeta, setAuthMeta] = useState<AuthMetaRow | null>(null)
  const [adjustments, setAdjustments] = useState<CreditAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    account_status: 'active',
    notes: '',
    linked_accounts: '',
  })
  const [creditForm, setCreditForm] = useState({ amount: '', reason: '' })

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')

    const [{ data: p, error: pErr }, { data: a, error: aErr }, { data: u, error: uErr }, { data: c, error: cErr }] = await Promise.all([
      supabase.from('profiles').select('id, email, fullname, full_name, plan, subscriptionstatus, referralcode, createdat, created_at, billinginterval').eq('id', id).maybeSingle(),
      supabase.from('admin_user_profiles').select('user_id, first_name, last_name, date_of_birth, phone, account_status, credits, notes, linked_accounts, last_admin_action, last_admin_action_at').eq('user_id', id).maybeSingle(),
      supabase.from('admin_auth_users').select('id, email, last_sign_in_at, phone, app_metadata').eq('id', id).maybeSingle(),
      supabase.from('credit_adjustments').select('id, amount, reason, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20)
    ])

    if (pErr || aErr || uErr || cErr) {
      setError(pErr?.message || aErr?.message || uErr?.message || cErr?.message || 'Failed to load user')
    }

    setProfile(p || null)
    setAdminProfile(a || null)
    setAuthMeta(u || null)
    setAdjustments(c || [])

    setForm({
      first_name: a?.first_name || '',
      last_name: a?.last_name || '',
      date_of_birth: a?.date_of_birth || '',
      phone: a?.phone || u?.phone || '',
      account_status: a?.account_status || 'active',
      notes: a?.notes || '',
      linked_accounts: Array.isArray(a?.linked_accounts) ? a!.linked_accounts.join(', ') : '',
    })

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  const displayName = useMemo(() => {
    return [form.first_name, form.last_name].filter(Boolean).join(' ').trim() || profile?.fullname || profile?.full_name || 'Unnamed user'
  }, [form.first_name, form.last_name, profile])

  const providerList = useMemo(() => {
    const providers = authMeta?.app_metadata?.providers || (authMeta?.app_metadata?.provider ? [authMeta.app_metadata.provider] : [])
    return providers.length ? providers : ['email']
  }, [authMeta])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setError('')

    const payload = {
      user_id: id,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      date_of_birth: form.date_of_birth || null,
      phone: form.phone || null,
      account_status: form.account_status,
      notes: form.notes || null,
      linked_accounts: form.linked_accounts
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      last_admin_action: 'profile_update',
      last_admin_action_at: new Date().toISOString(),
      credits: adminProfile?.credits ?? 0,
    }

    const { error } = await supabase.from('admin_user_profiles').upsert(payload)
    if (error) {
      setError(error.message)
    } else {
      await load()
    }

    setSaving(false)
  }

  const addCredits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    const amount = Number(creditForm.amount)
    if (!Number.isFinite(amount) || amount === 0) return

    setSaving(true)
    setError('')

    const nextCredits = (adminProfile?.credits ?? 0) + amount

    const { error: adjustmentError } = await supabase.from('credit_adjustments').insert({
      user_id: id,
      amount,
      reason: creditForm.reason || null,
    })

    if (adjustmentError) {
      setError(adjustmentError.message)
      setSaving(false)
      return
    }

    const { error: profileError } = await supabase.from('admin_user_profiles').upsert({
      user_id: id,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      date_of_birth: form.date_of_birth || null,
      phone: form.phone || null,
      account_status: form.account_status,
      notes: form.notes || null,
      linked_accounts: form.linked_accounts.split(',').map((item) => item.trim()).filter(Boolean),
      credits: nextCredits,
      last_admin_action: amount > 0 ? 'credit_added' : 'credit_removed',
      last_admin_action_at: new Date().toISOString(),
    })

    if (profileError) {
      setError(profileError.message)
    } else {
      setCreditForm({ amount: '', reason: '' })
      await load()
    }

    setSaving(false)
  }

  if (loading) {
    return <div style={{ color: 'var(--t3)' }}>Loading user details...</div>
  }

  if (!profile) {
    return <div style={{ color: 'var(--red-val)' }}>User not found.</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {error ? <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>{error}</div> : null}

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--t1)' }}>{displayName}</h1>
                <div className="text-sm font-mono" style={{ color: 'var(--t3)' }}>{profile.id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--t4)' }}>Credits</div>
                <div className="text-2xl font-bold">{adminProfile?.credits ?? 0}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><span style={{ color: 'var(--t4)' }}>Email</span><div>{profile.email || authMeta?.email || '—'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Phone</span><div>{form.phone || '—'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Date of birth</span><div>{form.date_of_birth || '—'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Plan</span><div>{profile.plan || 'free'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Subscription status</span><div>{profile.subscriptionstatus || form.account_status}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Billing interval</span><div>{profile.billinginterval || '—'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Joined</span><div>{profile.createdat || profile.created_at ? new Date(profile.createdat || profile.created_at || '').toLocaleString() : '—'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Last login</span><div>{authMeta?.last_sign_in_at ? new Date(authMeta.last_sign_in_at).toLocaleString() : 'Never'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Referral code</span><div>{profile.referralcode || '—'}</div></div>
              <div><span style={{ color: 'var(--t4)' }}>Linked accounts</span><div>{providerList.join(', ')}</div></div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-lg font-bold mb-4">Admin managed account details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>First name</label>
                <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Last name</label>
                <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Date of birth</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Account status</label>
                <select value={form.account_status} onChange={(e) => setForm({ ...form, account_status: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="closed">Closed</option>
                  <option value="review">Review</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Linked accounts</label>
                <input value={form.linked_accounts} onChange={(e) => setForm({ ...form, linked_accounts: e.target.value })} placeholder="google, apple, email" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Internal notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={5} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">Save account details</button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <form onSubmit={addCredits} className="p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-lg font-bold mb-4">Manual crediting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Amount</label>
                <input type="number" value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })} placeholder="100 or -50" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Reason</label>
                <textarea value={creditForm.reason} onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full px-4 py-2 text-sm disabled:opacity-60">Apply credit adjustment</button>
            </div>
          </form>

          <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-lg font-bold mb-4">Recent credit history</h2>
            <div className="space-y-3">
              {adjustments.length === 0 ? (
                <div className="text-sm" style={{ color: 'var(--t3)' }}>No credit adjustments yet.</div>
              ) : adjustments.map((item) => (
                <div key={item.id} className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-semibold">{item.amount > 0 ? `+${item.amount}` : item.amount}</span>
                    <span className="text-xs" style={{ color: 'var(--t4)' }}>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--t3)' }}>{item.reason || 'No reason provided'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}