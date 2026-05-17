'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/top-referrers — leaderboard of users who brought in the most
 * referrals. Ranked by `rewarded` count first (the only outcome that
 * actually costs us money), then `converted`, then `total`.
 *
 * Hooks: click any row to drill into the user profile. Click "Open
 * referrals" to see the full referral_events for that user.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, RefreshCw, Trophy, ExternalLink, Gift, ArrowRight,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface TopReferrer {
  id:           string
  email:        string | null
  full_name:    string | null
  total:        number
  converted:    number
  rewarded:     number
  reward_total: number
  latest_at:    string | null
}

interface Totals { rows: number; unique_referrers: number }

const RANK_MEDAL: Record<number, { icon: string; fg: string; bg: string }> = {
  1: { icon: '🥇', fg: '#f5c518', bg: 'rgba(245,197,24,0.13)' },
  2: { icon: '🥈', fg: '#cbd5e1', bg: 'rgba(203,213,225,0.10)' },
  3: { icon: '🥉', fg: '#d97706', bg: 'rgba(217,119,6,0.13)' },
}

function ymd(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

export default function TopReferrersPage() {
  const [rows,    setRows]    = useState<TopReferrer[]>([])
  const [totals,  setTotals]  = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/top-referrers', { cache: 'no-store' })
      const j = await r.json() as { referrers?: TopReferrer[]; totals?: Totals; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.referrers || [])
      setTotals(j.totals || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const rewardSum = rows.reduce((s, r) => s + (r.reward_total || 0), 0)

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Trophy size={28}/>}
        eyebrow="Growth"
        title="Top referrers"
        subtitle="Ranked by rewarded referrals (the ones that actually pay out). These are the users to thank, gift, or invite into a beta — they're already evangelising for free."
        metric={{
          label:     'Unique referrers',
          value:     (totals?.unique_referrers ?? 0).toLocaleString(),
          secondary: `$${rewardSum.toLocaleString(undefined, { maximumFractionDigits: 2 })} paid out`,
        }}
      />

      <Section
        accent="amber"
        title="Leaderboard"
        description={loading ? 'Loading…' : err ? `Error: ${err}` : `${rows.length} of ${totals?.unique_referrers ?? 0}`}
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
          <EmptyState icon={<Users size={20}/>} title="Couldn't load" description={err}/>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Gift size={20}/>}
            title="No referrals yet"
            description="Once referral_events starts collecting rows, top referrers will be ranked here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {rows.map((r, i) => {
              const rank = i + 1
              const medal = RANK_MEDAL[rank]
              return (
                <div
                  key={r.id}
                  style={{
                    background: medal ? medal.bg : 'var(--bg2)',
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                    borderLeft: medal ? `3px solid ${medal.fg}` : '3px solid transparent',
                  }}
                >
                  {/* Rank */}
                  <span style={{
                    fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 18,
                    color: medal ? medal.fg : 'var(--t3)',
                    minWidth: 40, textAlign: 'center', flexShrink: 0,
                  }}>
                    {medal ? medal.icon : `#${rank}`}
                  </span>

                  {/* Identity */}
                  <Link href={`/admin/users/${r.id}`} style={{ flex: 1, minWidth: 240, textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--t1)' }}>
                      {r.full_name || r.email?.split('@')[0] || '(unknown referrer)'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', marginTop: 2 }}>
                      {r.email || '—'}
                    </div>
                  </Link>

                  {/* Counts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <Stat label="rewarded" value={r.rewarded} tone="green"/>
                    <Stat label="converted" value={r.converted} tone="blue"/>
                    <Stat label="total" value={r.total} tone="muted"/>
                  </div>

                  {/* Reward total */}
                  <div style={{ minWidth: 100, textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
                      ${r.reward_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginTop: 2 }}>
                      Paid
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--t4)', minWidth: 100, textAlign: 'right' }}>
                    last {ymd(r.latest_at)}
                  </div>

                  <Link
                    href={`/admin/referrals?q=${r.id}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 700, color: 'var(--acc)',
                      textDecoration: 'none', padding: '4px 10px', borderRadius: 999,
                      border: '1px solid var(--acc-border)', background: 'var(--acc-bg)',
                    }}
                  >
                    <ExternalLink size={10}/> Events
                  </Link>
                  <ArrowRight size={14} style={{ color: 'var(--t4)', flexShrink: 0 }}/>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'muted' }) {
  const colors = {
    green:  { fg: 'var(--green)', bg: 'var(--green-bg)' },
    blue:   { fg: 'var(--blue)',  bg: 'var(--blue-bg)'  },
    muted:  { fg: 'var(--t3)',    bg: 'var(--surface2)' },
  }
  const t = colors[tone]
  return (
    <div style={{ textAlign: 'center', minWidth: 56 }}>
      <div style={{
        fontSize: 16, fontWeight: 800, color: t.fg,
        background: t.bg, borderRadius: 8,
        padding: '4px 10px',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginTop: 3 }}>
        {label}
      </div>
    </div>
  )
}
