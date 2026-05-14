/**
 * POST /api/admin/marketing/social/post
 *   body: { platform: 'x', text: '…' }
 *
 * Posts the text via the active connection's access_token. If the
 * token has expired (X access tokens last 2h) and we have a
 * refresh_token, we automatically rotate before posting.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { postTweet, refreshTokens } from '@/lib/admin/oauth-x'
import { postBluesky, refreshBlueskySession } from '@/lib/admin/social/bluesky'
import { postMastodon }                       from '@/lib/admin/social/mastodon'

interface Conn {
  id: string; platform: string; access_token: string; refresh_token: string | null;
  expires_at: string | null; handle: string | null;
  meta?: { did?: string; service?: string; instance?: string } | null
}

async function getActiveConnection(platform: string): Promise<Conn | null> {
  const sb = serviceClient()
  const { data } = await sb.from('social_connections')
    .select('id, platform, access_token, refresh_token, expires_at, handle, meta')
    .eq('platform', platform).is('revoked_at', null)
    .order('connected_at', { ascending: false }).limit(1).maybeSingle() as { data: Conn | null }
  return data
}

async function ensureFresh(conn: Conn): Promise<string> {
  if (!conn.expires_at || new Date(conn.expires_at).getTime() - Date.now() > 60_000) return conn.access_token
  if (!conn.refresh_token) return conn.access_token

  if (conn.platform === 'x') {
    try {
      const fresh = await refreshTokens(conn.refresh_token)
      const sb = serviceClient()
      await sb.from('social_connections').update({
        access_token:  fresh.access_token,
        refresh_token: fresh.refresh_token ?? conn.refresh_token,
        expires_at:    new Date(Date.now() + (fresh.expires_in || 7200) * 1000).toISOString(),
        last_error:    null,
      }).eq('id', conn.id)
      return fresh.access_token
    } catch (e) {
      const sb = serviceClient()
      await sb.from('social_connections').update({
        last_error: e instanceof Error ? e.message : 'refresh failed',
      }).eq('id', conn.id)
      return conn.access_token // try anyway; let the upstream return 401
    }
  }
  return conn.access_token
}

export async function POST(request: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as { platform?: string; text?: string } | null
  if (!body?.platform || !body?.text?.trim()) return NextResponse.json({ error: 'platform + text required' }, { status: 400 })

  const platform = body.platform
  if (!['x', 'bluesky', 'mastodon'].includes(platform)) {
    return NextResponse.json({ error: `posting not wired for platform '${platform}'` }, { status: 400 })
  }

  // Per-platform character cap upfront so we don't burn an API call.
  const CHAR_LIMIT: Record<string, number> = { x: 280, bluesky: 300, mastodon: 500 }
  if (body.text.length > CHAR_LIMIT[platform]) {
    return NextResponse.json({
      error: `over ${CHAR_LIMIT[platform]} chars for ${platform}`,
    }, { status: 400 })
  }

  const conn = await getActiveConnection(platform)
  if (!conn) return NextResponse.json({ error: 'no active connection' }, { status: 400 })

  const sb = serviceClient()

  // Dispatch — each branch returns { ok, id?, error? } in a shape we
  // can audit-log uniformly.
  let result: { ok: true; id: string } | { ok: false; error: string }

  if (platform === 'x') {
    const token = await ensureFresh(conn)
    const r = await postTweet(token, body.text)
    result = 'error' in r
      ? { ok: false, error: r.error }
      : { ok: true, id: r.id }
  } else if (platform === 'bluesky') {
    const did = conn.meta?.did
    const service = conn.meta?.service
    if (!did) {
      return NextResponse.json({ error: 'bluesky connection missing did — reconnect' }, { status: 500 })
    }

    // Refresh accessJwt if it's near expiry. Bluesky's accessJwt
    // lives ~2h; refresh proactively at 5 minutes-to-expiry.
    let accessJwt = conn.access_token
    let refreshJwt = conn.refresh_token
    const needsRefresh = !conn.expires_at ||
      (new Date(conn.expires_at).getTime() - Date.now()) < 5 * 60 * 1000
    if (needsRefresh && refreshJwt) {
      const r = await refreshBlueskySession({ refreshJwt, service })
      if ('accessJwt' in r) {
        accessJwt  = r.accessJwt
        refreshJwt = r.refreshJwt
        await sb.from('social_connections').update({
          access_token:  accessJwt,
          refresh_token: refreshJwt,
          expires_at:    new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          last_error:    null,
        }).eq('id', conn.id)
      }
    }
    const r = await postBluesky({ accessJwt, did, service, text: body.text })
    result = r.ok
      ? { ok: true, id: r.uri }
      : { ok: false, error: r.error }
  } else {
    // mastodon
    const instance = conn.meta?.instance
    if (!instance) {
      return NextResponse.json({ error: 'mastodon connection missing instance — reconnect' }, { status: 500 })
    }
    const r = await postMastodon({
      instance,
      accessToken: conn.access_token,
      text:        body.text,
    })
    result = r.ok
      ? { ok: true, id: r.url }
      : { ok: false, error: r.error }
  }

  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'social.post',
    entity_type: 'social_connection', entity_id: conn.id,
    metadata: { platform, handle: conn.handle, len: body.text.length, ok: result.ok },
  }).then(() => null, () => null)

  if (!result.ok) {
    await sb.from('social_connections').update({ last_error: result.error }).eq('id', conn.id)
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, id: result.id, handle: conn.handle })
}
