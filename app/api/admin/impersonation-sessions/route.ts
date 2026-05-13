/**
 * /api/admin/impersonation-sessions — read recorded impersonation runs.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const targetId = url.searchParams.get('target_user_id') || ''
  const sb = serviceClient()
  let q = sb.from('impersonation_sessions')
    .select('*').order('started_at', { ascending: false }).limit(200)
  if (targetId) q = q.eq('target_user_id', targetId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}
