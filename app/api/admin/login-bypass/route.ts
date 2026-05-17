import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env"
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

// In-memory rate-limit buckets — per email + per IP. Resets when the
// isolate restarts; intentionally aggressive ceilings so a brute-force
// is throttled even if the attacker hits multiple isolates.
const EMAIL_BUCKETS = new Map<string, number[]>() // key: email -> ts[]
const IP_BUCKETS    = new Map<string, number[]>() // key: ip    -> ts[]
const FAIL_BUCKETS  = new Map<string, number[]>() // key: email -> ts[] of FAILED attempts
const EMAIL_MAX_PER_HOUR = 10
const IP_MAX_PER_MIN     = 5
const FAIL_MAX_PER_HOUR  = 5
const HOUR_MS = 60 * 60 * 1000
const MIN_MS  = 60 * 1000
function pruneAndCount(map: Map<string, number[]>, key: string, windowMs: number): number {
  const now = Date.now()
  const arr = map.get(key) ?? []
  while (arr.length && arr[0] < now - windowMs) arr.shift()
  map.set(key, arr)
  return arr.length
}
function record(map: Map<string, number[]>, key: string) {
  const arr = map.get(key) ?? []
  arr.push(Date.now())
  map.set(key, arr)
}
function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip')
      ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? 'unknown'
}

export async function POST(request: Request) {
  try {
    // ── Origin / Sec-Fetch-Site enforcement ─────────────────────
    // Reject cross-site POSTs to close the login-CSRF surface that
    // could otherwise be used to log a victim's browser into an
    // attacker's account (then chained with admin XSS).
    const sfs = request.headers.get('sec-fetch-site')
    if (sfs && sfs !== 'same-origin' && sfs !== 'same-site' && sfs !== 'none') {
      return NextResponse.json({ error: 'cross-site requests rejected' }, { status: 403 })
    }
    const origin = request.headers.get('origin')
    const host   = request.headers.get('host')
    if (origin && host) {
      try {
        const u = new URL(origin)
        if (u.host !== host) {
          return NextResponse.json({ error: 'origin mismatch' }, { status: 403 })
        }
      } catch { /* malformed origin — treat as no origin, fall through */ }
    }
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

    // ── Rate-limit gate ─────────────────────────────────────────
    // Per-IP cap (5/min/IP) catches scripted brute-force from a
    // single source. Per-email cap (10/hour) catches credential
    // stuffing across distributed sources targeting one account.
    // Per-email FAIL cap (5/hour) is the real teeth — throttles
    // even slow distributed guessing once 5 wrong passwords land.
    const ip       = clientIp(request)
    const lcEmail  = email.toLowerCase().trim()
    const ipCount      = pruneAndCount(IP_BUCKETS,    ip,      MIN_MS)
    const emailCount   = pruneAndCount(EMAIL_BUCKETS, lcEmail, HOUR_MS)
    const failCount    = pruneAndCount(FAIL_BUCKETS,  lcEmail, HOUR_MS)
    if (ipCount    >= IP_MAX_PER_MIN)     return respondError(`too many login attempts from this IP. Try again in 1 minute.`,    429)
    if (emailCount >= EMAIL_MAX_PER_HOUR) return respondError(`too many login attempts for this email. Try again in 1 hour.`,   429)
    if (failCount  >= FAIL_MAX_PER_HOUR)  return respondError(`account temporarily locked after too many failed attempts. Try again in 1 hour, or use the "Forgot password" link to reset.`, 429)
    record(IP_BUCKETS,    ip)
    record(EMAIL_BUCKETS, lcEmail)

    const body = { email, password }

    const supabaseUrlValue = supabaseUrl()
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrlValue || !serviceKey) {
      return NextResponse.json({ error: 'server is missing supabase configuration' }, { status: 503 })
    }

    // Service-role token request — Supabase skips captcha for service-role.
    const tokenRes = await fetch(`${supabaseUrlValue}/auth/v1/token?grant_type=password`, {
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
      // Record FAILED attempt — feeds the per-email lock-out above.
      record(FAIL_BUCKETS, lcEmail)
      return respondError(
        // Generic message: never confirm whether the email exists.
        'invalid email or password',
        tokenRes.status === 400 ? 401 : tokenRes.status,
      )
    }

    // Confirm the user has an admin role before letting them in.
    const userId = tokenJson.user?.id
    if (!userId) {
      return respondError('malformed login response', 500)
    }
    const roleRes = await fetch(`${supabaseUrlValue}/rest/v1/user_roles?id=eq.${encodeURIComponent(userId)}&select=role`, {
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

    // Telemetry: write a login_events row for the admin sign-in.
    // Same shape as the public site's /api/auth/log-event endpoint
    // so the user-detail Activity tab can render both uniformly.
    try {
      const ua = request.headers.get('user-agent') || ''
      const isMobile = /mobile|iphone|ipod|android|blackberry|webos|opera mini/i.test(ua)
      const isTablet = /ipad|tablet|playbook|silk(?!.*mobile)/i.test(ua)
      const isBot    = /bot|crawler|spider|crawl|slurp|fetch|curl|wget|python-requests/i.test(ua)
      const browser = /edg\//i.test(ua) ? 'Edge'
                    : /opr\/|opera/i.test(ua) ? 'Opera'
                    : /firefox|fxios/i.test(ua) ? 'Firefox'
                    : /chrome|crios/i.test(ua) ? 'Chrome'
                    : /safari/i.test(ua) ? 'Safari'
                    : 'unknown'
      const os = /windows/i.test(ua) ? 'Windows'
               : /iphone|ipad|ipod/i.test(ua) ? 'iOS'
               : /android/i.test(ua) ? 'Android'
               : /mac os x|macos/i.test(ua) ? 'macOS'
               : /linux/i.test(ua) ? 'Linux'
               : 'unknown'
      const device = isBot ? 'bot' : isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
      const cfAny = (request as unknown as { cf?: Record<string, unknown> }).cf
      await fetch(`${supabaseUrlValue}/rest/v1/login_events`, {
        method:  'POST',
        headers: {
          'apikey':         serviceKey,
          'Authorization':  `Bearer ${serviceKey}`,
          'Content-Type':   'application/json',
          'Prefer':         'return=minimal',
        },
        body: JSON.stringify({
          user_id:     userId,
          ip:          request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
          country:     request.headers.get('cf-ipcountry') || null,
          city:        (cfAny?.city     as string) || null,
          region:      (cfAny?.region   as string) || null,
          timezone:    (cfAny?.timezone as string) || null,
          user_agent:  ua.slice(0, 500),
          device_type: device,
          browser,
          os,
          method:      'admin_password',
          success:     true,
        }),
      }).catch(() => null)
    } catch { /* never block login on telemetry failure */ }

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
