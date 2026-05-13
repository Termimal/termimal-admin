/**
 * POST /api/admin/marketing/social/disconnect
 *   body: { platform: 'x' }
 *
 * Best-effort revokes the token at the provider, then marks the
 * social_connections row as revoked.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { revokeToken as revokeXToken } from '@/lib/admin/oauth-x'

export async function POST(request: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as { platform?: string } | null
  if (!body?.platform) return NextResponse.json({ error: 'platform required' }, { status: 400 })

  const sb = serviceClient()
  const { data: row } = await sb.from('social_connections')
    .select('id, access_token, refresh_token, handle')
    .eq('platform', body.platform).is('revoked_at', null)
    .order('connected_at', { ascending: false }).limit(1).maybeSingle() as {
      data: { id: string; access_token: string; refresh_token: string | null; handle: string | null } | null
    }
  if (!row) return NextResponse.json({ ok: true, already: 'no active connection' })

  if (body.platform === 'x') {
    try { await revokeXToken(row.access_token) } catch { /* swallow */ }
  }

  await sb.from('social_connections').update({ revoked_at: new Date().toISOString() }).eq('id', row.id)

  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'social.disconnect',
    entity_type: 'social_connection', entity_id: row.id,
    metadata: { platform: body.platform, handle: row.handle },
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true })
}
