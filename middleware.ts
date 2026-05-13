import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requiredPermission, roleGrants } from '@/lib/admin/permissions'

/**
 * Admin auth gate with RBAC permission check.
 *
 * Every /admin/* and /api/admin/* request:
 *   1. Must have a Supabase session (else 401 / redirect to /login).
 *   2. Caller's role (from public.user_roles) must grant the
 *      permission required for the path (looked up in
 *      lib/admin/permissions.PATH_PERMISSIONS).
 *   3. The role's permission list comes from rbac_roles. Wildcards
 *      ('*') grant everything (super_admin only).
 *   4. If no permission required (e.g. /admin/accept-invite), pass.
 *
 * Backwards-compat: if rbac_roles doesn't have a row for the user's
 * role name, we fall back to the seeded defaults inside this file
 * (so accidental data loss in rbac_roles doesn't lock everyone out).
 */

// Fallback role permissions baked in. Mirrors the seed in the
// 20260508_finance_and_rbac migration.
const FALLBACK_PERMS: Record<string, string[]> = {
  super_admin: ['*'],
  admin:       ['users.read','users.write','billing.read','billing.write','content.read','content.write','seo.read','seo.write','flags.read','flags.write','support.read','support.write','experiments.read','experiments.write','cohorts.read','cohorts.write','translations.read','translations.write','email_templates.read','email_templates.write','audit.read','analytics.read','webhooks.read','items.read','items.write','anomalies.read','system.read','system.write','maintenance.read','maintenance.write','invites.read','invites.write','export.read','banners.read','banners.write','announcements.read','announcements.write','faqs.read','faqs.write','notes.read','notes.write','coupons.read','coupons.write','finance.read','referrals.read','referrals.write'],
  finance:     ['billing.read','billing.write','billing.refund','finance.read','finance.write','coupons.read','coupons.write','analytics.read','audit.read','export.read','users.read','referrals.read','referrals.write'],
  support:     ['users.read','support.read','support.write','notes.read','notes.write','billing.read','billing.refund','audit.read'],
  content_editor: ['content.read','content.write','seo.read','seo.write','translations.read','translations.write','email_templates.read','email_templates.write','banners.read','banners.write','announcements.read','announcements.write','faqs.read','faqs.write'],
  developer:   ['users.read','billing.read','flags.read','flags.write','experiments.read','experiments.write','system.read','system.write','maintenance.read','maintenance.write','audit.read','webhooks.read','anomalies.read','analytics.read','items.read','items.write'],
  readonly:    ['users.read','billing.read','content.read','seo.read','flags.read','support.read','experiments.read','cohorts.read','translations.read','email_templates.read','audit.read','analytics.read','webhooks.read','items.read','anomalies.read','system.read','maintenance.read','invites.read','export.read','banners.read','announcements.read','faqs.read','notes.read','finance.read','coupons.read','referrals.read'],
}

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
  const path  = request.nextUrl.pathname
  const isApi = path.startsWith('/api/admin')
  const isPage = path.startsWith('/admin')

  // /api/admin/login-bypass is the captcha-skipping login endpoint —
  // it must be reachable WITHOUT a session (it's how the user gets one).
  if (path === '/api/admin/login-bypass') {
    return supabaseResponse
  }

  // /admin/accept-invite + /api/admin/invites/accept are the admin paths
  // that DON'T require an existing admin role — that's how new admins
  // claim their role. They still require an authenticated Supabase
  // session (the invitee must sign up / log in first).
  if (path === '/admin/accept-invite' || path === '/api/admin/invites/accept') {
    if (!user) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (isPage || isApi) {
    if (!user) {
      if (isApi) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!roleRow?.role) {
      if (isApi) return NextResponse.json({ error: 'forbidden — no role' }, { status: 403 })
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }

    // Permission check.
    const perm = requiredPermission(path)
    if (perm) {
      // Try rbac_roles first; fall back to baked-in defaults.
      const { data: rbacRow } = await supabase
        .from('rbac_roles')
        .select('permissions')
        .eq('name', roleRow.role)
        .maybeSingle()
      const permsList = (rbacRow?.permissions as string[] | undefined) ?? FALLBACK_PERMS[roleRow.role] ?? []
      if (!roleGrants(permsList, perm)) {
        if (isApi) return NextResponse.json({ error: `forbidden — requires ${perm}` }, { status: 403 })
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        url.searchParams.set('missing', perm)
        return NextResponse.redirect(url)
      }
    }
  }

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
