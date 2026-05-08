/**
 * /api/admin/translations — i18n string editor.
 *
 *   GET    /api/admin/translations?locale=en&namespace=marketing
 *   POST   /api/admin/translations   { key, namespace, locale, value }   upsert
 *   DELETE /api/admin/translations?id=…
 */
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin/service-client'

export async function GET(request: Request) {
  try {
    const sb = serviceClient()
    const u  = new URL(request.url)
    const locale    = u.searchParams.get('locale')
    const namespace = u.searchParams.get('namespace')
    let q = sb.from('translations').select('*').order('namespace, key, locale', { ascending: true })
    if (locale)    q = q.eq('locale', locale)
    if (namespace) q = q.eq('namespace', namespace)
    const { data, error } = await q.limit(2000)
    if (error) return NextResponse.json({ error: error.message, rows: [] }, { status: 500 })
    // Distinct locales + namespaces for filter dropdowns.
    const all = data ?? []
    const locales    = [...new Set(all.map(r => r.locale).filter(Boolean) as string[])]
    const namespaces = [...new Set(all.map(r => r.namespace).filter(Boolean) as string[])]
    return NextResponse.json({ rows: all, locales, namespaces })
  } catch (e) { return NextResponse.json({ error: String(e), rows: [] }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const sb = serviceClient()
    const body = await request.json().catch(() => null) as { key?: string; namespace?: string; locale?: string; value?: string } | null
    if (!body?.key || !body.namespace || !body.locale) {
      return NextResponse.json({ error: 'key, namespace, locale required' }, { status: 400 })
    }
    const insert = {
      key:       body.key,
      namespace: body.namespace,
      locale:    body.locale,
      value:     body.value ?? '',
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await sb.from('translations')
      .upsert(insert, { onConflict: 'key,namespace,locale' })
      .select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ row: data })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  try {
    const sb = serviceClient()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await sb.from('translations').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
