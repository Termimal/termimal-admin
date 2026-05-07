'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Login page for the admin panel.
 *
 * Renders a Cloudflare Turnstile widget when a site key is configured
 * and passes the resulting token to `signInWithPassword({ ..., options:
 * { captchaToken } })`. Supabase's project-level captcha setting
 * rejects sign-ins without a fresh token, which is why login was
 * failing here — the form was sending password-only requests.
 *
 * If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset we skip the widget
 * entirely and let the call go through unchecked. That's the right
 * fallback for staging / local-dev so we don't block ourselves out
 * if Supabase captcha is off.
 */

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__termimalTurnstileReady'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      reset: (id?: string) => void
      remove: (id: string) => void
    }
    __termimalTurnstileReady?: () => void
  }
}

function LoginForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/admin'

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const widgetIdRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Surface error message passed in via ?error=... after a redirect.
  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setError(err)
  }, [searchParams])

  // Mount the Turnstile widget once the global script has loaded.
  // We use the explicit-render flow so we can re-mount on demand
  // (e.g. after a failed sign-in we need a fresh token).
  useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let cancelled = false

    function mount() {
      if (cancelled) return
      const ts = window.turnstile
      if (!ts || !containerRef.current) return
      if (widgetIdRef.current) {
        ts.reset(widgetIdRef.current)
        return
      }
      widgetIdRef.current = ts.render(containerRef.current, {
        sitekey:           siteKey,
        theme:             'auto',
        callback:          (token: string) => setCaptchaToken(token),
        'error-callback':  () => setCaptchaToken(''),
        'expired-callback':() => setCaptchaToken(''),
      })
    }

    if (window.turnstile) {
      mount()
    } else {
      window.__termimalTurnstileReady = mount
    }

    return () => {
      cancelled = true
      const ts = window.turnstile
      if (ts && widgetIdRef.current) {
        try { ts.remove(widgetIdRef.current) } catch {}
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    // If a site key is configured, Supabase will reject sign-ins
    // without a captcha token. Block the submission until the
    // widget completes.
    if (siteKey && !captchaToken) {
      setError('Please complete the captcha before signing in.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      // Reset the widget so the user can try again with a fresh token.
      if (window.turnstile && widgetIdRef.current) {
        try { window.turnstile.reset(widgetIdRef.current) } catch {}
      }
      setCaptchaToken('')
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <>
      {siteKey ? (
        <Script
          src={TURNSTILE_SCRIPT_URL}
          strategy="afterInteractive"
        />
      ) : null}
      <main className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold">Sign in</h1>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <input
            className="w-full border p-3 rounded"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
          />
          <input
            className="w-full border p-3 rounded"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          {siteKey ? <div ref={containerRef} /> : null}
          <button
            className="w-full border p-3 rounded font-semibold disabled:opacity-50"
            disabled={loading || (Boolean(siteKey) && !captchaToken)}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {!siteKey && (
            <p className="text-xs text-gray-500">
              Captcha disabled (NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset).
            </p>
          )}
        </form>
      </main>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
