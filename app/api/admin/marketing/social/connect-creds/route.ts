/**
 * POST /api/admin/marketing/social/connect-creds
 *
 * Credential-based connect path for platforms that don't use OAuth
 * (Bluesky, Mastodon). The existing OAuth flow at
 * /api/admin/marketing/social/connect/[platform] stays untouched.
 *
 * Body shapes:
 *   Bluesky:
 *     { platform: 'bluesky', identifier: '<handle>', password: '<app-password>', service?: '<custom-pds>' }
 *
 *   Mastodon:
 *     { platform: 'mastodon', instance: 'https://mastodon.social', accessToken: '<token>' }
 *
 * Stores the resulting session/token in public.social_connections.
 * Bluesky stores accessJwt → access_token, refreshJwt → refresh_token,
 * did → meta.did, service → meta.service.
 * Mastodon stores access_token → access_token, instance → meta.instance.
 *
 * The post endpoint dispatches on `platform` and uses these fields to
 * post via the matching adapter.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { createBlueskySession } from '@/lib/admin/social/bluesky'
import { verifyMastodonToken }  from '@/lib/admin/social/mastodon'

type Body =
  | { platform: 'bluesky';  identifier: string; password:    string; service?: string }
  | { platform: 'mastodon'; instance:   string; accessToken: string }

export async function POST(request: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as Body | null
  if (!body?.platform) return NextResponse.json({ error: 'platform required' }, { status: 400 })

  const sb = serviceClient()
  const now = new Date().toISOString()

  if (body.platform === 'bluesky') {
    if (!body.identifier || !body.password) {
      return NextResponse.json({ error: 'identifier + password required' }, { status: 400 })
    }
    const session = await createBlueskySession({
      identifier: body.identifier,
      password:   body.password,
      service:    body.service,
    })
    if (session.ok === false) {
      return NextResponse.json({ error: session.error }, { status: 401 })
    }

    // Revoke any prior bluesky connection for tidiness (admins
    // typically only want one active per platform).
    await sb.from('social_connections')
      .update({ revoked_at: now })
      .eq('platform', 'bluesky')
      .is('revoked_at', null)

    const { data, error } = await sb.from('social_connections').insert({
      platform:         'bluesky',
      handle:           `@${session.handle}`,
      provider_user_id: session.did,
      access_token:     session.accessJwt,
      refresh_token:    session.refreshJwt,
      token_type:       'Bearer',
      scope:            'write:posts',
      // Bluesky access tokens last ~2h. Set expires_at conservatively
      // so the post endpoint refreshes before any 401s.
      expires_at:       new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      connected_by:     gate.user.id,
      connected_at:     now,
      meta: { did: session.did, service: session.service },
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id, handle: `@${session.handle}` })
  }

  if (body.platform === 'mastodon') {
    if (!body.instance || !body.accessToken) {
      return NextResponse.json({ error: 'instance + accessToken required' }, { status: 400 })
    }
    const account = await verifyMastodonToken({
      instance:    body.instance,
      accessToken: body.accessToken,
    })
    if (account.ok === false) {
      return NextResponse.json({ error: account.error }, { status: 401 })
    }

    await sb.from('social_connections')
      .update({ revoked_at: now })
      .eq('platform', 'mastodon')
      .is('revoked_at', null)

    const { data, error } = await sb.from('social_connections').insert({
      platform:         'mastodon',
      handle:           account.fqHandle,
      provider_user_id: account.acct,
      access_token:     body.accessToken,
      refresh_token:    null,
      token_type:       'Bearer',
      scope:            'write:statuses',
      // Mastodon tokens have no expiry by default; we still set a
      // reasonable refresh hint at 1y so the UI doesn't flag it stale.
      expires_at:       new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
      connected_by:     gate.user.id,
      connected_at:     now,
      meta: { instance: account.instance },
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id, handle: account.fqHandle })
  }

  return NextResponse.json({ error: 'unsupported platform' }, { status: 400 })
}
