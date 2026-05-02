import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
export async function GET() {
  const { data, error } = await sb().from('banners').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ banners: data || [] })
}
export async function POST(req: Request) {
  const body = await req.json()
  if (body.id) {
    const { data, error } = await sb().from('banners').update({ title: body.title, message: body.message, type: body.type, active: body.active, link_url: body.link_url, link_label: body.link_label }).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ banner: data })
  }
  const { data, error } = await sb().from('banners').insert({ title: body.title, message: body.message, type: body.type || 'info', active: body.active ?? true, link_url: body.link_url || null, link_label: body.link_label || null }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ banner: data })
}
export async function DELETE(req: Request) {
  const { id } = await req.json()
  const { error } = await sb().from('banners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
