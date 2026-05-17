/**
 * /api/admin/users/export
 *
 *   GET ?search=<text>&plan=<plan>
 *
 * Streams a CSV of every matched profile. Unlike /api/admin/users
 * which is paginated and merges in auth.users data, this one is
 * profiles-only and unbounded (up to 10k rows). Use it for finance,
 * compliance, or quick spreadsheet analysis.
 *
 * Audit-logs the export with row count + filter so we can see who
 * pulled what. Gated to users.export.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

const EXPORT_COLUMNS = [
  'id',
  'email',
  'full_name',
  'plan',
  'subscription_status',
  'billing_interval',
  'current_period_end',
  'stripe_customer_id',
  'country',
  'timezone',
  'created_at',
] as const

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Quote if it contains comma, quote, newline, or leading/trailing whitespace.
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(request: Request) {
  // export.read is a tighter permission than users.read — only
  // certain roles should be able to bulk-extract PII.
  const gate = await requireAdmin('export.read')
  if (gate.ok === false) return gate.response

  const url     = new URL(request.url)
  const search  = (url.searchParams.get('search') || '').trim()
  const plan    = (url.searchParams.get('plan') || '').trim()
  const sb      = serviceClient()

  let query = sb.from('profiles').select(EXPORT_COLUMNS.join(', '))
    .order('created_at', { ascending: false })
    .limit(10_000)

  if (plan && plan !== 'all') query = query.eq('plan', plan)
  if (search) {
    const safe = search.replace(/[%_]/g, '\\$&')
    query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%,id.eq.${safe}`)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = ((data ?? []) as unknown) as Array<Record<string, unknown>>

  // Audit-log the export. Failure to insert the audit row should not
  // block the download — the export is read-only, but we still want
  // to know about it.
  void sb.from('audit_logs').insert({
    user_id:     gate.user.id,
    action:      'users.export',
    entity_type: 'profile',
    metadata:    { search: search || null, plan: plan || null, count: rows.length },
  }).then(() => null, () => null)

  const lines: string[] = []
  lines.push(EXPORT_COLUMNS.join(','))
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map((c) => escapeCsv(row[c])).join(','))
  }
  const body = lines.join('\n') + '\n'

  const ymd = new Date().toISOString().slice(0, 10)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type':        'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="termimal-users-${ymd}.csv"`,
      'cache-control':       'no-store',
    },
  })
}
