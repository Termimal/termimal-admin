/**
 * /api/admin/cohorts — saved user-segment definitions + member counts.
 *
 * The cohort `definition` is a small JSONB object. Currently supported keys:
 *   plan         — array of plan strings to include
 *   country      — array of country codes
 *   created_after, created_before — ISO timestamps
 *   role         — array (e.g. ['admin'])
 *   has_stripe   — boolean (only profiles with stripe_customer_id)
 *
 *   GET   /api/admin/cohorts                       — list all
 *   GET   /api/admin/cohorts?id=…&preview=true     — count members for a saved cohort
 *   POST  /api/admin/cohorts                        — create
 *   PATCH /api/admin/cohorts                        — { id, patch }
 *   DELETE /api/admin/cohorts?id=…
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'
import { requireAdmin } from '@/lib/admin/require-admin'

interface Definition {
  plan?: string[]
  country?: string[]
  role?: string[]
  created_after?: string
  created_before?: string
  has_stripe?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countCohortMembers(sb: any, def: Definition): Promise<number> {
  let q = sb.from('profiles').select('id', { count: 'exact', head: true })
  if (def.plan && def.plan.length > 0)        q = q.in('plan', def.plan)
  if (def.country && def.country.length > 0)  q = q.in('country', def.country)
  if (def.role && def.role.length > 0)        q = q.in('role', def.role)
  if (def.created_after)                      q = q.gte('created_at', def.created_after)
  if (def.created_before)                     q = q.lte('created_at', def.created_before)
  if (def.has_stripe === true)                q = q.not('stripe_customer_id', 'is', null)
  if (def.has_stripe === false)               q = q.is('stripe_customer_id', null)
  const { count } = await q
  return count ?? 0
}

export async function GET(request: Request) {
  const gate = await requireAdmin('cohorts.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const u  = new URL(request.url)
    const id = u.searchParams.get('id')
    const preview = u.searchParams.get('preview') === 'true'

    if (id && preview) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row } = await (sb as any).from('cohorts').select('*').eq('id', id).single()
      if (!row) return NextResponse.json({ error: 'cohort not found' }, { status: 404 })
      const count = await countCohortMembers(sb, row.definition as Definition)
      // Update cache.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('cohorts').update({ member_count_cached: count, cached_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ count })
    }

    const { data, error } = await sb.from('cohorts').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    return NextResponse.json({ rows: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  const gate = await requireAdmin('cohorts.write')
  if (gate.ok === false) return gate.response
  try {
    const sb   = serviceClient()
    const body = await request.json().catch(() => null) as { name?: string; description?: string; definition?: Definition } | null
    if (!body?.name || !body.definition) return NextResponse.json({ error: 'name and definition required' }, { status: 400 })
    const count = await countCohortMembers(sb, body.definition)
    const { data, error } = await sb.from('cohorts').insert({
      name:        body.name,
      description: body.description ?? null,
      definition:  body.definition,
      member_count_cached: count,
      cached_at:   new Date().toISOString(),
    }).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin('cohorts.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { id?: string; patch?: Record<string, unknown> } | null
    if (!body?.id || !body.patch) return NextResponse.json({ error: 'missing id or patch' }, { status: 400 })
    const update: Record<string, unknown> = {}
    for (const k of ['name', 'description', 'definition'] as const) if (k in body.patch) update[k] = body.patch[k]
    if ('definition' in update) {
      const count = await countCohortMembers(sb, update.definition as Definition)
      update.member_count_cached = count
      update.cached_at = new Date().toISOString()
    }
    const { data, error } = await sb.from('cohorts').update(update).eq('id', body.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin('cohorts.write')
  if (gate.ok === false) return gate.response
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('cohorts').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
