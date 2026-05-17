import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env"
/**
 * /api/admin/inactive-customers
 *
 *   GET ?days=14|30|60|90  (default 14)
 *
 * Paying customers (subscription_status in active/trialing/past_due)
 * whose last_sign_in_at is older than the window, OR null. These
 * are the accounts most likely to churn — proactive outreach has
 * the highest LTV-per-effort return here.
 *
 * Joins auth.users.last_sign_in_at via admin.listUsers and filters
 * client-side because Supabase's auth schema isn't queryable via
 * the data-API.
 *
 * Gated to users.read. Capped at 200 rows.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'

function admin() {
  return createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
}

interface InactiveRow {
  id:                  string
  email:               string | null
  full_name:           string | null
  plan:                string | null
  subscription_status: string | null
  current_period_end:  string | null
  last_sign_in_at:     string | null
  days_inactive:       number | null
}

export async function GET(request: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response

  const url  = new URL(request.url)
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 14))
  const sb   = admin()

  // Pull paying-tier profiles. Limit 500 so we have a workable pool
  // to filter against the auth.users last_sign_in_at field.
  const { data: profiles, error: profErr } = await sb
    .from('profiles')
    .select('id, email, full_name, plan, subscription_status, current_period_end')
    .in('subscription_status', ['active', 'trialing', 'past_due'])
    .not('plan', 'in', '("free")')
    .limit(500)
  if (profErr) {
    return NextResponse.json({ error: profErr.message, customers: [] }, { status: 500 })
  }

  // Join in last_sign_in_at from auth.users. listUsers is paginated
  // — pull a generous slab and join in-memory.
  const { data: authData, error: authErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authErr) {
    return NextResponse.json({ error: authErr.message, customers: [] }, { status: 500 })
  }
  const lastSignIn = new Map<string, string | null>(
    (authData?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
  )

  const cutoff = Date.now() - days * 86_400_000
  const inactive: InactiveRow[] = []
  for (const p of profiles ?? []) {
    const last = lastSignIn.get(p.id) ?? null
    const lastMs = last ? Date.parse(last) : 0
    if (last && lastMs > cutoff) continue   // recent enough — skip
    inactive.push({
      id:                  p.id,
      email:               p.email,
      full_name:           p.full_name,
      plan:                p.plan,
      subscription_status: p.subscription_status,
      current_period_end:  p.current_period_end,
      last_sign_in_at:     last,
      days_inactive:       last
        ? Math.floor((Date.now() - lastMs) / 86_400_000)
        : null,   // null = never signed in
    })
  }

  // Sort by days_inactive desc (never-signed-in first).
  inactive.sort((a, b) => {
    if (a.days_inactive == null) return -1
    if (b.days_inactive == null) return 1
    return b.days_inactive - a.days_inactive
  })

  return NextResponse.json({
    customers: inactive.slice(0, 200),
    totals: {
      checked:        profiles?.length ?? 0,
      inactive:       inactive.length,
      never_signed_in: inactive.filter((r) => r.days_inactive == null).length,
    },
    window_days: days,
  })
}
