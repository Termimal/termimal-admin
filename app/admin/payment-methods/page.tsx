'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/payment-methods — admin-controlled payment-method toggles.
 *
 * Two knobs per method:
 *   enabled    — show it on /pricing + /dashboard/billing or not
 *   visibility — who is allowed to see it once enabled:
 *                  public      → everyone
 *                  test_users  → signed-in users tagged
 *                                test/internal/vip (set on the
 *                                user-detail Settings tab) + admins
 *                  admin_only  → admins only — for staging a new
 *                                gateway before going live
 *
 * The visibility rule is server-enforced in
 * public.visible_payment_methods() RPC and on the
 * /api/payment-methods/visible endpoint. Clients can't bypass it.
 *
 * Setup-state hints (configured / needs_keys / not_started) are
 * displayed read-only — they're maintained by admins as a note
 * to themselves about whether the gateway is wired up.
 */

import { useEffect, useState } from 'react'
import {
  CreditCard, Wallet, Bitcoin, RefreshCw, Power, Eye, Users, ShieldCheck,
  AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import { HeroCard, Section } from '@/components/admin/PageChrome'

interface MethodRow {
  id:            string
  enabled:       boolean
  visibility:    'public' | 'test_users' | 'admin_only'
  display_name:  string
  description:   string | null
  icon:          string | null
  sort_order:    number
  setup_state:   string | null
  notes:         string | null
  updated_at:    string
}

const ICON_FOR: Record<string, any> = {
  CreditCard, Wallet, Bitcoin,
}
const VISIBILITY_META: Record<MethodRow['visibility'], { label: string; tone: string; icon: any; description: string }> = {
  public:     { label: 'Public',      tone: 'var(--green)', icon: Eye,         description: 'Every visitor — anon + signed-in — sees this method.' },
  test_users: { label: 'Test users',  tone: 'var(--amber)', icon: Users,       description: 'Only signed-in users tagged test / internal / vip on their admin profile. Plus all admins.' },
  admin_only: { label: 'Admin only',  tone: 'var(--purple)', icon: ShieldCheck, description: 'Only admins. Staging-before-launch state for new gateways.' },
}
const SETUP_META: Record<string, { label: string; tone: string; icon: any }> = {
  configured:   { label: 'Configured',  tone: 'var(--green)',  icon: CheckCircle2 },
  needs_keys:   { label: 'Needs keys',  tone: 'var(--amber)',  icon: AlertTriangle },
  not_started:  { label: 'Not started', tone: 'var(--t3)',     icon: Clock },
}

export default function PaymentMethodsPage() {
  const [rows,    setRows]    = useState<MethodRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState<string | null>(null)
  const [error,   setError]   = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/payment-methods', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setRows(j.methods || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const patch = async (id: string, fields: Partial<MethodRow>) => {
    setBusy(id); setError('')
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, ...fields }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      // Optimistically update the row in place so the UI is snappy.
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...j.method } : r))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  const enabledCount = rows.filter(r => r.enabled).length

  return (
    <div>
      <HeroCard
        accent="acc"
        icon={<CreditCard size={28} />}
        eyebrow="Billing"
        title="Payment methods"
        subtitle="Enable or disable each payment method and choose who sees it. Visibility is enforced server-side — the public /pricing page only renders methods the viewer is entitled to see."
        metric={{ label: 'Enabled', value: `${enabledCount}/${rows.length}` }}
      />

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:38 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" style={{
          padding:'12px 16px', borderRadius:12, marginBottom:18,
          background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)',
          color:'var(--red)', fontSize:13, fontWeight:600,
        }}>{error}</div>
      )}

      <Section
        accent="acc"
        title="Methods"
        description="Toggling Enabled flips the method on the public site immediately. Visibility scopes who sees it — flip to Test users to validate a new gateway with internal accounts before exposing to everyone."
      >
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {Array.from({ length:4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:120, borderRadius:14 }} />
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {rows.map(r => {
              const Icon  = ICON_FOR[r.icon || 'CreditCard'] || CreditCard
              const vis   = VISIBILITY_META[r.visibility]
              const setup = SETUP_META[r.setup_state || 'configured'] || SETUP_META.configured
              const SetupIcon = setup.icon
              const isBusy = busy === r.id
              return (
                <div key={r.id} className="card-premium" style={{
                  padding:'20px 24px',
                  borderColor: r.enabled
                    ? 'var(--acc)44'
                    : 'var(--border)',
                  opacity: r.enabled ? 1 : 0.7,
                }}>
                  <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
                    <div style={{
                      width:48, height:48, borderRadius:14, flexShrink:0,
                      background: r.enabled ? 'var(--acc-bg)' : 'var(--surface)',
                      color: r.enabled ? 'var(--acc)' : 'var(--t3)',
                      border:`1px solid ${r.enabled ? 'var(--acc-border)' : 'var(--border)'}`,
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Icon size={20}/>
                    </div>

                    <div style={{ flex:1, minWidth:280 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                        <span style={{ fontSize:15.5, fontWeight:700, color:'var(--t1)' }}>
                          {r.display_name}
                        </span>
                        <span style={{
                          fontSize:10, padding:'3px 9px', borderRadius:999,
                          background: r.enabled ? 'var(--green-bg)' : 'var(--surface2)',
                          color: r.enabled ? 'var(--green)' : 'var(--t4)',
                          fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em',
                        }}>{r.enabled ? 'Enabled' : 'Disabled'}</span>
                        <span style={{
                          fontSize:10, padding:'3px 9px', borderRadius:999,
                          background:'var(--surface)', color: setup.tone,
                          fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em',
                          border:`1px solid ${setup.tone}33`,
                          display:'inline-flex', alignItems:'center', gap:4,
                        }}>
                          <SetupIcon size={10}/> {setup.label}
                        </span>
                      </div>
                      {r.description && (
                        <div style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.5 }}>
                          {r.description}
                        </div>
                      )}
                      {r.notes && (
                        <div style={{
                          fontSize:11.5, color:'var(--t4)', lineHeight:1.5,
                          marginTop:8, padding:'8px 12px', borderRadius:8,
                          background:'var(--bg2)', border:'1px solid var(--border)',
                        }}>
                          {r.notes}
                        </div>
                      )}
                    </div>

                    {/* Enabled switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.enabled}
                      aria-label={`${r.enabled ? 'Disable' : 'Enable'} ${r.display_name}`}
                      onClick={() => patch(r.id, { enabled: !r.enabled })}
                      disabled={isBusy}
                      style={{
                        width:50, height:28, flexShrink:0, marginTop:4,
                        borderRadius:999, position:'relative',
                        background: r.enabled ? 'var(--acc)' : 'var(--bg3)',
                        border: `1px solid ${r.enabled ? 'var(--acc)' : 'var(--border)'}`,
                        cursor: isBusy ? 'wait' : 'pointer',
                        transition: 'all 200ms',
                      }}
                    >
                      <span style={{
                        position:'absolute', top:2, left: r.enabled ? 24 : 2,
                        width:22, height:22, borderRadius:'50%',
                        background:'#fff',
                        transition:'left 200ms',
                        boxShadow:'0 2px 6px rgba(0,0,0,0.4)',
                      }}/>
                    </button>
                  </div>

                  {/* Visibility radio row */}
                  <div style={{
                    marginTop:16, paddingTop:16,
                    borderTop:'1px solid var(--border)',
                  }}>
                    <div style={{
                      fontSize:10.5, fontWeight:800, color:'var(--t4)',
                      textTransform:'uppercase', letterSpacing:'0.13em',
                      marginBottom:10,
                    }}>Visibility</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {(Object.keys(VISIBILITY_META) as MethodRow['visibility'][]).map(v => {
                        const meta = VISIBILITY_META[v]
                        const VIcon = meta.icon
                        const on    = r.visibility === v
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => patch(r.id, { visibility: v })}
                            disabled={isBusy}
                            style={{
                              display:'inline-flex', alignItems:'center', gap:8,
                              padding:'10px 14px', borderRadius:12,
                              background: on ? `${meta.tone}1A` : 'var(--surface)',
                              border:`1px solid ${on ? meta.tone + '66' : 'var(--border)'}`,
                              color: on ? meta.tone : 'var(--t3)',
                              fontSize:12.5, fontWeight:600,
                              cursor: isBusy ? 'wait' : 'pointer',
                              boxShadow: on ? `0 0 0 3px ${meta.tone}22` : 'none',
                              transition:'all 160ms',
                              flex:'1 1 200px',
                              textAlign:'left',
                            }}
                            title={meta.description}
                          >
                            <VIcon size={14}/>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:700, fontSize:12.5 }}>{meta.label}</div>
                              <div style={{ fontSize:10.5, color: on ? meta.tone : 'var(--t4)', opacity:0.85, marginTop:1 }}>
                                {meta.description}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section
        accent="amber"
        title="How visibility works"
        description="Server-side rule, single source of truth."
      >
        <div style={{ fontSize:13, color:'var(--t3)', lineHeight:1.7 }}>
          The public site calls <code style={{ background:'var(--surface)', padding:'2px 6px', borderRadius:4 }}>GET /api/payment-methods/visible</code> which invokes the
          <code style={{ background:'var(--surface)', padding:'2px 6px', borderRadius:4 }}>public.visible_payment_methods()</code> RPC. The RPC reads the caller's <code style={{ background:'var(--surface)', padding:'2px 6px', borderRadius:4 }}>auth.uid()</code> and:
          <ul style={{ listStyleType:'disc', marginLeft:20, marginTop:8 }}>
            <li><strong>Anonymous visitors</strong> — return rows where <code>visibility = 'public'</code> AND <code>enabled = true</code>.</li>
            <li><strong>Signed-in users</strong> — same; plus <code>visibility = 'test_users'</code> if their <code>admin_user_profiles.user_type</code> is <code>test / internal / vip</code>.</li>
            <li><strong>Admins</strong> (any row in <code>user_roles</code>) — everything enabled, regardless of visibility.</li>
          </ul>
          Tag a user as <strong>test</strong> on the user-detail Settings tab to let them validate a method before public rollout. Even if the client tries to call the crypto checkout endpoint directly, the server-side gate re-checks the same RPC and returns 403 for unauthorised users — there's no client-side trust.
        </div>
      </Section>
    </div>
  )
}
