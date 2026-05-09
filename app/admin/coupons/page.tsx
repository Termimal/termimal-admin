'use client'

import { useCallback, useEffect, useState } from 'react'
import { Tag, Plus, Trash2, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field, ItemGrid, ItemCard } from '@/components/admin/PageChrome'

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

  const active = rows.filter(r => !r.archived_at)

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Tag size={28} />}
        eyebrow="Billing · Coupons"
        title="Discount codes"
        subtitle="Create promotion codes redeemable at Stripe Checkout. Codes are mirrored to Stripe automatically."
        metric={{ label: 'Active', value: active.length.toString(), secondary: stripeReady ? 'Stripe linked' : 'local-only' }}
      />

      {!stripeReady && (
        <div className="card-premium" style={{
          padding: '14px 18px', marginBottom: 20,
          borderColor: 'var(--amber)44', color: 'var(--amber)',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} /> STRIPE_SECRET_KEY not configured — codes save locally only.
        </div>
      )}

      <Section title="Create a coupon" accent="amber" description="Configure the discount, duration, and redemption limits.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Code" required hint="Uppercase, no spaces. Customer types this at checkout.">
              <input className="input" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/\s+/g, '') })} placeholder="SUMMER25" />
            </Field>
            <Field label="Internal name (optional)">
              <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Summer 2026 launch" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Discount type">
              <select className="input" value={draft.discount_type} onChange={e => setDraft({ ...draft, discount_type: e.target.value as 'percent' | 'amount' })}>
                <option value="percent">Percent off</option>
                <option value="amount">Fixed amount off</option>
              </select>
            </Field>
            {draft.discount_type === 'percent' ? (
              <Field label="Percent off (1-100)" required>
                <input type="number" className="input" min={1} max={100} value={draft.percent_off} onChange={e => setDraft({ ...draft, percent_off: Number(e.target.value) })} />
              </Field>
            ) : (
              <Field label="Amount off (cents)" required>
                <input type="number" className="input" min={1} value={draft.amount_off_cents} onChange={e => setDraft({ ...draft, amount_off_cents: Number(e.target.value) })} />
              </Field>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Duration">
              <select className="input" value={draft.duration} onChange={e => setDraft({ ...draft, duration: e.target.value as 'once' | 'repeating' | 'forever' })}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Max redemptions (optional)">
              <input type="number" className="input" value={draft.max_redemptions} onChange={e => setDraft({ ...draft, max_redemptions: e.target.value })} placeholder="No limit"/>
            </Field>
            <Field label="Valid until (optional)">
              <input type="datetime-local" className="input" value={draft.valid_until} onChange={e => setDraft({ ...draft, valid_until: e.target.value })} />
            </Field>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--red)', fontSize: 13, fontWeight: 600,
            }}>{error}</div>
          )}
          <div>
            <button className="btn btn-primary btn-sm" disabled={!draft.code || creating} onClick={create}>
              <Plus size={13} /> {creating ? 'Creating…' : 'Create coupon'}
            </button>
          </div>
        </div>
      </Section>

      {active.length === 0 ? (
        <EmptyState icon={<Tag size={20} />} title="No coupons yet" description="Create your first discount above." />
      ) : (
        <ItemGrid min={300}>
          {active.map(r => (
            <ItemCard
              key={r.id}
              accent="amber"
              icon={<Tag size={18}/>}
              title={r.code}
              subtitle={r.name || (r.percent_off ? `${r.percent_off}% off` : `$${((r.amount_off_cents || 0)/100).toFixed(2)} off`)}
              status={{
                label: r.stripe_coupon_id ? 'LIVE' : 'LOCAL',
                tone:  r.stripe_coupon_id ? 'green' : 'muted',
              }}
              meta={
                <>
                  <span>
                    {r.percent_off ? `${r.percent_off}% off` : `$${((r.amount_off_cents || 0)/100).toFixed(2)} off`}
                  </span>
                  <span>·</span>
                  <span>
                    {r.duration === 'once' ? 'once' : r.duration === 'forever' ? 'forever' : `${r.duration_in_months}m`}
                  </span>
                  <span>·</span>
                  <span>{r.redeemed_count}{r.max_redemptions ? ` / ${r.max_redemptions}` : ''} redeemed</span>
                </>
              }
              footer={
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => copy(r.code)}>
                    {copied === r.code ? <CheckCircle size={12}/> : <Copy size={12}/>}
                    {copied === r.code ? 'Copied' : 'Copy code'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => archive(r.id)} style={{ color: 'var(--red)' }}>
                    <Trash2 size={12}/> Archive
                  </button>
                </div>
              }
            />
          ))}
        </ItemGrid>
      )}
    </div>
  )
}
