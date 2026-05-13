/**
 * /api/admin/analytics-extras
 *
 *   GET ?view=retention | feature-usage | geo | channel-funnel
 *
 * Combined endpoint for the four Round-G analytics RPCs. One handler
 * keeps the file count small; the view= switch picks the right RPC.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const view = (url.searchParams.get('view') || '').trim()
  const sb = serviceClient()

  if (view === 'retention') {
    const months = Math.min(Math.max(parseInt(url.searchParams.get('months') || '6', 10) || 6, 2), 24)
    const { data, error } = await sb.rpc('admin_cohort_retention', { p_months: months })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  }
  if (view === 'feature-usage') {
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 365)
    const { data, error } = await sb.rpc('admin_feature_usage', { p_days: days })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  }
  if (view === 'geo') {
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '90', 10) || 90, 1), 365)
    const { data, error } = await sb.rpc('admin_geo_revenue', { p_days: days })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  }
  if (view === 'channel-funnel') {
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 365)
    const { data, error } = await sb.rpc('admin_funnel_by_channel', { p_days: days })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  }
  return NextResponse.json({ error: 'view required (retention|feature-usage|geo|channel-funnel)' }, { status: 400 })
}
