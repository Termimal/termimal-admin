/**
 * Bluesky (AT Protocol) adapter.
 *
 * Bluesky's posting API uses app-password authentication — no OAuth
 * dance, no developer app approval, no rate-limit pre-approval. The
 * user generates an app password at bsky.app → Settings → App
 * Passwords, hands it to us, we exchange it for a short-lived
 * session JWT, store the session + refresh JWT, and post.
 *
 * Endpoints (all unauthenticated except where noted):
 *   POST /xrpc/com.atproto.server.createSession           — exchange app password for tokens
 *   POST /xrpc/com.atproto.server.refreshSession          — refresh expired session (refreshJwt auth)
 *   POST /xrpc/com.atproto.repo.createRecord              — post (accessJwt auth)
 *   POST /xrpc/com.atproto.server.deleteSession           — sign-out
 *
 * Service: by convention `https://bsky.social`. Users on custom PDS
 * instances can override via the meta.service field; default works
 * for 99% of users.
 *
 * Session JWTs expire after ~2 hours. We refresh on-demand at post
 * time using the long-lived refresh JWT.
 */

const DEFAULT_SERVICE = 'https://bsky.social'

export interface BlueskySession {
  ok: true
  accessJwt: string
  refreshJwt: string
  did: string
  handle: string
  /** PDS service URL used for this session (default bsky.social). */
  service: string
}

export interface BlueskyResult {
  ok: true
  uri: string
  cid: string
}

export interface BlueskyError {
  ok: false
  error: string
}

/**
 * Exchange a handle + app password for a session. Called once at
 * connect time. Subsequent posts use refreshSession() to keep the
 * accessJwt fresh.
 */
export async function createBlueskySession(opts: {
  identifier: string
  password: string
  service?: string
}): Promise<BlueskySession | BlueskyError> {
  const service = opts.service?.replace(/\/$/, '') || DEFAULT_SERVICE
  try {
    const r = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ identifier: opts.identifier, password: opts.password }),
    })
    const j = await r.json().catch(() => ({})) as {
      accessJwt?: string; refreshJwt?: string; did?: string; handle?: string;
      message?: string; error?: string;
    }
    if (!r.ok || !j.accessJwt || !j.refreshJwt || !j.did) {
      return { ok: false, error: j.message || j.error || `HTTP ${r.status}` }
    }
    return {
      ok:         true,
      accessJwt:  j.accessJwt,
      refreshJwt: j.refreshJwt,
      did:        j.did,
      handle:     j.handle || opts.identifier,
      service,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/** Refresh an expired accessJwt using the long-lived refreshJwt. */
export async function refreshBlueskySession(opts: {
  refreshJwt: string
  service?: string
}): Promise<{ accessJwt: string; refreshJwt: string } | BlueskyError> {
  const service = opts.service?.replace(/\/$/, '') || DEFAULT_SERVICE
  try {
    const r = await fetch(`${service}/xrpc/com.atproto.server.refreshSession`, {
      method:  'POST',
      headers: { 'authorization': `Bearer ${opts.refreshJwt}` },
    })
    const j = await r.json().catch(() => ({})) as {
      accessJwt?: string; refreshJwt?: string; message?: string; error?: string;
    }
    if (!r.ok || !j.accessJwt || !j.refreshJwt) {
      return { ok: false, error: j.message || j.error || `HTTP ${r.status}` }
    }
    return { accessJwt: j.accessJwt, refreshJwt: j.refreshJwt }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/**
 * Post a text record. Bluesky's character limit is 300 graphemes; we
 * use a conservative 300-character cap and let the server reject
 * anything that exceeds the grapheme count.
 */
export async function postBluesky(opts: {
  accessJwt: string
  did: string
  text: string
  service?: string
}): Promise<BlueskyResult | BlueskyError> {
  const service = opts.service?.replace(/\/$/, '') || DEFAULT_SERVICE
  if (opts.text.length > 300) {
    return { ok: false, error: 'over 300 chars' }
  }
  try {
    const r = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
      method:  'POST',
      headers: {
        'content-type':   'application/json',
        'authorization':  `Bearer ${opts.accessJwt}`,
      },
      body: JSON.stringify({
        repo:       opts.did,
        collection: 'app.bsky.feed.post',
        record: {
          $type:     'app.bsky.feed.post',
          text:      opts.text,
          createdAt: new Date().toISOString(),
        },
      }),
    })
    const j = await r.json().catch(() => ({})) as { uri?: string; cid?: string; message?: string; error?: string }
    if (!r.ok || !j.uri || !j.cid) {
      return { ok: false, error: j.message || j.error || `HTTP ${r.status}` }
    }
    return { ok: true, uri: j.uri, cid: j.cid }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}
