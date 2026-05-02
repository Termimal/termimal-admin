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
    const pct = parseInt(body.discount_percent ?? '0')
    const { error } = await supabase.from('admin_user_profiles').upsert({
      user_id: userId, discount_percent: pct,
      discount_reason: body.discount_reason || null,
      discount_expires_at: body.discount_expires_at || null,
      updated_at: now, last_admin_action_at: now,
      last_admin_action: `discount set: ${pct}%`
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await supabase.from('subscription_overrides').insert({
      user_id: userId, type: 'discount', discount_pct: pct,
      reason: body.discount_reason || null, expires_at: body.discount_expires_at || null
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
