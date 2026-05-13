'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/incident — the break-glass console.
 *
 * Two big red levers:
 *   1. Read-only mode  — flips system_state.readonly_mode. The public
 *      site refuses writes while this is on.
 *   2. Mass revoke     — global signOut for every session, plus
 *      revokes every active API token.
 *
 * Plus a banner-message editor that displays on every page during
 * incidents.
 *
 * Use this when you suspect a breach or need to freeze the platform.
 * Audit log captures everything.
 */
import { useEffect, useState } from 'react'
import { Siren, Lock, LockOpen, RefreshCw, Bomb } from 'lucide-react'
import { HeroCard, Section } from '@/components/admin/PageChrome'

interface State {
  readonly_mode: boolean; banner_message: string | null; readonly_since: string | null;
  readonly_reason: string | null; readonly_by: string | null
}

export default function IncidentPage() {
  const [state, setState]  = useState<State | null>(null)
  const [reason, setReason] = useState('')
  const [banner, setBanner] = useState('')
  const [busy, setBusy]     = useState(false)
  const [revokeBusy, setRev] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/system-state', { cache:'no-store' })
    const j = await res.json()
    setState(j.state)
    setBanner(j.state?.banner_message || '')
  }
  useEffect(() => { load() }, [])

  const toggleReadonly = async () => {
    if (!confirm(state?.readonly_mode ? 'Turn read-only mode OFF and resume writes?' : 'Turn READ-ONLY MODE ON — the public site will refuse writes?')) return
    setBusy(true)
    await fetch('/api/admin/system-state', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ readonly_mode: !state?.readonly_mode, reason }),
    })
    setBusy(false); await load()
  }

  const saveBanner = async () => {
    setBusy(true)
    await fetch('/api/admin/system-state', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ banner_message: banner || null }),
    })
    setBusy(false); await load()
  }

  const massRevoke = async (scope: 'all' | 'users' | 'admins') => {
    if (!confirm(`MASS REVOKE — scope: ${scope}. Every session in scope will be killed. Type REVOKE_ALL in the next dialog.`)) return
    const second = prompt('Type REVOKE_ALL to confirm.')
    if (second !== 'REVOKE_ALL') return
    setRev(true)
    const res = await fetch('/api/admin/mass-revoke', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ confirm:'REVOKE_ALL', scope, reason }),
    })
    const j = await res.json()
    setRev(false)
    if (!res.ok) alert(j.error || 'failed')
    else alert(`Revoked ${j.revokedUsers} users, ${j.revokedTokens} API tokens.`)
    await load()
  }

  return (
    <div>
      <HeroCard accent="red" icon={<Siren size={28}/>} eyebrow="Incident response"
        title="Break-glass console"
        subtitle="Read-only mode freezes writes site-wide. Mass-revoke kills every session + every API token. Use these during a confirmed compromise — recovery from a key leak is much cheaper than recovery from continued attacker access."
        metric={{ label: state?.readonly_mode ? 'READ-ONLY' : 'Normal', value: state?.readonly_mode ? 'ON' : 'OFF', secondary: state?.readonly_since ? `since ${new Date(state.readonly_since).toLocaleString()}` : '' }}/>

      <Section accent="red" title="Read-only mode" description="Site refuses POST/PATCH/DELETE while ON.">
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center' }}>
          <input className="input" placeholder="reason (logged to audit)" value={reason} onChange={e=>setReason(e.target.value)}/>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={toggleReadonly}
            style={{ background: state?.readonly_mode ? 'var(--green-val)' : 'var(--red)', color:'#0c0c0c' }}>
            {state?.readonly_mode ? <><LockOpen size={13}/> Turn OFF</> : <><Lock size={13}/> Turn ON</>}
          </button>
        </div>
      </Section>

      <Section accent="amber" title="Status banner" description="Shows on every page while non-empty.">
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center' }}>
          <input className="input" placeholder="e.g. 'Investigating slow login responses — ETA 15 min.'"
            value={banner} onChange={e=>setBanner(e.target.value)}/>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={saveBanner}>Save banner</button>
        </div>
      </Section>

      <Section accent="red" title="Mass session revocation" description="Sign EVERYONE out + invalidate every API token. Irreversible.">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-secondary btn-sm" disabled={revokeBusy} style={{ color:'var(--red)' }} onClick={()=>massRevoke('admins')}>
            <Bomb size={12}/> Revoke admin sessions
          </button>
          <button className="btn btn-secondary btn-sm" disabled={revokeBusy} style={{ color:'var(--red)' }} onClick={()=>massRevoke('users')}>
            <Bomb size={12}/> Revoke user sessions
          </button>
          <button className="btn btn-primary btn-sm" disabled={revokeBusy} style={{ background:'var(--red)', color:'#0c0c0c' }} onClick={()=>massRevoke('all')}>
            <Bomb size={13}/> REVOKE EVERYONE
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginLeft:'auto' }}><RefreshCw size={13}/></button>
        </div>
      </Section>
    </div>
  )
}
