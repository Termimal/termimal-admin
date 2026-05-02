import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
export async function GET() {
  const { data, error } = await sb().from('feature_flags').select('*').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flags: data || [] })
}
export async function POST(req: Request) {
  const body = await req.json()
  if (body.id) {
    const { data, error } = await sb().from('feature_flags').update({ enabled: body.enabled, description: body.description }).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ flag: data })
  }
  const { data, error } = await sb().from('feature_flags').insert({ key: body.key, enabled: body.enabled ?? false, description: body.description }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flag: data })
}
export async function DELETE(req: Request) {
  const { id } = await req.json()
  const { error } = await sb().from('feature_flags').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
