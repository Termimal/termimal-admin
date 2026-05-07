'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Flag } from 'lucide-react'
import { PageHeader, Section, EmptyState } from '@/components/admin/PageChrome'
import { createClient } from '@/lib/supabase/client'

interface FlagRow {
  id:          string
  key:         string
  description: string | null
  enabled:     boolean
  created_at:  string | null
}

export default function FlagsPage() {
  const sb = createClient()
  const [flags, setFlags]     = useState<FlagRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await sb
        .from('feature_flags')
        .select('id, key, description, enabled, created_at')
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (!error && data) setFlags(data as FlagRow[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggle(id: string, next: boolean) {
    // Optimistic.
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: next } : f))
    const { error } = await sb.from('feature_flags').update({ enabled: next }).eq('id', id)
    if (error) {
      // Revert on failure.
      setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !next } : f))
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Flag size={14} />}
        eyebrow="Feature Flags"
        title="Module toggles"
        description="Switch product modules on or off. Changes take effect on the next request — no redeploy required."
        accent="amber"
      />

      <Section flush accent="amber">
        {loading ? (
          <div style={{ padding: 24, fontSize: 13, color: 'var(--t3)' }}>Loading flags…</div>
        ) : flags.length === 0 ? (
          <EmptyState icon={<Flag size={20} />} title="No feature flags defined" description="Add rows to public.feature_flags to manage them here." />
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table-root">
              <thead>
                <tr>
                  <th>Flag</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Created</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {flags.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--t1)' }}>{f.key}</td>
                    <td style={{ color: 'var(--t3)' }}>{f.description || '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--t4)', fontSize: 12 }}>
                      {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="toggle"
                        data-checked={f.enabled}
                        onClick={() => toggle(f.id, !f.enabled)}
                        aria-pressed={f.enabled}
                        title={f.enabled ? 'Disable' : 'Enable'}
                      >
                        <span className="toggle-thumb" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
