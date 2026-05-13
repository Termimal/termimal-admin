'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/win-back — cancelled subs ripe for win-back outreach.
 *
 * Source of truth: public.admin_win_back_queue() returns users who:
 *   - cancelled 7-90 days ago
 *   - have an email on file
 *   - haven't been sent a 'win_back' email in the last 180 days
 *
 * One-click send uses the `win_back` email template (or a built-in
 * fallback if the template hasn't been created). Every send writes to
 * email_log AND audit_log, and immediately flips the row's
 * `contacted_before` to true on the next refresh.
 *
 * Why 7-90 days? <7 days: too aggressive, they just cancelled. >90 days:
 * win-back rates collapse below 1%, not worth our sender reputation.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Mail, RefreshCw, Send, Heart, AlertCircle, CheckCircle2,
  Clock, DollarSign,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  user_id:          string
  email:            string
  full_name:        string | null
  plan_before:      string
  cancelled_at:     string
  days_since:       number
  last_period_end:  string | null
  est_clv_cents:    number
  contacted_before: boolean
}

function fmtUSD(cents: number): string {
  if (!cents) return '$0'
  return '$' + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:1000,
      padding:'12px 18px', borderRadius:12,
      background: ok ? 'rgba(63,185,80,0.18)' : 'rgba(248,113,113,0.18)',
      border: `1px solid ${ok ? 'rgba(63,185,80,0.5)' : 'rgba(248,113,113,0.5)'}`,
      color: ok ? 'var(--green-val)' : 'var(--red)',
      fontSize:13, fontWeight:600,
      display:'flex', alignItems:'center', gap:10,
      boxShadow:'0 10px 30px rgba(0,0,0,0.3)',
    }}>
      {ok ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
      {msg}
    </div>
  )
}

export default function WinBackPage() {
  const [queue, setQueue] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/win-back', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setQueue(j.queue || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const sendOne = async (user_id: string) => {
    if (!confirm('Send the win-back email to this user?')) return
    setSendingId(user_id)
    try {
      const res = await fetch('/api/admin/win-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id }),
      })
      const j = await res.json()
      if (!res.ok) {
        setToast({ msg: j.error || `HTTP ${res.status}`, ok: false })
      } else {
        setToast({ msg: 'Win-back email sent', ok: true })
        // Optimistic: mark as contacted in local state.
        setQueue(q => q.map(r => r.user_id === user_id ? { ...r, contacted_before: true } : r))
      }
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'failed', ok: false })
    } finally {
      setSendingId(null)
    }
  }

  const stats = useMemo(() => {
    const eligible  = queue.filter(r => !r.contacted_before).length
    const contacted = queue.length - eligible
    const totalCLV  = queue.reduce((s, r) => s + r.est_clv_cents, 0)
    return { total: queue.length, eligible, contacted, totalCLV }
  }, [queue])

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Heart size={28}/>}
        eyebrow="Revenue rescue"
        title="Win-back queue"
        subtitle={`Subscribers who cancelled in the last 7-90 days. ${stats.eligible} haven't been contacted yet — one click sends them the 'win_back' template. Lifetime CLV across this queue: ${fmtUSD(stats.totalCLV)}.`}
        metric={{
          label: 'Eligible',
          value: stats.eligible.toString(),
          secondary: `${stats.contacted} already contacted`,
        }}
      />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <p style={{ fontSize:12.5, color:'var(--t3)', margin:0, maxWidth:640 }}>
          Sends use the <code style={{ background:'var(--bg3)', padding:'1px 6px', borderRadius:4 }}>win_back</code> email template — edit it under <a href="/admin/email-templates" style={{ color:'var(--blue)' }}>Email Templates</a>. If the template doesn&apos;t exist, we use a built-in fallback.
        </p>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:36 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Section accent="amber" title="Queue" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${queue.length} cancelled · ${stats.eligible} eligible`}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:78, borderRadius:14 }} />
            ))}
          </div>
        ) : err ? (
          <EmptyState
            icon={<AlertCircle size={20}/>}
            title="Couldn't load queue"
            description={err}
          />
        ) : queue.length === 0 ? (
          <EmptyState
            icon={<Heart size={20}/>}
            title="No one in the win-back window"
            description="Nobody cancelled in the last 7-90 days. Either churn is zero (unlikely) or the plan_changes table hasn't been populated by your Stripe webhook yet."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {queue.map(r => (
              <div key={r.user_id} className="card-premium" style={{
                padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
                opacity: r.contacted_before ? 0.6 : 1,
              }}>
                <span style={{
                  width:36, height:36, borderRadius:11, flexShrink:0,
                  background:'rgba(210,153,34,0.12)', color:'var(--amber)',
                  border:'1px solid rgba(210,153,34,0.3)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Heart size={15}/>
                </span>
                <div style={{ flex:1, minWidth:260 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>
                    {r.full_name || r.email}
                    {r.contacted_before && (
                      <span style={{
                        marginLeft:10, padding:'2px 8px', borderRadius:999,
                        background:'rgba(63,185,80,0.12)', color:'var(--green-val)',
                        border:'1px solid rgba(63,185,80,0.3)',
                        fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                      }}>Contacted</span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontFamily:'monospace' }}>{r.email}</span>
                    <span>·</span>
                    <span>was on <strong style={{ color:'var(--t3)' }}>{r.plan_before}</strong></span>
                    <span>·</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                      <Clock size={11}/> cancelled {r.days_since}d ago
                    </span>
                    {r.est_clv_cents > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                          <DollarSign size={11}/> CLV {fmtUSD(r.est_clv_cents)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={`/admin/users/${r.user_id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize:11, minHeight:32 }}
                  onClick={e => e.stopPropagation()}
                >
                  View user
                </a>
                <button
                  type="button"
                  onClick={() => sendOne(r.user_id)}
                  disabled={sendingId === r.user_id}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize:11.5, minHeight:32, opacity: sendingId === r.user_id ? 0.6 : 1 }}
                >
                  {sendingId === r.user_id ? (
                    <>
                      <RefreshCw size={12} className="spin"/> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={12}/> {r.contacted_before ? 'Resend' : 'Send win-back'}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)}/>}
    </div>
  )
}
