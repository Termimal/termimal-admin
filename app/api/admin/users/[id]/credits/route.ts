import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { amount, reason } = await req.json()
    if (!amount || isNaN(amount)) return NextResponse.json({ error:'Invalid amount' }, { status:400 })
    const client = sb()
    const { data: existing } = await client.from('admin_user_profiles').select('credits,credit_history').eq('user_id',id).single()
    const current = existing?.credits || 0
    const history = existing?.credit_history || []
    history.push({ amount, reason:reason||'Admin adjustment', created_at:new Date().toISOString() })
    const { error } = await client.from('admin_user_profiles').upsert({
      user_id:id, credits:current+amount, credit_history:history,
      last_admin_action:`credits_adjusted_${amount>0?'+':''}${amount}`,
      last_admin_action_at:new Date().toISOString(),
    }, { onConflict:'user_id' })
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    return NextResponse.json({ ok:true, new_balance:current+amount })
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}
