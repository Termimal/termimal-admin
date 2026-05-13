/**
 * /api/admin/plan-changes
 *
 *   GET                  →  { summary: monthly aggregates, recent: latest 100 rows }
 *   GET ?summary=1       →  summary only
 *   GET ?recent=1        →  recent list only (with optional ?limit=)
 *
 * Reads from `public.plan_changes` (written by Stripe webhooks + admin
 * actions) and `public.admin_plan_change_summary(months)` for the
 * monthly roll-up.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const onlySummary = url.searchParams.get('summary') === '1'
  const onlyRecent  = url.searchParams.get('recent') === '1'
  const months = Math.min(Math.max(parseInt(url.searchParams.get('months') || '12', 10) || 12, 1), 36)
  const limit  = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 500)

  const sb = serviceClient()

  let summary: unknown[] = []
  let recent: unknown[] = []

  if (!onlyRecent) {
    const { data, error } = await sb.rpc('admin_plan_change_summary', { p_months: months })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    summary = data ?? []
  }
  if (!onlySummary) {
    const { data, error } = await sb.from('plan_changes')
      .select('id, created_at, user_id, actor_id, from_plan, to_plan, from_status, to_status, from_interval, to_interval, mrr_delta_cents, reason, source, meta')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    recent = data ?? []
  }

  return NextResponse.json({ summary, recent })
}
