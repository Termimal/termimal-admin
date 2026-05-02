import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } }
)

export async function GET() {
  try {
    const client = sb()
    const day = 86400000
    const now = Date.now()
    const [
      { count: totalUsers },
      { data: profiles },
      { data: recentUsers },
    ] = await Promise.all([
      client.from('profiles').select('*', { count:'exact', head:true }),
      client.from('profiles').select('plan,subscription_status,created_at'),
      client.from('profiles').select('id,full_name,email,plan,created_at')
        .order('created_at', { ascending:false }).limit(8),
    ])
    const planCounts: Record<string,number> = {}
    const statusCounts: Record<string,number> = {}
    const signupsByDay: Record<string,number> = {}
    for (const p of profiles || []) {
      const plan = p.plan || 'free'
      planCounts[plan] = (planCounts[plan] || 0) + 1
      const s = p.subscription_status || 'inactive'
      statusCounts[s] = (statusCounts[s] || 0) + 1
      if (p.created_at) {
        const daysAgo = Math.floor((now - new Date(p.created_at).getTime()) / day)
        if (daysAgo <= 29) {
          const key = new Date(p.created_at).toISOString().slice(0,10)
          signupsByDay[key] = (signupsByDay[key] || 0) + 1
        }
      }
    }
    const labels: string[] = [], signupData: number[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * day)
      labels.push(d.toLocaleDateString('en-US', { month:'short', day:'numeric' }))
      signupData.push(signupsByDay[d.toISOString().slice(0,10)] || 0)
    }
    let mrr = 0, revenue30d = 0, recentCharges: any[] = []
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const { default: Stripe } = await import('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' as any })
        const since = Math.floor((now - 30 * day) / 1000)
        const [charges, subs] = await Promise.all([
          stripe.charges.list({ limit:25, created:{ gte:since } }),
          stripe.subscriptions.list({ limit:100, status:'active' }),
        ])
        revenue30d = charges.data.filter(c => c.status==='succeeded').reduce((s,c) => s+c.amount/100, 0)
        mrr = subs.data.reduce((s,sub) => {
          const item = sub.items.data[0]
          if (!item?.price?.unit_amount) return s
          return s + (item.price.unit_amount/100) / (item.price.recurring?.interval==='year'?12:1)
        }, 0)
        recentCharges = charges.data.slice(0,6).map(c => ({
          id:c.id, amount:c.amount/100, status:c.status,
          email:(c as any).billing_details?.email||'', created:c.created,
        }))
      }
    } catch (_) {}
    return NextResponse.json({ totalUsers, planCounts, statusCounts,
      recentUsers: recentUsers||[], mrr, revenue30d, recentCharges,
      signupChart: { labels, data: signupData } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}
