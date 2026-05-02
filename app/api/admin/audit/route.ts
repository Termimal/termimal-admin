import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get('page')||'1'))
    const per  = Math.min(100, Number(url.searchParams.get('per')||'25'))
    const from = (page - 1) * per
    const client = sb()
    const { data, count, error } = await client
      .from('admin_user_profiles')
      .select('user_id,last_admin_action,last_admin_action_at', { count:'exact' })
      .not('last_admin_action', 'is', null)
      .order('last_admin_action_at', { ascending:false })
      .range(from, from + per - 1)
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    const logs = (data||[]).map((d:any,i:number) => ({
      id:`${d.user_id}-${i}`, user_id:d.user_id,
      action:d.last_admin_action, created_at:d.last_admin_action_at,
    }))
    return NextResponse.json({ logs, total:count||0 })
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}
