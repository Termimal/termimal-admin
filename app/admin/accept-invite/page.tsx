'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, CheckCircle, XCircle, Loader2, ArrowRight, Terminal } from 'lucide-react'

function AcceptInviteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token  = params.get('token') || ''
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [error, setError] = useState('')
  const [role, setRole]   = useState('')

  async function accept() {
    if (!token) { setError('No invite token in URL'); setState('err'); return }
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/admin/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const j = await res.json() as { ok?: boolean; role?: string; error?: string }
      if (!res.ok) {
        setError(j.error || 'Failed to accept invite')
        setState('err')
        return
      }
      setRole(j.role || 'admin')
      setState('ok')
      setTimeout(() => router.push('/admin'), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error')
      setState('err')
    }
  }

  useEffect(() => {
    if (!token) { setError('No invite token provided'); setState('err') }
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--bg)',
    }}>
      <div className="card card-p" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 18px',
          borderRadius: 14,
          background: 'var(--acc-bg)',
          border: '1px solid var(--acc-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Terminal size={22} style={{ color: 'var(--acc)' }} />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0, marginBottom: 6 }}>
          Termimal admin invite
        </h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0, marginBottom: 24 }}>
          You&rsquo;ve been invited to join the Termimal back office. Accept to claim your admin role.
        </p>

        {state === 'idle' && token && (
          <>
            <div style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 11,
              color: 'var(--t4)',
              marginBottom: 18,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}>
              token: {token.slice(0, 12)}…{token.slice(-6)}
            </div>
            <button onClick={accept} className="btn btn-primary" style={{ width: '100%' }}>
              <Shield size={14} /> Accept invite
            </button>
            <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 14 }}>
              You must be signed in with the email this invite was sent to.
            </p>
          </>
        )}

        {state === 'loading' && (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Loader2 size={20} style={{ color: 'var(--acc)', animation: 'accept-invite-spin 0.9s linear infinite' }} />
            <style>{`@keyframes accept-invite-spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 13, color: 'var(--t3)' }}>Granting role…</span>
          </div>
        )}

        {state === 'ok' && (
          <div style={{ padding: '24px 0' }}>
            <CheckCircle size={36} style={{ color: 'var(--green)', marginBottom: 10 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>You&rsquo;re in.</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>
              Role granted: <span className="chip chip-purple">{role}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Redirecting to admin <ArrowRight size={12} />
            </div>
          </div>
        )}

        {state === 'err' && (
          <div style={{ padding: '20px 0' }}>
            <XCircle size={32} style={{ color: 'var(--red)', marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>{error || 'Could not accept invite'}</div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/login" className="btn btn-secondary">Sign in with the invited email</Link>
              {state === 'err' && token && (
                <button onClick={accept} className="btn btn-ghost" style={{ fontSize: 12 }}>Try again</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  )
}
