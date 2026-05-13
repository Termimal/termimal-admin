'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/bulk — fan-out admin actions over a segment.
 * Pick action + segment + payload, hit Run. Returns per-user counts
 * and the first 50 errors.
 */
import { useState } from 'react'
import { Layers, Play, AlertCircle, CheckCircle2 } from 'lucide-react'
import { HeroCard, Section } from '@/components/admin/PageChrome'

type Action = 'grant_credits' | 'apply_coupon' | 'force_password_reset' | 'send_broadcast'

export default function BulkPage() {
  const [action, setAction] = useState<Action>('force_password_reset')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')
  const [country, setCountry] = useState('')
  const [minDays, setMinDays] = useState('')
  // payload fields:
  const [cents, setCents] = useState('500')
  const [coupon, setCoupon] = useState('')
  const [title, setTitle] = useState('')
  const [body,  setBody]  = useState('')

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ total: number; succeeded: number; failed: number; errors: Array<{ user_id: string; error: string }> } | null>(null)

  const run = async () => {
    if (!confirm(`Run "${action}" over this segment? Confirm count after — the API returns a dry-run total first.`)) return
    setRunning(true); setResult(null)
    const segment: Record<string, unknown> = {}
    if (plan)    segment.plan    = plan.split(',').map(x=>x.trim()).filter(Boolean)
    if (status)  segment.status  = status.split(',').map(x=>x.trim()).filter(Boolean)
    if (country) segment.country = country.split(',').map(x=>x.trim()).filter(Boolean)
    if (minDays) segment.min_signup_days = parseInt(minDays, 10)
    const payload: Record<string, unknown> = {}
    if (action === 'grant_credits') payload.cents = parseInt(cents, 10) || 0
    if (action === 'apply_coupon')  payload.coupon_code = coupon
    if (action === 'send_broadcast'){ payload.title = title; payload.body = body; payload.channels = ['notification'] }

    const r = await fetch('/api/admin/bulk', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action, segment, payload }) })
    const j = await r.json()
    setRunning(false); setResult(j)
  }

  return (
    <div>
      <HeroCard accent="amber" icon={<Layers size={28}/>} eyebrow="Operations"
        title="Bulk operations"
        subtitle="Fan-out a single admin action across a user segment. Granting credits, forcing password resets, queueing broadcasts. Every run audit-logs with counts; payloads cap at 20 000 users."
        metric={{ label: 'Last run', value: result ? `${result.succeeded}/${result.total}` : '—', secondary: result?.failed ? `${result.failed} failed` : '' }}/>

      <Section accent="amber" title="Action">
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:6 }}>
          {(['force_password_reset','grant_credits','apply_coupon','send_broadcast'] as Action[]).map(a => (
            <label key={a} style={{ display:'flex', alignItems:'center', gap:8, padding:8, borderRadius:8,
              background: action === a ? 'rgba(210,153,34,0.10)' : 'var(--surface)',
              border:`1px solid ${action === a ? 'rgba(210,153,34,0.4)' : 'var(--border)'}`, cursor:'pointer' }}>
              <input type="radio" name="action" checked={action === a} onChange={() => setAction(a)}/>
              <span style={{ fontSize:13, fontWeight:600, color: action === a ? 'var(--amber)' : 'var(--t2)' }}>{a}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section accent="amber" title="Segment" description="Empty = all users. Multiple values CSV.">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          <input className="input" placeholder="plan (csv)" value={plan} onChange={e=>setPlan(e.target.value)}/>
          <input className="input" placeholder="status (csv)" value={status} onChange={e=>setStatus(e.target.value)}/>
          <input className="input" placeholder="country (csv)" value={country} onChange={e=>setCountry(e.target.value)}/>
          <input className="input" placeholder="min signup days" type="number" value={minDays} onChange={e=>setMinDays(e.target.value)}/>
        </div>
      </Section>

      <Section accent="amber" title="Payload">
        {action === 'grant_credits' && (
          <input className="input" placeholder="cents" type="number" value={cents} onChange={e=>setCents(e.target.value)}/>
        )}
        {action === 'apply_coupon' && (
          <input className="input" placeholder="coupon code" value={coupon} onChange={e=>setCoupon(e.target.value)}/>
        )}
        {action === 'send_broadcast' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <input className="input" placeholder="title" value={title} onChange={e=>setTitle(e.target.value)}/>
            <textarea className="input" placeholder="body" rows={3} value={body} onChange={e=>setBody(e.target.value)}/>
          </div>
        )}
        {action === 'force_password_reset' && (
          <p style={{ fontSize:12, color:'var(--t4)' }}>No payload — sends each user a recovery link.</p>
        )}
      </Section>

      <button className="btn btn-primary btn-sm" disabled={running} onClick={run}>
        <Play size={13}/> {running ? 'Running…' : 'Run'}
      </button>

      {result && (
        <Section accent={result.failed ? 'red' : 'green'} title="Result">
          <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--green-val)', fontWeight:700 }}>
              <CheckCircle2 size={14}/> {result.succeeded} succeeded
            </span>
            {result.failed > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--red)', fontWeight:700 }}>
                <AlertCircle size={14}/> {result.failed} failed
              </span>
            )}
            <span style={{ fontSize:12, color:'var(--t4)' }}>of {result.total} matched</span>
          </div>
          {result.errors.length > 0 && (
            <pre style={{ marginTop:12, padding:10, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:11, maxHeight:200, overflow:'auto' }}>
              {JSON.stringify(result.errors, null, 2)}
            </pre>
          )}
        </Section>
      )}
    </div>
  )
}
