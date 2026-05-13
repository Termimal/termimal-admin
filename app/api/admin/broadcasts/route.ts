/**
 * /api/admin/broadcasts — segmented announcement send.
 *
 *   GET                          → list drafts + sent
 *   POST { title, body, channels, segment, scheduled_for? } → draft
 *   PATCH { id, action: 'send' }                            → send now
 *
 * Send action:
 *   - resolves segment → user_ids
 *   - inserts a notification per user (in-app)
 *   - if 'email' channel, sendAndLog per user
 *   - bumps status=sent + sent_to_count
 *
 * Segment shape: { plan?: string[], min_signup_days?: number,
 *                  status?: string[], country?: string[] }
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { sendAndLog } from '@/lib/admin/email-log'

interface Segment {
  plan?: string[]
  min_signup_days?: number
  status?: string[]
  country?: string[]
}

async function resolveSegment(seg: Segment): Promise<Array<{ id: string; email: string | null; full_name: string | null }>> {
  const sb = serviceClient()
  let q = sb.from('profiles').select('id, email, full_name').limit(50000)
  if (seg.plan?.length)    q = q.in('plan', seg.plan)
  if (seg.status?.length)  q = q.in('subscription_status', seg.status)
  if (seg.country?.length) q = q.in('country', seg.country)
  if (seg.min_signup_days != null) {
    q = q.lte('created_at', new Date(Date.now() - seg.min_signup_days * 86400000).toISOString())
  }
  const { data } = await q
  return (data ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>
}

export async function GET() {
  const gate = await requireAdmin('content.read')
  if (gate.ok === false) return gate.response
  const { data, error } = await serviceClient().from('broadcasts')
    .select('*').order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as {
    title?: string; body?: string; channels?: string[]; segment?: Segment; scheduled_for?: string
  } | null
  if (!body?.title || !body?.body) return NextResponse.json({ error: 'title + body required' }, { status: 400 })
  const { data, error } = await serviceClient().from('broadcasts').insert({
    title: body.title.trim().slice(0, 200),
    body:  body.body,
    channels: body.channels ?? ['notification'],
    segment:  body.segment ?? {},
    scheduled_for: body.scheduled_for ?? null,
    created_by: gate.user.id,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('content.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; action?: string } | null
  if (!body?.id || body.action !== 'send') return NextResponse.json({ error: "id + action='send' required" }, { status: 400 })

  const sb = serviceClient()
  const { data: bc } = await sb.from('broadcasts').select('*').eq('id', body.id).maybeSingle() as { data: {
    id: string; title: string; body: string; channels: string[]; segment: Segment; status: string;
  } | null }
  if (!bc) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (bc.status === 'sent') return NextResponse.json({ error: 'already sent' }, { status: 400 })

  await sb.from('broadcasts').update({ status: 'queued' }).eq('id', bc.id)

  const recipients = await resolveSegment(bc.segment ?? {})
  let n = 0

  // In-app notifications: one row per recipient.
  if (bc.channels.includes('notification')) {
    const rows = recipients.map(r => ({
      user_id: r.id, title: bc.title, body: bc.body, kind: 'broadcast' as const,
      meta: { broadcast_id: bc.id },
    }))
    for (let i = 0; i < rows.length; i += 500) {
      await sb.from('notifications').insert(rows.slice(i, i + 500))
    }
    n = recipients.length
  }
  // Email channel: bounded rate per minute could be added; for now sequential.
  if (bc.channels.includes('email')) {
    for (const r of recipients) {
      if (!r.email) continue
      await sendAndLog({
        to: r.email, subject: bc.title,
        text: bc.body, html: `<p>${bc.body.replace(/\n/g, '<br/>')}</p>`,
        trigger: 'broadcast', templateKey: 'broadcast',
        userId: r.id, actorId: gate.user.id,
        meta: { broadcast_id: bc.id },
      })
    }
    n = Math.max(n, recipients.filter(r => r.email).length)
  }

  await sb.from('broadcasts').update({
    status: 'sent', sent_at: new Date().toISOString(), sent_to_count: n,
  }).eq('id', bc.id)

  await sb.from('audit_logs').insert({
    user_id: gate.user.id, action: 'broadcast.send',
    entity_type: 'broadcast', entity_id: bc.id, metadata: { n },
  })

  return NextResponse.json({ ok: true, sent_to_count: n })
}
