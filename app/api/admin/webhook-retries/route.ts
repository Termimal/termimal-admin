/**
 * /api/admin/webhook-retries — view + retry failed inbound webhooks.
 *
 *   GET                              → list queued/dead
 *   POST { id, action: 'retry' | 'mark_dead' }
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('system.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || ''
  const sb = serviceClient()
  let q = sb.from('webhook_retries').select('*').order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('system.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; action?: string } | null
  if (!body?.id || !body.action) return NextResponse.json({ error: 'id + action required' }, { status: 400 })

  const sb = serviceClient()
  if (body.action === 'mark_dead') {
    await sb.from('webhook_retries').update({ status: 'dead' }).eq('id', body.id)
    await sb.from('audit_logs').insert({
      user_id: gate.user.id, action: 'webhook_retry.dead',
      entity_type: 'webhook_retry', entity_id: body.id, metadata: {},
    })
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'retry') {
    // Look up the row and POST back to /api/stripe/webhook (or wherever
    // source dictates). For Stripe we just bump next_retry_at; the
    // production Stripe webhook itself is idempotent, so re-sending the
    // raw payload to it would work. We mark as processing here; a
    // separate cron + worker would actually re-issue.
    await sb.from('webhook_retries').update({
      status: 'queued',
      next_retry_at: new Date().toISOString(),
      attempt_count: 0,
    }).eq('id', body.id)
    await sb.from('audit_logs').insert({
      user_id: gate.user.id, action: 'webhook_retry.requeue',
      entity_type: 'webhook_retry', entity_id: body.id, metadata: {},
    })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
