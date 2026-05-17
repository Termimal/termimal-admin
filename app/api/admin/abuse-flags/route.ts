/**
 * /api/admin/abuse-flags
 *
 * Reads signup_fingerprints rows flagged by the public-site precheck
 * (/api/auth/check-fingerprint over there). Groups by
 * fingerprint_hash so an admin sees a single cluster per offending
 * device, with all the accounts it tried to create.
 *
 * GET   ?status=flagged|all (default flagged)
 * POST  body: { id, action: 'clear' | 'block' }  — patch flag state
 *
 * Gated to users.write because clearing a flag effectively
 * whitelists a device for further signups.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

interface FpRow {
  id:                string
  user_id:           string | null
  email_hash:        string
  ip_text:           string | null
  fingerprint_hash:  string
  country:           string | null
  user_agent:        string | null
  flagged:           boolean
  flag_reason:       string | null
  created_at:        string
}

export async function GET(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response

  const url    = new URL(request.url)
  const status = url.searchParams.get('status') ?? 'flagged'

  const sb = serviceClient()
  let q = sb.from('signup_fingerprints')
    .select('id, user_id, email_hash, ip_text, fingerprint_hash, country, user_agent, flagged, flag_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (status === 'flagged') q = q.eq('flagged', true)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ error: error.message, clusters: [] }, { status: 500 })
  }
  const rows = (data ?? []) as FpRow[]

  // Group by fingerprint_hash so 5 trial accounts from the same
  // device show as ONE cluster, not 5 rows.
  const byFp = new Map<string, FpRow[]>()
  for (const r of rows) {
    const arr = byFp.get(r.fingerprint_hash) ?? []
    arr.push(r)
    byFp.set(r.fingerprint_hash, arr)
  }

  const clusters = [...byFp.entries()].map(([hash, members]) => ({
    fingerprint_hash: hash,
    count:            members.length,
    latest:           members[0],
    ips:              [...new Set(members.map(m => m.ip_text).filter(Boolean) as string[])],
    countries:        [...new Set(members.map(m => m.country).filter(Boolean) as string[])],
    members,
  })).sort((a, b) => b.count - a.count)

  return NextResponse.json({ clusters, total_rows: rows.length })
}

export async function POST(request: Request) {
  const gate = await requireAdmin('users.write')
  if (gate.ok === false) return gate.response

  const body = await request.json().catch(() => null) as { id?: string; action?: 'clear' | 'block' } | null
  if (!body?.id || !body.action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  const sb = serviceClient()
  const next = body.action === 'clear'
    ? { flagged: false, flag_reason: 'cleared_by_admin' }
    : { flagged: true,  flag_reason: 'manual_block' }
  const { error } = await sb.from('signup_fingerprints').update(next).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('audit_logs').insert({
    user_id:     gate.user.id,
    action:      `abuse.${body.action}`,
    entity_type: 'signup_fingerprint',
    entity_id:   body.id,
    metadata:    { by: gate.user.id },
  })

  return NextResponse.json({ ok: true })
}
