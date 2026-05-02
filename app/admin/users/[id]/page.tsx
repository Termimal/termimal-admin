'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Copy, CheckCircle, XCircle, RefreshCw, Mail, User,
  CreditCard, Gift, History, Activity, Settings, Shield, Zap,
  Star, LogIn, Monitor, Smartphone, Tablet, Crown, Ban, Unlock,
  Edit3, Hash, AlertTriangle, TestTube2, UserCheck, Building2,
} from 'lucide-react'

const PLANS = ['free', 'starter', 'pro', 'premium'] as const
const PLAN_META: Record<string, { color: string; label: string; badge: string }> = {
  free:     { color: 'var(--t4)',      label: 'Free',     badge: 'badge-muted'   },
  starter:  { color: 'var(--blue)',    label: 'Starter',  badge: 'badge-blue'    },
  pro:      { color: 'var(--acc)',     label: 'Pro',      badge: 'badge-acc'     },
  premium:  { color: 'var(--purple)',  label: 'Premium',  badge: 'badge-purple'  },
}
const STATUS_META: Record<string, string> = {
  active:'badge-green', trialing:'badge-blue', past_due:'badge-amber',
  canceled:'badge-red', unpaid:'badge-red', inactive:'badge-muted',
}
const ACCOUNT_META: Record<string, { badge: string }> = {
  active:    { badge:'badge-green' },
  suspended: { badge:'badge-amber' },
  closed:    { badge:'badge-red'   },
}
const USER_TYPES = [
  { value:'normal',   label:'Normal',   icon:<UserCheck  size={13}/>, badge:'badge-muted'   },
  { value:'test',     label:'Test',     icon:<TestTube2  size={13}/>, badge:'badge-amber'   },
  { value:'internal', label:'Internal', icon:<Building2  size={13}/>, badge:'badge-blue'    },
  { value:'vip',      label:'VIP',      icon:<Crown      size={13}/>, badge:'badge-purple'  },
]
const SUB_PACKAGES = [
  { id:'free_trial_7d',  plan:'free',    months:0, days:7,  label:'Free Trial 7d',  group:'Trial',   color:'var(--t3)' },
  { id:'free_trial_14d', plan:'free',    months:0, days:14, label:'Free Trial 14d', group:'Trial',   color:'var(--t3)' },
  { id:'free_trial_30d', plan:'free',    months:0, days:30, label:'Free Trial 30d', group:'Trial',   color:'var(--t3)' },
  { id:'starter_1m',  plan:'starter', months:1,  days:0, label:'Starter 1mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_2m',  plan:'starter', months:2,  days:0, label:'Starter 2mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_3m',  plan:'starter', months:3,  days:0, label:'Starter 3mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_6m',  plan:'starter', months:6,  days:0, label:'Starter 6mo',  group:'Starter', color:'var(--blue)'   },
  { id:'starter_12m', plan:'starter', months:12, days:0, label:'Starter 1yr',  group:'Starter', color:'var(--blue)'   },
  { id:'pro_1m',  plan:'pro', months:1,  days:0, label:'Pro 1mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_2m',  plan:'pro', months:2,  days:0, label:'Pro 2mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_3m',  plan:'pro', months:3,  days:0, label:'Pro 3mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_6m',  plan:'pro', months:6,  days:0, label:'Pro 6mo',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_12m', plan:'pro', months:12, days:0, label:'Pro 1yr',  group:'Pro', color:'var(--acc)'    },
  { id:'pro_24m', plan:'pro', months:24, days:0, label:'Pro 2yr',  group:'Pro', color:'var(--acc)'    },
  { id:'premium_1m',  plan:'premium', months:1,  days:0, label:'Premium 1mo',  group:'Premium', color:'var(--purple)' },
  { id:'premium_3m',  plan:'premium', months:3,  days:0, label:'Premium 3mo',  group:'Premium', color:'var(--purple)' },
  { id:'premium_6m',  plan:'premium', months:6,  days:0, label:'Premium 6mo',  group:'Premium', color:'var(--purple)' },
  { id:'premium_12m', plan:'premium', months:12, days:0, label:'Premium 1yr',  group:'Premium', color:'var(--purple)' },
]
const CREDIT_PACKAGES = [
  { id:'c50',   credits:50,   label:'50 credits'    },
  { id:'c100',  credits:100,  label:'100 credits'   },
  { id:'c250',  credits:250,  label:'250 credits'   },
  { id:'c500',  credits:500,  label:'500 credits'   },
  { id:'c1000', credits:1000, label:'1,000 credits' },
  { id:'c5000', credits:5000, label:'5,000 credits' },
]
const DISCOUNT_PRESETS = [10, 20, 25, 30, 50, 75, 100]
const TABS = [
  { key:'overview',     label:'Overview',     icon:<User size={14}/>       },
  { key:'subscription', label:'Subscription', icon:<CreditCard size={14}/> },
  { key:'packages',     label:'Packages',     icon:<Gift size={14}/>       },
  { key:'credits',      label:'Credits',      icon:<Hash size={14}/>       },
  { key:'activity',     label:'Activity',     icon:<Activity size={14}/>   },
  { key:'settings',     label:'Settings',     icon:<Settings size={14}/>   },
]

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ color:'var(--t4)', fontSize:12, whiteSpace:'nowrap', flexShrink:0 }}>{label}</span>
      <span style={{ color:'var(--t2)', fontSize:12, textAlign:'right', fontFamily: mono ? 'monospace' : 'inherit', wordBreak:'break-all' }}>{value ?? '—'}</span>
    </div>
  )
}
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
      style={{ background:'none', border:'none', cursor:'pointer', color: ok ? 'var(--acc)' : 'var(--t4)', padding:'0 2px', lineHeight:1, display:'inline-flex', alignItems:'center' }}>
      {ok ? <CheckCircle size={12}/> : <Copy size={12}/>}
    </button>
  )
}
function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
      <span style={{ color:'var(--acc)' }}>{icon}</span>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'var(--t4)', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}
function EmptyState({ label }: { label: string }) {
  return <div style={{ padding:'32px 0', textAlign:'center', color:'var(--t4)', fontSize:13 }}>{label}</div>
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [selPlan, setSelPlan] = useState('pro')
  const [planSaving, setPlanSaving] = useState(false)
  const [selSubPkg, setSelSubPkg] = useState('')
  const [subPkgNote, setSubPkgNote] = useState('')
  const [subPkgSaving, setSubPkgSaving] = useState(false)
  const [discPct, setDiscPct] = useState('')
  const [discReason, setDiscReason] = useState('')
  const [discExpiry, setDiscExpiry] = useState('')
  const [discSaving, setDiscSaving] = useState(false)
  const [creditAmt, setCreditAmt] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [creditSaving, setCreditSaving] = useState(false)
  const [selCreditPkg, setSelCreditPkg] = useState('')
  const [userType, setUserType] = useState('normal')
  const [accountStatus, setAccountStatus] = useState('active')
  const [settingsSaving, setSettingsSaving] = useState(false)

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`)
      const json = await res.json()
      setData(json)
      setNotes(json.admin?.notes || '')
      setUserType(json.admin?.user_type || 'normal')
      setAccountStatus(json.admin?.account_status || 'active')
      setSelPlan(json.profile?.plan || 'free')
      setDiscPct(json.admin?.discount_percent ? String(json.admin.discount_percent) : '')
      setDiscReason(json.admin?.discount_reason || '')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function post(path: string, body: any, setState?: (v: boolean) => void) {
    setState?.(true)
    const res = await fetch(`/api/admin/users/${id}${path}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body),
    })
    const j = await res.json()
    setState?.(false)
    return j
  }

  async function saveNotes() {
    setNotesSaving(true)
    const j = await post('', { notes }, undefined)
    setNotesSaving(false)
    if (j.ok) { showToast(true, 'Notes saved'); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function changePlan() {
    setPlanSaving(true)
    const j = await post('/plan', { plan: selPlan })
    setPlanSaving(false)
    if (j.ok) { showToast(true, `Plan set to ${selPlan}`); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function grantSubPackage() {
    if (!selSubPkg) return
    const pkg = SUB_PACKAGES.find(p => p.id === selSubPkg)!
    setSubPkgSaving(true)
    const j = await post('/grant-package', { packageId:pkg.id, label:pkg.label, plan:pkg.plan, months:pkg.months, days:pkg.days, credits:0, note:subPkgNote })
    setSubPkgSaving(false)
    if (j.ok) { showToast(true, `Granted: ${pkg.label}`); setSelSubPkg(''); setSubPkgNote(''); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function applyDiscount() {
    const pct = parseInt(discPct)
    if (isNaN(pct) || pct < 0 || pct > 100) return showToast(false, 'Enter 0–100')
    setDiscSaving(true)
    const j = await post('/discount', { discount_percent:pct, discount_reason:discReason, discount_expires_at:discExpiry||null })
    setDiscSaving(false)
    if (j.ok) { showToast(true, `Discount set: ${pct}%`); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function applyCredit() {
    const amt = parseInt(creditAmt)
    if (isNaN(amt) || amt === 0) return showToast(false, 'Enter valid amount')
    setCreditSaving(true)
    const j = await post('/credits', { amount:amt, reason:creditReason })
    setCreditSaving(false)
    if (j.ok) { showToast(true, `Credits: ${amt > 0 ? '+' : ''}${amt}`); setCreditAmt(''); setCreditReason(''); setSelCreditPkg(''); load() }
    else showToast(false, j.error || 'Failed')
  }
  async function saveSettings() {
    setSettingsSaving(true)
    const j = await post('', { user_type:userType, account_status:accountStatus, is_test_user: userType==='test' })
    setSettingsSaving(false)
    if (j.ok) { showToast(true, 'Settings saved'); load() }
    else showToast(false, j.error || 'Failed')
  }

  if (loading) return (
    <div style={{ padding:'40px 0' }}>
      {[160,120,200,120].map((w,i) => <div key={i} className="skeleton" style={{ height:16, width:w, borderRadius:8, marginBottom:12 }} />)}
    </div>
  )
  if (!data) return <div style={{ color:'var(--red)' }}>Failed to load user.</div>

  const { user, profile, admin } = data
  const loginHistory: any[] = data.loginHistory || []
  const creditHistory: any[] = data.creditHistory || []
  const overrides: any[] = data.overrides || []
  const packageHistory: any[] = admin?.package_history || []

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()
  const currentPlan = profile?.plan || 'free'
  const planM = PLAN_META[currentPlan] || PLAN_META.free
  const subStatus = profile?.subscription_status || 'inactive'
  const acctM = ACCOUNT_META[admin?.account_status || 'active'] || ACCOUNT_META.active
  const utM = USER_TYPES.find(u => u.value === (admin?.user_type || 'normal'))!
  const subGroups = ['Trial','Starter','Pro','Premium']

  return (
    <div style={{ maxWidth:1100 }}>
      {toast && (
        <div style={{
          position:'fixed', top:16, right:20, zIndex:9999,
          background: toast.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
          border:`1px solid ${toast.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: toast.ok ? 'var(--green)' : 'var(--red)',
          padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600,
          display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast.ok ? <CheckCircle size={14}/> : <XCircle size={14}/>} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:20 }}>
        <Link href="/admin/users" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--t4)', textDecoration:'none' }}>
          <ArrowLeft size={14}/> Back to Users
        </Link>
      </div>

      {/* User hero */}
      <div className="card card-p" style={{ marginBottom:20, display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
        <div style={{
          width:56, height:56, borderRadius:16, flexShrink:0,
          background:`linear-gradient(135deg, ${planM.color}44, ${planM.color}22)`,
          border:`1px solid ${planM.color}44`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, fontWeight:800, color:planM.color,
        }}>{initials}</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <h1 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', margin:0 }}>{displayName}</h1>
            <span className={`badge ${planM.badge}`}>{planM.label}</span>
            <span className={`badge ${STATUS_META[subStatus] || 'badge-muted'}`}>{subStatus}</span>
            <span className={`badge ${acctM.badge}`}>{admin?.account_status || 'active'}</span>
            <span className={`badge ${utM.badge}`} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>{utM.icon} {utM.label}</span>
            {admin?.discount_percent > 0 && <span className="badge badge-amber">⚡ {admin.discount_percent}% off</span>}
          </div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:12, color:'var(--t4)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <Mail size={11}/> {user?.email} <CopyBtn text={user?.email || ''}/>
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <Hash size={11}/> {user?.id?.slice(0,8)}… <CopyBtn text={user?.id || ''}/>
            </span>
            {profile?.stripe_customer_id && (
              <span style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'monospace', fontSize:11 }}>
                Stripe: {profile.stripe_customer_id.slice(0,16)}… <CopyBtn text={profile.stripe_customer_id}/>
              </span>
            )}
          </div>
        </div>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', flexShrink:0 }}>
          {[
            { label:'Credits',   value: admin?.credits ?? 0,                   color:'var(--amber)'  },
            { label:'Bonus Mo',  value: admin?.subscription_bonus_months ?? 0, color:'var(--acc)'    },
            { label:'Packages',  value: packageHistory.length,                  color:'var(--purple)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 18px', minWidth:72 }}>
              <div style={{ fontSize:22, fontWeight:800, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--t4)', marginTop:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button onClick={load} style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--t3)', borderRadius:8, padding:'7px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, flexShrink:0 }}>
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:5, width:'fit-content', flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
              background: activeTab === t.key ? 'var(--acc)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--t3)',
              fontWeight: activeTab === t.key ? 700 : 500,
              transition:'all 0.15s',
            }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<User size={15}/>} title="Profile" />
            <InfoRow label="Email" value={<span style={{ display:'flex', alignItems:'center', gap:4 }}>{user?.email} <CopyBtn text={user?.email || ''}/></span>} />
            <InfoRow label="Full name" value={profile?.full_name || '—'} />
            <InfoRow label="Country" value={profile?.country || '—'} />
            <InfoRow label="Timezone" value={profile?.timezone || 'UTC'} />
            <InfoRow label="Email verified" value={user?.email_confirmed_at ? '✓ Yes' : '✗ No'} />
            <InfoRow label="Auth provider" value={user?.app_metadata?.provider || '—'} />
            <InfoRow label="Joined" value={user?.created_at ? new Date(user.created_at).toLocaleString() : '—'} />
            <InfoRow label="Last login" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'} />
            <InfoRow label="User ID" value={<span style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'monospace', fontSize:11 }}>{user?.id?.slice(0,24)}… <CopyBtn text={user?.id || ''}/></span>} />
          </div>
          <div className="card card-p">
            <SectionTitle icon={<CreditCard size={15}/>} title="Subscription" />
            <InfoRow label="Plan" value={<span className={`badge ${planM.badge}`}>{currentPlan}</span>} />
            <InfoRow label="Status" value={<span className={`badge ${STATUS_META[subStatus] || 'badge-muted'}`}>{subStatus}</span>} />
            <InfoRow label="Billing interval" value={profile?.billing_interval || '—'} />
            <InfoRow label="Period end" value={profile?.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : '—'} />
            <InfoRow label="Trial ends" value={profile?.trial_ends_at ? new Date(profile.trial_ends_at).toLocaleDateString() : '—'} />
            <InfoRow label="Stripe customer" value={profile?.stripe_customer_id || '—'} mono />
            <InfoRow label="Stripe sub ID" value={profile?.stripe_subscription_id || '—'} mono />
            <InfoRow label="Bonus months" value={admin?.subscription_bonus_months ?? 0} />
            <InfoRow label="Discount" value={admin?.discount_percent ? `${admin.discount_percent}%` : 'None'} />
            <InfoRow label="Discount reason" value={admin?.discount_reason || '—'} />
            <InfoRow label="Last admin action" value={admin?.last_admin_action || '—'} />
          </div>
          <div className="card card-p" style={{ gridColumn:'1 / -1' }}>
            <SectionTitle icon={<Edit3 size={15}/>} title="Admin Notes" sub="Internal only — never visible to the user" />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
              placeholder="Internal notes, support history, special cases…"
              style={{ width:'100%', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--t1)', padding:'10px 12px', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', lineHeight:1.6 }} />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
              <button onClick={saveNotes} disabled={notesSaving} className="btn btn-primary btn-sm">
                {notesSaving ? 'Saving…' : '✓ Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<Zap size={15}/>} title="Set Plan Directly" sub="Admin override — bypasses Stripe billing" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {PLANS.map(p => (
                <button key={p} onClick={() => setSelPlan(p)}
                  style={{
                    padding:'10px 14px', borderRadius:8, cursor:'pointer', textAlign:'left', fontSize:13, fontWeight:600,
                    background: selPlan === p ? `${PLAN_META[p].color}18` : 'var(--surface)',
                    border:`1.5px solid ${selPlan === p ? PLAN_META[p].color + '66' : 'var(--border)'}`,
                    color: selPlan === p ? PLAN_META[p].color : 'var(--t2)',
                    transition:'all 0.15s',
                  }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
              ))}
            </div>
            <button onClick={changePlan} disabled={planSaving} className="btn btn-primary" style={{ width:'100%' }}>
              {planSaving ? 'Applying…' : `Apply "${selPlan}" plan`}
            </button>
          </div>

          <div className="card card-p">
            <SectionTitle icon={<Star size={15}/>} title="Subscription Discount" sub="% off their next billing cycle" />
            <label className="label">Discount %</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {DISCOUNT_PRESETS.map(p => (
                <button key={p} onClick={() => setDiscPct(String(p))}
                  style={{
                    padding:'4px 10px', borderRadius:6, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: discPct === String(p) ? 'var(--amber-bg)' : 'var(--surface)',
                    borderColor: discPct === String(p) ? 'rgba(251,191,36,0.3)' : 'var(--border)',
                    color: discPct === String(p) ? 'var(--amber)' : 'var(--t3)',
                  }}>{p}%</button>
              ))}
            </div>
            <input className="input" style={{ marginBottom:10 }} type="number" value={discPct} onChange={e => setDiscPct(e.target.value)} placeholder="Custom %" />
            <label className="label">Reason</label>
            <input className="input" style={{ marginBottom:10 }} value={discReason} onChange={e => setDiscReason(e.target.value)} placeholder="Loyalty, support credit, promo…" />
            <label className="label">Expires (optional)</label>
            <input className="input" style={{ marginBottom:14 }} type="date" value={discExpiry} onChange={e => setDiscExpiry(e.target.value)} />
            <button onClick={applyDiscount} disabled={discSaving} className="btn btn-primary" style={{ width:'100%' }}>
              {discSaving ? 'Applying…' : 'Set Discount'}
            </button>
          </div>

          <div className="card card-p" style={{ gridColumn:'1 / -1' }}>
            <SectionTitle icon={<Gift size={15}/>} title="Grant Free Subscription Period" sub="Adds bonus months on top of their current subscription — 18 packages available" />
            {subGroups.map(group => {
              const pkgs = SUB_PACKAGES.filter(p => p.group === group)
              return (
                <div key={group} style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{group}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {pkgs.map(pkg => (
                      <button key={pkg.id} onClick={() => setSelSubPkg(pkg.id === selSubPkg ? '' : pkg.id)}
                        style={{
                          padding:'7px 14px', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                          background: selSubPkg === pkg.id ? pkg.color + '18' : 'var(--surface)',
                          borderColor: selSubPkg === pkg.id ? pkg.color + '66' : 'var(--border)',
                          color: selSubPkg === pkg.id ? pkg.color : 'var(--t3)',
                          transition:'all 0.12s',
                        }}>{pkg.label}</button>
                    ))}
                  </div>
                </div>
              )
            })}
            {selSubPkg && (
              <div style={{ marginTop:8, display:'flex', gap:10, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <label className="label">Note (optional)</label>
                  <input className="input" value={subPkgNote} onChange={e => setSubPkgNote(e.target.value)} placeholder="e.g. 'Support gesture', 'Promo LAUNCH2026'" />
                </div>
                <button onClick={grantSubPackage} disabled={subPkgSaving} className="btn btn-primary" style={{ flexShrink:0 }}>
                  {subPkgSaving ? 'Granting…' : `✓ Grant ${SUB_PACKAGES.find(p => p.id === selSubPkg)?.label}`}
                </button>
              </div>
            )}
          </div>

          <div className="card card-p" style={{ gridColumn:'1 / -1' }}>
            <SectionTitle icon={<History size={15}/>} title="Override History" />
            {overrides.length === 0 ? <EmptyState label="No overrides applied yet." /> : (
              <div className="table-wrap">
                <table className="table-root">
                  <thead><tr><th>Type</th><th>Plan</th><th>Months</th><th>Discount</th><th>Reason</th><th>Applied</th></tr></thead>
                  <tbody>
                    {overrides.map((o:any) => (
                      <tr key={o.id}>
                        <td><span className="badge badge-acc">{o.type}</span></td>
                        <td>{o.plan ? <span className={`badge ${PLAN_META[o.plan]?.badge || 'badge-muted'}`}>{o.plan}</span> : '—'}</td>
                        <td style={{ color:'var(--t2)' }}>{o.months || '—'}</td>
                        <td style={{ color:'var(--t2)' }}>{o.discount_pct ? `${o.discount_pct}%` : '—'}</td>
                        <td style={{ color:'var(--t3)', fontSize:12 }}>{o.reason || '—'}</td>
                        <td style={{ color:'var(--t4)', fontSize:12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PACKAGES */}
      {activeTab === 'packages' && (
        <div className="card card-p">
          <SectionTitle icon={<Gift size={15}/>} title="Package Grant History" sub={`${packageHistory.length} packages granted to this user`} />
          {packageHistory.length === 0 ? <EmptyState label="No packages granted yet. Use the Subscription tab to grant packages." /> : (
            <div className="table-wrap">
              <table className="table-root">
                <thead><tr><th>Package</th><th>Plan</th><th>Duration</th><th>Credits</th><th>Note</th><th>Granted</th></tr></thead>
                <tbody>
                  {[...packageHistory].reverse().map((h:any, i:number) => (
                    <tr key={i}>
                      <td style={{ fontWeight:600, color:'var(--t1)' }}>{h.label || h.packageId}</td>
                      <td>{h.plan ? <span className={`badge ${PLAN_META[h.plan]?.badge || 'badge-muted'}`}>{h.plan}</span> : '—'}</td>
                      <td style={{ color:'var(--t2)' }}>{h.months ? `${h.months}mo` : h.days ? `${h.days}d` : '—'}</td>
                      <td style={{ color:'var(--amber)' }}>{h.credits || '—'}</td>
                      <td style={{ color:'var(--t4)', fontSize:12 }}>{h.note || '—'}</td>
                      <td style={{ color:'var(--t4)', fontSize:12 }}>{new Date(h.granted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREDITS */}
      {activeTab === 'credits' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<Hash size={15}/>} title="Adjust Credits" sub="Positive to add, negative to deduct" />
            <label className="label" style={{ marginBottom:8 }}>Quick grant</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {CREDIT_PACKAGES.map(cp => (
                <button key={cp.id} onClick={() => { setSelCreditPkg(cp.id); setCreditAmt(String(cp.credits)) }}
                  style={{
                    padding:'6px 12px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: selCreditPkg === cp.id ? 'var(--amber-bg)' : 'var(--surface)',
                    borderColor: selCreditPkg === cp.id ? 'rgba(251,191,36,0.35)' : 'var(--border)',
                    color: selCreditPkg === cp.id ? 'var(--amber)' : 'var(--t3)',
                    transition:'all 0.12s',
                  }}>{cp.label}</button>
              ))}
            </div>
            <label className="label" style={{ marginBottom:8 }}>Quick deduct</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {[50,100,250,500].map(amt => (
                <button key={amt} onClick={() => { setSelCreditPkg(`deduct_${amt}`); setCreditAmt(String(-amt)) }}
                  style={{
                    padding:'6px 12px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: creditAmt === String(-amt) && selCreditPkg === `deduct_${amt}` ? 'var(--red-bg)' : 'var(--surface)',
                    borderColor: creditAmt === String(-amt) && selCreditPkg === `deduct_${amt}` ? 'rgba(248,113,113,0.3)' : 'var(--border)',
                    color: creditAmt === String(-amt) && selCreditPkg === `deduct_${amt}` ? 'var(--red)' : 'var(--t3)',
                  }}>-{amt}</button>
              ))}
            </div>
            <label className="label">Custom amount</label>
            <input className="input" style={{ marginBottom:10 }} type="number" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} placeholder="e.g. 200 or -50" />
            <label className="label">Reason</label>
            <input className="input" style={{ marginBottom:14 }} value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Refund, promo, support credit…" />
            <button onClick={applyCredit} disabled={creditSaving} className="btn btn-primary" style={{ width:'100%' }}>
              {creditSaving ? 'Applying…' : 'Apply Credit Adjustment'}
            </button>
          </div>
          <div className="card card-p">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:'var(--acc)' }}><History size={15}/></span>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Credit History</span>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--amber)', fontVariantNumeric:'tabular-nums' }}>{admin?.credits ?? 0}</div>
                <div style={{ fontSize:10, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Balance</div>
              </div>
            </div>
            {creditHistory.length === 0 ? <EmptyState label="No credit history yet." /> : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {creditHistory.map((c:any) => (
                  <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--surface)', borderRadius:8, padding:'8px 12px', fontSize:13 }}>
                    <span style={{ color:'var(--t3)', flex:1 }}>{c.reason || 'Adjustment'}</span>
                    <span style={{ color: c.amount > 0 ? 'var(--green)' : 'var(--red)', fontWeight:700, marginLeft:12, fontVariantNumeric:'tabular-nums' }}>
                      {c.amount > 0 ? '+' : ''}{c.amount}
                    </span>
                    <span style={{ color:'var(--t4)', fontSize:11, marginLeft:12 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="card card-p">
          <SectionTitle icon={<LogIn size={15}/>} title="Login History" sub="Last 50 sessions" />
          {loginHistory.length === 0 ? (
            <EmptyState label="No login history. Records appear here once the auth webhook is configured." />
          ) : (
            <div className="table-wrap">
              <table className="table-root">
                <thead><tr><th>Date & Time</th><th>IP Address</th><th>Device</th><th>Location</th><th>User Agent</th></tr></thead>
                <tbody>
                  {loginHistory.map((l:any) => (
                    <tr key={l.id}>
                      <td style={{ color:'var(--t2)', fontSize:12 }}>{new Date(l.signed_in_at).toLocaleString()}</td>
                      <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--t3)' }}>{l.ip_address || '—'}</td>
                      <td style={{ color:'var(--t3)', fontSize:12 }}>{l.device_type || 'desktop'}</td>
                      <td style={{ color:'var(--t4)', fontSize:12 }}>{[l.city, l.country].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ color:'var(--t4)', fontSize:11, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.user_agent?.slice(0,70) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card card-p">
            <SectionTitle icon={<Shield size={15}/>} title="User Type" sub="Controls feature flags, test data visibility, etc." />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
              {USER_TYPES.map(ut => (
                <button key={ut.value} onClick={() => setUserType(ut.value)}
                  style={{
                    padding:'12px 14px', borderRadius:10, border:'1.5px solid', cursor:'pointer', textAlign:'left',
                    background: userType === ut.value ? 'var(--acc-bg)' : 'var(--surface)',
                    borderColor: userType === ut.value ? 'var(--acc-border)' : 'var(--border)',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ marginBottom:4, color: userType === ut.value ? 'var(--acc)' : 'var(--t4)' }}>{ut.icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color: userType === ut.value ? 'var(--t1)' : 'var(--t3)' }}>{ut.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="card card-p">
            <SectionTitle icon={<Ban size={15}/>} title="Account Status" sub="Suspended users can't log in; Closed is permanent." />
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:4 }}>
              {[
                { value:'active',    label:'Active',    desc:'Full access',              icon:<Unlock size={14}/>,         color:'var(--green)' },
                { value:'suspended', label:'Suspended', desc:'Login blocked temporarily', icon:<AlertTriangle size={14}/>,  color:'var(--amber)' },
                { value:'closed',    label:'Closed',    desc:'Account permanently closed', icon:<Ban size={14}/>,            color:'var(--red)'   },
              ].map(s => (
                <button key={s.value} onClick={() => setAccountStatus(s.value)}
                  style={{
                    padding:'12px 14px', borderRadius:10, border:'1.5px solid', cursor:'pointer', textAlign:'left',
                    display:'flex', alignItems:'center', gap:12,
                    background: accountStatus === s.value ? s.color + '12' : 'var(--surface)',
                    borderColor: accountStatus === s.value ? s.color + '44' : 'var(--border)',
                    transition:'all 0.15s',
                  }}>
                  <span style={{ color:s.color }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color: accountStatus === s.value ? s.color : 'var(--t2)' }}>{s.label}</div>
                    <div style={{ fontSize:11, color:'var(--t4)', marginTop:1 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button onClick={load} className="btn btn-secondary">Cancel</button>
            <button onClick={saveSettings} disabled={settingsSaving} className="btn btn-primary">
              {settingsSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
