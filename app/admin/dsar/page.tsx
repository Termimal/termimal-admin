'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/dsar — Data Subject Access Request queue.
 *
 * Inbox-style page. Click a row to expand details, with buttons to:
 *   - export   → download a JSON bundle of everything we have on them
 *   - mark complete / rejected
 *   - erase    → only on kind=erasure, only after status=in_progress.
 *                Two confirms before the delete fires.
 *
 * SLA tracking: every request has a 30d clock. Rows past SLA show in red.
 */

import { useEffect, useMemo, useState } from 'react'
import { Shield, AlertTriangle, Download, Trash2, CheckCircle2, XCircle, RefreshCw, Filter, Mail, Clock } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id:           string
  created_at:   string
  user_id:      string | null
  email:        string
  kind:         string
  status:       string
  reason:       string | null
  sla_due_at:   string
  responded_at: string | null
  responded_by: string | null
}

const STATUSES = ['open', 'in_progress', 'complete', 'rejected']
const STATUS_TINT: Record<string, { fg: string; bg: string; border: string }> = {
  open:        { fg: 'var(--amber)', bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.3)' },
  in_progress: { fg: 'var(--blue)',  bg: 'rgba(56,139,253,0.12)',  border: 'rgba(56,139,253,0.3)' },
  complete:    { fg: 'var(--green-val)', bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.3)' },
  rejected:    { fg: 'var(--red)',   bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
}

export default function DsarPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')
  const [filter, setFilter]   = useState('all')
  const [busy, setBusy]       = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const url = filter === 'all' ? '/api/admin/dsar' : `/api/admin/dsar?status=${filter}`
      const res = await fetch(url, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setRows(j.rows || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    let overdue = 0
    const now = Date.now()
    for (const r of rows) {
      if ((r.status === 'open' || r.status === 'in_progress') && new Date(r.sla_due_at).getTime() < now) overdue++
    }
    return { total: rows.length, overdue }
  }, [rows])

  const updateStatus = async (id: string, status: string) => {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/dsar', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) alert((await res.json()).error || 'failed')
      else await load()
    } finally { setBusy(null) }
  }

  const exportBundle = async (id: string) => {
    const res = await fetch(`/api/admin/dsar/${id}/export`, { method: 'POST' })
    if (!res.ok) { alert((await res.json()).error || 'export failed'); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `dsar-${id}.json`; a.click()
    URL.revokeObjectURL(a.href)
    await load()
  }

  const erase = async (id: string, email: string) => {
    if (!confirm(`PERMANENT delete of ${email}? Type ERASE in the next dialog to confirm.`)) return
    const second = prompt('Type ERASE to permanently delete this user and cascade their data.')
    if (second !== 'ERASE') return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/dsar/${id}/erase`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'ERASE' }),
      })
      const j = await res.json()
      if (!res.ok) alert(j.error || 'failed')
      else { alert('User erased. Counts: ' + JSON.stringify(j.counts)); await load() }
    } finally { setBusy(null) }
  }

  return (
    <div>
      <HeroCard
        accent="red"
        icon={<Shield size={28}/>}
        eyebrow="Privacy"
        title="DSAR queue"
        subtitle="GDPR Data Subject Access Requests. 30-day statutory deadline per request. Export bundles everything we have on the requestor as one JSON. Erasure deletes the user and cascades — irreversible."
        metric={{ label: 'Open + In-progress', value: rows.filter(r => r.status === 'open' || r.status === 'in_progress').length.toString(), secondary: stats.overdue > 0 ? `${stats.overdue} OVERDUE` : 'all on time' }}
      />

      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:18, flexWrap:'wrap' }}>
        <Filter size={13} color="var(--t4)"/>
        {(['all', ...STATUSES] as const).map(s => {
          const on = filter === s
          const c = STATUS_TINT[s as string]
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
              fontSize:12, fontWeight:600, textTransform:'capitalize',
              background: on ? (c?.bg ?? 'var(--bg3)') : 'var(--surface)',
              borderColor: on ? (c?.border ?? 'var(--border2)') : 'var(--border)',
              color: on ? (c?.fg ?? 'var(--t1)') : 'var(--t3)',
            }}>{s.replace('_', ' ')}</button>
          )
        })}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft:'auto', minHeight:32 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Section accent="red" title="Requests" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${rows.length} rows`}>
        {loading ? (
          <div className="skeleton" style={{ height:220, borderRadius:14 }}/>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Shield size={20}/>} title="No DSARs" description="No requests in this filter. When users submit through /privacy/data or you ingest via privacy@ inbox they appear here." />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => {
              const tint = STATUS_TINT[r.status] || STATUS_TINT.open
              const overdue = (r.status === 'open' || r.status === 'in_progress') && new Date(r.sla_due_at) < new Date()
              return (
                <div key={r.id} className="card-premium" style={{ padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <span style={{
                      width:34, height:34, borderRadius:10,
                      background: tint.bg, color: tint.fg, border: `1px solid ${tint.border}`,
                      display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    }}>
                      <Mail size={14}/>
                    </span>
                    <div style={{ flex:1, minWidth:240 }}>
                      <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{r.email}</div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, color: tint.fg }}>{r.kind}</span>
                        <span>·</span><span>{new Date(r.created_at).toLocaleString()}</span>
                        <span>·</span>
                        <span style={{ color: overdue ? 'var(--red)' : 'var(--t4)', fontWeight: overdue ? 700 : 400, display:'inline-flex', alignItems:'center', gap:4 }}>
                          <Clock size={11}/> due {new Date(r.sla_due_at).toLocaleDateString()} {overdue && '(OVERDUE)'}
                        </span>
                        {r.reason && (<><span>·</span><span style={{ fontStyle:'italic' }}>{r.reason}</span></>)}
                      </div>
                    </div>
                    <span style={{
                      padding:'4px 10px', borderRadius:999, background: tint.bg, color: tint.fg, border: `1px solid ${tint.border}`,
                      fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                    }}>{r.status.replace('_', ' ')}</span>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize:11, minHeight:30 }} onClick={() => exportBundle(r.id)}>
                        <Download size={11}/> Export
                      </button>
                      {r.status === 'open' && (
                        <button className="btn btn-secondary btn-sm" style={{ fontSize:11, minHeight:30 }} disabled={busy === r.id} onClick={() => updateStatus(r.id, 'in_progress')}>
                          In progress
                        </button>
                      )}
                      {(r.status === 'open' || r.status === 'in_progress') && (
                        <>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize:11, minHeight:30, color:'var(--green-val)' }} disabled={busy === r.id} onClick={() => updateStatus(r.id, 'complete')}>
                            <CheckCircle2 size={11}/> Complete
                          </button>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize:11, minHeight:30, color:'var(--red)' }} disabled={busy === r.id} onClick={() => updateStatus(r.id, 'rejected')}>
                            <XCircle size={11}/> Reject
                          </button>
                        </>
                      )}
                      {r.kind === 'erasure' && r.status === 'in_progress' && (
                        <button className="btn btn-secondary btn-sm" style={{ fontSize:11, minHeight:30, color:'var(--red)', borderColor:'rgba(248,113,113,0.4)' }} disabled={busy === r.id} onClick={() => erase(r.id, r.email)}>
                          <Trash2 size={11}/> ERASE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section accent="amber" title="Compliance reminders" description="Tick these once per request.">
        <ul style={{ margin:0, padding:'0 0 0 18px', color:'var(--t3)', fontSize:13, lineHeight:1.7 }}>
          <li>Reply to the requester within 30 days of receipt (GDPR Art. 12.3).</li>
          <li>Verify identity before fulfilling — match request email against a known account or ask for a verification token.</li>
          <li>For erasure: retain a redacted audit_log entry (kept for legal-defense), delete all PII rows. Hash chain preserves integrity.</li>
          <li>For access: the JSON bundle includes profiles, audit_logs, login history, invoices, plan_changes, consent_log, email_log, feature_events.</li>
          <li>Document anything refused, with legal basis (criminal investigation, freedom of expression, etc.).</li>
        </ul>
      </Section>
    </div>
  )
}

// AlertTriangle import is unused but kept for future "overdue" banner.
void AlertTriangle
