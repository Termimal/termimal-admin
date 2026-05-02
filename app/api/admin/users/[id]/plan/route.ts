import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json()
    const { id: userId } = await context.params
    const supabase = adminClient()
    const now = new Date().toISOString()
    const plan: string = body.plan
    if (!['free','starter','pro','premium'].includes(plan))
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    const { error } = await supabase.from('profiles').update({ plan, updated_at: now }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await supabase.from('admin_user_profiles').upsert({
      user_id: userId, admin_plan_override: plan, updated_at: now,
      last_admin_action_at: now, last_admin_action: `plan override → ${plan}`
    })
    await supabase.from('subscription_overrides').insert({
      user_id: userId, type: 'plan_change', plan, reason: body.reason || 'Admin override'
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
