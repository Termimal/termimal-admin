/**
 * GET /api/admin/marketing/social/callback/x?code=…&state=…
 *
 * Completes the OAuth flow:
 *   1. Verifies state against oauth_states; rejects unknown/expired
 *   2. Looks up the matching code_verifier
 *   3. Exchanges code → tokens at X
 *   4. Fetches /2/users/me so we know the handle
 *   5. Soft-revokes prior X connections for this account
 *   6. Inserts new social_connections row
 *   7. Audit-logs and redirects back to /admin/marketing/social
 *
 * Any error in the chain redirects back with ?x_error=<msg> so the
 * page can show a useful banner.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { exchangeCode, fetchMe } from '@/lib/admin/oauth-x'

function back(error?: string) {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://bo.termimal.com'
  const url = new URL('/admin/marketing/social', base)
  if (error) url.searchParams.set('x_error', error.slice(0, 240))
  else url.searchParams.set('x_connected', '1')
  return NextResponse.redirect(url, 302)
}

export async function GET(request: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error')
  if (oauthError) return back(oauthError)
  if (!code || !state) return back('missing code or state')

  const sb = serviceClient()

  // 1) Look up the state row.
  const { data: stateRow } = await sb.from('oauth_states')
    .select('platform, code_verifier, expires_at, user_id')
    .eq('state', state).maybeSingle() as { data: { platform: string; code_verifier: string; expires_at: string; user_id: string } | null }
  if (!stateRow) return back('unknown state')
  if (stateRow.platform !== 'x') return back('platform mismatch')
  if (new Date(stateRow.expires_at) < new Date()) return back('state expired (>10 min)')

  // 2) Exchange code → tokens.
  let tokens: { access_token: string; refresh_token?: string; token_type: string; expires_in: number; scope: string }
  try {
    tokens = await exchangeCode({ code, codeVerifier: stateRow.code_verifier })
  } catch (e) {
    return back(e instanceof Error ? e.message : 'token exchange failed')
  }

  // 3) Resolve the user's handle.
  const me = await fetchMe(tokens.access_token)
  if (!me) return back('could not fetch /2/users/me')

  const expiresAt = new Date(Date.now() + (tokens.expires_in || 7200) * 1000).toISOString()

  // 4) Soft-revoke any prior X connection for the same provider_user_id.
  await sb.from('social_connections').update({ revoked_at: new Date().toISOString() })
    .eq('platform', 'x').eq('provider_user_id', me.id).is('revoked_at', null)

  // 5) Insert new row.
  const { error: insErr } = await sb.from('social_connections').insert({
    platform:         'x',
    handle:           `@${me.username}`,
    provider_user_id: me.id,
    access_token:     tokens.access_token,
    refresh_token:    tokens.refresh_token ?? null,
    token_type:       tokens.token_type,
    scope:            tokens.scope,
    expires_at:       expiresAt,
    connected_by:     gate.user.id,
    meta:             { name: me.name },
  })
  if (insErr) return back(insErr.message)

  // 6) Consume the state row.
  await sb.from('oauth_states').delete().eq('state', state)

  // 7) Audit.
  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'social.connect',
    entity_type: 'social_connection', entity_id: me.id,
    metadata: { platform: 'x', handle: `@${me.username}`, name: me.name, scope: tokens.scope },
  }).then(() => null, () => null)

  return back()
}
