import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { discount_percent, discount_reason } = await req.json()
    const client = sb()
    const { error } = await client.from('admin_user_profiles').upsert({
      user_id:id, discount_percent:discount_percent||0, discount_reason:discount_reason||'',
      last_admin_action:`discount_set_${discount_percent}pct`,
      last_admin_action_at:new Date().toISOString(),
    }, { onConflict:'user_id' })
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    return NextResponse.json({ ok:true })
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}
