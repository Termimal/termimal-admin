import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const supabase = adminClient()
    const { id: userId } = await context.params

    const { packageId, plan, months, credits, note } = body
    const now = new Date().toISOString()

    // Fetch current admin profile
    const { data: existing } = await supabase
      .from('admin_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const history = existing?.package_history ?? []
    history.push({ packageId, plan, months, credits, note, granted_at: now, label: body.label })

    const updates: any = {
      user_id: userId,
      updated_at: now,
      last_admin_action_at: now,
      last_admin_action: `granted package: ${packageId}`,
      package_history: history,
    }

    // Apply bonus months if plan-based package
    if (months && months > 0) {
      updates.subscription_bonus_months = (existing?.subscription_bonus_months ?? 0) + months
    }

    // Apply credits if credit package
    if (credits && credits > 0) {
      updates.credits = (existing?.credits ?? 0) + credits
    }

    const { error: upsertErr } = await supabase
      .from('admin_user_profiles')
      .upsert(updates)

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

    // If plan package, also update the profiles table plan
    if (plan) {
      const { error: planErr } = await supabase
        .from('profiles')
        .update({ plan })
        .eq('id', userId)

      if (planErr) {
        // Non-fatal: log but don't fail
        console.error('Failed to update profile plan:', planErr.message)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to grant package' }, { status: 500 })
  }
}
