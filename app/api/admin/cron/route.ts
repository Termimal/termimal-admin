/**
 * /api/admin/cron
 *
 *   GET                        →  list scheduled jobs + last-run summary
 *   GET ?jobid=<id>&runs=1     →  recent run history (last 100 by default)
 *
 * Reads from public.admin_cron_jobs() / admin_cron_runs() which wrap
 * cron.job + cron.job_run_details with SECURITY DEFINER. We do this
 * because Supabase's service-role client doesn't get pg_cron grants by
 * default, and exposing the cron schema directly would leak more than
 * we want.
 *
 * Permission: 'system.read' — same as System Health.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  const gate = await requireAdmin('system.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const wantRuns = url.searchParams.get('runs') === '1'
  const sb = serviceClient()

  if (wantRuns) {
    const jobidRaw = url.searchParams.get('jobid')
    const jobid = jobidRaw ? parseInt(jobidRaw, 10) : null
    const limitRaw = parseInt(url.searchParams.get('limit') || '100', 10)
    const limit = Math.min(Math.max(isFinite(limitRaw) ? limitRaw : 100, 1), 500)

    const { data, error } = await sb.rpc('admin_cron_runs', {
      p_jobid: jobid ?? null,
      p_limit: limit,
    })
    if (error) return NextResponse.json({ error: error.message, runs: [] }, { status: 500 })
    return NextResponse.json({ runs: data ?? [] })
  }

  const { data, error } = await sb.rpc('admin_cron_jobs')
  if (error) return NextResponse.json({ error: error.message, jobs: [] }, { status: 500 })
  return NextResponse.json({ jobs: data ?? [] })
}
