/**
 * /api/admin/funnel
 *
 *   GET ?from=<iso>&to=<iso>  →  conversion funnel for the window
 *
 * Reads `public.admin_conversion_funnel()` which counts:
 *   1. Signup       — profiles created in the window
 *   2. Activated    — signed in OR finished onboarding
 *   3. Paid         — subscription_status in (active|trialing|past_due)
 *   4. Retained 30d — still active, period not yet ended, signed up >30d ago
 *
 * Defaults: trailing 30 days.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { serviceClient } from '@/lib/admin/service-client'

function parseDate(iso: string | null, fallback: Date): Date {
  if (!iso) return fallback
  const d = new Date(iso)
  return isNaN(d.getTime()) ? fallback : d
}

export async function GET(request: Request) {
  const gate = await requireAdmin('analytics.read')
  if (gate.ok === false) return gate.response

  const url = new URL(request.url)
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const from = parseDate(url.searchParams.get('from'), defaultFrom)
  const to   = parseDate(url.searchParams.get('to'),   now)

  const sb = serviceClient()
  const { data, error } = await sb.rpc('admin_conversion_funnel', {
    p_from: from.toISOString(),
    p_to:   to.toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message, steps: [] }, { status: 500 })

  return NextResponse.json({
    from: from.toISOString(),
    to:   to.toISOString(),
    steps: data ?? [],
  })
}
