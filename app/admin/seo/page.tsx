'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SeoSettings = {
  id: string
  site_title: string
  site_description: string
  site_keywords: string
  canonical_url: string
  og_image: string
  twitter_handle: string
  robots: string
}

export default function AdminSeoPage() {
  const supabase = createClient()

  const [form, setForm] = useState<SeoSettings>({
    id: 'global',
    site_title: '',
    site_description: '',
    site_keywords: '',
    canonical_url: '',
    og_image: '',
    twitter_handle: '',
    robots: 'index,follow',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'global')
        .single()

      if (!error && data) {
        setForm({
          id: data.id ?? 'global',
          site_title: data.site_title ?? '',
          site_description: data.site_description ?? '',
          site_keywords: data.site_keywords ?? '',
          canonical_url: data.canonical_url ?? '',
          og_image: data.og_image ?? '',
          twitter_handle: data.twitter_handle ?? '',
          robots: data.robots ?? 'index,follow',
        })
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const updateField = (key: keyof SeoSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase.from('site_settings').upsert({
      ...form,
      id: 'global',
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'SEO settings saved successfully.' })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="text-sm" style={{ color: 'var(--t3)' }}>
        Loading SEO settings...
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}
        >
          SEO Settings
        </h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          Manage the global metadata used across the main Termimal site.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-xl p-6 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Field
          label="Site title"
          value={form.site_title}
          onChange={(v) => updateField('site_title', v)}
        />

        <TextAreaField
          label="Site description"
          value={form.site_description}
          onChange={(v) => updateField('site_description', v)}
          rows={4}
        />

        <TextAreaField
          label="Keywords"
          value={form.site_keywords}
          onChange={(v) => updateField('site_keywords', v)}
          rows={3}
        />

        <Field
          label="Canonical URL"
          value={form.canonical_url}
          onChange={(v) => updateField('canonical_url', v)}
        />

        <Field
          label="Open Graph image URL"
          value={form.og_image}
          onChange={(v) => updateField('og_image', v)}
        />

        <Field
          label="Twitter handle"
          value={form.twitter_handle}
          onChange={(v) => updateField('twitter_handle', v)}
        />

        <Field
          label="Robots"
          value={form.robots}
          onChange={(v) => updateField('robots', v)}
        />

        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t4)' }}>
            Preview
          </div>
          <div className="text-lg font-bold mb-1" style={{ color: 'var(--blue)' }}>
            {form.site_title || 'Termimal'}
          </div>
          <div className="text-sm mb-1" style={{ color: 'var(--acc)' }}>
            {form.canonical_url || 'https://termimal.com'}
          </div>
          <div className="text-sm" style={{ color: 'var(--t3)' }}>
            {form.site_description || 'No description set.'}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {message ? (
            <span
              className="text-sm font-medium"
              style={{ color: message.type === 'error' ? 'var(--red-val)' : 'var(--green-val)' }}
            >
              {message.text}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--t4)' }}>
              Changes save to Supabase immediately.
            </span>
          )}

          <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? 'Saving...' : 'Save SEO Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>
        {label}
      </div>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          color: 'var(--t1)',
        }}
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-2" style={{ color: 'var(--t2)' }}>
        {label}
      </div>
      <textarea
        rows={rows}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          color: 'var(--t1)',
        }}
      />
    </label>
  )
}
