/**
 * OAuth provider registry for Social Studio.
 *
 * Each platform's OAuth 2.0 spec is similar enough that we can express
 * them as a config: auth URL, token URL, "me" URL, default scopes.
 * The connect + callback routes use this registry to handle all four
 * non-X platforms with a single code path.
 *
 * X has its own oauth-x.ts because Twitter's API has a few unique
 * quirks (PKCE strictly required for confidential clients, /2/users/me
 * shape, /2/tweets posting endpoint).
 *
 * Env vars per platform follow the pattern:
 *   <PLATFORM>_CLIENT_ID
 *   <PLATFORM>_CLIENT_SECRET
 *   <PLATFORM>_REDIRECT_URI
 *
 * For example LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI.
 */

export type Platform = 'linkedin' | 'threads' | 'facebook' | 'instagram'

export interface ProviderSpec {
  /** Authorization endpoint. */
  authUrl:       string
  /** Token-exchange endpoint. */
  tokenUrl:      string
  /** GET endpoint returning the auth'd user — must return id at minimum. */
  meUrl:         string
  /** Space-delimited scopes we request. */
  scopes:        string[]
  /** "id" extraction from /me payload. */
  extractId:     (j: unknown) => string | null
  /** "handle" extraction — falls back to id if undefined. */
  extractHandle: (j: unknown) => string | null
  /** Authorization header for token POST. 'basic' uses HTTP Basic; null sends client_id/secret in body. */
  tokenAuth:     'basic' | 'body'
}

export const PROVIDERS: Record<Platform, ProviderSpec> = {
  linkedin: {
    authUrl:  'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    meUrl:    'https://api.linkedin.com/v2/userinfo',
    scopes:   ['openid', 'profile', 'email', 'w_member_social'],
    extractId:     (j) => (j as { sub?: string })?.sub ?? null,
    extractHandle: (j) => (j as { email?: string; name?: string })?.email ?? (j as { name?: string })?.name ?? null,
    tokenAuth: 'body',
  },
  facebook: {
    // Meta Graph API. Facebook posting uses the same OAuth flow as the
    // Pages product. Configure the app at developers.facebook.com.
    authUrl:  'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    meUrl:    'https://graph.facebook.com/v19.0/me?fields=id,name,email',
    scopes:   ['pages_manage_posts', 'pages_read_engagement', 'public_profile'],
    extractId:     (j) => (j as { id?: string })?.id ?? null,
    extractHandle: (j) => (j as { name?: string })?.name ?? null,
    tokenAuth: 'body',
  },
  instagram: {
    // Instagram Graph API goes through Facebook Login + an
    // ig_business_account on the connected Page. Same auth dialog,
    // different scopes.
    authUrl:  'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    meUrl:    'https://graph.facebook.com/v19.0/me?fields=id,name',
    scopes:   ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    extractId:     (j) => (j as { id?: string })?.id ?? null,
    extractHandle: (j) => (j as { name?: string })?.name ?? null,
    tokenAuth: 'body',
  },
  threads: {
    // Threads API (Meta product) — OAuth-like endpoints under graph.threads.net.
    authUrl:  'https://threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
    meUrl:    'https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url',
    scopes:   ['threads_basic', 'threads_content_publish'],
    extractId:     (j) => (j as { id?: string })?.id ?? null,
    extractHandle: (j) => {
      const u = (j as { username?: string })?.username
      return u ? `@${u}` : null
    },
    tokenAuth: 'body',
  },
}

export function envForPlatform(p: Platform): { clientId?: string; clientSecret?: string; redirectUri?: string } {
  const upper = p.toUpperCase()
  return {
    clientId:     process.env[`${upper}_CLIENT_ID`]     as string | undefined,
    clientSecret: process.env[`${upper}_CLIENT_SECRET`] as string | undefined,
    redirectUri:  process.env[`${upper}_REDIRECT_URI`]  as string | undefined,
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomState(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return base64UrlEncode(arr)
}

export function authorizeUrlFor(p: Platform, state: string): string {
  const spec = PROVIDERS[p]
  const env  = envForPlatform(p)
  if (!env.clientId || !env.redirectUri) throw new Error(`${p.toUpperCase()}_CLIENT_ID + _REDIRECT_URI must be set`)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     env.clientId,
    redirect_uri:  env.redirectUri,
    scope:         spec.scopes.join(' '),
    state,
  })
  return `${spec.authUrl}?${params.toString()}`
}

export interface ExchangeResult {
  access_token:  string
  refresh_token?: string
  expires_in?:   number
  token_type?:   string
  scope?:        string
}

export async function exchangeCodeFor(p: Platform, code: string): Promise<ExchangeResult> {
  const spec = PROVIDERS[p]
  const env  = envForPlatform(p)
  if (!env.clientId || !env.redirectUri) throw new Error('platform not configured')
  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: env.redirectUri,
  })
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (spec.tokenAuth === 'basic') {
    headers.Authorization = `Basic ${btoa(`${env.clientId}:${env.clientSecret ?? ''}`)}`
  } else {
    body.set('client_id',     env.clientId)
    if (env.clientSecret) body.set('client_secret', env.clientSecret)
  }
  const res = await fetch(spec.tokenUrl, { method: 'POST', headers, body: body.toString() })
  const j = await res.json().catch(() => ({})) as ExchangeResult & { error?: string; error_description?: string }
  if (!res.ok) throw new Error(j.error_description || j.error || `${p} token exchange HTTP ${res.status}`)
  return j
}

export async function fetchMeFor(p: Platform, accessToken: string): Promise<{ id: string | null; handle: string | null; raw: unknown }> {
  const spec = PROVIDERS[p]
  const res = await fetch(spec.meUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return { id: null, handle: null, raw: null }
  const j = await res.json().catch(() => null)
  return { id: spec.extractId(j), handle: spec.extractHandle(j), raw: j }
}
