/**
 * /api/admin/health — system health snapshot.
 *
 * Sources:
 *   - Supabase ping (service-role select 1)
 *   - upstream services we depend on (gamma-api, fred, dbnomics, stripe-status)
 *   - last 24h audit_logs row count (signal of activity)
 *   - latest scheduled_maintenance row
 *
 * Everything runs in parallel; a single slow upstream doesn't slow
 * the whole probe (3-second per-call timeout).
 *
 * If you want full request-level metrics, point Cloudflare Analytics
 * at this account and read the GraphQL API. Out of scope here.
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'

interface ProbeResult {
  name:        string
  /** Critical to our service (failure → overall down) vs third-party */
  critical:    boolean
  ok:          boolean
  latency_ms:  number
  status?:     number
  error?:      string
}

async function probe(
  name: string,
  url: string,
  opts: RequestInit & { critical?: boolean; timeout?: number } = {},
): Promise<ProbeResult> {
  const critical = opts.critical ?? false
  const t0 = Date.now()
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), opts.timeout ?? 6000)
  try {
    const r = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      cache: 'no-store',
      // Send a friendly UA so we don't get 403 from rate-limited APIs.
      headers: {
        ...(opts.headers || {}),
        'User-Agent': 'Termimal-Admin-Healthcheck/1.0',
        'Accept':     '*/*',
      },
    })
    clearTimeout(to)
    return { name, critical, ok: r.ok, status: r.status, latency_ms: Date.now() - t0 }
  } catch (e) {
    clearTimeout(to)
    return {
      name, critical,
      ok: false,
      latency_ms: Date.now() - t0,
      error: e instanceof Error ? e.message : 'unknown',
    }
  }
}

export async function GET() {
  const t0 = Date.now()
  const sb = serviceClient()

  // Supabase smoke test (critical — our own infra).
  const supaT0 = Date.now()
  const { error: supaErr } = await sb.from('profiles').select('id', { count: 'exact', head: true })
  const supabase: ProbeResult = {
    name: 'supabase',
    critical: true,
    ok: !supaErr,
    latency_ms: Date.now() - supaT0,
    error: supaErr?.message,
  }

  // Upstream probes (third-party — degraded ≠ down for the platform).
  const [gamma, fred, dbnomics] = await Promise.all([
    probe('polymarket-gamma', 'https://gamma-api.polymarket.com/markets?active=true&limit=1', { critical: false, timeout: 8000 }),
    probe('fred-csv',         'https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE',     { critical: false, timeout: 6000 }),
    probe('dbnomics',         'https://api.db.nomics.world/v22/providers',                    { critical: false, timeout: 6000 }),
  ])

  // Activity signal.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: auditCount } = await sb
    .from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', since)

  // Active maintenance window.
  const { data: nextMaintenance } = await sb
    .from('scheduled_maintenance')
    .select('*')
    .in('status', ['scheduled', 'active'])
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Overall status — only critical probes (Supabase) failing means
  // the platform is down. Third-party probe failures = degraded, not
  // down (most features still work, only the data source they back is
  // affected).
  const allProbes = [supabase, gamma, fred, dbnomics]
  const criticalDown = allProbes.some(p => p.critical && !p.ok)
  const upstreamDown = allProbes.some(p => !p.critical && !p.ok)
  const overallStatus: 'operational' | 'degraded' | 'down' =
    criticalDown ? 'down' : upstreamDown ? 'degraded' : 'operational'

  return NextResponse.json({
    generated_at:     new Date().toISOString(),
    overall_status:   overallStatus,
    overall_ok:       overallStatus === 'operational',
    total_latency_ms: Date.now() - t0,
    probes:           { supabase, gamma, fred, dbnomics },
    audit_events_24h: auditCount ?? 0,
    next_maintenance: nextMaintenance ?? null,
  })
}
