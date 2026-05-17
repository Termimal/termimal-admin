/**
 * /api/admin/email-log
 *
 *   GET  ?to=&status=&template=&limit=  →  list rows
 *
 * Read-only viewer for transactional email history. We log every send
 * we make through Resend (or any other provider in the future) to
 * `public.email_log`. Webhooks update the row with delivered / opened /
 * bounced / complained statuses if/when we wire them up.
 *
 * Filters:
 *   - `to`        — case-insensitive substring match on recipient
 *   - `status`    — exact match (queued | sent | delivered | …)
 *   - `template`  — exact template_key match
 *   - `limit`     — cap rows (default 200, max 500)
 *
 * 180-day pg_cron retention runs daily at 03:17 UTC.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const to = (url.searchParams.get('to') || '').trim().toLowerCase()
  const status = (url.searchParams.get('status') || '').trim().toLowerCase()
  const template = (url.searchParams.get('template') || '').trim()
  const since    = (url.searchParams.get('since') || '').trim()
  const limitRaw = parseInt(url.searchParams.get('limit') || '200', 10)
  const limit = Math.min(Math.max(isFinite(limitRaw) ? limitRaw : 200, 1), 500)

  const sb = serviceClient()
  let q = sb.from('email_log')
    .select('id, created_at, status_at, user_id, actor_id, trigger, template_key, from_addr, to_addr, subject, body_preview, provider, provider_id, status, error, meta')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (to)       q = q.ilike('to_addr', `%${to}%`)
  if (status)   q = q.eq('status', status)
  if (template) q = q.eq('template_key', template)
  if (since)    q = q.gte('created_at', since)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })

  // Aggregate stats over the returned window for the header card.
  const stats = { total: 0, sent: 0, failed: 0, bounced: 0, delivered: 0, opened: 0 }
  for (const r of (data ?? [])) {
    stats.total++
    const s = (r as { status?: string }).status || 'queued'
    if (s === 'sent')       stats.sent++
    if (s === 'failed')     stats.failed++
    if (s === 'bounced')    stats.bounced++
    if (s === 'delivered')  stats.delivered++
    if (s === 'opened')     stats.opened++
  }

  return NextResponse.json({ rows: data ?? [], stats })
}
