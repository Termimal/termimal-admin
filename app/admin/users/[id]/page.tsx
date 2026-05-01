'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Package,
  Shield,
  TestTube,
  UserCheck,
  Gift,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Copy,
} from 'lucide-react'
import Link from 'next/link'

// ─── Termimal packages catalogue ────────────────────────────────────────────
const PACKAGES = [
  {
    id: 'pro_1m',
    label: 'Pro — 1 Month',
    plan: 'pro',
    months: 1,
    description: 'Full Pro access for 1 month',
    color: 'var(--acc)',
  },
  {
    id: 'pro_3m',
    label: 'Pro — 3 Months',
    plan: 'pro',
    months: 3,
    description: 'Full Pro access for 3 months',
    color: 'var(--acc)',
  },
  {
    id: 'pro_6m',
    label: 'Pro — 6 Months',
    plan: 'pro',
    months: 6,
    description: 'Full Pro access for 6 months',
    color: 'var(--acc)',
  },
  {
    id: 'pro_12m',
    label: 'Pro — 12 Months',
    plan: 'pro',
    months: 12,
    description: 'Full Pro access for 1 year',
    color: 'var(--acc)',
  },
  {
    id: 'starter_1m',
    label: 'Starter — 1 Month',
    plan: 'starter',
    months: 1,
    description: 'Starter plan for 1 month',
    color: 'var(--blue)',
  },
  {
    id: 'starter_3m',
    label: 'Starter — 3 Months',
    plan: 'starter',
    months: 3,
    description: 'Starter plan for 3 months',
    color: 'var(--blue)',
  },
  {
    id: 'credits_100',
    label: '100 Credits',
    plan: null,
    months: 0,
    credits: 100,
    description: 'Add 100 credits to the account',
    color: 'var(--amber)',
  },
  {
    id: 'credits_500',
    label: '500 Credits',
    plan: null,
    months: 0,
    credits: 500,
    description: 'Add 500 credits to the account',
    color: 'var(--amber)',
  },
]

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-muted',
  closed: 'badge-red',
  suspended: 'badge-amber',
  trialing: 'badge-blue',
  pro: 'badge-acc',
  starter: 'badge-blue',
  free: 'badge-muted',
  enterprise: 'badge-purple',
}

function Badge({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span className={`badge ${STATUS_BADGE[value?.toLowerCase()] || 'badge-muted'} ${className}`}>
      {value || '—'}
    </span>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--t4)' }}>{label}</span>
      <span
        className={`text-xs text-right ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--t2)' }}
      >
        {String(value ?? '—')}
      </span>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [selectedPackage, setSelectedPackage] = useState('')
  const [giftNote, setGiftNote] = useState('')
  const [giftLoading, setGiftLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    account_status: 'active',
    subscription_bonus_months: 0,
    credits: 0,
    notes: '',
    last_admin_action: '',
    is_test_user: false,
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
      is_test_user: json.admin?.is_test_user || false,
    })
    setLoading(false)
  }

  useEffect(() => { if (params.id) load() }, [params.id])

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const save = async (payload: any) => {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (json.ok) { showMsg('ok', 'Changes saved.'); load() }
    else showMsg('err', json.error || 'Failed to save.')
    setSaving(false)
  }

  const grantPackage = async () => {
    if (!selectedPackage) return
    const pkg = PACKAGES.find((p) => p.id === selectedPackage)
    if (!pkg) return
    setGiftLoading(true)
    const res = await fetch(`/api/admin/users/${params.id}/grant-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: pkg.id, plan: pkg.plan, months: pkg.months, credits: (pkg as any).credits, note: giftNote }),
    })
    const json = await res.json()
    if (json.ok) { showMsg('ok', `Package "${pkg.label}" granted successfully.`); setSelectedPackage(''); setGiftNote(''); load() }
    else showMsg('err', json.error || 'Failed to grant package.')
    setGiftLoading(false)
  }

  const copyId = () => {
    if (data?.user?.id) {
      navigator.clipboard.writeText(data.user.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="skeleton h-6 w-48 mb-8 rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const user = data?.user
  const profile = data?.profile
  const admin = data?.admin
  const pkg = PACKAGES.find((p) => p.id === selectedPackage)

  return (
    <div className="max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} /> Users
        </Link>
        <span style={{ color: 'var(--border2)' }}>/</span>
        <span className="text-sm" style={{ color: 'var(--t2)' }}>{profile?.fullname || user?.email || 'User detail'}</span>
      </div>

      {/* Identity bar */}
      <div className="flex items-start gap-4 mb-6 p-4 card rounded-xl">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-base font-bold"
          style={{ width: 44, height: 44, background: 'var(--acc-bg)', color: 'var(--acc)', border: '1px solid var(--acc-border)' }}
        >
          {(profile?.fullname || user?.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold" style={{ color: 'var(--t1)' }}>
              {profile?.fullname || user?.email || 'Unknown user'}
            </h1>
            <Badge value={profile?.plan || 'free'} />
            <Badge value={admin?.account_status || 'active'} />
            {admin?.is_test_user && (
              <span className="badge badge-amber"><TestTube size={10} /> test user</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs" style={{ color: 'var(--t3)' }}>{user?.email}</span>
          </div>
          <button
            onClick={copyId}
            className="flex items-center gap-1 mt-1 text-xs hover:opacity-80 transition-opacity"
            style={{ color: 'var(--t4)', fontFamily: 'monospace' }}
            title="Copy user ID"
          >
            <span>{user?.id?.slice(0, 20)}…</span>
            <Copy size={10} />
            {copied && <span style={{ color: 'var(--acc)' }}>copied!</span>}
          </button>
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`mb-4 ${message.type === 'ok' ? 'msg-ok' : 'msg-err'} flex items-center gap-2`}>
          {message.type === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Account info */}
        <section className="card card-p">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} style={{ color: 'var(--acc)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Account info</h2>
          </div>
          <InfoRow label="User ID" value={user?.id} mono />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Full name" value={profile?.fullname || '—'} />
          <InfoRow label="Plan" value={profile?.plan || 'free'} />
          <InfoRow label="Sub status" value={profile?.subscriptionstatus || 'inactive'} />
          <InfoRow label="Billing interval" value={profile?.billinginterval || '—'} />
          <InfoRow label="Credits" value={(admin?.credits ?? profile?.credits ?? 0).toLocaleString()} />
          <InfoRow label="Bonus months" value={admin?.subscription_bonus_months ?? 0} />
          <InfoRow label="Created" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
          <InfoRow label="Last sign in" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'} />
        </section>

        {/* Controls */}
        <section className="card card-p">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Controls</h2>
          </div>

          <div className="space-y-4">
            {/* Test user toggle */}
            <div>
              <label className="label">User type</label>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setForm((f) => ({ ...f, is_test_user: !f.is_test_user }))}
                  className="toggle"
                  data-checked={form.is_test_user ? 'true' : 'false'}
                  role="switch"
                  aria-checked={form.is_test_user}
                  aria-label="Test user toggle"
                >
                  <span className="toggle-thumb" />
                </button>
                <div>
                  <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--t1)' }}>
                    {form.is_test_user ? <><TestTube size={12} style={{ color: 'var(--amber)' }} /> Test user</> : <><UserCheck size={12} style={{ color: 'var(--acc)' }} /> Normal user</>}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--t4)' }}>
                    {form.is_test_user ? 'Excluded from analytics & billing' : 'Real customer account'}
                  </div>
                </div>
              </div>
            </div>

            {/* Account status */}
            <div>
              <label className="label">Account status</label>
              <select
                value={form.account_status}
                onChange={(e) => setForm((f) => ({ ...f, account_status: e.target.value }))}
                className="select"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Credits */}
            <div>
              <label className="label">Credits</label>
              <input
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
                className="input"
              />
            </div>

            {/* Bonus months */}
            <div>
              <label className="label">Subscription bonus months</label>
              <input
                type="number"
                min={0}
                value={form.subscription_bonus_months}
                onChange={(e) => setForm((f) => ({ ...f, subscription_bonus_months: Number(e.target.value) }))}
                className="input"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Internal notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input resize-none"
                placeholder="Notes visible only to admins..."
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button disabled={saving} onClick={() => save(form)} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {admin?.account_status !== 'closed' ? (
                <button
                  disabled={saving}
                  onClick={() => save({ ...form, account_status: 'closed', last_admin_action: 'closed account' })}
                  className="btn btn-danger"
                >
                  Close account
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={() => save({ ...form, account_status: 'active', last_admin_action: 'reopened account' })}
                  className="btn btn-secondary"
                >
                  Reopen account
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Package management */}
        <section className="card card-p md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={14} style={{ color: 'var(--purple)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Grant a package</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PACKAGES.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPackage(selectedPackage === p.id ? '' : p.id)}
                className={`rounded-lg p-3 text-left transition-all border ${
                  selectedPackage === p.id
                    ? 'border-[var(--acc-border)] bg-[var(--acc-bg)]'
                    : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {(p as any).credits ? (
                    <CreditCard size={11} style={{ color: p.color }} />
                  ) : (
                    <Package size={11} style={{ color: p.color }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: p.color }}>
                    {(p as any).credits ? `+${(p as any).credits}` : `${p.months}mo`}
                  </span>
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--t1)' }}>{p.label}</div>
                <div className="text-xs" style={{ color: 'var(--t4)' }}>{p.description}</div>
              </button>
            ))}
          </div>

          {selectedPackage && pkg && (
            <div className="rounded-lg p-4 mb-3" style={{ background: 'var(--acc-bg)', border: '1px solid var(--acc-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={14} style={{ color: 'var(--acc)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--acc)' }}>Selected: {pkg.label}</span>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="e.g. Gifted for beta feedback..."
                  className="input text-xs"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  disabled={giftLoading}
                  onClick={grantPackage}
                  className="btn btn-primary"
                >
                  <Gift size={13} />
                  {giftLoading ? 'Granting…' : 'Grant package'}
                </button>
                <button onClick={() => setSelectedPackage('')} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Package history */}
          {admin?.package_history?.length ? (
            <div className="mt-2">
              <div className="section-title">Grant history</div>
              <div className="space-y-1">
                {(admin.package_history as any[]).map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-2" style={{ borderTop: '1px solid var(--border)', color: 'var(--t3)' }}>
                    <span style={{ color: 'var(--t2)' }}>{h.label || h.packageId}</span>
                    <div className="flex items-center gap-3">
                      {h.note && <span style={{ color: 'var(--t4)' }}>{h.note}</span>}
                      <span className="flex items-center gap-1"><Clock size={10} /> {h.granted_at ? new Date(h.granted_at).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Raw data (collapsed) */}
        <section className="card card-p md:col-span-2">
          <details>
            <summary className="flex items-center gap-2 cursor-pointer list-none" style={{ color: 'var(--t3)' }}>
              <ChevronDown size={14} />
              <span className="text-xs font-semibold">Raw profile data</span>
            </summary>
            <pre
              className="overflow-auto text-xs mt-3 p-3 rounded-lg"
              style={{ background: 'var(--bg2)', color: 'var(--t3)', maxHeight: 300 }}
            >
              {JSON.stringify({ user, profile, admin }, null, 2)}
            </pre>
          </details>
        </section>
      </div>
    </div>
  )
}
