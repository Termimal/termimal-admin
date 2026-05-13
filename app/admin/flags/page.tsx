'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Flag, Power } from 'lucide-react'
import { HeroCard, Section, EmptyState, ItemGrid, ItemCard } from '@/components/admin/PageChrome'
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
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: next } : f))
    const { error } = await sb.from('feature_flags').update({ enabled: next }).eq('id', id)
    if (error) {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !next } : f))
    }
  }

  const enabled = flags.filter(f => f.enabled).length

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Flag size={28}/>}
        eyebrow="Feature flags"
        title="Module toggles"
        subtitle="Switch product modules on or off. Changes take effect on the next request — no redeploy required."
        metric={{ label: 'Enabled', value: `${enabled}/${flags.length}`, secondary: 'live flags' }}
      />

      {loading ? (
        <Section flush>
          <div style={{ padding: 40, fontSize: 13, color: 'var(--t3)', textAlign:'center' }}>Loading flags…</div>
        </Section>
      ) : flags.length === 0 ? (
        <EmptyState icon={<Flag size={20}/>} title="No feature flags defined" description="Add rows to public.feature_flags to manage them here." />
      ) : (
        <ItemGrid min={300}>
          {flags.map(f => (
            <ItemCard
              key={f.id}
              accent="amber"
              icon={<Flag size={18}/>}
              title={f.key}
              subtitle={f.description || 'No description'}
              status={{
                label: f.enabled ? 'ENABLED' : 'DISABLED',
                tone: f.enabled ? 'green' : 'muted',
                pulse: f.enabled,
              }}
              meta={
                <>
                  <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 11 }}>{f.key}</span>
                  {f.created_at && (
                    <>
                      <span>·</span>
                      <span>created {new Date(f.created_at).toLocaleDateString()}</span>
                    </>
                  )}
                </>
              }
              footer={
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggle(f.id, !f.enabled)}
                >
                  <Power size={12}/> {f.enabled ? 'Disable' : 'Enable'}
                </button>
              }
            />
          ))}
        </ItemGrid>
      )}
    </div>
  )
}
