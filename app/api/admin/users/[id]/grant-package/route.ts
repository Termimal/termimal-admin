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
    const { packageId, plan, months = 0, days = 0, credits = 0, note, label, type = 'plan_grant' } = body

    const { data: existing } = await supabase.from('admin_user_profiles').select('*').eq('user_id', userId).maybeSingle()
    const history = existing?.package_history ?? []
    history.push({ packageId, plan, months, days, credits, note, label, granted_at: now, type })

    const updates: any = {
      user_id: userId, updated_at: now, last_admin_action_at: now,
      last_admin_action: `granted: ${label || packageId}`, package_history: history,
    }
    if (months > 0) updates.subscription_bonus_months = (existing?.subscription_bonus_months ?? 0) + months
    if (credits > 0) updates.credits = (existing?.credits ?? 0) + credits

    if (days > 0 && type === 'free_period') {
      const base = existing?.free_until && new Date(existing.free_until) > new Date()
        ? new Date(existing.free_until) : new Date()
      base.setDate(base.getDate() + days)
      updates.free_until = base.toISOString()
    }

    const { error: uErr } = await supabase.from('admin_user_profiles').upsert(updates)
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    if (plan && plan !== 'free') {
      await supabase.from('profiles').update({ plan, updated_at: now }).eq('id', userId)
    }
    await supabase.from('subscription_overrides').insert({
      user_id: userId, type, plan: plan || null, months: months || null,
      days: days || null, credits: credits || null, reason: label || packageId, note: note || null,
    })
    if (credits > 0) {
      await supabase.from('credits').insert({
        user_id: userId, amount: credits, reason: `Package grant: ${label || packageId}`, note: note || null,
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 }) }
}
