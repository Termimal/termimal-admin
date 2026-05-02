import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
export async function GET() {
  try {
    const client = sb()
    for (const table of ['feedback','user_feedback','support_tickets','contact_submissions']) {
      const { data, error } = await client.from(table).select('*').order('created_at',{ascending:false}).limit(100)
      if (!error && data) return NextResponse.json({ feedback:data })
    }
    return NextResponse.json({ feedback:[] })
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}
