'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/csp-reports — Content-Security-Policy violation viewer.
 * Reports arrive at the PUBLIC `/api/csp-report` endpoint on the
 * main site; we read them here. Top-directive aggregation helps spot
 * tightening opportunities (or false positives from browser
 * extensions).
 */
import { useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id: string; created_at: string;
  document_uri: string | null; blocked_uri: string | null;
  violated_directive: string | null; effective_directive: string | null;
  source_file: string | null; line_number: number | null;
  user_agent: string | null
}

interface TopRow { directive: string; count: number }

export default function CspPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [top,  setTop]        = useState<TopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [directive, setDir]   = useState('')

  const load = async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (directive) qs.set('directive', directive)
    const res = await fetch(`/api/admin/csp-reports?${qs}`, { cache:'no-store' })
    const j = await res.json()
    setRows(j.rows || []); setTop(j.top || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [directive]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <HeroCard accent="red" icon={<ShieldAlert size={28}/>} eyebrow="Security"
        title="CSP violations"
        subtitle="Every browser-side CSP block we caught. Most are extensions, but a spike on a new directive deserves a look."
        metric={{ label: 'Visible', value: rows.length.toString() }}/>

      {top.length > 0 && (
        <Section accent="red" title="Top directives" description="Click to filter">
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {top.slice(0, 12).map(t => (
              <button key={t.directive} onClick={()=>setDir(directive === t.directive ? '' : t.directive)} style={{
                padding:'6px 12px', borderRadius:999, border:'1px solid',
                cursor:'pointer', fontSize:12, fontWeight:600,
                background: directive === t.directive ? 'var(--red-bg)' : 'var(--surface)',
                borderColor: directive === t.directive ? 'rgba(248,113,113,0.4)' : 'var(--border)',
                color: directive === t.directive ? 'var(--red)' : 'var(--t3)',
              }}>{t.directive} <span style={{ color:'var(--t4)' }}>· {t.count}</span></button>
            ))}
          </div>
        </Section>
      )}

      <Section accent="red" title="Reports" description={loading ? 'Loading…' : `${rows.length} rows`}>
        {loading ? <div className="skeleton" style={{ height:200, borderRadius:14 }}/>
        : rows.length === 0 ? <EmptyState icon={<ShieldAlert size={20}/>} title="No CSP reports" description="Either nothing blocked, or the receiver isn't wired. Check /api/csp-report on the public site."/>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {rows.map(r => (
              <div key={r.id} className="card-premium" style={{ padding:'10px 14px' }}>
                <div style={{ fontSize:12, color:'var(--t1)' }}>
                  <strong style={{ color:'var(--red)' }}>{r.violated_directive}</strong> blocked <span style={{ fontFamily:'monospace' }}>{r.blocked_uri}</span>
                </div>
                <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
                  <span>on {r.document_uri || '—'}</span>
                  {r.source_file && <><span>·</span><span>{r.source_file}:{r.line_number}</span></>}
                  <span>·</span><span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginTop:8 }}><RefreshCw size={13}/> Refresh</button>
    </div>
  )
}
