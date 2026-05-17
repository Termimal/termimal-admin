'use client'
export const dynamic = 'force-dynamic'

/**
 * /unauthorized — landing page when the cookie-bound user isn't in
 * `user_roles` with an admin/super_admin role.
 *
 * Previously this page only had a "Return to Login" link. That link
 * sent the user straight back into /login → middleware sees existing
 * session → redirects /admin → /admin gate fails → /unauthorized. An
 * infinite loop for anyone whose public-site cookie got synced over
 * to bo.termimal.com via the parent .termimal.com cookie domain.
 *
 * Now we surface the actually-signed-in email (when we can read it)
 * and offer a Sign-out button that wipes the session via the
 * /api/admin/logout endpoint, after which /login is reachable again.
 *
 * Native form fallback is left in place so users with extension-broken
 * JS can still escape.
 */
import { useEffect, useState } from 'react'

export default function UnauthorizedPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState<string | null>(null)

  // Best-effort read of the signed-in user so we can tell them which
  // account is failing the role check. /api/admin/me requires the
  // caller to actually BE an admin — non-admins land here, so this
  // call will 401 and we fall back to a generic message. That's
  // intentional: we never want to confirm "yes this email exists
  // but lacks admin role" to a non-admin caller.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((j: { email?: string | null } | null) => {
        if (!cancelled) setEmail(j?.email ?? null)
      })
      .catch(() => { /* never block the page */ })
    return () => { cancelled = true }
  }, [])

  const signOut = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/admin/logout', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      // Hard reload so middleware re-reads the (now-empty) session and
      // /login renders cleanly. Avoids any stale client-router cache.
      window.location.assign('/login')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'sign out failed')
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#060810',
      padding: 24,
      backgroundImage: 'radial-gradient(ellipse at 50% 0,rgba(248,113,113,0.07) 0%,transparent 60%)',
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: '#121726',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: 32,
        display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        color: '#f0f4ff',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f87171', letterSpacing: '-0.4px', margin: 0 }}>
            Access denied
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(240,244,255,0.62)', lineHeight: 1.55, margin: 0 }}>
            {email
              ? <>You&rsquo;re signed in as <strong style={{ color: '#f0f4ff' }}>{email}</strong>, but that account doesn&rsquo;t have admin access.</>
              : <>Your current session doesn&rsquo;t have admin access.</>
            }
          </p>
          <p style={{ fontSize: 12.5, color: 'rgba(240,244,255,0.45)', lineHeight: 1.55, margin: 0 }}>
            Sign out below and try a different account. If this is the right account, ask a super_admin to grant it a role.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* JS path */}
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            style={{
              width: '100%', padding: '11px',
              background: busy ? 'rgba(248,113,113,0.5)' : '#f87171',
              border: 'none', borderRadius: 10,
              color: '#0a0d16', fontSize: 13, fontWeight: 800,
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease',
              boxShadow: busy ? 'none' : '0 0 20px rgba(248,113,113,0.2)',
            }}
          >
            {busy ? 'Signing out…' : 'Sign out & try a different account'}
          </button>

          {/* No-JS fallback: POSTs straight to the API which 303s to /login. */}
          <form method="POST" action="/api/admin/logout" style={{ display: 'none' }} id="logout-fallback-form" />

          <a
            href="/login"
            style={{
              width: '100%', padding: '10px 11px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              color: 'rgba(240,244,255,0.72)',
              fontSize: 12.5, fontWeight: 600,
              textAlign: 'center', textDecoration: 'none',
              display: 'block',
            }}
          >
            Return to login
          </a>
        </div>

        {err && (
          <div style={{
            padding: '9px 12px',
            background: 'rgba(255,92,107,0.08)',
            border: '1px solid rgba(255,92,107,0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: '#ff5c6b',
          }}>
            {err}
          </div>
        )}
      </div>

      <noscript>
        <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(240,244,255,0.5)' }}>
          JavaScript is disabled —&nbsp;
          <form method="POST" action="/api/admin/logout" style={{ display: 'inline' }}>
            <button type="submit" style={{
              background: 'transparent', border: 'none', color: '#f87171',
              textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit',
            }}>
              sign out
            </button>
          </form>
          &nbsp;to return to the login page.
        </div>
      </noscript>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  )
}
