import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { plan } = await req.json()
    if (!plan) return NextResponse.json({ error:'Plan required' }, { status:400 })
    const client = sb()
    const { error } = await client.from('profiles').update({ plan }).eq('id', id)
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    await client.from('admin_user_profiles').upsert({
      user_id:id, last_admin_action:`plan_overridden_to_${plan}`,
      last_admin_action_at:new Date().toISOString(),
    }, { onConflict:'user_id' })
    return NextResponse.json({ ok:true })
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}
