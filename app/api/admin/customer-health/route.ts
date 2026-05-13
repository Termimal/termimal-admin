/**
 * /api/admin/customer-health
 *
 *   GET ?band=red|yellow|green&limit=  → list snapshots
 *   POST                                → recompute all (slow; run sparingly)
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'
import { recomputeAllHealth } from '@/lib/admin/health-score'

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const band  = url.searchParams.get('band')  || ''
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '500', 10) || 500, 1), 5000)
  const sb = serviceClient()
  let q = sb.from('customer_health')
    .select('user_id, score, band, signals, reasons, updated_at, profiles!inner(email, full_name, plan, subscription_status)')
    .order('score', { ascending: true })
    .limit(limit)
  if (band) q = q.eq('band', band)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST() {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response
  const result = await recomputeAllHealth()

  await serviceClient().from('audit_logs').insert({
    user_id: gate.user.id, action: 'customer_health.recompute',
    entity_type: 'system', entity_id: 'customer_health', metadata: result,
  })
  return NextResponse.json({ ok: true, ...result })
}
