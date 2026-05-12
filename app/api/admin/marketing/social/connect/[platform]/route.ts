/**
 * GET /api/admin/marketing/social/connect/[platform]
 *
 * Unified OAuth-start endpoint for LinkedIn, Threads, Facebook, Instagram.
 * X has its own /connect/x because the PKCE flow differs.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { PROVIDERS, authorizeUrlFor, envForPlatform, randomState, type Platform } from '@/lib/admin/oauth-providers'

export async function GET(_req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const { platform } = await ctx.params
  if (!(platform in PROVIDERS)) return NextResponse.json({ error: 'unknown platform' }, { status: 400 })

  const env = envForPlatform(platform as Platform)
  if (!env.clientId || !env.redirectUri) {
    return NextResponse.json({ error: `${platform.toUpperCase()}_CLIENT_ID + _REDIRECT_URI must be set in Worker env` }, { status: 503 })
  }

  const state = randomState()
  const sb = serviceClient()
  const { error } = await sb.from('oauth_states').insert({
    state, platform, user_id: gate.user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.redirect(authorizeUrlFor(platform as Platform, state), 302)
}
