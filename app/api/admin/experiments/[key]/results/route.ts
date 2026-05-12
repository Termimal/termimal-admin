/**
 * /api/admin/experiments/[key]/results — per-experiment results.
 * Returns exposures + conversions + conversion rate + 95% Wilson CI
 * per variant, plus a list of recent events.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const gate = await requireAdmin('experiments.write')
  if (gate.ok === false) return gate.response
  const { key } = await ctx.params
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
  const sb = serviceClient()
  const { data, error } = await sb.rpc('admin_experiment_results', { p_key: key })
  if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })

  // Significance signal: largest-N variant is the "control". For every
  // other variant we report whether its CI overlaps control's point
  // estimate. Easy first-pass for "are we winning yet?".
  const rows = (data ?? []) as Array<{ variant: string; exposures: number; conversions: number; conv_rate: number; ci_lower: number; ci_upper: number; total_value: number }>
  let control = rows[0]
  for (const r of rows) if (r.exposures > (control?.exposures ?? 0)) control = r
  const enriched = rows.map(r => ({
    ...r,
    is_control: r.variant === control?.variant,
    sig:        control && r.variant !== control.variant
      ? (r.ci_lower > control.conv_rate ? 'positive'
        : r.ci_upper < control.conv_rate ? 'negative'
        : 'inconclusive')
      : null,
  }))
  return NextResponse.json({ rows: enriched })
}
