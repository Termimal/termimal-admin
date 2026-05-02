import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
export async function GET() {
  const { data, error } = await sb().from('seo_meta').select('*').order('page_key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pages: data || [] })
}
export async function POST(req: Request) {
  const body = await req.json()
  if (body.id) {
    const { data, error } = await sb().from('seo_meta').update({ title: body.title, description: body.description, og_title: body.og_title, og_description: body.og_description, og_image: body.og_image, canonical_url: body.canonical_url, updated_at: new Date().toISOString() }).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ page: data })
  }
  const { data, error } = await sb().from('seo_meta').insert({ page_key: body.page_key, title: body.title, description: body.description, og_title: body.og_title || null, og_description: body.og_description || null, og_image: body.og_image || null, canonical_url: body.canonical_url || null, updated_at: new Date().toISOString() }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ page: data })
}
