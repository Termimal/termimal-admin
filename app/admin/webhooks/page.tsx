'use client'

import { useCallback, useEffect, useState } from 'react'
import { Webhook, RefreshCw } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

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
    <div>
      <HeroCard
        accent="purple"
        icon={<Webhook size={28}/>}
        eyebrow="Webhooks"
        title="Stripe webhook log"
        subtitle="Every Stripe webhook event processed (idempotency log). Use to inspect replay storms or events that arrived out of order."
        metric={{ label: 'Events', value: events.length.toString(), secondary: type === 'all' ? 'all types' : type }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" style={{ minHeight: 38 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Section title="Filter by event type" accent="purple">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ minWidth: 320, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
            {KNOWN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{events.length} events</span>
        </div>
      </Section>

      {!loading && events.length === 0 && (
        <EmptyState icon={<Webhook size={20}/>} title="No webhook events yet" description="Either Stripe hasn't fired any events yet or the dedup table is empty." />
      )}

      {events.length > 0 && (
        <Section flush title={`${events.length} event${events.length === 1 ? '' : 's'}`}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-root" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Event ID','Type','Received'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 2 ? 'right' : 'left', padding: '14px 24px',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--t4)',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.event_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 24px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, color: 'var(--t1)' }}>{e.event_id}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <span className="badge badge-purple" style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{e.type}</span>
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right', fontSize: 12, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(e.created_at).toLocaleString()}
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
