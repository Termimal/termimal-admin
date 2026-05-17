'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/top-customers — VIP leaderboard ranked by estimated LTV.
 *
 * LTV is approximated as plan_price × months_active_since_signup,
 * not real invoice totals, but the ordering is good enough for
 * "who should we send a thank-you, which churners would hurt most".
 *
 * Top-3 rows get gold/silver/bronze accents so they stand out.
 * Each row deep-links into the user profile for full context.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Crown, RefreshCw, ArrowRight, CalendarClock, Trophy } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface TopCustomer {
  id:                  string
  email:               string | null
  full_name:           string | null
  plan:                string | null
  subscription_status: string | null
  current_period_end:  string | null
  created_at:          string
  months_active:       number
  ltv_estimate:        number
}

interface Totals {
  top_ltv:   number
  all_ltv:   number
  count_all: number
}

const PLAN_TONE: Record<string, string> = {
  starter: 'chip chip-blue',
  pro:     'chip chip-acc',
  premium: 'chip chip-purple',
}

const STATUS_TONE: Record<string, string> = {
  active:   'chip chip-green',
  trialing: 'chip chip-blue',
  past_due: 'chip chip-amber',
}

// Top 3 rows get an extra medal accent. Subtle, not loud.
const RANK_TONE: Record<number, { fg: string; bg: string; icon: string }> = {
  1: { fg: '#f5c518', bg: 'rgba(245,197,24,0.13)', icon: '🥇' },
  2: { fg: '#cbd5e1', bg: 'rgba(203,213,225,0.10)', icon: '🥈' },
  3: { fg: '#d97706', bg: 'rgba(217,119,6,0.13)',  icon: '🥉' },
}

function ymd(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

export default function TopCustomersPage() {
  const [rows,    setRows]    = useState<TopCustomer[]>([])
  const [totals,  setTotals]  = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/top-customers', { cache: 'no-store' })
      const j = await r.json() as { customers?: TopCustomer[]; totals?: Totals; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.customers || [])
      setTotals(j.totals || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Trophy size={28}/>}
        eyebrow="Customer success"
        title="Top customers"
        subtitle="Ranked by estimated lifetime value (plan price × months since signup). These are the relationships most worth investing in — proactive support, NPS outreach, and gifting all start here."
        metric={{
          label:     'Top 100 LTV',
          value:     totals ? `$${totals.top_ltv.toLocaleString()}` : '—',
          secondary: totals ? `${totals.count_all} paying total · $${totals.all_ltv.toLocaleString()} all-in` : '—',
        }}
      />

      <Section
        accent="purple"
        title="Leaderboard"
        description={loading ? 'Loading…' : err ? `Error: ${err}` : `${rows.length} customers`}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button className="btn btn-secondary btn-sm" style={{ minHeight: 32 }} onClick={load} disabled={loading}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 60, borderRadius: 14 }}/>
            ))}
          </div>
        ) : err ? (
          <EmptyState icon={<Crown size={20}/>} title="Couldn't load" description={err}/>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Crown size={20}/>}
            title="No paying customers yet"
            description="Once you have active subscriptions, they'll be ranked here by estimated LTV."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {rows.map((c, i) => {
              const rank = i + 1
              const medal = RANK_TONE[rank]
              return (
                <Link
                  key={c.id}
                  href={`/admin/users/${c.id}`}
                  style={{
                    background: medal ? medal.bg : 'var(--bg2)',
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                    textDecoration: 'none', color: 'inherit',
                    borderLeft: medal ? `3px solid ${medal.fg}` : '3px solid transparent',
                  }}
                >
                  {/* Rank cell */}
                  <span style={{
                    fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 18,
                    color: medal ? medal.fg : 'var(--t3)',
                    minWidth: 40, textAlign: 'center', flexShrink: 0,
                  }}>
                    {medal ? medal.icon : `#${rank}`}
                  </span>

                  {/* Identity */}
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--t1)' }}>
                      {c.full_name || c.email?.split('@')[0] || '(no name)'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', marginTop: 2 }}>
                      {c.email || '—'}
                    </div>
                  </div>

                  {/* Plan + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 130 }}>
                    {c.plan && <span className={PLAN_TONE[c.plan] ?? 'chip'}>{c.plan}</span>}
                    {c.subscription_status && <span className={STATUS_TONE[c.subscription_status] ?? 'chip'}>{c.subscription_status}</span>}
                  </div>

                  {/* Tenure */}
                  <div style={{ minWidth: 100, textAlign: 'right', fontSize: 12, color: 'var(--t3)' }}>
                    <CalendarClock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }}/>
                    {c.months_active} mo
                    <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 2 }}>since {ymd(c.created_at)}</div>
                  </div>

                  {/* LTV */}
                  <div style={{ minWidth: 90, textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
                      ${c.ltv_estimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginTop: 2 }}>
                      LTV est
                    </div>
                  </div>

                  <ArrowRight size={14} style={{ color: 'var(--t4)', flexShrink: 0 }}/>
                </Link>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
