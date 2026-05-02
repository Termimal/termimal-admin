import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
export async function GET() {
  const { data, error } = await sb().from('site_settings').select('*').eq('id', 'global').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
export async function POST(req: Request) {
  const body = await req.json()
  const { id: _id, ...rest } = body
  const { data, error } = await sb().from('site_settings').upsert({ id: 'global', ...rest, updated_at: new Date().toISOString() }, { onConflict: 'id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
