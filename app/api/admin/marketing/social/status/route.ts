/**
 * GET /api/admin/marketing/social/status
 *
 * Returns the current connection state per platform.
 *   {
 *     x: { connected: true, handle: '@termimal', expires_at: '…', scope: '…' },
 *     linkedin: { connected: false }, …
 *   }
 *
 * Reads from the social_connections_current view (most-recent non-
 * revoked row per platform). Tokens are NEVER returned to the client.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

const PLATFORMS = ['x', 'linkedin', 'threads', 'facebook', 'instagram', 'youtube'] as const

export async function GET() {
  const gate = await requireAdmin('content.read')
  if (gate.ok === false) return gate.response

  const sb = serviceClient()
  const { data } = await sb.from('social_connections_current')
    .select('platform, handle, expires_at, scope, connected_at, last_error')

  const map: Record<string, unknown> = {}
  for (const p of PLATFORMS) map[p] = { connected: false }
  for (const r of (data ?? []) as Array<{ platform: string; handle: string | null; expires_at: string | null; scope: string | null; connected_at: string; last_error: string | null }>) {
    map[r.platform] = {
      connected:    true,
      handle:       r.handle,
      expires_at:   r.expires_at,
      scope:        r.scope,
      connected_at: r.connected_at,
      last_error:   r.last_error,
      stale:        r.expires_at ? new Date(r.expires_at) < new Date() : false,
    }
  }
  // Indicator: tell the page whether X is even configurable.
  map._config = {
    x: { configured: !!(process.env.X_CLIENT_ID && process.env.X_REDIRECT_URI) },
  }
  return NextResponse.json(map)
}
