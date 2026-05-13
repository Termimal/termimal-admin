/**
 * /api/admin/sla — first-response + resolution time metrics from
 * support_tickets, bucketed by priority over a configurable window.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('support.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 365)
  const { data, error } = await serviceClient().rpc('admin_sla_metrics', { p_days: days })
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
  return NextResponse.json({ rows: data ?? [], days })
}
