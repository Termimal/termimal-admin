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
    const amount = parseInt(body.amount)
    if (isNaN(amount) || amount === 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    await supabase.from('credits').insert({ user_id: userId, amount, reason: body.reason || 'Admin adjustment', note: body.note || null })

    const { data: existing } = await supabase.from('admin_user_profiles').select('credits').eq('user_id', userId).maybeSingle()
    const newTotal = (existing?.credits ?? 0) + amount

    const { error } = await supabase.from('admin_user_profiles').upsert({
      user_id: userId, credits: newTotal, updated_at: now,
      last_admin_action_at: now, last_admin_action: `credit adjustment: ${amount > 0 ? '+' : ''}${amount}`
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, newTotal })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
