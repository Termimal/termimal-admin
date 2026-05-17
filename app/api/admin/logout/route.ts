/**
 * /api/admin/logout — clear the Supabase session on the admin domain.
 *
 * The middleware already exempts this route from the auth gate so a
 * non-admin user (e.g. someone whose public-site cookie was shared
 * onto bo.termimal.com) can use it to escape the /unauthorized loop.
 *
 * Mirrors the SSR-cookie write path used by login-bypass: we let
 * @supabase/ssr write the auth cookies through Next's cookies()
 * store, which keeps the chunked / base64-prefixed format middleware
 * expects on the next request.
 *
 * Two response shapes:
 *   - JSON callers (the /unauthorized page's "Sign out" button) get
 *     `{ ok: true }` and handle the redirect themselves.
 *   - Form-encoded POSTs (no-JS fallback) get a 303 to /login.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const ct = (request.headers.get('content-type') || '').toLowerCase()
  const formMode = !ct.includes('application/json')
  try {
    const sb = await createClient()
    await sb.auth.signOut().catch(() => null)
  } catch { /* fall through — even if signOut threw, we return ok */ }

  if (formMode) {
    const url = new URL(request.url)
    url.pathname = '/login'
    url.search   = ''
    return NextResponse.redirect(url, { status: 303 })
  }
  return NextResponse.json({ ok: true })
}
