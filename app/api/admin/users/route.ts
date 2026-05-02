import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page    = Number(url.searchParams.get('page') || '1')
    const perPage = Math.min(Number(url.searchParams.get('perPage') || '25'), 100)
    const search  = (url.searchParams.get('search') || '').trim()
    const sb = admin()

    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const users = data.users || []
    const ids = users.map(u => u.id)

    const [
      { data: profiles },
      { data: adminProfiles },
    ] = await Promise.all([
      ids.length
        ? sb.from('profiles').select('id, plan, subscription_status, full_name, referral_code, billing_interval, current_period_end, stripe_customer_id').in('id', ids)
        : { data: [] },
      ids.length
        ? sb.from('admin_user_profiles').select('user_id, account_status, subscription_bonus_months, credits, notes, last_admin_action, last_admin_action_at, is_test_user, user_type, discount_percent').in('user_id', ids)
        : { data: [] },
    ])

    const pm = new Map((profiles || []).map((p: any) => [p.id, p]))
    const am = new Map((adminProfiles || []).map((p: any) => [p.user_id, p]))

    let merged = users.map(u => {
      const p: any = pm.get(u.id) || {}
      const a: any = am.get(u.id) || {}
      return {
        id: u.id, email: u.email, created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        fullname: p.full_name || u.user_metadata?.full_name || '',
        plan: p.plan || 'free',
        subscription_status: p.subscription_status || 'inactive',
        billing_interval: p.billing_interval || '',
        current_period_end: p.current_period_end || null,
        referral_code: p.referral_code || '',
        stripe_customer_id: p.stripe_customer_id || '',
        account_status: a.account_status || 'active',
        subscription_bonus_months: a.subscription_bonus_months || 0,
        credits: a.credits || 0,
        notes: a.notes || '',
        last_admin_action: a.last_admin_action || '',
        last_admin_action_at: a.last_admin_action_at || null,
        is_test_user: a.is_test_user || false,
        user_type: a.user_type || 'normal',
        discount_percent: a.discount_percent || 0,
      }
    })

    if (search) {
      const q = search.toLowerCase()
      merged = merged.filter(u =>
        [u.email, u.fullname, u.id, u.referral_code, u.plan, u.subscription_status, u.account_status]
          .filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q))
      )
    }

    return NextResponse.json({ users: merged, page, perPage, total: data.total || merged.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
