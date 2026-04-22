'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type BannerRow = {
  id: string
  title: string
  placement: string
  status: 'active' | 'draft' | 'archived'
  cta_label: string
  cta_href: string
}

export default function AdminBannersPage() {
  const supabase = createClient()
  const [banners, setBanners] = useState<BannerRow[]>([])
  const [form, setForm] = useState<BannerRow>({ id: '', title: '', placement: '', status: 'draft', cta_label: '', cta_href: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sorted = useMemo(() => [...banners].sort((a, b) => a.title.localeCompare(b.title)), [banners])

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.from('banners').select('id, title, placement, status, cta_label, cta_href').order('title', { ascending: true })
    if (error) {
      setError(error.message)
      setBanners([])
    } else {
      setBanners((data || []) as BannerRow[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({ id: '', title: '', placement: '', status: 'draft', cta_label: '', cta_href: '' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload: BannerRow = { ...form, id: form.id || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
    if (!payload.title || !payload.placement) {
      setSaving(false)
      return
    }
    const { error } = await supabase.from('banners').upsert(payload)
    if (error) setError(error.message)
    else {
      await load()
      resetForm()
    }
    setSaving(false)
  }

  const edit = (banner: BannerRow) => {
    setEditingId(banner.id)
    setForm(banner)
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this banner?')) return
    const { error } = await supabase.from('banners').delete().eq('id', id)
    if (error) setError(error.message)
    else {
      await load()
      if (editingId === id) resetForm()
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--t1)' }}>Banner Management</h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Live banners only. No placeholders.</p>
      </div>

      {error ? <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>{error}</div> : null}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={submit} className="p-6 rounded-xl border sticky top-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--t1)' }}>{editingId ? 'Edit banner' : 'Create banner'}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} /></div>
              <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Placement</label><input value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} placeholder="homepage_hero" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} /></div>
              <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>CTA label</label><input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} /></div>
              <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>CTA link</label><input value={form.cta_href} onChange={(e) => setForm({ ...form, cta_href: e.target.value })} placeholder="/pricing" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} /></div>
              <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BannerRow['status'] })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
              <div className="flex gap-2 pt-2"><button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">{editingId ? 'Update banner' : 'Create banner'}</button><button type="button" onClick={resetForm} className="btn-secondary px-4 py-2 text-sm">Reset</button></div>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? <div style={{ color: 'var(--t3)' }}>Loading banners...</div> : null}
          {sorted.map((banner) => (
            <div key={banner.id} className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base mb-1" style={{ color: 'var(--t1)' }}>{banner.title}</h3>
                  <p className="text-sm mb-2" style={{ color: 'var(--t3)' }}>Placement: {banner.placement}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full" style={{ background: 'var(--bg)', color: 'var(--t2)', border: '1px solid var(--border)' }}>{banner.status}</span>
                    {banner.cta_label ? <span className="px-2 py-1 rounded-full" style={{ background: 'var(--bg)', color: 'var(--t2)', border: '1px solid var(--border)' }}>CTA: {banner.cta_label}</span> : null}
                    {banner.cta_href ? <span className="px-2 py-1 rounded-full" style={{ background: 'var(--bg)', color: 'var(--t2)', border: '1px solid var(--border)' }}>{banner.cta_href}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => edit(banner)} className="btn-secondary px-3 py-2 text-xs">Edit</button>
                  <button onClick={() => remove(banner.id)} className="btn-secondary px-3 py-2 text-xs">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!loading && !sorted.length ? <div className="p-8 text-center rounded-xl border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}>No banners yet. Create your first banner from the form.</div> : null}
        </div>
      </div>
    </div>
  )
}