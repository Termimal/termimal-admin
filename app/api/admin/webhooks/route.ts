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
    const limit = Math.min(500, Math.max(10, Number(u.searchParams.get('limit')) || 100))
    const type  = u.searchParams.get('type')
    let q = sb.from('processed_webhooks').select('*').order('created_at', { ascending: false }).limit(limit)
    if (type && type !== 'all') q = q.eq('type', type)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message, events: [] }, { status: 500 })
    return NextResponse.json({ events: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown', events: [] }, { status: 500 })
  }
}
