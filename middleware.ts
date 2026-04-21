import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get current user session
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  const isUnauthorizedPage = request.nextUrl.pathname.startsWith('/unauthorized')

  // 1. If no user, redirect to login (unless already there)
  if (!user && !isLoginPage && !isUnauthorizedPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. If user exists, check their role
  if (user) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = roleData?.role === 'admin'

    // If they are not an admin and trying to access anything other than /unauthorized
    if (!isAdmin && !isUnauthorizedPage) {
      // Sign them out of the admin panel so their session doesn't linger
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // If they ARE an admin and try to hit /login, push them to the dashboard
    if (isAdmin && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Protect all routes except for static assets, images, and auth callbacks
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api).*)',
  ],
}