'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/site-content — edit the marketing-site copy without a
 * code deploy.
 *
 * Each row is a key (e.g. `hero.title`) and a value (the copy that
 * lands on the public site). The marketing pages look up known
 * keys via /api/site/content and fall back to hardcoded defaults
 * when no row exists.
 *
 * Group by category for a navigable UX: Hero / Pricing / FAQ /
 * Footer / ad-hoc.
 */

import { useEffect, useMemo, useState } from 'react'
import { Edit3, RefreshCw, Save, Trash2, FileText } from 'lucide-react'
import { HeroCard, Section, Field } from '@/components/admin/PageChrome'

interface Row {
  key:         string
  value:       string
  description: string | null
  category:    string | null
  updated_at:  string
}

export default function SiteContentPage() {
  const [rows,    setRows]    = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState<string | null>(null)
  const [error,   setError]   = useState('')
  const [dirty,   setDirty]   = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/admin/site-content', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.rows || [])
      setDirty({})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async (key: string) => {
    const row = rows.find(r => r.key === key)
    if (!row) return
    const newValue = dirty[key] ?? row.value
    if (newValue === row.value) return
    setBusy(key); setError('')
    try {
      const r = await fetch('/api/admin/site-content', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue, description: row.description, category: row.category }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(prev => prev.map(x => x.key === key ? { ...x, value: newValue, updated_at: j.row.updated_at } : x))
      setDirty(prev => { const next = { ...prev }; delete next[key]; return next })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setBusy(null) }
  }

  const grouped = useMemo(() => {
    const map: Record<string, Row[]> = {}
    for (const r of rows) {
      const k = r.category || 'other'
      if (!map[k]) map[k] = []
      map[k].push(r)
    }
    return map
  }, [rows])

  const dirtyCount = Object.keys(dirty).length

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<Edit3 size={28}/>}
        eyebrow="Marketing copy"
        title="Site content"
        subtitle="Change the hero, pricing, FAQ, and footer copy on termimal.com without a code deploy. Public site reads via /api/site/content and falls back to hardcoded defaults when no override exists."
        metric={{ label: 'Keys', value: rows.length.toString(), secondary: `${dirtyCount} unsaved` }}
      />

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:18 }}>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:36 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" style={{
          padding:'12px 14px', borderRadius:12, marginBottom:16,
          background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.3)',
          color:'var(--red)', fontSize:13, fontWeight:600,
        }}>{error}</div>
      )}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height:120, borderRadius:14 }}/>)}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <Section key={cat} accent="blue" title={cat.charAt(0).toUpperCase() + cat.slice(1)} description={`${items.length} ${items.length === 1 ? 'key' : 'keys'} in this section.`}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {items.map(r => {
                const current = dirty[r.key] ?? r.value
                const isDirty = dirty[r.key] !== undefined && dirty[r.key] !== r.value
                const isLong  = (current?.length ?? 0) > 80
                return (
                  <div key={r.key} className="card-premium" style={{
                    padding:'16px 20px',
                    borderColor: isDirty ? 'rgba(56,139,253,0.4)' : 'var(--border)',
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <code style={{ fontSize:12, fontFamily:'ui-monospace, Menlo, Consolas, monospace', color:'var(--t1)', fontWeight:600 }}>
                          {r.key}
                        </code>
                        {r.description && (
                          <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:2, lineHeight:1.5 }}>
                            {r.description}
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        {isDirty && (
                          <button onClick={() => save(r.key)} disabled={busy === r.key} className="btn btn-primary btn-sm" style={{ fontSize:11 }}>
                            <Save size={11}/> Save
                          </button>
                        )}
                      </div>
                    </div>
                    {isLong ? (
                      <textarea
                        className="input"
                        rows={3}
                        value={current}
                        onChange={e => setDirty({ ...dirty, [r.key]: e.target.value })}
                        style={{ resize:'vertical', fontFamily:'inherit', lineHeight:1.55 }}
                      />
                    ) : (
                      <input
                        className="input"
                        value={current}
                        onChange={e => setDirty({ ...dirty, [r.key]: e.target.value })}
                      />
                    )}
                    <div style={{ fontSize:10.5, color:'var(--t4)', marginTop:6 }}>
                      Last updated {new Date(r.updated_at).toLocaleString()} · {(current?.length ?? 0)} chars
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        ))
      )}
    </div>
  )
}
