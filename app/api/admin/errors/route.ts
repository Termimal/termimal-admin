/**
 * /api/admin/errors — list recent error_logs rows.
 *
 * Reader for the /admin/errors page. Returns the last 200 entries
 * with optional surface filter.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const surface = url.searchParams.get('surface')
  const sb = serviceClient()
  let q = sb.from('error_logs')
    .select('id, occurred_at, user_id, surface, message, stack, url, ip, user_agent, release')
    .order('occurred_at', { ascending: false })
    .limit(200)
  if (surface) q = q.eq('surface', surface)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}
