import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

async function requireAdmin() {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['admin', 'superadmin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || '1')
    const perPage = Math.min(Number(url.searchParams.get('perPage') || '20'), 100)
    const search = (url.searchParams.get('search') || '').trim()

    const supabase = adminClient()

    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = data.users || []
    const ids = users.map((u) => u.id)

    const { data: profiles, error: profilesError } = ids.length
      ? await supabase
          .from('profiles')
          .select(
            'id, plan, subscriptionstatus, fullname, referralcode, createdat, billinginterval, role'
          )
          .in('id', ids)
      : { data: [], error: null }

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const { data: adminProfiles, error: adminProfilesError } = ids.length
      ? await supabase
          .from('admin_user_profiles')
          .select(
            'user_id, account_status, subscription_bonus_months, credits, notes, last_admin_action, last_admin_action_at, closed_at'
          )
          .in('user_id', ids)
      : { data: [], error: null }

    if (adminProfilesError) {
      return NextResponse.json({ error: adminProfilesError.message }, { status: 500 })
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))
    const adminMap = new Map((adminProfiles || []).map((p) => [p.user_id, p]))

    let merged = users.map((u) => {
      const p: any = profileMap.get(u.id) || {}
      const a: any = adminMap.get(u.id) || {}

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        user_metadata: u.user_metadata,
        plan: p.plan || 'free',
        subscription_status: p.subscriptionstatus || 'inactive',
        fullname:
          p.fullname ||
          u.user_metadata?.full_name ||
          u.user_metadata?.fullname ||
          '',
        referralcode: p.referralcode || '',
        createdat: p.createdat || u.created_at,
        billinginterval: p.billinginterval || 'month',
        role: p.role || 'user',
        account_status: a.account_status || 'active',
        subscription_bonus_months: a.subscription_bonus_months || 0,
        credits: a.credits || 0,
        notes: a.notes || '',
        last_admin_action: a.last_admin_action || '',
        last_admin_action_at: a.last_admin_action_at || null,
        closed_at: a.closed_at || null,
      }
    })

    if (search) {
      const q = search.toLowerCase()
      merged = merged.filter((u) =>
        [
          u.email,
          u.fullname,
          u.id,
          u.referralcode,
          u.plan,
          u.subscription_status,
          u.account_status,
          u.role,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }

    return NextResponse.json({
      users: merged,
      page,
      perPage,
      total: data.total || merged.length,
      totalPages: data.total ? Math.ceil(data.total / perPage) : 1,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Failed to load users' },
      { status: 500 }
    )
  }
}
