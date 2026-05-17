'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/geo-revenue — revenue concentration by country.
 *
 * Uses the existing /api/admin/analytics-extras?view=geo endpoint
 * which is backed by the admin_geo_revenue RPC. We already render
 * a tiny variant on the analytics-extras tab; this dedicated page
 * adds the bar-graph + sortable header + 30/90/180/365 day picker
 * the team's been asking for.
 *
 * Rendering trick: instead of a chart library, draw one inline bar
 * per row scaled to the max signups-or-paying value. ~50 LoC, no
 * runtime deps.
 */

import { useEffect, useMemo, useState } from 'react'
import { Globe2, RefreshCw, ArrowUpDown } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface GeoRow {
  country:      string
  paying_users: number
  signups:      number
}

const WINDOWS = [
  { label: '30d',  days: 30 },
  { label: '90d',  days: 90 },
  { label: '180d', days: 180 },
  { label: '1y',   days: 365 },
]

type Sort = 'paying' | 'signups' | 'rate'

/** ISO-3166 alpha-2 → emoji flag. */
function flag(code: string): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return '🌐'
  const A = 0x1F1E6
  const upper = code.toUpperCase()
  return String.fromCodePoint(A + upper.charCodeAt(0) - 65, A + upper.charCodeAt(1) - 65)
}

export default function GeoRevenuePage() {
  const [rows,    setRows]    = useState<GeoRow[]>([])
  const [days,    setDays]    = useState(90)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')
  const [sortBy,  setSortBy]  = useState<Sort>('paying')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`/api/admin/analytics-extras?view=geo&days=${days}`, { cache: 'no-store' })
      const j = await r.json() as { rows?: GeoRow[]; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.rows || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const data = [...rows]
    if (sortBy === 'paying')  data.sort((a, b) => b.paying_users - a.paying_users)
    if (sortBy === 'signups') data.sort((a, b) => b.signups - a.signups)
    if (sortBy === 'rate')    data.sort((a, b) => {
      const ra = a.signups ? a.paying_users / a.signups : 0
      const rb = b.signups ? b.paying_users / b.signups : 0
      return rb - ra
    })
    return data
  }, [rows, sortBy])

  const totals = useMemo(() => ({
    countries: rows.length,
    paying:    rows.reduce((s, r) => s + r.paying_users, 0),
    signups:   rows.reduce((s, r) => s + r.signups, 0),
  }), [rows])

  const maxBar = useMemo(() =>
    Math.max(1, ...rows.map(r => Math.max(r.paying_users, r.signups))),
    [rows]
  )

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<Globe2 size={28}/>}
        eyebrow="Growth · geo"
        title="Geographic revenue"
        subtitle="Where revenue concentrates by country. Use this to prioritise localisation, regional payment methods, and timezone-aware support."
        metric={{
          label:     'Countries',
          value:     totals.countries.toLocaleString(),
          secondary: `${totals.paying.toLocaleString()} paying · ${totals.signups.toLocaleString()} signups`,
        }}
      />

      {/* Window picker + refresh */}
      <div className="card-premium" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Window</span>
        {WINDOWS.map(w => (
          <button
            key={w.label}
            onClick={() => setDays(w.days)}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: 11, minHeight: 28,
              background:   days === w.days ? 'var(--blue-bg)'  : undefined,
              color:        days === w.days ? 'var(--blue)'     : undefined,
              borderColor:  days === w.days ? 'rgba(56,139,253,0.4)' : undefined,
            }}
          >{w.label}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', minHeight: 30 }} onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      <Section accent="blue" title="By country" description={loading ? 'Loading…' : err ? `Error: ${err}` : `${sorted.length} countries`}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 14 }}/>
            ))}
          </div>
        ) : err ? (
          <EmptyState icon={<Globe2 size={20}/>} title="Couldn't load" description={err}/>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Globe2 size={20}/>}
            title="No country breakdown"
            description="Make sure profiles.country is populated on signup."
          />
        ) : (
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            {/* Sortable header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) 1fr 1fr 0.8fr 1.6fr',
              padding: '10px 18px', gap: 12,
              fontSize: 10.5, fontWeight: 700, color: 'var(--t4)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              background: 'var(--bg3)',
            }}>
              <div>Country</div>
              <SortHead label="Paying"   active={sortBy === 'paying'}  onClick={() => setSortBy('paying')}/>
              <SortHead label="Signups"  active={sortBy === 'signups'} onClick={() => setSortBy('signups')}/>
              <SortHead label="Paid %"   active={sortBy === 'rate'}    onClick={() => setSortBy('rate')}/>
              <div>Distribution</div>
            </div>
            {sorted.map((r) => {
              const rate    = r.signups ? Math.round((r.paying_users / r.signups) * 100) : 0
              const payPct  = (r.paying_users / maxBar) * 100
              const signPct = (r.signups      / maxBar) * 100
              return (
                <div key={r.country} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) 1fr 1fr 0.8fr 1.6fr',
                  padding: '12px 18px', gap: 12,
                  alignItems: 'center', borderTop: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>
                    <span style={{ fontSize: 18 }}>{flag(r.country)}</span>
                    {r.country}
                  </div>
                  <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--green-val, var(--green))', fontWeight: 700 }}>
                    {r.paying_users.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--t2)' }}>
                    {r.signups.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: rate >= 5 ? 'var(--green)' : rate >= 2 ? 'var(--amber)' : 'var(--t3)' }}>
                    {rate}%
                  </div>
                  {/* Mini bar: signups grey under, paying green over */}
                  <div style={{ position: 'relative', height: 18 }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 4, bottom: 4,
                      width: `${signPct}%`, background: 'var(--surface2)',
                      borderRadius: 3,
                    }}/>
                    <div style={{
                      position: 'absolute', left: 0, top: 2, bottom: 2,
                      width: `${payPct}%`,
                      background: 'linear-gradient(90deg, var(--green) 0%, var(--green)88 100%)',
                      borderRadius: 3,
                    }}/>
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

function SortHead({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        textAlign: 'left', padding: 0,
        color: active ? 'var(--blue)' : 'var(--t4)',
        textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10.5, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}
    >
      {label} <ArrowUpDown size={9}/>
    </button>
  )
}
