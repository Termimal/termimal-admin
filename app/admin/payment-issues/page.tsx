'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/payment-issues — at-risk subscriptions surface.
 *
 * Every row is a revenue leak in progress. Click through to the
 * user profile for full context + recovery actions (extend grace
 * period, refund, mark as written off, etc).
 *
 * Filter chips toggle the visible status buckets. Counts on each
 * chip are server-side so they don't lie when the client filter
 * is narrower than the data set.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertOctagon, RefreshCw, ExternalLink, CreditCard, AlertTriangle,
  Clock, Filter,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface PaymentIssue {
  id:                   string
  email:                string | null
  full_name:            string | null
  plan:                 string | null
  subscription_status:  string
  stripe_customer_id:   string | null
  current_period_end:   string | null
  billing_interval:     string | null
  days_overdue:         number | null
  created_at:           string
}

const STATUS_META: Record<string, { label: string; tone: string; bg: string; desc: string }> = {
  past_due: {
    label: 'Past due',
    tone:  'var(--red)',     bg: 'var(--red-bg)',
    desc:  'Stripe is retrying after a failed charge. Highest priority.',
  },
  unpaid: {
    label: 'Unpaid',
    tone:  'var(--red)',     bg: 'var(--red-bg)',
    desc:  'Retries exhausted. The subscription is going to lapse soon.',
  },
  incomplete: {
    label: 'Incomplete',
    tone:  'var(--amber)',   bg: 'var(--amber-bg)',
    desc:  'Checkout was started but never finished.',
  },
  incomplete_expired: {
    label: 'Expired',
    tone:  'var(--t4)',      bg: 'var(--surface2)',
    desc:  'Abandoned >23h ago — Stripe gave up.',
  },
  paused: {
    label: 'Paused',
    tone:  'var(--blue)',    bg: 'var(--blue-bg)',
    desc:  'Explicitly paused. Usually intentional.',
  },
}

const PLAN_TONE: Record<string, string> = {
  free:    'chip chip-muted',
  starter: 'chip chip-blue',
  pro:     'chip chip-acc',
  premium: 'chip chip-purple',
}

function ymd(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

export default function PaymentIssuesPage() {
  const [issues, setIssues]     = useState<PaymentIssue[]>([])
  const [totals, setTotals]     = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState('')
  // Multi-select chips. When empty, show all.
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/payment-issues', { cache: 'no-store' })
      const j = await r.json() as { issues?: PaymentIssue[]; totals?: Record<string, number>; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setIssues(j.issues || [])
      setTotals(j.totals || {})
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (activeStatuses.size === 0) return issues
    return issues.filter(i => activeStatuses.has(i.subscription_status))
  }, [issues, activeStatuses])

  const toggleStatus = (s: string) => {
    setActiveStatuses(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  const totalAtRisk    = totals.total ?? 0
  const criticalCount  = (totals.past_due ?? 0) + (totals.unpaid ?? 0)

  return (
    <div>
      <HeroCard
        accent="red"
        icon={<AlertOctagon size={28}/>}
        eyebrow="Revenue · at risk"
        title="Payment issues"
        subtitle={
          <>
            Every row here is revenue actively at risk. Past-due and unpaid get
            priority — they're paying customers right now whose next renewal
            won't go through.
          </>
        }
        metric={{
          label:     'Total at risk',
          value:     totalAtRisk.toLocaleString(),
          secondary: criticalCount > 0
            ? <span style={{ color: 'var(--red)', fontWeight: 700 }}>{criticalCount} critical</span>
            : 'No critical accounts',
        }}
      />

      {/* Status chips */}
      <div className="card-premium" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Filter size={13} color="var(--t4)"/>
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const n  = totals[key] ?? 0
            const on = activeStatuses.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStatus(key)}
                title={meta.desc}
                style={{
                  padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                  border: `1px solid ${on ? meta.tone + '55' : 'var(--border)'}`,
                  background: on ? meta.bg : 'var(--surface)',
                  color: on ? meta.tone : 'var(--t3)',
                  fontSize: 12, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                {meta.label}
                <span style={{
                  background: on ? meta.tone + '22' : 'var(--surface2)',
                  color: on ? meta.tone : 'var(--t4)',
                  padding: '1px 8px', borderRadius: 999,
                  fontSize: 11, fontWeight: 700,
                }}>{n}</span>
              </button>
            )
          })}
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 'auto', minHeight: 32 }}
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      <Section
        accent="red"
        title={activeStatuses.size === 0 ? 'All at-risk accounts' : `Filtered (${filtered.length})`}
        description={loading ? 'Loading…' : err ? `Error: ${err}` : `${filtered.length} of ${totalAtRisk}`}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }}/>
            ))}
          </div>
        ) : err ? (
          <EmptyState icon={<AlertTriangle size={20}/>} title="Couldn't load" description={err}/>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={20}/>}
            title={totalAtRisk === 0 ? 'No payment issues' : 'Nothing matches your filter'}
            description={
              totalAtRisk === 0
                ? "Every active subscription is in good standing. Nice."
                : 'Toggle off some status chips above to see other buckets.'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {filtered.map(issue => {
              const meta = STATUS_META[issue.subscription_status] || STATUS_META.incomplete
              const overdueText = issue.days_overdue && issue.days_overdue > 0
                ? `${issue.days_overdue}d overdue`
                : null
              return (
                <Link
                  key={issue.id}
                  href={`/admin/users/${issue.id}`}
                  style={{
                    background: 'var(--bg2)',
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                    textDecoration: 'none', color: 'inherit',
                    transition: 'background 160ms',
                  }}
                >
                  {/* Status pill */}
                  <span style={{
                    flexShrink: 0,
                    padding: '4px 12px', borderRadius: 999,
                    background: meta.bg, color: meta.tone,
                    border: `1px solid ${meta.tone}33`,
                    fontSize: 11, fontWeight: 700,
                    minWidth: 90, textAlign: 'center',
                  }}>{meta.label}</span>

                  {/* Identity */}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
                      {issue.full_name || issue.email?.split('@')[0] || '(no name)'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', marginTop: 2 }}>
                      {issue.email || '—'}
                    </div>
                  </div>

                  {/* Plan + interval */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {issue.plan && <span className={PLAN_TONE[issue.plan] ?? 'chip'}>{issue.plan}</span>}
                    {issue.billing_interval && (
                      <span className="chip">{issue.billing_interval}</span>
                    )}
                  </div>

                  {/* Period end + overdue */}
                  <div style={{ minWidth: 130, textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                      <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }}/>
                      {ymd(issue.current_period_end)}
                    </div>
                    {overdueText && (
                      <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginTop: 2 }}>
                        {overdueText}
                      </div>
                    )}
                  </div>

                  {/* Stripe link */}
                  {issue.stripe_customer_id && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${issue.stripe_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: 11, color: 'var(--blue)',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                      }}
                      aria-label="Open in Stripe"
                    >
                      Stripe <ExternalLink size={10}/>
                    </a>
                  )}

                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)' }}>OPEN ›</span>
                </Link>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
