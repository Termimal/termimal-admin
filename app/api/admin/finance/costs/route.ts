/**
 * /api/admin/finance/costs — CRUD for the infrastructure_costs ledger.
 *
 *   GET    /api/admin/finance/costs?period=YYYY-MM
 *   POST   /api/admin/finance/costs   { category, provider, period, amount_usd, notes? }
 *   PATCH  /api/admin/finance/costs   { id, patch }
 *   DELETE /api/admin/finance/costs?id=…
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { createClient as createSsrClient } from '@/lib/supabase/server'

const ALLOWED = ['category', 'provider', 'period', 'amount_usd', 'notes'] as const

export async function GET(request: Request) {
  try {
    const sb = serviceClient()
    const period = new URL(request.url).searchParams.get('period')
    let q = sb.from('infrastructure_costs').select('*').order('period', { ascending: false }).order('category', { ascending: true })
    if (period) q = q.eq('period', period)
    const { data, error } = await q.limit(500)
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const cookieSb = await createSsrClient()
    const { data: { user } } = await cookieSb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sb   = serviceClient()
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body?.category || !body.provider || !body.period || body.amount_usd == null) {
      return NextResponse.json({ error: 'category, provider, period, amount_usd required' }, { status: 400 })
    }
    const insert: Record<string, unknown> = {
      category:   body.category,
      provider:   String(body.provider).slice(0, 100),
      period:     String(body.period).slice(0, 7),
      amount_usd: Number(body.amount_usd),
      notes:      body.notes ?? null,
      created_by: user.id,
    }
    const { data, error } = await sb.from('infrastructure_costs')
      .upsert(insert, { onConflict: 'category,provider,period' })
      .select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ALLOWED) if (k in body.patch) update[k] = body.patch[k]
    const { data, error } = await sb.from('infrastructure_costs').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('infrastructure_costs').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
