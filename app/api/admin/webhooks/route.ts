/**
 * /api/admin/webhooks — view processed Stripe webhook events.
 *
 * Reads from public.processed_webhooks (idempotency log) so admins can
 * spot replay storms or events that errored mid-processing.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  try {
    const sb = serviceClient()
    const u  = new URL(request.url)
    const limit  = Math.min(500, Math.max(10, Number(u.searchParams.get('limit')) || 100))
    const type   = u.searchParams.get('type')
    const eventId = u.searchParams.get('event_id')
    const since  = u.searchParams.get('since')   // ISO timestamp
    let q = sb.from('processed_webhooks').select('*').order('created_at', { ascending: false }).limit(limit)
    if (type && type !== 'all') q = q.eq('type', type)
    if (eventId)                q = q.ilike('event_id', `%${eventId.replace(/[%_]/g, '')}%`)
    if (since)                  q = q.gte('created_at', since)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message, events: [] }, { status: 500 })

    // Aggregate counts per type so the UI can render quick stats.
    const counts = new Map<string, number>()
    for (const r of (data ?? []) as Array<{ type: string }>) counts.set(r.type, (counts.get(r.type) || 0) + 1)
    return NextResponse.json({
      events:  data ?? [],
      counts:  Object.fromEntries(counts),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', events: [] }, { status: 500 })
  }
}
