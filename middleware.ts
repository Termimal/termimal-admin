import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  if (isPage || isApi) {
    if (!user) {
      if (isApi) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    // Verify the caller has an admin role. user_roles uses (id, role).
    // Verify the caller has an admin role. user_roles uses (id, role)
    // — the id IS the user_id, not a separate column.
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

  // Redirect logged-in admins away from /login → /admin.
  // Redirect signed-in admins away from /login → /admin.
  if (path === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
