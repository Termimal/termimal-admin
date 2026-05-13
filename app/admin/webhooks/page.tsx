'use client'

import { useCallback, useEffect, useState } from 'react'
import { Webhook, RefreshCw, Filter } from 'lucide-react'
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

export default function WebhooksPage() {
  const [events, setEvents]   = useState<ProcessedWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType]       = useState('all')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (type !== 'all') params.set('type', type)
    const r = await fetch(`/api/admin/webhooks?${params.toString()}`, { cache: 'no-store' })
    const j = await r.json() as { events?: ProcessedWebhook[] }
    setEvents(j.events || [])
    setLoading(false)
  }, [type])
  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Webhook size={14} />}
        eyebrow="Webhooks"
        title="Stripe webhook log"
        description="Every Stripe webhook event we've processed (idempotency log). Use to inspect replay storms or events that arrived out of order."
        accent="purple"
        actions={<button className="btn-secondary btn-sm" onClick={load} disabled={loading}><RefreshCw size={11}/> Refresh</button>}
      />
      <Section flush accent="purple">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <Filter size={12} style={{ color: 'var(--t4)' }} />
          <select className="select" value={type} onChange={e => setType(e.target.value)} style={{ minWidth: 280 }}>
            {KNOWN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t4)' }}>{events.length} events</span>
        </div>
      </Section>
      {!loading && events.length === 0 && (
        <EmptyState icon={<Webhook size={20}/>} title="No webhook events yet" description="Either Stripe hasn't fired any events yet or the dedup table is empty." />
      )}
      {events.length > 0 && (
        <Section flush>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table-root">
              <thead><tr><th>Event ID</th><th>Type</th><th style={{ textAlign: 'right' }}>Received</th></tr></thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.event_id}>
                    <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: 'var(--t1)' }}>{e.event_id}</td>
                    <td><span className="chip chip-purple" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{e.type}</span></td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--t4)' }}>{new Date(e.created_at).toLocaleString()}</td>
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
