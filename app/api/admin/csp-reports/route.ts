/**
 * /api/admin/csp-reports
 *
 *   GET ?directive=&blocked=&limit= → recent reports
 *
 * Reports themselves arrive at the PUBLIC /api/csp-report endpoint on
 * the main site. This is the admin viewer.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response
  const url = new URL(request.url)
  const directive = url.searchParams.get('directive') || ''
  const blocked   = url.searchParams.get('blocked')   || ''
  const limit     = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '500', 10) || 500, 1), 2000)
  const sb = serviceClient()
  let q = sb.from('csp_reports').select('*').order('created_at', { ascending: false }).limit(limit)
  if (directive) q = q.eq('violated_directive', directive)
  if (blocked)   q = q.ilike('blocked_uri', `%${blocked}%`)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })

  // Aggregate top offenders.
  const byDirective = new Map<string, number>()
  for (const r of (data as Array<{ violated_directive: string | null }> ?? [])) {
    const k = r.violated_directive || 'unknown'
    byDirective.set(k, (byDirective.get(k) || 0) + 1)
  }
  return NextResponse.json({
    rows: data ?? [],
    top:  [...byDirective.entries()].map(([k,v]) => ({ directive: k, count: v })).sort((a,b)=>b.count-a.count),
  })
}
