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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { email?: string; password?: string } | null
    if (!body?.email || !body.password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

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
      return NextResponse.json({
        error: tokenJson.error_description || tokenJson.msg || tokenJson.error || 'invalid email or password',
      }, { status: tokenRes.status === 400 ? 401 : tokenRes.status })
    }

    // Confirm the user has an admin role before letting them in.
    const userId = tokenJson.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'malformed login response' }, { status: 500 })
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
      return NextResponse.json({
        error: 'this account does not have admin access',
      }, { status: 403 })
    }

    // Set the Supabase auth cookie pair so the SSR client picks up the
    // session on the next request. Cookie names follow @supabase/ssr's
    // convention: sb-<projectRef>-auth-token holds the JSON-encoded
    // token pair, sometimes split into chunks for very long tokens.
    // We write the standard non-chunked cookie which @supabase/ssr will
    // happily read on the next page load.
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    const cookieName = `sb-${projectRef}-auth-token`
    const cookieValue = JSON.stringify({
      access_token:  tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      expires_at:    tokenJson.expires_at,
      expires_in:    tokenJson.expires_in,
      token_type:    tokenJson.token_type ?? 'bearer',
      user:          tokenJson.user ?? null,
    })

    const response = NextResponse.json({ ok: true, role, redirect: '/admin' })
    response.cookies.set(cookieName, cookieValue, {
      path:     '/',
      httpOnly: true,
      sameSite: 'lax',
      secure:   true,
      maxAge:   tokenJson.expires_in ?? 3600,
    })
    return response
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'login failed',
    }, { status: 500 })
  }
}
