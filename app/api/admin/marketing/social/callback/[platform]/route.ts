/**
 * GET /api/admin/marketing/social/callback/[platform]
 *
 * Unified OAuth callback for LinkedIn / Threads / Facebook / Instagram.
 * X has its own /callback/x because of PKCE specifics.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { PROVIDERS, exchangeCodeFor, fetchMeFor, type Platform } from '@/lib/admin/oauth-providers'

function back(error?: string) {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://bo.termimal.com'
  const url = new URL('/admin/marketing/social', base)
  if (error) url.searchParams.set('social_error', error.slice(0, 240))
  else        url.searchParams.set('social_connected', '1')
  return NextResponse.redirect(url, 302)
}

export async function GET(request: Request, ctx: { params: Promise<{ platform: string }> }) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const { platform } = await ctx.params
  if (!(platform in PROVIDERS)) return back('unknown platform')

  const url = new URL(request.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error')
  if (oauthError) return back(oauthError)
  if (!code || !state) return back('missing code or state')

  const sb = serviceClient()
  const { data: stateRow } = await sb.from('oauth_states')
    .select('platform, expires_at').eq('state', state).maybeSingle() as { data: { platform: string; expires_at: string } | null }
  if (!stateRow) return back('unknown state')
  if (stateRow.platform !== platform) return back('platform mismatch')
  if (new Date(stateRow.expires_at) < new Date()) return back('state expired')

  let tokens
  try { tokens = await exchangeCodeFor(platform as Platform, code) }
  catch (e) { return back(e instanceof Error ? e.message : 'token exchange failed') }

  const me = await fetchMeFor(platform as Platform, tokens.access_token)
  const providerUserId = me.id ?? `unknown-${Date.now()}`

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  await sb.from('social_connections').update({ revoked_at: new Date().toISOString() })
    .eq('platform', platform).eq('provider_user_id', providerUserId).is('revoked_at', null)

  const { error: insErr } = await sb.from('social_connections').insert({
    platform,
    handle:           me.handle,
    provider_user_id: providerUserId,
    access_token:     tokens.access_token,
    refresh_token:    tokens.refresh_token ?? null,
    token_type:       tokens.token_type ?? null,
    scope:            tokens.scope ?? null,
    expires_at:       expiresAt,
    connected_by:     gate.user.id,
    meta:             { raw_me: me.raw },
  })
  if (insErr) return back(insErr.message)

  await sb.from('oauth_states').delete().eq('state', state)
  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'social.connect',
    entity_type: 'social_connection', entity_id: providerUserId,
    metadata: { platform, handle: me.handle },
  }).then(() => null, () => null)

  return back()
}
