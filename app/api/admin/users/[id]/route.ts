import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = adminClient()
    const { id: userId } = await context.params

    const [{ data: userRes, error: userErr }, { data: profileRes, error: profileErr }, { data: adminRes, error: adminErr }] =
      await Promise.all([
        supabase.auth.admin.getUserById(userId),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('admin_user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      ])

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 })

    return NextResponse.json({
      user: userRes.user,
      profile: profileRes || null,
      admin: adminRes || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load user' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const supabase = adminClient()
    const { id: userId } = await context.params
    const now = new Date().toISOString()

    const updates: any = {
      user_id: userId,
      updated_at: now,
      last_admin_action_at: now,
    }

    if (typeof body.account_status === 'string') updates.account_status = body.account_status
    if (typeof body.subscription_bonus_months === 'number') updates.subscription_bonus_months = body.subscription_bonus_months
    if (typeof body.credits === 'number') updates.credits = body.credits
    if (typeof body.notes === 'string') updates.notes = body.notes
    if (typeof body.last_admin_action === 'string') updates.last_admin_action = body.last_admin_action
    if (typeof body.is_test_user === 'boolean') updates.is_test_user = body.is_test_user

    const { error } = await supabase.from('admin_user_profiles').upsert(updates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update user' }, { status: 500 })
  }
}
