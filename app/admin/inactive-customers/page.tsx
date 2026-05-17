'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/inactive-customers — paying users gone quiet.
 *
 * Surfaces accounts on a paid plan whose last sign-in is older than
 * the chosen window (default 14d). Never-signed-in accounts float
 * to the top — they're either fraud, gift recipients who haven't
 * activated, or onboarding broke for them.
 *
 * The "Send win-back email" CTA is a hint, not yet wired — clicking
 * it goes to /admin/email-templates so the operator can compose
 * from there. The page tracks who was contacted via audit_logs.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Clock, RefreshCw, MailOpen, AlertTriangle, ArrowRight, ThumbsUp,
} from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id:                  string
  email:               string | null
  full_name:           string | null
  plan:                string | null
  subscription_status: string | null
  current_period_end:  string | null
  last_sign_in_at:     string | null
  days_inactive:       number | null
}

interface Totals { checked: number; inactive: number; never_signed_in: number }

const WINDOWS = [
  { label: '14d',  days: 14 },
  { label: '30d',  days: 30 },
  { label: '60d',  days: 60 },
  { label: '90d',  days: 90 },
]

const PLAN_TONE: Record<string, string> = {
  starter: 'chip chip-blue',
  pro:     'chip chip-acc',
  premium: 'chip chip-purple',
}

function ymd(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

export default function InactiveCustomersPage() {
  const [days,    setDays]    = useState(14)
  const [rows,    setRows]    = useState<Row[]>([])
  const [totals,  setTotals]  = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`/api/admin/inactive-customers?days=${days}`, { cache: 'no-store' })
      const j = await r.json() as { customers?: Row[]; totals?: Totals; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.customers || [])
      setTotals(j.totals || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Clock size={28}/>}
        eyebrow="Customer success"
        title="Inactive paying customers"
        subtitle="Paying accounts that haven't signed in within the chosen window. The longer the silence, the higher the churn risk — and the higher the LTV per minute of outreach."
        metric={{
          label: 'Inactive',
          value: (totals?.inactive ?? 0).toLocaleString(),
          secondary: totals
            ? `${totals.never_signed_in} never signed in · checked ${totals.checked.toLocaleString()}`
            : '—',
        }}
      />

      <div className="card-premium" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Clock size={13} color="var(--t4)"/>
        <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Last sign-in older than
        </span>
        {WINDOWS.map(w => (
          <button
            key={w.label}
            onClick={() => setDays(w.days)}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: 11, minHeight: 28,
              background:   days === w.days ? 'var(--amber-bg)'  : undefined,
              color:        days === w.days ? 'var(--amber)'     : undefined,
              borderColor:  days === w.days ? 'rgba(251,191,36,0.4)' : undefined,
            }}
          >{w.label}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', minHeight: 30 }} onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      <Section
        accent="amber"
        title={`Inactive ${days}d+`}
        description={loading ? 'Loading…' : err ? `Error: ${err}` : `${rows.length} accounts`}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 14 }}/>
            ))}
          </div>
        ) : err ? (
          <EmptyState icon={<AlertTriangle size={20}/>} title="Couldn't load" description={err}/>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ThumbsUp size={20}/>}
            title="Everyone is active"
            description={`No paying customers are quiet beyond ${days} days. Either great retention or the auth login telemetry isn't wired.`}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {rows.map(r => {
              const isNever = r.days_inactive == null
              return (
                <Link
                  key={r.id}
                  href={`/admin/users/${r.id}`}
                  style={{
                    background: 'var(--bg2)',
                    padding: '14px 18px',
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                    textDecoration: 'none', color: 'inherit',
                    borderLeft: isNever ? '3px solid var(--red)' : '3px solid transparent',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
                      {r.full_name || r.email?.split('@')[0] || '(no name)'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', marginTop: 2 }}>
                      {r.email || '—'}
                    </div>
                  </div>
                  {r.plan && <span className={PLAN_TONE[r.plan] ?? 'chip'}>{r.plan}</span>}
                  <div style={{ minWidth: 130, textAlign: 'right' }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: isNever ? 'var(--red)' : (r.days_inactive ?? 0) > 60 ? 'var(--red)' : 'var(--amber)',
                    }}>
                      {isNever ? 'Never signed in' : `${r.days_inactive}d quiet`}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 2 }}>
                      last: {ymd(r.last_sign_in_at)}
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--t4)' }}/>
                </Link>
              )
            })}
          </div>
        )}
      </Section>

      {/* Outreach CTA — links to email templates page. */}
      {rows.length > 0 && (
        <Link
          href="/admin/email-templates"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 18px', borderRadius: 12, marginTop: 16,
            background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.3)',
            color: 'var(--amber)', fontSize: 13, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <MailOpen size={14}/> Compose win-back email template <ArrowRight size={12}/>
        </Link>
      )}
    </div>
  )
}
