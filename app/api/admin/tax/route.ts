/**
 * /api/admin/tax — tax registrations + quarterly summary.
 *
 *   GET                               → registrations + revenue-by-country
 *   POST { country, region?, ... }    → add registration
 *   PATCH { id, patch }               → edit
 *   DELETE ?id=                       → remove
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET() {
  const gate = await requireAdmin('finance.read')
  if (gate.ok === false) return gate.response
  const sb = serviceClient()
  const [regs, revByCountry] = await Promise.all([
    sb.from('tax_registrations').select('*').order('country'),
    // Revenue by country, last 90 days, joined via profiles.
    sb.from('invoices')
      .select('amount, currency, period_end, user_id, profiles!inner(country)')
      .gte('period_end', new Date(Date.now() - 90*24*3600*1000).toISOString())
      .limit(5000),
  ])
  return NextResponse.json({
    registrations: regs.data ?? [],
    revenue:       revByCountry.data ?? [],
  })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('finance.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body?.country) return NextResponse.json({ error: 'country required' }, { status: 400 })
  const { data, error } = await serviceClient().from('tax_registrations').insert(body).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('finance.write')
  if (gate.ok === false) return gate.response
  const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
  if (!body?.id || !body.patch) return NextResponse.json({ error: 'id + patch required' }, { status: 400 })
  const { error } = await serviceClient().from('tax_registrations').update(body.patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('finance.write')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await serviceClient().from('tax_registrations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
