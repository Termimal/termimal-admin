'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/dunning — past-due subscribers.
 * Each row: user + their dunning_state. One-click grant grace / mark
 * resolved / cancel.
 */
import { useEffect, useState } from 'react'
import { CreditCard, RefreshCw, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Profile { id: string; email: string; full_name: string | null; plan: string; current_period_end: string | null; subscription_status: string }
interface Dunning { user_id: string; first_failed_at: string | null; attempts: number; grace_until: string | null; resolved_at: string | null }
interface Row { profile: Profile; dunning: Dunning | null }

export default function DunningPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/dunning', { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const act = async (user_id: string, action: string, days?: number) => {
    if (action === 'cancel' && !confirm('Cancel this subscription in our DB? (Also cancel in Stripe separately.)')) return
    const res = await fetch('/api/admin/dunning', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ user_id, action, days }),
    })
    if (!res.ok) alert((await res.json()).error || 'failed')
    load()
  }

  return (
    <div>
      <HeroCard accent="amber" icon={<CreditCard size={28}/>} eyebrow="Finance"
        title="Dunning"
        subtitle="Subscriptions in past_due / unpaid / incomplete. Grant a grace period to keep them active while Stripe retries, mark resolved when the card clears, or cancel manually."
        metric={{ label: 'Past-due', value: rows.length.toString() }}/>

      <Section accent="amber" title="Past-due users" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:180, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<CheckCircle2 size={20}/>} title="No past-due subs" description="Everyone's paid up. Nice."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(({ profile: p, dunning: d }) => (
              <div key={p.id} className="card-premium" style={{ padding:'12px 16px',
                display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:240 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{p.full_name || p.email}</div>
                  <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'monospace' }}>{p.email}</span>
                    <span>·</span><span>plan: {p.plan}</span>
                    <span>·</span><span style={{ color:'var(--amber)' }}>{p.subscription_status}</span>
                    {d?.attempts != null && <><span>·</span><span>{d.attempts} retries</span></>}
                    {d?.grace_until && <><span>·</span><span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><Clock size={10}/> grace til {new Date(d.grace_until).toLocaleDateString()}</span></>}
                  </div>
                </div>
                <a href={`/admin/users/${p.id}`} className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>View user</a>
                <button className="btn btn-secondary btn-sm" style={{ fontSize:11 }} onClick={()=>act(p.id, 'grant_grace', 7)}>+7d grace</button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize:11, color:'var(--green-val)' }} onClick={()=>act(p.id, 'mark_resolved')}><CheckCircle2 size={11}/> Resolved</button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize:11, color:'var(--red)' }} onClick={()=>act(p.id, 'cancel')}><XCircle size={11}/> Cancel</button>
              </div>
            ))}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
