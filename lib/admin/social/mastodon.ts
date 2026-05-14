/**
 * Mastodon adapter.
 *
 * Mastodon's API is OAuth-based, but the practical free-tier path is
 * dead simple compared to X/LinkedIn: the user goes to their
 * instance's Settings → Development → New Application, gives the
 * app a name, picks the `write:statuses` scope, clicks Create, then
 * copies the access token from the resulting page. No approval,
 * no waiting, no review queue.
 *
 * We never see the user's password and we don't run an OAuth dance.
 * The user pastes:
 *   1. The instance base URL (e.g. https://mastodon.social,
 *      https://hachyderm.io, etc.)
 *   2. The personal access token from the application's "Your access
 *      token" field.
 *
 * Endpoints used:
 *   GET    /api/v1/accounts/verify_credentials  — confirm token + get handle
 *   POST   /api/v1/statuses                     — post a toot
 *
 * Mastodon access tokens have no expiry by default; we store them
 * once and reuse. If a token is revoked the API returns 401 and we
 * mark last_error on the connection.
 *
 * Character limit: instance-configurable, default 500.
 */

export interface MastodonAccount {
  ok: true
  acct:       string    // handle without @ on the home instance, "user@other" on remote
  fqHandle:   string    // always full "@user@instance.tld" for display
  instance:   string    // canonical base URL
}

export interface MastodonResult {
  ok: true
  id:  string
  url: string
}

export interface MastodonError {
  ok: false
  error: string
}

function canonicalInstance(input: string): string {
  let url = input.trim()
  if (!/^https?:\/\//.test(url)) url = `https://${url}`
  return url.replace(/\/$/, '')
}

/**
 * Verify a pasted access token. Returns the account handle on success
 * so we can display it back to the operator and reject typos.
 */
export async function verifyMastodonToken(opts: {
  instance: string
  accessToken: string
}): Promise<MastodonAccount | MastodonError> {
  const instance = canonicalInstance(opts.instance)
  try {
    const r = await fetch(`${instance}/api/v1/accounts/verify_credentials`, {
      headers: { 'authorization': `Bearer ${opts.accessToken}` },
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return { ok: false, error: `HTTP ${r.status}${body ? ' — ' + body.slice(0, 120) : ''}` }
    }
    const j = await r.json() as { acct?: string; username?: string; error?: string }
    if (!j.acct && !j.username) return { ok: false, error: 'verify_credentials returned no handle' }
    // For home users `acct` is just the username; we add the instance
    // to produce the conventional @user@instance.tld.
    const host = new URL(instance).host
    const acct = j.acct || j.username || 'unknown'
    const fqHandle = acct.includes('@') ? `@${acct}` : `@${acct}@${host}`
    return { ok: true, acct, fqHandle, instance }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/** Post a toot (status). `visibility` defaults to 'public'. */
export async function postMastodon(opts: {
  instance:    string
  accessToken: string
  text:        string
  visibility?: 'public' | 'unlisted' | 'private' | 'direct'
}): Promise<MastodonResult | MastodonError> {
  const instance = canonicalInstance(opts.instance)
  if (opts.text.length > 500) {
    return { ok: false, error: 'over 500 chars (default Mastodon limit; some instances allow more)' }
  }
  try {
    const r = await fetch(`${instance}/api/v1/statuses`, {
      method:  'POST',
      headers: {
        'content-type':  'application/json',
        'authorization': `Bearer ${opts.accessToken}`,
      },
      body: JSON.stringify({
        status:     opts.text,
        visibility: opts.visibility || 'public',
      }),
    })
    const j = await r.json().catch(() => ({})) as { id?: string; url?: string; error?: string }
    if (!r.ok || !j.id || !j.url) {
      return { ok: false, error: j.error || `HTTP ${r.status}` }
    }
    return { ok: true, id: j.id, url: j.url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}
