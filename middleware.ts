import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase/env'

/**
 * Top-level admin auth gate.
 *
 * Critical safety property: every /api/admin/* route uses the
 * SUPABASE_SERVICE_ROLE_KEY internally (it has to — listing all users,
 * setting plans, granting credits, all need RLS-bypassing auth).
 * Therefore the routes MUST NEVER be reachable without an authenticated
 * admin session. The previous middleware only gated /admin (the page
 * routes) and left /api/admin/* exposed — anyone with the URL could
 * `curl /api/admin/users` and download the full user list (emails,
 * subscription state, Stripe IDs, etc.).
 *
 * Now we also gate /api/admin/* and require role in {admin,super_admin}.
 * Defence-in-depth: each API route should ALSO re-check the role
 * (cookie-bound supabase client + RLS), but this middleware is the
 * first line.
 * admin session. A previous version of this middleware only gated
 * /admin (the page routes) and left /api/admin/* exposed — anyone with
 * the URL could `curl /api/admin/users` and download the full user
 * list (emails, subscription state, Stripe IDs, …).
 *
 * Now we gate both /admin/* AND /api/admin/* and require role in
 * {admin,super_admin}. Defence-in-depth: API routes should also
 * re-check the role inside the handler, but middleware is the first
 * line.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path   = request.nextUrl.pathname
  const isPage = path.startsWith('/admin')
  const isApi  = path.startsWith('/api/admin')

  // ── Login-flow exemptions ─────────────────────────────────────
  // The middleware gates /api/admin/* with `unauthenticated` for
  // missing sessions. That's correct for every admin endpoint
  // EXCEPT the login flow itself — those endpoints exist to create
  // the session a caller is about to have. Without these exemptions
  // the login form POSTs to /api/admin/login-bypass, the middleware
  // sees no session, and returns `{error:"unauthenticated"}` before
  // the route handler ever runs. The login form then renders the
  // string verbatim as the error message — which is the bug the
  // user reported on the login screen.
  const isLoginEndpoint =
       path === '/api/admin/login-bypass'
    || path === '/api/admin/logout'
    || path === '/api/admin/invites/accept'   // invite-accept hits before a session exists
  if (isLoginEndpoint) {
    return supabaseResponse
  }

  // /admin/accept-invite is the one page in /admin/* that an
  // invitee — who BY DEFINITION has no admin role yet — must be
  // able to reach. We still require an authenticated Supabase
  // session here (the API handler checks email match + token
  // validity + writes user_roles), but we skip the role gate so
  // the page itself can render. Without this, every invite link
  // bounces through /login → /admin → /unauthorized.
  const isAcceptInvitePage = path === '/admin/accept-invite'

  if (isPage || isApi) {
    if (!user) {
      if (isApi) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      // Preserve the full original URL (with query string) so the
      // invitee comes back to /admin/accept-invite?token=… after
      // signing in. `path` alone would drop the token.
      const fullNext = path + (request.nextUrl.search || '')
      url.searchParams.set('next', fullNext)
      return NextResponse.redirect(url)
    }

    if (!isAcceptInvitePage) {
      // Verify the caller has an admin role. user_roles uses
      // (id, role) — the id IS the user_id, not a separate column.
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const isAdmin = role?.role === 'admin' || role?.role === 'super_admin'
      if (!isAdmin) {
        if (isApi) {
          return NextResponse.json({ error: 'forbidden' }, { status: 403 })
        }
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect signed-in admins away from /login → /admin. The
  // `next` exception lets an invitee — already signed in but
  // not yet an admin — get back to /admin/accept-invite after
  // the login round-trip. Without it the redirect dumps them
  // on /admin and the token is lost.
  if (path === '/login' && user) {
    const next = request.nextUrl.searchParams.get('next')
    if (next && next.startsWith('/admin/accept-invite')) {
      const url = request.nextUrl.clone()
      url.pathname = next.split('?')[0]
      url.search   = next.includes('?') ? '?' + next.split('?')[1] : ''
      return NextResponse.redirect(url)
    }
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
