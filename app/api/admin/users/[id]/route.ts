import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await context.params
    const supabase = adminClient()
    const [
      { data: userRes,  error: uErr },
      { data: profile,  error: pErr },
      { data: admin,    error: aErr },
      { data: loginHistory },
      { data: creditHistory },
      { data: overrides },
    ] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('admin_user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_login_history').select('*').eq('user_id', userId).order('signed_in_at', { ascending: false }).limit(50),
      supabase.from('credits').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('subscription_overrides').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    ])
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
    return NextResponse.json({ user: userRes.user, profile, admin, loginHistory: loginHistory||[], creditHistory: creditHistory||[], overrides: overrides||[] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load user' }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json()
    const { id: userId } = await context.params
    const supabase = adminClient()
    const now = new Date().toISOString()
    const updates: any = { user_id: userId, updated_at: now, last_admin_action_at: now }
    if (typeof body.account_status === 'string') updates.account_status = body.account_status
    if (typeof body.user_type      === 'string') updates.user_type = body.user_type
    if (typeof body.is_test_user   === 'boolean') updates.is_test_user = body.user_type === 'test'
    if (typeof body.notes          === 'string') updates.notes = body.notes
    if (body.last_admin_action) updates.last_admin_action = body.last_admin_action
    const { error } = await supabase.from('admin_user_profiles').upsert(updates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update user' }, { status: 500 })
  }
}
