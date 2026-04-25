'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FeatureFlag = {
  id: string
  key: string
  description: string | null
  enabled: boolean
  createdat: string | null
}

export default function FlagsPage() {
  const supabase = createClient()

  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('featureflags')
      .select('id, key, description, enabled, createdat')
      .order('key', { ascending: true })

    if (error) {
      setError(error.message)
      setFlags([])
    } else {
      setFlags((data as FeatureFlag[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const toggleFlag = async (flag: FeatureFlag) => {
    setSavingId(flag.id)
    setError('')

    const next = !flag.enabled

    const { error } = await supabase
      .from('featureflags')
      .update({ enabled: next })
      .eq('id', flag.id)

    if (error) {
      setError(error.message)
    } else {
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, enabled: next } : f))
      )
    }

    setSavingId(null)
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight mb-1"
          style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}
        >
          Feature Flags
        </h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          Toggle product capabilities that are stored in the featureflags table.
        </p>
      </div>

      {error ? (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}
        >
          {error}
        </div>
      ) : null}

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              {['Flag', 'Description', 'Created', 'Status'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--t4)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center"
                  style={{ color: 'var(--t3)' }}
                >
                  Loading flags...
                </td>
              </tr>
            ) : flags.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center"
                  style={{ color: 'var(--t3)' }}
                >
                  No feature flags found.
                </td>
              </tr>
            ) : (
              flags.map((flag) => (
                <tr key={flag.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div
                      className="font-mono font-semibold text-sm"
                      style={{ color: 'var(--t1)' }}
                    >
                      {flag.key}
                    </div>
                  </td>

                  <td className="px-4 py-3" style={{ color: 'var(--t3)' }}>
                    {flag.description || '—'}
                  </td>

                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--t4)' }}>
                    {flag.createdat
                      ? new Date(flag.createdat).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-1 rounded"
                        style={{
                          color: flag.enabled ? 'var(--green-val)' : 'var(--t3)',
                          background: flag.enabled
                            ? 'rgba(52,211,153,.1)'
                            : 'rgba(148,163,184,.12)',
                        }}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>

                      <button
                        onClick={() => toggleFlag(flag)}
                        disabled={savingId === flag.id}
                        className="w-10 h-6 rounded-full relative transition-all disabled:opacity-60"
                        style={{
                          background: flag.enabled ? 'var(--acc2)' : 'var(--border)',
                        }}
                        aria-label={`Toggle ${flag.key}`}
                      >
                        <div
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                          style={{ left: flag.enabled ? '18px' : '2px' }}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}