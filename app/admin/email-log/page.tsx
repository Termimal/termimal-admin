'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/email-log — every transactional email we sent, with status.
 *
 * Reads from public.email_log, which any code that sends mail writes to
 * synchronously. Resend / SES webhooks (when wired up) update the row
 * with delivered / opened / bounced / complained statuses.
 *
 * Filters: recipient substring, status, template key.
 * 180-day retention via pg_cron.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  MailCheck, MailX, MailOpen, Mail, RefreshCw, Filter, AlertTriangle, Search,
  ChevronDown,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id:            string
  created_at:    string
  status_at:     string
  user_id:       string | null
  actor_id:      string | null
  trigger:       string | null
  template_key:  string | null
  from_addr:     string
  to_addr:       string
  subject:       string | null
  body_preview:  string | null
  provider:      string
  provider_id:   string | null
  status:        string
  error:         string | null
  meta:          Record<string, unknown>
}

interface Stats {
  total:      number
  sent:       number
  delivered:  number
  opened:     number
  bounced:    number
  failed:     number
}

const STATUSES = ['all', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed']

const STATUS_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  queued:     { bg: 'rgba(148,163,184,0.12)', fg: 'var(--t3)',   border: 'rgba(148,163,184,0.3)' },
  sent:       { bg: 'rgba(56,139,253,0.12)',  fg: 'var(--blue)', border: 'rgba(56,139,253,0.3)' },
  delivered:  { bg: 'rgba(63,185,80,0.12)',   fg: 'var(--green-val)', border: 'rgba(63,185,80,0.3)' },
  opened:     { bg: 'rgba(167,139,250,0.14)', fg: '#a78bfa',     border: 'rgba(167,139,250,0.3)' },
  clicked:    { bg: 'rgba(45,212,164,0.14)',  fg: 'var(--acc)',  border: 'rgba(45,212,164,0.3)' },
  bounced:    { bg: 'rgba(248,113,113,0.14)', fg: 'var(--red)',  border: 'rgba(248,113,113,0.3)' },
  complained: { bg: 'rgba(210,153,34,0.14)',  fg: 'var(--amber)',border: 'rgba(210,153,34,0.3)' },
  failed:     { bg: 'rgba(248,113,113,0.18)', fg: 'var(--red)',  border: 'rgba(248,113,113,0.4)' },
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.queued
  return (
    <span style={{
      display:'inline-block', padding:'3px 9px', borderRadius:999,
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
      fontSize:10.5, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase',
    }}>{status}</span>
  )
}

export default function EmailLogPage() {
  const [rows, setRows]       = useState<Row[]>([])
  const [stats, setStats]     = useState<Stats>({ total: 0, sent: 0, delivered: 0, opened: 0, bounced: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')
  const [status, setStatus]   = useState('all')
  const [toFilter, setTo]     = useState('')
  const [tplFilter, setTpl]   = useState('')
  const [openId, setOpenId]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const qs = new URLSearchParams()
      if (status !== 'all') qs.set('status', status)
      if (toFilter.trim())  qs.set('to', toFilter.trim())
      if (tplFilter.trim()) qs.set('template', tplFilter.trim())
      const res = await fetch(`/api/admin/email-log?${qs}`, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setRows(j.rows || [])
      setStats(j.stats || { total: 0, sent: 0, delivered: 0, opened: 0, bounced: 0, failed: 0 })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deliverability rate (delivered+opened) / sent  — quick health gauge.
  const deliverability = useMemo(() => {
    const denom = stats.sent + stats.delivered + stats.opened + stats.bounced + stats.failed
    if (!denom) return null
    return Math.round(((stats.delivered + stats.opened) / denom) * 100)
  }, [stats])

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<MailCheck size={28}/>}
        eyebrow="Communications"
        title="Email log"
        subtitle="Every transactional email we sent through Resend. Filter by recipient, status, or template. Webhook-driven status updates show delivered / opened / bounced. 180-day retention."
        metric={{
          label: 'Visible',
          value: stats.total.toString(),
          secondary: deliverability !== null ? `${deliverability}% delivered` : `${stats.failed + stats.bounced} bounced/failed`,
        }}
      />

      {/* Filters */}
      <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:20 }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          <Filter size={13} color="var(--t4)"/>
          {STATUSES.map(s => {
            const on = status === s
            const c = STATUS_COLORS[s]
            return (
              <button key={s} onClick={() => setStatus(s)} style={{
                padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
                fontSize:11.5, fontWeight:600, textTransform:'capitalize',
                background: on ? (c?.bg ?? 'var(--bg3)') : 'var(--surface)',
                borderColor: on ? (c?.border ?? 'var(--border2)') : 'var(--border)',
                color: on ? (c?.fg ?? 'var(--t1)') : 'var(--t3)',
              }}>{s}</button>
            )
          })}
          <div style={{ marginLeft:'auto' }}>
            <button className="btn btn-secondary btn-sm" style={{ minHeight:32 }} onClick={load} disabled={loading}>
              <RefreshCw size={13}/> Refresh
            </button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={13} color="var(--t4)" style={{ position:'absolute', top:'50%', left:11, transform:'translateY(-50%)' }}/>
            <input
              value={toFilter}
              onChange={e => setTo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') load() }}
              placeholder="Filter by recipient (substring)…"
              className="input"
              style={{ paddingLeft:30 }}
            />
          </div>
          <div style={{ position:'relative' }}>
            <Mail size={13} color="var(--t4)" style={{ position:'absolute', top:'50%', left:11, transform:'translateY(-50%)' }}/>
            <input
              value={tplFilter}
              onChange={e => setTpl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') load() }}
              placeholder="Template key (exact) e.g. welcome, password_reset"
              className="input"
              style={{ paddingLeft:30 }}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={load} disabled={loading} style={{ minHeight:36 }}>Apply</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:20 }}>
        {[
          { label: 'Sent',      value: stats.sent,      color: 'var(--blue)', icon: <Mail size={14}/> },
          { label: 'Delivered', value: stats.delivered, color: 'var(--green-val)', icon: <MailCheck size={14}/> },
          { label: 'Opened',    value: stats.opened,    color: '#a78bfa', icon: <MailOpen size={14}/> },
          { label: 'Bounced',   value: stats.bounced,   color: 'var(--red)', icon: <MailX size={14}/> },
          { label: 'Failed',    value: stats.failed,    color: 'var(--red)', icon: <AlertTriangle size={14}/> },
        ].map(t => (
          <div key={t.label} className="card-premium" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{
              width:30, height:30, borderRadius:9, display:'inline-flex', alignItems:'center', justifyContent:'center',
              background:'var(--bg3)', color:t.color, border:'1px solid var(--border)',
            }}>{t.icon}</span>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--t1)', lineHeight:1 }}>{t.value}</div>
              <div style={{ fontSize:11, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginTop:4 }}>{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Section accent="blue" title="Recent emails" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${rows.length} row${rows.length === 1 ? '' : 's'}`}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:64, borderRadius:14 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Mail size={20}/>}
            title="No emails match these filters"
            description="Either nothing has been sent in the last 180 days, no provider is configured, or your filters are too narrow. Try clearing the recipient/template filters."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => {
              const open = openId === r.id
              return (
                <div
                  key={r.id}
                  className="card-premium"
                  style={{ padding:'14px 18px', cursor:'pointer' }}
                  onClick={() => setOpenId(open ? null : r.id)}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <span style={{
                      width:36, height:36, borderRadius:11, flexShrink:0,
                      background:'var(--bg3)', color:'var(--blue)',
                      border:'1px solid var(--border)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Mail size={15}/>
                    </span>
                    <div style={{ flex:1, minWidth:260 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.subject || '(no subject)'}
                      </div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ fontFamily:'monospace', color:'var(--t3)' }}>→ {r.to_addr}</span>
                        {r.template_key && (
                          <>
                            <span>·</span>
                            <span style={{ fontFamily:'monospace' }}>tpl: {r.template_key}</span>
                          </>
                        )}
                        {r.trigger && (
                          <>
                            <span>·</span>
                            <span>{r.trigger}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                    <ChevronDown size={14} style={{ color:'var(--t4)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 160ms' }}/>
                  </div>
                  {open && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10 }}>
                      <DetailRow label="From"        value={r.from_addr} mono />
                      <DetailRow label="Provider"    value={`${r.provider}${r.provider_id ? `  ·  id ${r.provider_id}` : ''}`} mono />
                      <DetailRow label="Status at"   value={new Date(r.status_at).toLocaleString()} />
                      {r.user_id && (
                        <DetailRow label="User" value={
                          <a href={`/admin/users/${r.user_id}`} style={{ color:'var(--blue)', fontFamily:'monospace' }} onClick={e => e.stopPropagation()}>
                            {r.user_id.slice(0, 8)}…
                          </a>
                        } />
                      )}
                      {r.body_preview && (
                        <div>
                          <div style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>Preview</div>
                          <div style={{
                            padding:'10px 12px', borderRadius:10,
                            background:'var(--bg)', border:'1px solid var(--border)',
                            fontSize:12, color:'var(--t2)',
                            whiteSpace:'pre-wrap', wordBreak:'break-word',
                            maxHeight:160, overflow:'auto',
                          }}>{r.body_preview}</div>
                        </div>
                      )}
                      {r.error && (
                        <div>
                          <div style={{ fontSize:10.5, color:'var(--red)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>Error</div>
                          <pre style={{
                            margin:0, padding:'10px 12px', borderRadius:10,
                            background:'var(--bg)', border:'1px solid rgba(248,113,113,0.3)',
                            fontSize:11, fontFamily:'ui-monospace, Menlo, monospace',
                            color:'var(--red)', whiteSpace:'pre-wrap', wordBreak:'break-word',
                          }}>{r.error}</pre>
                        </div>
                      )}
                      {r.meta && Object.keys(r.meta).length > 0 && (
                        <div>
                          <div style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>Meta</div>
                          <pre style={{
                            margin:0, padding:'10px 12px', borderRadius:10,
                            background:'var(--bg)', border:'1px solid var(--border)',
                            fontSize:11, fontFamily:'ui-monospace, Menlo, monospace',
                            color:'var(--t3)', whiteSpace:'pre-wrap', wordBreak:'break-word',
                            maxHeight:180, overflow:'auto',
                          }}>{JSON.stringify(r.meta, null, 2)}</pre>
                        </div>
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

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display:'flex', gap:14, fontSize:12 }}>
      <span style={{ color:'var(--t4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', minWidth:90 }}>{label}</span>
      <span style={{ color:'var(--t2)', fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}
