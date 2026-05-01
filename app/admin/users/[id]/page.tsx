'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Package, Shield, TestTube, UserCheck, Gift,
  Clock, CreditCard, CheckCircle, XCircle, ChevronDown, Copy, Zap,
} from 'lucide-react'
import Link from 'next/link'

const PACKAGES = [
  { id: 'pro_1m',      label: 'Pro — 1 Month',    plan: 'pro',     months: 1,  credits: 0,   description: 'Full Pro access for 1 month',    color: 'var(--acc)' },
  { id: 'pro_3m',      label: 'Pro — 3 Months',   plan: 'pro',     months: 3,  credits: 0,   description: 'Full Pro access for 3 months',   color: 'var(--acc)' },
  { id: 'pro_6m',      label: 'Pro — 6 Months',   plan: 'pro',     months: 6,  credits: 0,   description: 'Full Pro access for 6 months',   color: 'var(--acc)' },
  { id: 'pro_12m',     label: 'Pro — 12 Months',  plan: 'pro',     months: 12, credits: 0,   description: 'Full Pro access for 1 year',     color: 'var(--acc)' },
  { id: 'starter_1m',  label: 'Starter — 1 Month', plan: 'starter', months: 1,  credits: 0,  description: 'Starter plan for 1 month',       color: 'var(--blue)' },
  { id: 'starter_3m',  label: 'Starter — 3 Months',plan: 'starter', months: 3,  credits: 0,  description: 'Starter plan for 3 months',      color: 'var(--blue)' },
  { id: 'credits_100', label: '100 Credits',       plan: null,      months: 0,  credits: 100, description: 'Add 100 credits to the account', color: 'var(--amber)' },
  { id: 'credits_500', label: '500 Credits',       plan: null,      months: 0,  credits: 500, description: 'Add 500 credits to the account', color: 'var(--amber)' },
]

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green', inactive: 'badge-muted', closed: 'badge-red',
  suspended: 'badge-amber', trialing: 'badge-blue', pro: 'badge-acc',
  starter: 'badge-blue', free: 'badge-muted', enterprise: 'badge-purple',
}

function Badge({ value, className = '' }: { value: string; className?: string }) {
  return <span className={`badge ${STATUS_BADGE[value?.toLowerCase()] || 'badge-muted'} ${className}`}>{value || '—'}</span>
}

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--t4)' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--t2)' }}>{String(value ?? '—')}</span>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
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
    plan: 'free',
    subscription_status: 'inactive',
    billing_interval: 'month',
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
      plan: json.profile?.plan || 'free',
      subscription_status: json.profile?.subscriptionstatus || 'inactive',
      billing_interval: json.profile?.billinginterval || 'month',
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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: pkg.id, plan: pkg.plan, months: pkg.months, credits: pkg.credits, note: giftNote, label: pkg.label }),
    })
    const json = await res.json()
    if (json.ok) { showMsg('ok', `"${pkg.label}" granted.`); setSelectedPackage(''); setGiftNote(''); load() }
    else showMsg('err', json.error || 'Failed to grant package.')
    setGiftLoading(false)
  }

  const quickGrant = async (label: string, months: number, plan: string | null, note: string) => {
    setGiftLoading(true)
    const res = await fetch(`/api/admin/users/${params.id}/grant-package`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: `quick_${Date.now()}`, plan, months, credits: 0, note, label }),
    })
    const json = await res.json()
    if (json.ok) { showMsg('ok', `${label} granted.`); load() }
    else showMsg('err', json.error || 'Failed.')
    setGiftLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="skeleton h-6 w-48 mb-8 rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map((i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
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
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Users</Link>
        <span style={{ color: 'var(--border2)' }}>/</span>
        <span className="text-sm" style={{ color: 'var(--t2)' }}>{profile?.fullname || user?.email || 'User detail'}</span>
      </div>

      {/* Identity bar */}
      <div className="flex items-start gap-4 mb-6 p-4 card rounded-xl">
        <div className="flex-shrink-0 flex items-center justify-center rounded-full text-base font-bold"
          style={{ width: 44, height: 44, background: 'var(--acc-bg)', color: 'var(--acc)', border: '1px solid var(--acc-border)' }}>
          {(profile?.fullname || user?.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold" style={{ color: 'var(--t1)' }}>{profile?.fullname || user?.email || 'Unknown user'}</h1>
            <Badge value={profile?.plan || 'free'} />
            <Badge value={admin?.account_status || 'active'} />
            {admin?.is_test_user && <span className="badge badge-amber"><TestTube size={10} /> test user</span>}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{user?.email}</div>
          <button onClick={() => { navigator.clipboard.writeText(user?.id || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="flex items-center gap-1 mt-1 text-xs hover:opacity-80 transition-opacity"
            style={{ color: 'var(--t4)', fontFamily: 'monospace' }}>
            <span>{user?.id?.slice(0, 20)}…</span>
            <Copy size={10} />
            {copied && <span style={{ color: 'var(--acc)' }}>copied!</span>}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 ${message.type === 'ok' ? 'msg-ok' : 'msg-err'} flex items-center gap-2`}>
          {message.type === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">

        {/* ── Account info ── */}
        <section className="card card-p">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} style={{ color: 'var(--acc)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Account info</h2>
          </div>
          <InfoRow label="User ID"         value={user?.id}                                                          mono />
          <InfoRow label="Email"           value={user?.email} />
          <InfoRow label="Full name"       value={profile?.fullname || '—'} />
          <InfoRow label="Plan"            value={profile?.plan || 'free'} />
          <InfoRow label="Sub status"      value={profile?.subscriptionstatus || 'inactive'} />
          <InfoRow label="Billing"         value={profile?.billinginterval || '—'} />
          <InfoRow label="Credits"         value={(admin?.credits ?? 0).toLocaleString()} />
          <InfoRow label="Bonus months"    value={admin?.subscription_bonus_months ?? 0} />
          <InfoRow label="Created"         value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
          <InfoRow label="Last sign in"    value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'} />
        </section>

        {/* ── Controls ── */}
        <section className="card card-p">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Controls</h2>
          </div>
          <div className="space-y-4">

            {/* Test user toggle */}
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--t1)' }}>
                  {form.is_test_user ? <><TestTube size={12} style={{ color: 'var(--amber)' }} /> Test user</> : <><UserCheck size={12} style={{ color: 'var(--acc)' }} /> Normal user</>}
                </div>
                <div className="text-xs" style={{ color: 'var(--t4)' }}>{form.is_test_user ? 'Excluded from analytics & billing' : 'Real customer account'}</div>
              </div>
              <button onClick={() => setForm((f) => ({ ...f, is_test_user: !f.is_test_user }))}
                className="toggle" data-checked={form.is_test_user ? 'true' : 'false'}
                role="switch" aria-checked={form.is_test_user} aria-label="Test user toggle">
                <span className="toggle-thumb" />
              </button>
            </div>

            {/* Plan */}
            <div>
              <label className="label">Plan</label>
              <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className="select">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Subscription status */}
            <div>
              <label className="label">Subscription status</label>
              <select value={form.subscription_status} onChange={(e) => setForm((f) => ({ ...f, subscription_status: e.target.value }))} className="select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past due</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            {/* Billing interval */}
            <div>
              <label className="label">Billing interval</label>
              <select value={form.billing_interval} onChange={(e) => setForm((f) => ({ ...f, billing_interval: e.target.value }))} className="select">
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>

            {/* Account status */}
            <div>
              <label className="label">Account status</label>
              <select value={form.account_status} onChange={(e) => setForm((f) => ({ ...f, account_status: e.target.value }))} className="select">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Credits */}
            <div>
              <label className="label">Credits (set exact value)</label>
              <input type="number" min={0} value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))} className="input" />
            </div>

            {/* Bonus months */}
            <div>
              <label className="label">Bonus months (set exact value)</label>
              <input type="number" min={0} value={form.subscription_bonus_months} onChange={(e) => setForm((f) => ({ ...f, subscription_bonus_months: Number(e.target.value) }))} className="input" />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Internal notes</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input resize-none" placeholder="Notes visible only to admins..." />
            </div>

            {/* Save / close */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button disabled={saving} onClick={() => save(form)} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {admin?.account_status !== 'closed' ? (
                <button disabled={saving} onClick={() => save({ ...form, account_status: 'closed', last_admin_action: 'closed account' })} className="btn btn-danger">
                  Close account
                </button>
              ) : (
                <button disabled={saving} onClick={() => save({ ...form, account_status: 'active', last_admin_action: 'reopened account' })} className="btn btn-secondary">
                  Reopen account
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Quick actions ── */}
        <section className="card card-p">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} style={{ color: 'var(--amber)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Quick actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: '1 Month Free Pro',     months: 1,  plan: 'pro',     note: 'Admin: 1 month free Pro' },
              { label: '3 Months Free Pro',    months: 3,  plan: 'pro',     note: 'Admin: 3 months free Pro' },
              { label: '1 Month Free Starter', months: 1,  plan: 'starter', note: 'Admin: 1 month free Starter' },
              { label: 'Add 100 Credits',      months: 0,  plan: null,      note: 'Admin: 100 bonus credits', credits: 100 },
              { label: 'Add 500 Credits',      months: 0,  plan: null,      note: 'Admin: 500 bonus credits', credits: 500 },
            ].map((q) => (
              <button
                key={q.label}
                disabled={giftLoading}
                onClick={() => quickGrant(q.label, q.months, q.plan, q.note)}
                className="btn btn-secondary w-full justify-start text-left"
                style={{ fontSize: '0.8rem' }}
              >
                <Gift size={12} style={{ color: 'var(--acc)', flexShrink: 0 }} />
                {q.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Grant a package ── */}
        <section className="card card-p">
          <div className="flex items-center gap-2 mb-4">
            <Package size={14} style={{ color: 'var(--purple)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Grant a package</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PACKAGES.map((p) => (
              <button key={p.id} onClick={() => setSelectedPackage(selectedPackage === p.id ? '' : p.id)}
                className={`rounded-lg p-3 text-left transition-all border ${selectedPackage === p.id ? 'border-[var(--acc-border)] bg-[var(--acc-bg)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {p.credits ? <CreditCard size={11} style={{ color: p.color }} /> : <Package size={11} style={{ color: p.color }} />}
                  <span className="text-xs font-semibold" style={{ color: p.color }}>{p.credits ? `+${p.credits}` : `${p.months}mo`}</span>
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
              <label className="label">Note (optional)</label>
              <input value={giftNote} onChange={(e) => setGiftNote(e.target.value)} placeholder="e.g. Gifted for beta feedback..." className="input text-xs" />
              <div className="flex gap-2 mt-3">
                <button disabled={giftLoading} onClick={grantPackage} className="btn btn-primary"><Gift size={13} />{giftLoading ? 'Granting…' : 'Grant package'}</button>
                <button onClick={() => setSelectedPackage('')} className="btn btn-ghost">Cancel</button>
              </div>
            </div>
          )}
        </section>

        {/* ── Grant history ── */}
        {admin?.package_history?.length ? (
          <section className="card card-p md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} style={{ color: 'var(--t3)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Grant history</h2>
            </div>
            <div className="space-y-0">
              {(admin.package_history as any[]).map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs py-2.5" style={{ borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>
                  <span style={{ color: 'var(--t2)' }}>{h.label || h.packageId}</span>
                  <div className="flex items-center gap-4">
                    {h.note && <span style={{ color: 'var(--t4)' }}>{h.note}</span>}
                    <span className="flex items-center gap-1"><Clock size={10} />{h.granted_at ? new Date(h.granted_at).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Raw data ── */}
        <section className="card card-p md:col-span-2">
          <details>
            <summary className="flex items-center gap-2 cursor-pointer list-none" style={{ color: 'var(--t3)' }}>
              <ChevronDown size={14} />
              <span className="text-xs font-semibold">Raw profile data</span>
            </summary>
            <pre className="overflow-auto text-xs mt-3 p-3 rounded-lg" style={{ background: 'var(--bg2)', color: 'var(--t3)', maxHeight: 300 }}>
              {JSON.stringify({ user, profile, admin }, null, 2)}
            </pre>
          </details>
        </section>

      </div>
    </div>
  )
}
