import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
export async function GET() {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const { data, error } = await sb().from('announcements').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcements: data || [] })
}
export async function POST(req: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const body = await req.json()
  if (body.id) {
    const { data, error } = await sb().from('announcements').update({ title: body.title, content: body.content, type: body.type, target: body.target, status: body.status }).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ announcement: data })
  }
  const { data, error } = await sb().from('announcements').insert({ title: body.title, content: body.content, type: body.type || 'announcement', target: body.target || 'all', status: 'draft' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcement: data })
}
export async function DELETE(req: Request) {
  const gate = await requireAdmin('users.read')
  if (gate.ok === false) return gate.response
  const { id } = await req.json()
  const { error } = await sb().from('announcements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
