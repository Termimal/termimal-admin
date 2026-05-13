/**
 * GET /api/admin/marketing/social/connect/x
 *
 * Starts the X OAuth 2.0 PKCE flow:
 *   1. Generates code_verifier + code_challenge
 *   2. Generates a random `state`
 *   3. Persists both into oauth_states (10-min TTL)
 *   4. 302s to https://twitter.com/i/oauth2/authorize?…
 *
 * Caller must already be an authenticated admin. The session cookie
 * survives the 302 so we can verify on callback.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { authorizeUrl, randomString, pkceChallenge } from '@/lib/admin/oauth-x'

export async function GET(_request: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response

  if (!process.env.X_CLIENT_ID || !process.env.X_REDIRECT_URI) {
    return NextResponse.json({
      error: 'X is not configured. Set X_CLIENT_ID and X_REDIRECT_URI in the Worker env vars.',
    }, { status: 503 })
  }

  const state = randomString(24)
  const codeVerifier = randomString(48)
  const codeChallenge = await pkceChallenge(codeVerifier)

  const sb = serviceClient()
  const { error } = await sb.from('oauth_states').insert({
    state, platform: 'x', code_verifier: codeVerifier, user_id: gate.user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = authorizeUrl({ state, codeChallenge })
  return NextResponse.redirect(url, 302)
}
