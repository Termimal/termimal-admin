/**
 * /api/admin/feedback — list + triage user-submitted feedback.
 *
 *   GET ?status=new|reviewing|answered|closed|all  → list rows
 *   PATCH { id, status?, admin_notes? }            → update triage
 *
 * Reads from public.feedback_submissions (the table populated by
 * /api/feedback on the public site). The legacy generic-table
 * fallback that used to live in this route was replaced when we
 * built the new feedback widget end-to-end.
 *
 * Permission: support.read for GET, support.write for PATCH.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('support.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const sb = serviceClient()
  let q = sb.from('feedback_submissions')
    .select('id, user_id, category, body, url, user_agent, status, admin_notes, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (status && status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })

  // Hydrate user_id → email/full_name so the inbox shows who sent
  // each one without a per-row drilldown.
  const ids = Array.from(new Set((data || []).map(r => r.user_id).filter(Boolean) as string[]))
  let profMap: Record<string, { email: string | null; full_name: string | null }> = {}
  if (ids.length > 0) {
    const { data: profs } = await sb.from('profiles').select('id, email, full_name').in('id', ids)
    profMap = Object.fromEntries(
      ((profs || []) as Array<{ id: string; email: string | null; full_name: string | null }>)
        .map(p => [p.id, { email: p.email, full_name: p.full_name }]),
    )
  }

  return NextResponse.json({
    rows: (data || []).map(r => ({
      ...r,
      user_email:    r.user_id ? profMap[r.user_id]?.email     ?? null : null,
      user_fullname: r.user_id ? profMap[r.user_id]?.full_name ?? null : null,
    })),
  })
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin('support.write')
  if (gate.ok === false) return gate.response

  const body = await req.json().catch(() => null) as {
    id?: string; status?: string; admin_notes?: string
  } | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (body.status && !['new','reviewing','answered','closed'].includes(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  const sb = serviceClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status)                          patch.status      = body.status
  if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes.slice(0, 2000)
  const { data, error } = await sb
    .from('feedback_submissions')
    .update(patch)
    .eq('id', body.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data })
}
