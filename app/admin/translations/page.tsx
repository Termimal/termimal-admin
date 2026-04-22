'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type TranslationRow = {
  id: string
  key: string
  namespace: string | null
  locale: string
  value: string
}

export default function TranslationsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<TranslationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [namespaceFilter, setNamespaceFilter] = useState('All namespaces')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      const { data, error } = await supabase
        .from('translations')
        .select('id, key, namespace, locale, value')
        .order('key', { ascending: true })

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        setRows(data || [])
      }
      setLoading(false)
    }

    load()
  }, [])

  const namespaces = useMemo(() => {
    const set = new Set(rows.map((r) => r.namespace).filter(Boolean))
    return ['All namespaces', ...Array.from(set) as string[]]
  }, [rows])

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = rows.filter((r) => {
      if (namespaceFilter !== 'All namespaces' && r.namespace !== namespaceFilter) return false
      if (!q) return true
      return [r.key, r.namespace, r.locale, r.value].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })

    const map = new Map<string, { key: string; namespace: string | null; en?: string; tr?: string }>()
    for (const row of filtered) {
      const item = map.get(row.key) || { key: row.key, namespace: row.namespace }
      if (row.locale === 'en') item.en = row.value
      if (row.locale === 'tr') item.tr = row.value
      map.set(row.key, item)
    }
    return Array.from(map.values())
  }, [rows, search, namespaceFilter])

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--t1)' }}>Translations</h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Browse and review translation keys from Supabase.</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Search size={14} style={{ color: 'var(--t4)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search translation keys..." className="bg-transparent outline-none text-[0.78rem] w-full" style={{ color: 'var(--t1)' }} />
        </div>
        <select value={namespaceFilter} onChange={(e) => setNamespaceFilter(e.target.value)} className="px-3 py-2 rounded-lg text-[0.72rem]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}>
          {namespaces.map((ns) => <option key={ns}>{ns}</option>)}
        </select>
      </div>

      {error ? <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>{error}</div> : null}

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Key','Namespace','English','Turkish'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>Loading translations...</td></tr>
            ) : grouped.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--t3)' }}>No translations found.</td></tr>
            ) : grouped.map(k => (
              <tr key={k.key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5 font-mono font-medium text-[0.68rem]">{k.key}</td>
                <td className="px-4 py-2.5"><span className="text-[0.58rem] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--t3)' }}>{k.namespace || 'default'}</span></td>
                <td className="px-4 py-2.5" style={{ color: 'var(--t2)' }}>{k.en || '—'}</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{k.tr || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}