/**
 * /api/admin/consent — append-only consent ledger viewer.
 * Read-only. Filter by user_id, category, or granted=true/false.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('audit.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const userId   = url.searchParams.get('user_id') || ''
  const category = url.searchParams.get('category') || ''
  const granted  = url.searchParams.get('granted')
  const limit    = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '500', 10) || 500, 1), 2000)

  const sb = serviceClient()
  let q = sb.from('consent_log')
    .select('id, created_at, user_id, anon_id, category, scope, granted, ip, user_agent, source')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (userId)   q = q.eq('user_id', userId)
  if (category) q = q.eq('category', category)
  if (granted === 'true')  q = q.eq('granted', true)
  if (granted === 'false') q = q.eq('granted', false)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}
