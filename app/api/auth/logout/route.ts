/**
 * /api/auth/logout — sign the admin out and bounce to /login.
 *
 * The sidebar's "Sign out" anchor hits this endpoint. Without it the
 * link 404s. We expire the Supabase session both server- and
 * client-side so the next request to any /admin/* route triggers the
 * middleware redirect to /login.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function handler(request: Request) {
  try {
    const sb = await createClient()
    await sb.auth.signOut().catch(() => null)
  } catch { /* still bounce to login */ }

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}

export async function GET(request: Request)  { return handler(request) }
export async function POST(request: Request) { return handler(request) }
