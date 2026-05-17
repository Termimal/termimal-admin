/**
 * /api/admin/api-health
 *
 * Server-side latency-and-status probe across a curated list of
 * admin API endpoints. Each probe runs in parallel with a 6s timeout
 * and reports { name, ok, status, latency_ms, error? }.
 *
 * Why server-side: a client-side ping from the admin page would
 * include the admin user's cookie session, which doesn't capture
 * "is the route returning 5xx for unauthenticated callers". We run
 * the probes from the Workers runtime so the round-trip mirrors a
 * real internet client. We DO carry forward the admin's cookies so
 * gated endpoints respond truthfully — anonymous fetches would all
 * 401 and tell us nothing useful.
 *
 * Gated to system.read.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'

interface ProbeTarget { name: string; path: string }
interface ProbeResult {
  name:        string
  path:        string
  ok:          boolean
  status:      number | null
  latency_ms:  number
  error?:      string
}

// Curated list. Keep it light — these are real GET requests, not
// synthetic — so the load on the actual DB is bounded.
const TARGETS: ProbeTarget[] = [
  { name: 'Dashboard',         path: '/api/admin/dashboard' },
  { name: 'Audit log',         path: '/api/admin/audit-log?limit=1' },
  { name: 'Email log',         path: '/api/admin/email-log?limit=1' },
  { name: 'Webhooks',          path: '/api/admin/webhooks?limit=1' },
  { name: 'Flags',             path: '/api/admin/flags' },
  { name: 'Errors',            path: '/api/admin/errors?surface=admin' },
  { name: 'Funnel',            path: '/api/admin/funnel' },
  { name: 'Top customers',     path: '/api/admin/top-customers' },
  { name: 'Top referrers',     path: '/api/admin/top-referrers' },
  { name: 'Payment issues',    path: '/api/admin/payment-issues' },
  { name: 'Inactive customers',path: '/api/admin/inactive-customers' },
  { name: 'Search',            path: '/api/admin/search?q=ab' },
]

const TIMEOUT_MS = 6_000

async function probe(target: ProbeTarget, origin: string, cookieHeader: string): Promise<ProbeResult> {
  const url    = `${origin}${target.path}`
  const start  = performance.now()
  const ctl    = new AbortController()
  const tick   = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      method:  'GET',
      headers: { cookie: cookieHeader, accept: 'application/json' },
      cache:   'no-store',
      signal:  ctl.signal,
    })
    const latency_ms = Math.round(performance.now() - start)
    return {
      name:    target.name,
      path:    target.path,
      ok:      r.ok,
      status:  r.status,
      latency_ms,
    }
  } catch (e) {
    const latency_ms = Math.round(performance.now() - start)
    return {
      name:    target.name,
      path:    target.path,
      ok:      false,
      status:  null,
      latency_ms,
      error:   e instanceof Error ? e.message : 'fetch failed',
    }
  } finally {
    clearTimeout(tick)
  }
}

export async function GET(request: Request) {
  const gate = await requireAdmin('system.read')
  if (gate.ok === false) return gate.response

  const url    = new URL(request.url)
  const origin = url.origin
  const cookie = request.headers.get('cookie') ?? ''

  const t0 = performance.now()
  const probes = await Promise.all(TARGETS.map((t) => probe(t, origin, cookie)))
  const total_ms = Math.round(performance.now() - t0)

  const okCount    = probes.filter((p) => p.ok).length
  const slowest    = [...probes].sort((a, b) => b.latency_ms - a.latency_ms)[0]
  const avgLatency = probes.length
    ? Math.round(probes.reduce((s, p) => s + p.latency_ms, 0) / probes.length)
    : 0

  return NextResponse.json({
    probes,
    summary: {
      total:        probes.length,
      ok:           okCount,
      failed:       probes.length - okCount,
      avg_latency:  avgLatency,
      slowest:      slowest ? { name: slowest.name, latency_ms: slowest.latency_ms } : null,
      generated_at: new Date().toISOString(),
      total_ms,
    },
  })
}
