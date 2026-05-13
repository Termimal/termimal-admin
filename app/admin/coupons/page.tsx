'use client'

import { useCallback, useEffect, useState } from 'react'
import { Tag, Plus, Trash2, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Coupon {
  id: string
  code: string
  name: string | null
  percent_off: number | null
  amount_off_cents: number | null
  currency: string | null
  duration: 'once' | 'repeating' | 'forever'
  duration_in_months: number | null
  max_redemptions: number | null
  redeemed_count: number
  applies_to_plans: string[]
  valid_from: string | null
  valid_until: string | null
  stripe_coupon_id: string | null
  archived_at: string | null
  created_at: string
}

export default function CouponsPage() {
  const [rows, setRows]               = useState<Coupon[]>([])
  const [stripeReady, setStripeReady] = useState(false)
  const [draft, setDraft] = useState({
    code: '', name: '',
    discount_type: 'percent' as 'percent' | 'amount',
    percent_off: 10, amount_off_cents: 500, currency: 'usd',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    duration_in_months: 3,
    max_redemptions: '' as string,
    valid_until: '' as string,
    applies_to_plans: [] as string[],
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/coupons', { cache: 'no-store' })
    const j = await r.json() as { rows?: Coupon[]; stripe_configured?: boolean }
    setRows(j.rows || [])
    setStripeReady(!!j.stripe_configured)
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    setError(null); setCreating(true)
    const payload: Record<string, unknown> = {
      code: draft.code,
      name: draft.name || null,
      duration: draft.duration,
      ...(draft.duration === 'repeating' ? { duration_in_months: draft.duration_in_months } : {}),
      ...(draft.discount_type === 'percent'
        ? { percent_off: Number(draft.percent_off) }
        : { amount_off_cents: Number(draft.amount_off_cents), currency: draft.currency }),
      ...(draft.max_redemptions ? { max_redemptions: Number(draft.max_redemptions) } : {}),
      ...(draft.valid_until ? { valid_until: draft.valid_until } : {}),
      applies_to_plans: draft.applies_to_plans,
    }
    const r = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await r.json()
    if (j.row) {
      setRows(prev => [j.row, ...prev])
      setDraft({ ...draft, code: '', name: '' })
    } else if (j.error) {
      setError(j.error)
    }
    setCreating(false)
  }

  async function archive(id: string) {
    if (!confirm('Archive this coupon? Will also delete it on Stripe.')) return
    await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Tag size={14} />}
        eyebrow="Billing · Coupons"
        title="Discount codes"
        description={
          <>
            Create promotion codes redeemable at Stripe Checkout. Codes are mirrored to Stripe automatically.
            {!stripeReady && (
              <span style={{ marginLeft: 6, color: 'var(--amber)' }}>
                <AlertCircle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> STRIPE_SECRET_KEY not configured — codes save locally only.
              </span>
            )}
          </>
        }
        accent="amber"
      />

      <Section title="Create a coupon" accent="amber">
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <Field label="Code" hint="Uppercase, no spaces. Customer types this at checkout.">
              <input className="input" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/\s+/g, '') })} placeholder="SUMMER25" />
            </Field>
            <Field label="Internal name (optional)">
              <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Summer 2026 launch" />
            </Field>
          </div>
          <div className="form-grid form-grid-2">
            <Field label="Discount type">
              <select className="select" value={draft.discount_type} onChange={e => setDraft({ ...draft, discount_type: e.target.value as 'percent' | 'amount' })}>
                <option value="percent">Percent off</option>
                <option value="amount">Fixed amount off</option>
              </select>
            </Field>
            {draft.discount_type === 'percent' ? (
              <Field label="Percent off (1-100)">
                <input type="number" className="input" min={1} max={100} value={draft.percent_off} onChange={e => setDraft({ ...draft, percent_off: Number(e.target.value) })} />
              </Field>
            ) : (
              <Field label="Amount off (cents)">
                <input type="number" className="input" min={1} value={draft.amount_off_cents} onChange={e => setDraft({ ...draft, amount_off_cents: Number(e.target.value) })} />
              </Field>
            )}
          </div>
          <div className="form-grid form-grid-2">
            <Field label="Duration">
              <select className="select" value={draft.duration} onChange={e => setDraft({ ...draft, duration: e.target.value as 'once' | 'repeating' | 'forever' })}>
                <option value="once">Once (single billing cycle)</option>
                <option value="repeating">Repeating (X months)</option>
                <option value="forever">Forever (every renewal)</option>
              </select>
            </Field>
            {draft.duration === 'repeating' && (
              <Field label="Duration in months">
                <input type="number" className="input" min={1} value={draft.duration_in_months} onChange={e => setDraft({ ...draft, duration_in_months: Number(e.target.value) })} />
              </Field>
            )}
          </div>
          <div className="form-grid form-grid-2">
            <Field label="Max redemptions (optional)">
              <input type="number" className="input" value={draft.max_redemptions} onChange={e => setDraft({ ...draft, max_redemptions: e.target.value })} />
            </Field>
            <Field label="Valid until (optional)">
              <input type="datetime-local" className="input" value={draft.valid_until} onChange={e => setDraft({ ...draft, valid_until: e.target.value })} />
            </Field>
          </div>
          {error && <div className="msg-err">✗ {error}</div>}
          <button className="btn-primary btn-sm" disabled={!draft.code || creating} onClick={create} style={{ alignSelf: 'flex-start' }}>
            <Plus size={11} /> {creating ? 'Creating…' : 'Create coupon'}
          </button>
        </div>
      </Section>

      {rows.length === 0 ? (
        <EmptyState icon={<Tag size={20} />} title="No coupons yet" description="Create your first discount above." />
      ) : (
        <Section flush title={`Active coupons (${rows.filter(r => !r.archived_at).length})`}>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table-root">
              <thead><tr>
                <th>Code</th><th>Discount</th><th>Duration</th><th>Redeemed</th><th>Stripe</th><th></th>
              </tr></thead>
              <tbody>
                {rows.filter(r => !r.archived_at).map(r => (
                  <tr key={r.id}>
                    <td>
                      <button onClick={() => copy(r.code)} className="chip chip-amber" style={{ fontFamily: 'ui-monospace, Menlo, monospace', cursor: 'pointer', border: 'none' }}>
                        {r.code} {copied === r.code ? <CheckCircle size={9}/> : <Copy size={9}/>}
                      </button>
                      {r.name && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3 }}>{r.name}</div>}
                    </td>
                    <td>
                      {r.percent_off ? <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{r.percent_off}% off</span>
                                     : <span style={{ color: 'var(--amber)', fontWeight: 700 }}>${((r.amount_off_cents || 0) / 100).toFixed(2)} off</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {r.duration === 'once'      ? 'Once'
                       : r.duration === 'forever' ? 'Forever'
                       : `${r.duration_in_months} months`}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {r.redeemed_count}
                      {r.max_redemptions ? ` / ${r.max_redemptions}` : ''}
                    </td>
                    <td>
                      {r.stripe_coupon_id
                        ? <span className="chip chip-green">live</span>
                        : <span className="chip">local-only</span>}
                    </td>
                    <td>
                      <button className="btn-ghost btn-sm" onClick={() => archive(r.id)} style={{ color: 'var(--red)' }}><Trash2 size={11}/></button>
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
