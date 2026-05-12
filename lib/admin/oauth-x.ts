/**
 * X (Twitter) OAuth 2.0 with PKCE — minimal helpers.
 *
 * Reference: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
 *
 * Flow:
 *   1. Admin clicks "Connect X" → GET /api/admin/marketing/social/connect/x
 *      We generate `code_verifier` + `code_challenge` (S256) and a
 *      random `state`, persist both into oauth_states, and 302 to
 *      https://twitter.com/i/oauth2/authorize?... .
 *   2. User authorises on X. X 302s back to our redirect_uri with
 *      `?code=…&state=…`.
 *   3. Callback verifies state, looks up code_verifier, exchanges code
 *      + verifier for { access_token, refresh_token } at
 *      https://api.twitter.com/2/oauth2/token .
 *   4. Persist tokens into social_connections, mark old rows revoked.
 *
 * Env vars required:
 *   X_CLIENT_ID            — from developer.x.com → Project → App → OAuth 2.0 settings
 *   X_CLIENT_SECRET        — same place; only needed for confidential clients
 *   X_REDIRECT_URI         — must EXACTLY match what's whitelisted in the X app
 *                            settings; typically https://bo.termimal.com/api/admin/marketing/social/callback/x
 *
 * Scopes we request: `tweet.read tweet.write users.read offline.access`
 *   - `tweet.read` to fetch our own metrics
 *   - `tweet.write` to post tweets + replies
 *   - `users.read` to know our own handle
 *   - `offline.access` so we get a refresh_token (X access tokens expire in 2h)
 */

const X_AUTH_BASE  = 'https://twitter.com/i/oauth2/authorize'
const X_TOKEN_URL  = 'https://api.twitter.com/2/oauth2/token'
const X_REVOKE_URL = 'https://api.twitter.com/2/oauth2/revoke'
const X_USERS_ME   = 'https://api.twitter.com/2/users/me'

export const X_DEFAULT_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access']

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return base64UrlEncode(arr)
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const enc = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return base64UrlEncode(new Uint8Array(digest))
}

export function authorizeUrl(args: {
  state: string
  codeChallenge: string
  scopes?: string[]
  redirectUri?: string
}): string {
  const clientId    = process.env.X_CLIENT_ID
  const redirectUri = args.redirectUri || process.env.X_REDIRECT_URI || ''
  if (!clientId)    throw new Error('X_CLIENT_ID is not set')
  if (!redirectUri) throw new Error('X_REDIRECT_URI is not set')

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             clientId,
    redirect_uri:          redirectUri,
    scope:                 (args.scopes ?? X_DEFAULT_SCOPES).join(' '),
    state:                 args.state,
    code_challenge:        args.codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${X_AUTH_BASE}?${params.toString()}`
}

interface TokenResponse {
  token_type:    string
  expires_in:    number
  access_token:  string
  refresh_token?: string
  scope:         string
}

/** Exchange the auth `code` + PKCE verifier for tokens. */
export async function exchangeCode(args: {
  code: string; codeVerifier: string; redirectUri?: string
}): Promise<TokenResponse> {
  const clientId     = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  const redirectUri  = args.redirectUri || process.env.X_REDIRECT_URI || ''
  if (!clientId) throw new Error('X_CLIENT_ID is not set')

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code:          args.code,
    redirect_uri:  redirectUri,
    code_verifier: args.codeVerifier,
    client_id:     clientId,
  })

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  // Confidential clients (apps with a secret) use HTTP Basic auth.
  if (clientSecret) headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`

  const res = await fetch(X_TOKEN_URL, { method: 'POST', headers, body: body.toString() })
  const j = await res.json().catch(() => ({})) as TokenResponse & { error?: string; error_description?: string }
  if (!res.ok) throw new Error(j.error_description || j.error || `X token exchange HTTP ${res.status}`)
  return j
}

/** Refresh a long-lived session using the refresh_token. */
export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const clientId     = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId) throw new Error('X_CLIENT_ID is not set')

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     clientId,
  })
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (clientSecret) headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`

  const res = await fetch(X_TOKEN_URL, { method: 'POST', headers, body: body.toString() })
  const j = await res.json().catch(() => ({})) as TokenResponse & { error?: string; error_description?: string }
  if (!res.ok) throw new Error(j.error_description || j.error || `X refresh HTTP ${res.status}`)
  return j
}

/** Best-effort token revoke on the X side. */
export async function revokeToken(token: string): Promise<void> {
  const clientId     = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId) return
  const body = new URLSearchParams({ token, token_type_hint: 'access_token', client_id: clientId })
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (clientSecret) headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`
  await fetch(X_REVOKE_URL, { method: 'POST', headers, body: body.toString() }).catch(() => null)
}

/** Fetch the authorised user's profile (id, handle, name). */
export async function fetchMe(accessToken: string): Promise<{ id: string; username: string; name: string } | null> {
  const res = await fetch(X_USERS_ME, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return null
  const j = await res.json().catch(() => null) as { data?: { id: string; username: string; name: string } } | null
  return j?.data ?? null
}

/** Post a Tweet on behalf of the user. */
export async function postTweet(accessToken: string, text: string): Promise<{ id: string } | { error: string }> {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ text }),
  })
  const j = await res.json().catch(() => ({})) as { data?: { id: string }; detail?: string; title?: string }
  if (!res.ok || !j.data?.id) return { error: j.detail || j.title || `HTTP ${res.status}` }
  return { id: j.data.id }
}
