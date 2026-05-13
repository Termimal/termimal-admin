'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/errors — browse uncaught client errors logged via
 * /api/error-log. 14-day retention. Filter by surface. Click a
 * row to expand the stack trace.
 */

import { useEffect, useMemo, useState } from 'react'
import { Bug, RefreshCw, ChevronDown, AlertTriangle, Filter } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface ErrorRow {
  id:           string
  occurred_at:  string
  user_id:      string | null
  surface:      string | null
  message:      string
  stack:        string | null
  url:          string | null
  ip:           string | null
  user_agent:   string | null
  release:      string | null
}

const SURFACES = ['all', 'dashboard', 'terminal', 'admin', 'public']

export default function ErrorsPage() {
  const [rows,     setRows]    = useState<ErrorRow[]>([])
  const [loading,  setLoading] = useState(true)
  const [err,      setErr]     = useState('')
  const [surface,  setSurface] = useState('all')
  const [openId,   setOpenId]  = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const url = surface === 'all' ? '/api/admin/errors' : `/api/admin/errors?surface=${surface}`
      const res = await fetch(url, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setRows(j.rows || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [surface])  // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    // Group identical messages so a single bug doesn't show 50 rows.
    const m = new Map<string, { sample: ErrorRow; count: number; latest: string }>()
    for (const r of rows) {
      const key = `${r.surface}|${r.message.slice(0, 200)}`
      const existing = m.get(key)
      if (existing) {
        existing.count += 1
        if (r.occurred_at > existing.latest) existing.latest = r.occurred_at
      } else {
        m.set(key, { sample: r, count: 1, latest: r.occurred_at })
      }
    }
    return Array.from(m.values()).sort((a, b) => b.latest.localeCompare(a.latest))
  }, [rows])

  return (
    <div>
      <HeroCard
        accent="red"
        icon={<Bug size={28}/>}
        eyebrow="Observability"
        title="Error log"
        subtitle="Uncaught client errors from the dashboard, terminal, and admin. 14-day retention. Identical messages on the same surface are grouped."
        metric={{ label: 'Last 200', value: rows.length.toString(), secondary: `${grouped.length} unique` }}
      />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <Filter size={13} color="var(--t4)"/>
          {SURFACES.map(s => {
            const on = surface === s
            return (
              <button key={s} onClick={() => setSurface(s)} style={{
                padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
                fontSize:12, fontWeight:600, textTransform:'capitalize',
                background: on ? 'var(--red-bg)' : 'var(--surface)',
                borderColor: on ? 'rgba(248,113,113,0.4)' : 'var(--border)',
                color: on ? 'var(--red)' : 'var(--t3)',
              }}>{s}</button>
            )
          })}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:36 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Section accent="red" title="Recent errors" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${grouped.length} unique × ${rows.length} total`}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:64, borderRadius:14 }} />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={20}/>}
            title="No errors logged"
            description="Either there are no errors in the last 14 days, or the error reporter hasn't been triggered. Try opening DevTools on the dashboard and running `throw new Error('test')`."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {grouped.map(g => {
              const r = g.sample
              const isOpen = openId === r.id
              return (
                <div key={r.id} className="card-premium" style={{
                  padding:'14px 18px',
                  borderColor: 'rgba(248,113,113,0.25)',
                  cursor: 'pointer',
                }}
                onClick={() => setOpenId(isOpen ? null : r.id)}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <span style={{
                      width:36, height:36, borderRadius:11, flexShrink:0,
                      background:'var(--red-bg)', color:'var(--red)',
                      border:'1px solid rgba(248,113,113,0.3)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Bug size={15}/>
                    </span>
                    <div style={{ flex:1, minWidth:280 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.message}
                      </div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span style={{ textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em' }}>{r.surface}</span>
                        <span>·</span>
                        <span>{new Date(r.occurred_at).toLocaleString()}</span>
                        {g.count > 1 && (
                          <>
                            <span>·</span>
                            <span style={{ color:'var(--amber)', fontWeight:700 }}>×{g.count}</span>
                          </>
                        )}
                        {r.user_id && (
                          <>
                            <span>·</span>
                            <a href={`/admin/users/${r.user_id}`} style={{ color:'var(--blue)', fontFamily:'monospace' }} onClick={e => e.stopPropagation()}>
                              user-{r.user_id.slice(0, 8)}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronDown size={14} style={{ color:'var(--t4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 160ms' }}/>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                      {r.url && (
                        <div style={{ fontSize:11.5, marginBottom:8 }}>
                          <span style={{ color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', marginRight:8 }}>URL</span>
                          <span style={{ color:'var(--t2)', fontFamily:'monospace' }}>{r.url}</span>
                        </div>
                      )}
                      {r.user_agent && (
                        <div style={{ fontSize:11.5, marginBottom:8 }}>
                          <span style={{ color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', marginRight:8 }}>UA</span>
                          <span style={{ color:'var(--t3)', fontFamily:'monospace' }}>{r.user_agent}</span>
                        </div>
                      )}
                      {r.stack ? (
                        <pre style={{
                          margin:0, padding:'12px 14px', borderRadius:10,
                          background:'var(--bg)', border:'1px solid var(--border)',
                          fontSize:11, fontFamily:'ui-monospace, Menlo, monospace',
                          color:'var(--t2)', overflow:'auto', maxHeight:280,
                          whiteSpace:'pre-wrap', wordBreak:'break-word',
                        }}>{r.stack}</pre>
                      ) : (
                        <div style={{ fontSize:12, color:'var(--t4)' }}>No stack trace captured.</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
