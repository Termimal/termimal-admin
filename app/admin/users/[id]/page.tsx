'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    account_status: 'active',
    subscription_bonus_months: 0,
    credits: 0,
    notes: '',
    last_admin_action: '',
  })

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users/${params.id}`)
    const json = await res.json()
    setData(json)
    setForm({
      account_status: json.admin?.account_status || 'active',
      subscription_bonus_months: json.admin?.subscription_bonus_months || 0,
      credits: json.admin?.credits || 0,
      notes: json.admin?.notes || '',
      last_admin_action: json.admin?.last_admin_action || '',
    })
    setLoading(false)
  }

  useEffect(() => {
    if (params.id) load()
  }, [params.id])

  const save = async (payload: any) => {
    setSaving(true)
    setMessage('')

    const res = await fetch(`/api/admin/users/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json()
    setMessage(json.ok ? 'Saved.' : json.error || 'Failed.')
    setSaving(false)

    if (json.ok) load()
  }

  if (loading) return <div style={{ color: 'var(--t3)' }}>Loading user...</div>

  const user = data?.user
  const profile = data?.profile
  const admin = data?.admin

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--t1)' }}>
          {profile?.fullname || user?.email || 'User detail'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          {user?.email}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          className="rounded-xl p-6"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="mb-4 text-sm font-bold" style={{ color: 'var(--t1)' }}>
            Account
          </h2>
          <div className="space-y-3 text-sm">
            <Row label="User ID" value={user?.id} />
            <Row label="Plan" value={profile?.plan || 'free'} />
            <Row label="Subscription" value={profile?.subscriptionstatus || 'inactive'} />
            <Row label="Created" value={user?.created_at ? new Date(user.created_at).toLocaleString() : '—'} />
            <Row label="Last sign in" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'} />
          </div>
        </section>

        <section
          className="rounded-xl p-6"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="mb-4 text-sm font-bold" style={{ color: 'var(--t1)' }}>
            Controls
          </h2>

          <div className="space-y-3">
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase" style={{ color: 'var(--t4)' }}>
                Account status
              </div>
              <select
                value={form.account_status}
                onChange={(e) => setForm((p) => ({ ...p, account_status: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              >
                <option value="active">active</option>
                <option value="closed">closed</option>
                <option value="suspended">suspended</option>
              </select>
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase" style={{ color: 'var(--t4)' }}>
                Subscription bonus months
              </div>
              <input
                type="number"
                value={form.subscription_bonus_months}
                onChange={(e) =>
                  setForm((p) => ({ ...p, subscription_bonus_months: Number(e.target.value) }))
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase" style={{ color: 'var(--t4)' }}>
                Credits
              </div>
              <input
                type="number"
                value={form.credits}
                onChange={(e) => setForm((p) => ({ ...p, credits: Number(e.target.value) }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase" style={{ color: 'var(--t4)' }}>
                Notes
              </div>
              <textarea
                rows={5}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase" style={{ color: 'var(--t4)' }}>
                Last admin action
              </div>
              <input
                value={form.last_admin_action}
                onChange={(e) => setForm((p) => ({ ...p, last_admin_action: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                disabled={saving}
                onClick={() => save(form)}
                className="btn-primary px-4 py-2 text-sm"
              >
                Save changes
              </button>

              <button
                disabled={saving}
                onClick={() =>
                  save({
                    ...form,
                    close_account: true,
                    last_admin_action: 'closed account',
                  })
                }
                className="btn-secondary px-4 py-2 text-sm"
              >
                Close account
              </button>

              <button
                disabled={saving}
                onClick={() =>
                  save({
                    ...form,
                    open_account: true,
                    last_admin_action: 'opened account',
                  })
                }
                className="btn-secondary px-4 py-2 text-sm"
              >
                Open account
              </button>
            </div>

            {message ? (
              <div className="pt-1 text-sm" style={{ color: 'var(--t3)' }}>
                {message}
              </div>
            ) : null}
          </div>
        </section>

        <section
          className="rounded-xl p-6 md:col-span-2"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="mb-4 text-sm font-bold" style={{ color: 'var(--t1)' }}>
            Raw profile data
          </h2>
          <pre className="overflow-auto text-xs" style={{ color: 'var(--t2)' }}>
            {JSON.stringify({ user, profile, admin }, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div
      className="flex items-start justify-between gap-4 border-b pb-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <span style={{ color: 'var(--t4)' }}>{label}</span>
      <span className="text-right" style={{ color: 'var(--t2)' }}>
        {String(value ?? '—')}
      </span>
    </div>
  )
}
