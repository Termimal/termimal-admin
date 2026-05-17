'use client'

/**
 * /admin/webhooks — Stripe webhook idempotency log + Stripe-Dashboard
 * deep links + event-id search + 24h/7d/30d windows.
 *
 * The actual webhook handler lives on the public-site repo; this
 * page is read-only over the processed_webhooks dedup table. Replay
 * of a specific event is done from the Stripe Dashboard via the
 * deep link in each row.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Webhook, RefreshCw, Filter, ExternalLink, Search, X } from 'lucide-react'
import { PageHeader, Section, EmptyState } from '@/components/admin/PageChrome'

interface ProcessedWebhook { event_id: string; type: string; created_at: string }

const KNOWN_TYPES = [
  'all',
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]

const WINDOWS = [
  { label: '24h',  hours: 24 },
  { label: '7d',   hours: 24 * 7 },
  { label: '30d',  hours: 24 * 30 },
  { label: 'All',  hours: null },
] as const

function stripeUrl(eventId: string): string {
  // Stripe Dashboard event page. Works for any event id, prod + test
  // mode (the dashboard switches based on the logged-in account).
  return `https://dashboard.stripe.com/events/${eventId}`
}

export default function WebhooksPage() {
  const [events,  setEvents]  = useState<ProcessedWebhook[]>([])
  const [counts,  setCounts]  = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')
  const [type,    setType]    = useState('all')
  const [hours,   setHours]   = useState<number | null>(24 * 7)
  const [q,       setQ]       = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const params = new URLSearchParams()
      if (type !== 'all') params.set('type', type)
      if (q.trim())       params.set('event_id', q.trim())
      if (hours)          params.set('since', new Date(Date.now() - hours * 3600_000).toISOString())
      params.set('limit', '500')
      const r = await fetch(`/api/admin/webhooks?${params.toString()}`, { cache: 'no-store' })
      const j = await r.json() as { events?: ProcessedWebhook[]; counts?: Record<string, number>; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setEvents(j.events || [])
      setCounts(j.counts || {})
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [type, q, hours])

  // Debounce event-id search 250ms.
  useEffect(() => {
    const t = setTimeout(() => { void load() }, 250)
    return () => clearTimeout(t)
  }, [load])

  const topCounts = useMemo(() =>
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6),
    [counts]
  )

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Webhook size={14}/>}
        eyebrow="Webhooks"
        title="Stripe webhook log"
        description="Every Stripe webhook event we've processed (idempotency log). Use to inspect replay storms or events that arrived out of order. Click 'Stripe' on any row to open the event in the Stripe Dashboard — that's where to retry/replay from."
        accent="purple"
        actions={<button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}><RefreshCw size={11} className={loading ? 'animate-spin' : ''}/> Refresh</button>}
      />

      <Section flush accent="purple">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
          {/* Event-id search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input
              className="input"
              style={{ paddingLeft: 32, paddingRight: q ? 30 : 12, height: 34, fontSize: 12 }}
              placeholder="evt_… search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              spellCheck={false}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--t4)', padding: 4,
                }}
              ><X size={12}/></button>
            )}
          </div>
          <Filter size={12} style={{ color: 'var(--t4)' }}/>
          <select
            className="select"
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ minWidth: 240, height: 34, fontSize: 12 }}
          >
            {KNOWN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {WINDOWS.map(w => {
              const on = hours === w.hours
              return (
                <button
                  key={w.label}
                  type="button"
                  onClick={() => setHours(w.hours)}
                  style={{
                    padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${on ? 'rgba(167,139,250,0.45)' : 'var(--border)'}`,
                    background: on ? 'rgba(167,139,250,0.15)' : 'var(--surface)',
                    color: on ? 'var(--purple)' : 'var(--t3)',
                    fontSize: 11, fontWeight: 600,
                  }}
                >{w.label}</button>
              )
            })}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
            {events.length} events
          </span>
        </div>
      </Section>

      {/* Top types chip strip */}
      {topCounts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '4px 0 18px', flexWrap: 'wrap' }}>
          {topCounts.map(([t, n]) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{
                padding: '4px 12px', borderRadius: 999, cursor: 'pointer',
                background: type === t ? 'rgba(167,139,250,0.15)' : 'var(--surface)',
                border: `1px solid ${type === t ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
                color: type === t ? 'var(--purple)' : 'var(--t3)',
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                fontSize: 11, fontWeight: 600,
              }}
            >{t} <strong style={{ marginLeft: 6 }}>{n}</strong></button>
          ))}
        </div>
      )}

      {err && <div className="msg-err" style={{ marginBottom: 16 }}>{err}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 14 }}/>
      ) : events.length === 0 ? (
        <EmptyState icon={<Webhook size={20}/>} title="No webhook events" description="Either Stripe hasn't fired anything in this window, or the dedup table is empty." />
      ) : (
        <Section flush>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table-root">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.event_id}>
                    <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: 'var(--t1)' }}>{e.event_id}</td>
                    <td><span className="chip chip-purple" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{e.type}</span></td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--t4)' }}>{new Date(e.created_at).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a
                        href={stripeUrl(e.event_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 999,
                          background: 'var(--blue-bg)', color: 'var(--blue)',
                          border: '1px solid rgba(56,139,253,0.3)',
                          fontSize: 11, fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >Stripe <ExternalLink size={10}/></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
