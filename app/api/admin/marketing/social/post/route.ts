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

interface Conn {
  id: string; platform: string; access_token: string; refresh_token: string | null;
  expires_at: string | null; handle: string | null
}

async function getActiveConnection(platform: string): Promise<Conn | null> {
  const sb = serviceClient()
  const { data } = await sb.from('social_connections')
    .select('id, platform, access_token, refresh_token, expires_at, handle')
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
  if (body.platform !== 'x') return NextResponse.json({ error: 'only x is wired up so far' }, { status: 400 })
  if (body.text.length > 280)  return NextResponse.json({ error: 'over 280 chars' }, { status: 400 })

  const conn = await getActiveConnection(body.platform)
  if (!conn) return NextResponse.json({ error: 'no active connection' }, { status: 400 })

  const token = await ensureFresh(conn)
  const result = await postTweet(token, body.text)

  const sb = serviceClient()
  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'social.post',
    entity_type: 'social_connection', entity_id: conn.id,
    metadata: { platform: body.platform, handle: conn.handle, len: body.text.length, ok: !('error' in result) },
  }).then(() => null, () => null)

  if ('error' in result) {
    await sb.from('social_connections').update({ last_error: result.error }).eq('id', conn.id)
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, id: result.id, handle: conn.handle })
}
