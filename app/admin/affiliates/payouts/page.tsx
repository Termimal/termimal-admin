'use client'
export const dynamic = 'force-dynamic'

/**
 * Affiliate Payouts — admin BO records (and optionally executes)
 * payouts to affiliates.
 *
 * Paths:
 *   - Manual recording (default): admin enters who/how-much/method,
 *     pays them outside the system (SEPA, PayPal, USDC), comes back
 *     and marks Done.
 *   - Stripe Transfer (optional): if Stripe Connect is set up and the
 *     affiliate gives us their acct_… ID, the POST handler executes
 *     stripe.transfers.create on submit.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Handshake, Plus, RefreshCw, Download, Send, Check, ExternalLink,
  AlertCircle, CheckCircle2, Clock, Trash2,
} from 'lucide-react'
import { HeroCard, Section, Field } from '@/components/admin/PageChrome'

type Method = 'stripe_transfer' | 'sepa' | 'paypal' | 'usdc' | 'wire' | 'other'

interface PayoutRow {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  tags: string[]
  created_at: string
}

interface ParsedPayout {
  id: string
  affiliate: string
  amount: number
  currency: string
  method: Method
  email: string | null
  acct:  string | null
  transfer_id: string | null
  status: PayoutRow['status']
  notes: string | null
  created_at: string
}

const METHOD_META: Record<Method, { label: string; color: string; bg: string }> = {
  stripe_transfer: { label: 'Stripe Transfer', color: 'var(--purple)', bg: 'var(--purple-bg)' },
  sepa:            { label: 'SEPA',            color: 'var(--blue)',   bg: 'var(--blue-bg)'   },
  paypal:          { label: 'PayPal',          color: 'var(--blue)',   bg: 'var(--blue-bg)'   },
  usdc:            { label: 'USDC (crypto)',   color: 'var(--amber)',  bg: 'var(--amber-bg)'  },
  wire:            { label: 'Wire',            color: 'var(--t3)',     bg: 'var(--surface2)'  },
  other:           { label: 'Other',           color: 'var(--t3)',     bg: 'var(--surface2)'  },
}

const STATUS_META: Record<PayoutRow['status'], { label: string; color: string; icon: any }> = {
  todo:        { label: 'Queued',  color: 'var(--t3)',     icon: Clock },
  in_progress: { label: 'Sent',    color: 'var(--blue)',   icon: Send  },
  done:        { label: 'Paid',    color: 'var(--green)',  icon: CheckCircle2 },
}

function parseRow(r: PayoutRow): ParsedPayout {
  const get = (prefix: string) => {
    const t = (r.tags || []).find(x => x.startsWith(prefix + ':'))
    return t ? t.slice(prefix.length + 1) : null
  }
  const method = (get('method') || 'other') as Method
  const cur    = get('currency') || 'EUR'
  const amt    = parseFloat(get('amt') || '0')
  const [name, ..._] = (r.title || '').split(' · ')
  return {
    id:     r.id,
    affiliate: name || r.title,
    amount: amt,
    currency: cur,
    method,
    email:  get('email'),
    acct:   get('acct'),
    transfer_id: get('transfer'),
    status: r.status,
    notes:  r.description,
    created_at: r.created_at,
  }
}

export default function AffiliatePayoutsPage() {
  const [rows, setRows] = useState<ParsedPayout[]>([])
  const [loading, setL] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  // Form state
  const [name,   setName]   = useState('')
  const [email,  setEmail]  = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [method, setMethod] = useState<Method>('sepa')
  const [acct,   setAcct]   = useState('')
  const [notes,  setNotes]  = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | PayoutRow['status']>('all')
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const load = async () => {
    setL(true); setErr('')
    try {
      const res = await fetch('/api/admin/affiliate-payouts', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setRows((j.payouts || []).map(parseRow))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load payouts')
    } finally {
      setL(false)
    }
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!name.trim() || !amount || !currency) {
      setLastResult({ ok: false, msg: 'Name, amount, currency required' })
      return
    }
    setBusy(true); setLastResult(null)
    try {
      const res = await fetch('/api/admin/affiliate-payouts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_name:  name.trim(),
          affiliate_email: email.trim() || null,
          amount:          parseFloat(amount),
          currency:        currency.toUpperCase(),
          method,
          stripe_acct:     method === 'stripe_transfer' ? acct.trim() || null : null,
          notes:           notes.trim() || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)

      if (j.transfer_id) {
        setLastResult({ ok: true, msg: `Stripe Transfer sent: ${j.transfer_id}` })
      } else if (j.transfer_error) {
        setLastResult({ ok: false, msg: `Recorded as queued. Stripe Transfer failed: ${j.transfer_error}` })
      } else {
        setLastResult({ ok: true, msg: `Payout queued — pay ${name} via ${METHOD_META[method].label} and mark as Paid when done.` })
      }
      // Reset form
      setName(''); setEmail(''); setAmount(''); setAcct(''); setNotes('')
      await load()
    } catch (e) {
      setLastResult({ ok: false, msg: e instanceof Error ? e.message : 'Submit failed' })
    } finally {
      setBusy(false)
    }
  }

  const markStatus = async (id: string, status: PayoutRow['status']) => {
    await fetch('/api/admin/affiliate-payouts', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await load()
  }

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return rows
    return rows.filter(r => r.status === filterStatus)
  }, [rows, filterStatus])

  const totals = useMemo(() => {
    const tally: Record<string, number> = {}
    let count = 0
    for (const r of rows) {
      if (r.status === 'done') {
        tally[r.currency] = (tally[r.currency] || 0) + r.amount
        count += 1
      }
    }
    return { byCurrency: tally, count }
  }, [rows])

  const exportCsv = () => {
    if (filtered.length === 0) return
    const cols = ['affiliate', 'email', 'amount', 'currency', 'method', 'status', 'transfer_id', 'created_at', 'notes']
    const csv = [
      cols.join(','),
      ...filtered.map(r => cols.map(c => {
        const v = (r as any)[c]
        if (v == null) return ''
        const s = String(v)
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `affiliate-payouts-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Handshake size={28} />}
        eyebrow="Partnerships"
        title="Affiliate Payouts"
        subtitle="Record and (optionally) execute affiliate payouts. Manual SEPA/PayPal/USDC by default; Stripe Transfers if Connect is wired."
        metric={{
          label: 'Paid',
          value: totals.count.toString(),
          secondary: Object.entries(totals.byCurrency).map(([c, a]) => `${c} ${a.toFixed(2)}`).join(' · ') || '—',
        }}
      />

      {/* Compose payout */}
      <Section
        accent="amber"
        title="Record a payout"
        description="If method = Stripe Transfer + you paste an acct_… we execute via Stripe API. Otherwise it's a recording — pay them via your bank/PayPal/wallet and come back to mark Done."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Field label="Affiliate name" required>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Trader" />
          </Field>
          <Field label="Email (optional)">
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="affiliate@example.com" />
          </Field>
          <Field label="Amount" required>
            <input className="input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="49.50" />
          </Field>
          <Field label="Currency" required>
            <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
              {['EUR', 'USD', 'GBP', 'USDC', 'BTC', 'ETH'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ marginTop: 18 }}>
          <Field label="Method">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(Object.keys(METHOD_META) as Method[]).map(m => {
                const on = method === m
                const meta = METHOD_META[m]
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      padding: '8px 14px', borderRadius: 999, border: '1px solid', cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 600,
                      background: on ? meta.bg : 'var(--surface)',
                      borderColor: on ? meta.color + '55' : 'var(--border)',
                      color: on ? meta.color : 'var(--t3)',
                      boxShadow: on ? `0 0 0 3px ${meta.color}22` : 'none',
                    }}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        {method === 'stripe_transfer' && (
          <div style={{ marginTop: 14 }}>
            <Field label="Stripe Connected Account ID" hint="Starts with acct_… If left blank, payout is recorded as queued (no Transfer executed).">
              <input className="input" value={acct} onChange={e => setAcct(e.target.value)} placeholder="acct_1Q…" style={{ fontFamily: 'ui-monospace,monospace' }} />
            </Field>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <Field label="Notes / reference (optional)">
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Q1 commissions · ref #1234" />
          </Field>
        </div>

        {lastResult && (
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: lastResult.ok ? 'var(--green-bg)' : 'var(--red-bg)',
            border: `1px solid ${lastResult.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: lastResult.ok ? 'var(--green)' : 'var(--red)',
            fontSize: 12.5, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {lastResult.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {lastResult.msg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={submit} disabled={busy || !name.trim() || !amount} className="btn btn-primary" style={{ minHeight: 42, padding: '0 24px' }}>
            {busy ? 'Submitting…' : (method === 'stripe_transfer' && acct ? <><Send size={13}/> Send Stripe Transfer</> : <><Plus size={13}/> Queue payout</>)}
          </button>
        </div>
      </Section>

      {/* Payout register */}
      <Section
        accent="acc"
        title={`Payout register (${rows.length})`}
        description="Every payout this team has recorded. Mark as Paid once the funds have actually moved."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={{ minHeight: 34, padding: '4px 12px', fontSize: 12 }}>
              <option value="all">All</option>
              <option value="todo">Queued</option>
              <option value="in_progress">Sent</option>
              <option value="done">Paid</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download size={12}/> CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>
        }
      >
        {err && (
          <div style={{ padding: 14, borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>
            {err}
          </div>
        )}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
            No payouts {filterStatus !== 'all' ? `with status "${filterStatus}"` : 'yet'}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(r => {
              const meta   = METHOD_META[r.method]
              const sMeta  = STATUS_META[r.status]
              const SIcon  = sMeta.icon
              return (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 14, alignItems: 'center',
                  padding: '14px 18px', borderRadius: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
                  }}>
                    {r.currency}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.affiliate}
                      </span>
                      <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {meta.label}
                      </span>
                      {r.transfer_id && (
                        <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'var(--purple-bg)', color: 'var(--purple)', fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>
                          {r.transfer_id.slice(0, 12)}…
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 3 }}>
                      {r.email || '—'} · {new Date(r.created_at).toLocaleString()}
                      {r.notes ? ` · ${r.notes}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.amount.toFixed(2)} <span style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>{r.currency}</span>
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 999,
                    background: 'var(--surface2)', color: sMeta.color,
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                  }}>
                    <SIcon size={11}/> {sMeta.label}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {r.status !== 'done' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => markStatus(r.id, 'done')} style={{ fontSize: 11 }}>
                        <Check size={11}/> Mark paid
                      </button>
                    )}
                    {r.status === 'done' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => markStatus(r.id, 'todo')} style={{ fontSize: 11, color: 'var(--t3)' }}>
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
