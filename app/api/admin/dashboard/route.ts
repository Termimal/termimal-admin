import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
export async function GET() {
  try {
    const client = sb()
    const [{ count: totalUsers }, { data: profiles }, { data: recentUsers }] = await Promise.all([
      client.from('profiles').select('*', { count: 'exact', head: true }),
      client.from('profiles').select('plan,subscription_status'),
      client.from('profiles').select('id,full_name,email,plan,created_at').order('created_at', { ascending: false }).limit(6),
    ])
    const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, premium: 0 }
    const statusCounts: Record<string, number> = {}
    for (const p of profiles || []) {
      if (p.plan in planCounts) planCounts[p.plan]++
      const s = p.subscription_status || 'inactive'; statusCounts[s] = (statusCounts[s] || 0) + 1
    }
    let mrr = 0, revenue30d = 0
    try {
      const s = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-01-27.acacia' as any })
      const since = Math.floor(Date.now() / 1000) - 30 * 86400
      const [charges, subs] = await Promise.all([s.charges.list({ limit: 100, created: { gte: since } }), s.subscriptions.list({ limit: 100, status: 'active' })])
      revenue30d = charges.data.filter(c => c.status === 'succeeded').reduce((sum, c) => sum + c.amount / 100, 0)
      mrr = subs.data.reduce((sum, sub) => { const item = sub.items.data[0]; if (!item?.price?.unit_amount) return sum; const amt = item.price.unit_amount / 100; return sum + (item.price.recurring?.interval === 'year' ? amt / 12 : amt) }, 0)
    } catch {}
    return NextResponse.json({ totalUsers, planCounts, statusCounts, recentUsers: recentUsers || [], mrr, revenue30d })
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
