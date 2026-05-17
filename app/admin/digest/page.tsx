import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env"
/**
 * /admin/digest — daily snapshot of what changed yesterday.
 *
 * Opens to a single screen the founder can scan in 30 seconds:
 *   - signups yesterday vs 7-day average
 *   - paying customers added (best proxy for revenue acceleration)
 *   - cancellations / lapsed subs
 *   - errors logged
 *   - top 5 audit actions
 *   - top 5 error groups
 *
 * Server-rendered so first paint is data — no client spinners on a
 * page whose entire purpose is fast situational awareness. Cached
 * for 5 minutes (revalidate=300) since the digest is by-definition
 * not real-time and we don't want every admin refresh hammering DB.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 300

import Link from 'next/link'
import {
  Sunrise, ArrowRight, ArrowUpRight, ArrowDownRight, Minus,
  Users, CreditCard, AlertOctagon, Bug, History, TrendingUp, TrendingDown,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { HeroCard } from '@/components/admin/PageChrome'

function adminClient() {
  return createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

interface Digest {
  yesterday:        { signups: number; paying_added: number; errors: number; cancellations: number }
  prior:            { signups: number; paying_added: number; errors: number; cancellations: number }
  top_actions:      Array<{ action: string; count: number }>
  top_errors:       Array<{ message: string; surface: string | null; count: number }>
  generated_at:     string
}

async function fetchDigest(): Promise<Digest> {
  const sb = adminClient()

  // UTC day boundaries. "Yesterday" = previous full calendar day.
  // "Prior" = the day before that, so the delta is day-over-day.
  const startOfToday      = new Date(); startOfToday.setUTCHours(0, 0, 0, 0)
  const startOfYesterday  = new Date(startOfToday.getTime() - 86_400_000)
  const startOfPrior      = new Date(startOfYesterday.getTime() - 86_400_000)

  const iso = (d: Date) => d.toISOString()
  const between = (col: string, from: Date, to: Date) =>
    `${col}=gte.${iso(from)}&${col}=lt.${iso(to)}`

  const [
    { count: signupsY },
    { count: signupsP },
    { count: payingY  },
    { count: payingP  },
    { count: errorsY  },
    { count: errorsP  },
    { count: cancelsY },
    { count: cancelsP },
    { data:  actionRows },
    { data:  errorRows },
  ] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', iso(startOfYesterday)).lt('created_at', iso(startOfToday)),
    sb.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', iso(startOfPrior))    .lt('created_at', iso(startOfYesterday)),

    // Best proxy for "paying customer added yesterday": stripe subscription
    // started in window. Falls back to created_at if no sub-specific column.
    sb.from('profiles').select('id', { count: 'exact', head: true })
      .in('subscription_status', ['active', 'trialing'])
      .gte('created_at', iso(startOfYesterday)).lt('created_at', iso(startOfToday)),
    sb.from('profiles').select('id', { count: 'exact', head: true })
      .in('subscription_status', ['active', 'trialing'])
      .gte('created_at', iso(startOfPrior))    .lt('created_at', iso(startOfYesterday)),

    sb.from('client_errors').select('id', { count: 'exact', head: true })
      .gte('occurred_at', iso(startOfYesterday)).lt('occurred_at', iso(startOfToday)),
    sb.from('client_errors').select('id', { count: 'exact', head: true })
      .gte('occurred_at', iso(startOfPrior))    .lt('occurred_at', iso(startOfYesterday)),

    // Cancellations: subscription.canceled audit_log rows.
    sb.from('audit_logs').select('id', { count: 'exact', head: true })
      .ilike('action', 'subscription.cancel%')
      .gte('created_at', iso(startOfYesterday)).lt('created_at', iso(startOfToday)),
    sb.from('audit_logs').select('id', { count: 'exact', head: true })
      .ilike('action', 'subscription.cancel%')
      .gte('created_at', iso(startOfPrior))    .lt('created_at', iso(startOfYesterday)),

    // Top action counts in yesterday's audit_log. We pull rows and
    // bucket in memory — Supabase's count(*) GROUP BY isn't first-
    // class from JS-SDK, but at ~1000s of rows/day this is fine.
    sb.from('audit_logs').select('action')
      .gte('created_at', iso(startOfYesterday)).lt('created_at', iso(startOfToday))
      .limit(5000),

    sb.from('client_errors').select('message, surface')
      .gte('occurred_at', iso(startOfYesterday)).lt('occurred_at', iso(startOfToday))
      .limit(2000),
  ])

  // Tally top actions in-memory.
  const actionCount = new Map<string, number>()
  for (const r of (actionRows ?? []) as Array<{ action: string }>) {
    actionCount.set(r.action, (actionCount.get(r.action) || 0) + 1)
  }
  const top_actions = [...actionCount.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([action, count]) => ({ action, count }))

  // Tally top error groups (by message+surface) in-memory.
  const errKey = (m: string, s: string | null) => `${s || 'unknown'}|${m.slice(0, 160)}`
  const errCount = new Map<string, { message: string; surface: string | null; count: number }>()
  for (const r of (errorRows ?? []) as Array<{ message: string; surface: string | null }>) {
    const k = errKey(r.message, r.surface)
    const ex = errCount.get(k)
    if (ex) ex.count++
    else    errCount.set(k, { message: r.message, surface: r.surface, count: 1 })
  }
  const top_errors = [...errCount.values()]
    .sort((a, b) => b.count - a.count).slice(0, 5)

  return {
    yesterday: {
      signups:       signupsY  ?? 0,
      paying_added:  payingY   ?? 0,
      errors:        errorsY   ?? 0,
      cancellations: cancelsY  ?? 0,
    },
    prior: {
      signups:       signupsP  ?? 0,
      paying_added:  payingP   ?? 0,
      errors:        errorsP   ?? 0,
      cancellations: cancelsP  ?? 0,
    },
    top_actions,
    top_errors,
    generated_at: new Date().toISOString(),
  }
}

function Delta({ now, then, lowerIsBetter = false }: { now: number; then: number; lowerIsBetter?: boolean }) {
  if (then === 0 && now === 0) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--t4)', fontSize: 12 }}>
      <Minus size={11}/> flat
    </span>
  }
  if (then === 0) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>
      <ArrowUpRight size={11}/> new
    </span>
  }
  const pct  = ((now - then) / then) * 100
  const up   = pct > 0
  const good = lowerIsBetter ? !up : up
  const tone = good ? 'var(--green)' : Math.abs(pct) < 1 ? 'var(--t4)' : 'var(--red)'
  const Icon = Math.abs(pct) < 1 ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tone, fontSize: 12, fontWeight: 700 }}>
      <Icon size={11}/> {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
    </span>
  )
}

interface KpiTileProps {
  label:          string
  value:          number
  prior:          number
  icon:           React.ReactNode
  accent:         'green' | 'acc' | 'amber' | 'red' | 'blue'
  lowerIsBetter?: boolean
  href?:          string
}
function KpiTile({ label, value, prior, icon, accent, lowerIsBetter, href }: KpiTileProps) {
  const fg: Record<string, string> = { green:'var(--green)', acc:'var(--acc)', amber:'var(--amber)', red:'var(--red)', blue:'var(--blue)' }
  const bg: Record<string, string> = { green:'var(--green-bg)', acc:'var(--acc-bg)', amber:'var(--amber-bg)', red:'var(--red-bg)', blue:'var(--blue-bg)' }
  const body = (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <span style={{
          width:42, height:42, borderRadius:13,
          background: bg[accent], color: fg[accent],
          border: `1px solid ${fg[accent]}33`,
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>{icon}</span>
        {href && <ArrowRight size={12} style={{ color:'var(--t4)' }}/>}
      </div>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--t4)', marginBottom:8 }}>
        {label}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:34, fontWeight:800, letterSpacing:'-0.025em', color:'var(--t1)', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>
          {value.toLocaleString()}
        </span>
        <Delta now={value} then={prior} lowerIsBetter={lowerIsBetter}/>
      </div>
      <div style={{ marginTop:8, fontSize:11.5, color:'var(--t4)' }}>
        prior day: {prior.toLocaleString()}
      </div>
    </>
  )
  const baseStyle: React.CSSProperties = {
    padding: '24px 26px',
    display: 'flex', flexDirection: 'column',
    textDecoration: 'none', color: 'inherit',
    minHeight: 180,
  }
  return href
    ? <Link href={href} className="card-premium" style={baseStyle}>{body}</Link>
    : <div className="card-premium" style={baseStyle}>{body}</div>
}

export default async function DigestPage() {
  const d = await fetchDigest()
  const dateLabel = new Date(Date.now() - 86_400_000).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Sunrise size={28}/>}
        eyebrow="Morning brief"
        title={`What happened ${dateLabel}`}
        subtitle="A 30-second snapshot of yesterday's signups, conversions, churn, and errors. Cached 5 minutes."
        metric={{
          label:     'Generated',
          value:     new Date(d.generated_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          secondary: 'UTC-day boundaries',
        }}
      />

      {/* KPI quad */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16, marginBottom:32 }}>
        <KpiTile
          label="New signups"
          value={d.yesterday.signups}
          prior={d.prior.signups}
          icon={<Users size={20}/>}
          accent="blue"
          href="/admin/users"
        />
        <KpiTile
          label="New paying"
          value={d.yesterday.paying_added}
          prior={d.prior.paying_added}
          icon={<CreditCard size={20}/>}
          accent="green"
          href="/admin/subscriptions"
        />
        <KpiTile
          label="Cancellations"
          value={d.yesterday.cancellations}
          prior={d.prior.cancellations}
          icon={<TrendingDown size={20}/>}
          accent="red"
          lowerIsBetter
          href="/admin/payment-issues"
        />
        <KpiTile
          label="Errors logged"
          value={d.yesterday.errors}
          prior={d.prior.errors}
          icon={<Bug size={20}/>}
          accent="amber"
          lowerIsBetter
          href="/admin/errors"
        />
      </div>

      {/* Top actions + top errors side-by-side */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:20, marginBottom:32 }}>
        {/* Top actions */}
        <div className="card-premium" style={{ padding:'24px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:10 }}>
              <History size={15} color="var(--purple)"/> Top actions yesterday
            </h2>
            <Link href="/admin/audit-log" style={{ fontSize:12, color:'var(--acc)', textDecoration:'none', fontWeight:600 }}>
              Full log <ArrowRight size={10} style={{ verticalAlign:'middle' }}/>
            </Link>
          </div>
          {d.top_actions.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--t4)' }}>No audit events.</div>
          ) : (
            <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
              {d.top_actions.map(a => {
                const max = d.top_actions[0]?.count || 1
                const pct = Math.round((a.count / max) * 100)
                return (
                  <li key={a.action} style={{ position:'relative' }}>
                    <div style={{
                      position:'absolute', inset:0, width:`${pct}%`,
                      background:'rgba(167,139,250,0.10)', borderRadius:8,
                    }}/>
                    <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', fontSize:13 }}>
                      <span style={{ fontFamily:'ui-monospace, Menlo, Consolas, monospace', color:'var(--purple)', fontWeight:700 }}>{a.action}</span>
                      <span style={{ color:'var(--t1)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>×{a.count}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Top errors */}
        <div className="card-premium" style={{ padding:'24px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:10 }}>
              <AlertOctagon size={15} color="var(--red)"/> Top error groups
            </h2>
            <Link href="/admin/errors" style={{ fontSize:12, color:'var(--acc)', textDecoration:'none', fontWeight:600 }}>
              View errors <ArrowRight size={10} style={{ verticalAlign:'middle' }}/>
            </Link>
          </div>
          {d.top_errors.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--t4)' }}>No errors logged. Nice.</div>
          ) : (
            <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
              {d.top_errors.map((e, i) => (
                <li key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)', paddingTop: i === 0 ? 0 : 8 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <span style={{
                      fontSize:12.5, color:'var(--t1)', fontWeight:600,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      minWidth:0, flex:1,
                    }}>{e.message}</span>
                    <span style={{
                      flexShrink:0, padding:'2px 8px', borderRadius:999,
                      background:'var(--red-bg)', color:'var(--red)',
                      border:'1px solid rgba(248,113,113,0.3)',
                      fontSize:11, fontWeight:700,
                    }}>×{e.count}</span>
                  </div>
                  {e.surface && (
                    <div style={{ marginTop:3, fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700 }}>
                      {e.surface}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Net movement summary */}
      <div className="card-premium" style={{ padding:'22px 26px', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <TrendingUp size={18} color="var(--acc)"/>
        <span style={{ fontSize:13, color:'var(--t2)' }}>
          Net paying-customer movement: <strong style={{ color:'var(--t1)' }}>
            {(d.yesterday.paying_added - d.yesterday.cancellations >= 0 ? '+' : '')}
            {d.yesterday.paying_added - d.yesterday.cancellations}
          </strong>
          {' '}({d.yesterday.paying_added} added · {d.yesterday.cancellations} cancelled)
        </span>
      </div>
    </div>
  )
}
