'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/jit — just-in-time elevation.
 * Request elevated permissions for a specific reason; auto-revoke
 * after N minutes. The current list shows active + recent.
 */
import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Clock, RefreshCw, X } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; user_id: string; reason: string; granted_role: string;
  granted_at: string; expires_at: string; revoked_at: string | null;
}

export default function JitPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole]       = useState('super_admin')
  const [reason, setReason]   = useState('')
  const [duration, setDur]    = useState(60)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/jit', { cache:'no-store' })
    const j = await res.json(); setRows(j.rows || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const grant = async () => {
    if (!reason.trim()) { alert('reason required'); return }
    const res = await fetch('/api/admin/jit', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role, reason, duration_min: duration }),
    })
    const j = await res.json()
    if (!res.ok) { alert(j.error || 'failed'); return }
    setReason(''); load()
  }
  const revoke = async (id: string) => {
    if (!confirm('Revoke this elevation?')) return
    await fetch('/api/admin/jit', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    load()
  }

  const active = useMemo(() => rows.filter(r => !r.revoked_at && new Date(r.expires_at) > new Date()), [rows])

  return (
    <div>
      <HeroCard accent="purple" icon={<KeyRound size={28}/>} eyebrow="Security"
        title="Just-in-time elevation"
        subtitle="Nobody holds super_admin permanently. Grant yourself the role for a specific reason for up to 4 hours."
        metric={{ label: 'Active', value: active.length.toString() }}/>

      <Section accent="purple" title="Request elevation" description="State a reason — it becomes part of the audit trail.">
        <div style={{ display:'grid', gridTemplateColumns:'160px 1fr 120px auto', gap:8 }}>
          <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="super_admin">super_admin</option>
            <option value="admin">admin</option>
            <option value="finance">finance</option>
            <option value="support">support</option>
          </select>
          <input className="input" placeholder="reason (e.g. 'rotate Stripe webhook secret')" value={reason} onChange={e=>setReason(e.target.value)}/>
          <input className="input" type="number" min={5} max={240} value={duration} onChange={e=>setDur(parseInt(e.target.value || '60', 10))}/>
          <button className="btn btn-primary btn-sm" onClick={grant}>Grant</button>
        </div>
        <div style={{ fontSize:11, color:'var(--t4)', marginTop:6 }}>Duration in minutes (5–240). Hard cap is 4h.</div>
      </Section>

      <Section accent="purple" title="Active + recent" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:160, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<KeyRound size={20}/>} title="No elevations" description="You're currently operating at your baseline role."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => {
              const isActive = !r.revoked_at && new Date(r.expires_at) > new Date()
              return (
                <div key={r.id} className="card-premium" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', opacity: isActive ? 1 : 0.6 }}>
                  <div style={{ flex:1, minWidth:240 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{r.granted_role} <span style={{ fontSize:11, color:'var(--t4)', fontWeight:500 }}>· {r.user_id.slice(0,8)}…</span></div>
                    <div style={{ fontSize:12, color:'var(--t3)', marginTop:3 }}>{r.reason}</div>
                    <div style={{ fontSize:11, color:'var(--t4)', marginTop:4, display:'flex', gap:10 }}>
                      <span>{new Date(r.granted_at).toLocaleString()}</span>
                      <span>→</span>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><Clock size={10}/> {new Date(r.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <span style={{ padding:'4px 10px', borderRadius:999, fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                    background: isActive ? 'rgba(63,185,80,0.12)' : 'var(--bg3)', color: isActive ? 'var(--green-val)' : 'var(--t4)' }}>{isActive ? 'active' : (r.revoked_at ? 'revoked' : 'expired')}</span>
                  {isActive && (
                    <button className="btn btn-secondary btn-sm" style={{ color:'var(--red)' }} onClick={()=>revoke(r.id)}><X size={11}/> Revoke now</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
