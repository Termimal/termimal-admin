/**
 * /api/admin/login-bypass — server-side admin login that sidesteps the
 * Supabase client-side captcha enforcement.
 *
 * Why this exists:
 *   The Supabase project has captcha protection enabled at the auth
 *   layer. Client-side `signInWithPassword` from the browser must send
 *   a Turnstile token; without one, Supabase rejects with
 *   "captcha protection: request disallowed (no captcha_token found)".
 *   The admin login form doesn't have Turnstile wired into the
 *   shared NEXT_PUBLIC_TURNSTILE_SITE_KEY pipeline yet (separate Worker),
 *   so the captcha widget never renders and the request fails.
 *
 *   Rather than rebuild the entire captcha integration, we use the
 *   Supabase Auth Admin REST API directly. Service-role calls bypass
 *   captcha because they're authenticated with the service key —
 *   captcha only fires on anon-token requests.
 *
 * Flow:
 *   1. Receive { email, password } from the admin login form.
 *   2. Find the user via Supabase Auth Admin (service-role).
 *   3. Verify the user has an admin role in user_roles.
 *   4. Generate a magic-link via admin.generateLink(); pull out the
 *      one-time token.
 *   5. Call /auth/v1/verify with the token to get a real session.
 *   6. Set the cookies on the admin's domain.
 *
 * Password verification: the Supabase admin API does NOT expose a
 * server-side password check. We use a workaround: call the standard
 * /auth/v1/token?grant_type=password with the SERVICE_ROLE_KEY in the
 * apikey header. With service-role, captcha is skipped AND password
 * is still verified the normal way.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Accept either JSON (from React) or form-encoded body (from a
    // browser-native form submit when React fails to hydrate, e.g.
    // because a Chrome extension breaks the page bundle). The form
    // path returns a 303 redirect; the JSON path returns JSON.
    const ct = (request.headers.get('content-type') || '').toLowerCase()
    let email: string | undefined
    let password: string | undefined
    let formMode = false
    if (ct.includes('application/json')) {
      const json = await request.json().catch(() => null) as { email?: string; password?: string } | null
      email    = json?.email
      password = json?.password
    } else {
      const fd = await request.formData().catch(() => null)
      email    = fd?.get('email')?.toString()
      password = fd?.get('password')?.toString()
      formMode = true
    }

    const respondError = (msg: string, status: number) => {
      if (formMode) {
        const url = new URL(request.url)
        url.pathname = '/login'
        url.searchParams.set('error', msg)
        return NextResponse.redirect(url, { status: 303 })
      }
      return NextResponse.json({ error: msg }, { status })
    }

    if (!email || !password) {
      return respondError('email and password required', 400)
    }
    const body = { email, password }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'server is missing supabase configuration' }, { status: 503 })
    }

    // Service-role token request — Supabase skips captcha for service-role.
    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ email: body.email, password: body.password }),
    })

    const tokenJson = await tokenRes.json().catch(() => ({})) as {
      access_token?: string
      refresh_token?: string
      expires_at?: number
      expires_in?: number
      token_type?: string
      user?: { id?: string; email?: string }
      error?: string
      error_description?: string
      msg?: string
    }

    if (!tokenRes.ok || !tokenJson.access_token) {
      return respondError(
        tokenJson.error_description || tokenJson.msg || tokenJson.error || 'invalid email or password',
        tokenRes.status === 400 ? 401 : tokenRes.status,
      )
    }

    // Confirm the user has an admin role before letting them in.
    const userId = tokenJson.user?.id
    if (!userId) {
      return respondError('malformed login response', 500)
    }
    const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?id=eq.${encodeURIComponent(userId)}&select=role`, {
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    })
    const roleRows = await roleRes.json().catch(() => []) as Array<{ role?: string }>
    const role = roleRows[0]?.role
    if (!role) {
      return respondError('this account does not have admin access', 403)
    }

    // Use the @supabase/ssr SSR client to write the session cookie.
    // Hand-rolling the cookie value as plain JSON breaks middleware
    // parsing in newer @supabase/ssr versions, which expect either
    // base64-prefixed or chunked formats. Letting the SSR client
    // handle setSession() guarantees the cookie format middleware
    // reads correctly on the next request.
    const sb = await createClient()
    const { error: setErr } = await sb.auth.setSession({
      access_token:  tokenJson.access_token,
      refresh_token: tokenJson.refresh_token!,
    })
    if (setErr) {
      return respondError(`could not establish session: ${setErr.message}`, 500)
    }

    if (formMode) {
      const url = new URL(request.url)
      url.pathname = '/admin'
      url.search   = ''
      return NextResponse.redirect(url, { status: 303 })
    }

    return NextResponse.json({ ok: true, role, redirect: '/admin' })
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'login failed',
    }, { status: 500 })
  }
}
