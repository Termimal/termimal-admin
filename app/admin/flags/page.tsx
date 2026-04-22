'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FeatureFlag = {
  id: string
  name: string
  description: string | null
  environment: string
  enabled: boolean
  min_plan: string | null
}

const envColor: Record<string, { color: string; bg: string }> = {
  production: { color: 'var(--green-val)', bg: 'rgba(52,211,153,.1)' },
  beta: { color: 'var(--amber)', bg: 'rgba(251,191,36,.1)' },
  staging: { color: 'var(--blue)', bg: 'rgba(96,165,250,.1)' },
  development: { color: 'var(--t4)', bg: 'var(--surface)' },
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
    const { data, error } = await supabase.from('feature_flags').select('id, name, description, environment, enabled, min_plan').order('name', { ascending: true })
    if (error) {
      setError(error.message)
      setFlags([])
    } else {
      setFlags(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleFlag = async (flag: FeatureFlag) => {
    setSavingId(flag.id)
    const next = !flag.enabled
    const { error } = await supabase.from('feature_flags').update({ enabled: next }).eq('id', flag.id)
    if (!error) {
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled: next } : f)))
    } else {
      setError(error.message)
    }
    setSavingId(null)
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--t1)' }}>Feature Flags</h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Production data only.</p>
      </div>

      {error ? <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>{error}</div> : null}

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>{['Flag','Description','Environment','Min Plan','Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>Loading flags...</td></tr> : null}
            {!loading && flags.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>No feature flags found.</td></tr> : null}
            {flags.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5 font-mono font-semibold text-[0.72rem]">{f.name}</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{f.description || '—'}</td>
                <td className="px-4 py-2.5"><span className="text-[0.58rem] font-bold px-1.5 py-0.5 rounded" style={{ color: envColor[f.environment]?.color || 'var(--t2)', background: envColor[f.environment]?.bg || 'var(--surface)' }}>{f.environment}</span></td>
                <td className="px-4 py-2.5"><span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>{f.min_plan || 'all'}</span></td>
                <td className="px-4 py-2.5"><button onClick={() => toggleFlag(f)} disabled={savingId === f.id} className="w-9 h-5 rounded-full relative transition-all disabled:opacity-60" style={{ background: f.enabled ? 'var(--acc2)' : 'var(--border)' }} aria-label={`Toggle ${f.name}`}><div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.enabled ? '18px' : '2px' }} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}