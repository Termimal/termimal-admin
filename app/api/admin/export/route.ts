/**
 * /api/admin/export — CSV download for any whitelisted dataset.
 *
 *   GET  /api/admin/export?type=users|invoices|payments|tickets&since=ISO
 *
 * Streams a CSV response with Content-Disposition for the browser to
 * save. We escape every value with the standard CSV rules
 * ("…" + double inner quotes).
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { requireAdmin } from '@/lib/admin/require-admin'

const SCHEMAS: Record<string, { table: string; columns: string[]; order: string }> = {
  users:    { table: 'profiles',         columns: ['id','email','full_name','plan','subscription_status','country','referral_code','created_at'], order: 'created_at' },
  invoices: { table: 'invoices',         columns: ['id','user_id','stripe_invoice_id','amount','currency','status','period_start','period_end','created_at'], order: 'created_at' },
  payments: { table: 'payments',         columns: ['id','user_id','provider','external_id','amount','currency','status','reason','created_at'], order: 'created_at' },
  tickets:  { table: 'support_tickets',  columns: ['id','user_id','subject','status','priority','assigned_to','created_at','updated_at'], order: 'created_at' },
}

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v))
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: Request) {
  const gate = await requireAdmin('export.read')
  if (gate.ok === false) return gate.response
  try {
    const u    = new URL(request.url)
    const type = u.searchParams.get('type') || ''
    const schema = SCHEMAS[type]
    if (!schema) return NextResponse.json({ error: `unknown type — allowed: ${Object.keys(SCHEMAS).join(', ')}` }, { status: 400 })
    const since = u.searchParams.get('since')

    const sb = serviceClient()
    let q = sb.from(schema.table).select(schema.columns.join(',')).order(schema.order, { ascending: false }).limit(10_000)
    if (since) q = q.gte(schema.order, since)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const header = schema.columns.join(',')
    const lines  = (data ?? []).map(row => schema.columns.map(c => csvEscape((row as unknown as Record<string, unknown>)[c])).join(','))
    const csv    = [header, ...lines].join('\n')

    const filename = `termimal-${type}-${new Date().toISOString().slice(0, 10)}.csv`
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
