/**
 * Admin dashboard — sophisticated bento layout, premium cards, animated
 * mesh-gradient hero. Uses the new visual layer in globals.css.
 */
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import {
  Users, CreditCard, Star, Crown, ArrowRight, DollarSign,
  TrendingUp, RefreshCw, UserPlus, Bell, FileText, Mail,
  Shield, Webhook, Megaphone, Tag, Activity, Sparkles,
} from 'lucide-react'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export const revalidate = 60

interface PlanCounts { free: number; starter: number; pro: number; premium: number }

async function fetchDashboard() {
  const sb = adminClient()
  const sinceMonth = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
  const sinceToday = new Date(Date.now() - 86400 * 1000).toISOString()

  const [
    { count: totalUsers },
    { data: planRows },
    { data: recentUsers },
    { data: recentOverrides },
    { count: signupsToday },
    { count: pendingReferrals },
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('profiles').select('plan').not('plan', 'is', null),
    sb.from('profiles').select('id, email, full_name, plan, created_at')
      .order('created_at', { ascending: false }).limit(8),
    sb.from('subscription_overrides').select('*').order('created_at', { ascending: false }).limit(6),
    sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sinceToday),
    sb.from('referral_events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const counts: PlanCounts = { free: 0, starter: 0, pro: 0, premium: 0 }
  ;(planRows ?? []).forEach((p: { plan?: string }) => {
    if (p.plan && p.plan in counts) counts[p.plan as keyof PlanCounts]++
  })
  const paying = counts.starter + counts.pro + counts.premium
  const mrrEstimate = counts.starter * 9 + counts.pro * 29 + counts.premium * 99

  let refunds30d = 0
  try {
    const { data: refundRows } = await sb
      .from('subscription_overrides')
      .select('*')
      .eq('type', 'refund')
      .gte('created_at', sinceMonth)
    refunds30d = refundRows?.length ?? 0
  } catch { /* ignore */ }

  // Build a fake 7-day signup sparkline from real DB if possible.
  let signupHistory: number[] = []
  try {
    const { data: hist } = await sb
      .from('profiles')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString())
      .order('created_at', { ascending: true })
    const buckets = new Array<number>(7).fill(0)
    const now = Date.now()
    for (const row of (hist ?? []) as Array<{ created_at: string }>) {
      const dayIdx = Math.min(6, Math.max(0,
        6 - Math.floor((now - new Date(row.created_at).getTime()) / 86400000)
      ))
      buckets[dayIdx]++
    }
    signupHistory = buckets
  } catch { signupHistory = [0,0,0,0,0,0,0] }

  return {
    totalUsers: totalUsers ?? 0,
    counts,
    paying,
    mrrEstimate,
    signupsToday: signupsToday ?? 0,
    pendingReferrals: pendingReferrals ?? 0,
    refunds30d,
    recentUsers: recentUsers ?? [],
    recentOverrides: recentOverrides ?? [],
    signupHistory,
  }
}

const PLAN_BADGE: Record<string, string> = {
  free:     'badge-muted',
  starter:  'badge-blue',
  pro:      'badge-acc',
  premium:  'badge-purple',
}

interface RecentUser { id: string; email: string; full_name: string | null; plan: string | null; created_at: string }
interface OverrideRow { id: string; type: string; reason: string | null; created_at: string }

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null
  const max = Math.max(1, ...data)
  const w = 100
  const h = 32
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`sparkfill-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${points} ${w},${h}`} fill={`url(#sparkfill-${color.replace('#','')})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AdminDashboard() {
  // Note: Promise resolution moved up so we have data in scope.
  return <DashboardInner />
}

async function DashboardInner() {
  const data = await fetchDashboard()
  const hour = new Date().getUTCHours()
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ maxWidth: 1240 }}>
      {/* Mesh hero */}
      <section className="mesh-hero" style={{ marginBottom: 32 }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <div className="eyebrow-grad" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="live-dot" /> Live · admin console
            </div>
            <h1 className="display-h" style={{ marginBottom: 10 }}>
              {greeting}, admin.
            </h1>
            <p className="display-sub">
              {data.totalUsers.toLocaleString()} accounts — {data.paying.toLocaleString()} paying — {' '}
              <strong style={{ color: 'var(--t1)', fontWeight: 700 }}>${data.mrrEstimate.toLocaleString()}</strong> estimated MRR.
              {data.signupsToday > 0 && (
                <> · <span style={{ color: 'var(--green)', fontWeight: 600 }}>+{data.signupsToday}</span> signups today.</>
              )}
              {data.pendingReferrals > 0 && (
                <> · <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{data.pendingReferrals}</span> referrals awaiting review.</>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
            <span className="pill-soft">
              <Sparkles size={11} style={{ color: 'var(--purple)' }} /> v3.0
            </span>
            <Link href="/admin/finance" className="pill-soft interactive" style={{ paddingRight: 14 }}>
              <DollarSign size={12} style={{ color: 'var(--green)' }} /> Open finance <ArrowRight size={11} style={{ opacity: 0.55 }}/>
            </Link>
            <Link href="/admin/users" className="pill-soft interactive" style={{ paddingRight: 14 }}>
              <Users size={12} style={{ color: 'var(--blue)' }} /> Browse users <ArrowRight size={11} style={{ opacity: 0.55 }}/>
            </Link>
          </div>
        </div>
      </section>

      {/* Bento KPI grid */}
      <div className="bento-grid" style={{ marginBottom: 24 }}>
        {/* Featured signup card with sparkline — span-5 */}
        <div className="span-5 stat-card card-premium" style={{ padding: 28, minHeight: 180 }}>
          <Users size={16} className="stat-icon" style={{ color: 'var(--blue)' }} />
          <div className="stat-label" style={{ color: 'var(--blue)' }}>Total signups · 7d</div>
          <div className="stat-value" style={{ fontSize: 44 }}>{data.totalUsers.toLocaleString()}</div>
          {data.signupsToday > 0 && (
            <span className="stat-delta up">▲ +{data.signupsToday} today</span>
          )}
          <div className="stat-spark">
            <Sparkline data={data.signupHistory} color="#60a5fa" />
          </div>
        </div>

        {/* Paying customers — span-4 */}
        <div className="span-4 stat-card card-premium" style={{ padding: 28 }}>
          <CreditCard size={16} className="stat-icon" style={{ color: 'var(--acc)' }} />
          <div className="stat-label" style={{ color: 'var(--acc)' }}>Paying customers</div>
          <div className="stat-value">{data.paying.toLocaleString()}</div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--t3)' }}>
            <strong style={{ color: 'var(--t1)', fontWeight: 700 }}>{data.totalUsers ? Math.round(data.paying / data.totalUsers * 100) : 0}%</strong>
            {' '}of total accounts
          </div>
        </div>

        {/* MRR — span-3 */}
        <div className="span-3 stat-card card-premium" style={{ padding: 28 }}>
          <TrendingUp size={16} className="stat-icon" style={{ color: 'var(--green)' }} />
          <div className="stat-label" style={{ color: 'var(--green)' }}>MRR estimate</div>
          <div className="stat-value">${data.mrrEstimate.toLocaleString()}</div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t4)' }}>per month</div>
        </div>

        {/* Pro / Premium / Pending refs — span-4 each */}
        <div className="span-4 stat-card card-premium">
          <Star size={14} className="stat-icon" style={{ color: 'var(--purple)' }} />
          <div className="stat-label" style={{ color: 'var(--purple)' }}>Pro</div>
          <div className="stat-value">{data.counts.pro.toLocaleString()}</div>
        </div>
        <div className="span-4 stat-card card-premium">
          <Crown size={14} className="stat-icon" style={{ color: 'var(--amber)' }} />
          <div className="stat-label" style={{ color: 'var(--amber)' }}>Premium</div>
          <div className="stat-value">{data.counts.premium.toLocaleString()}</div>
        </div>
        <div className="span-4 stat-card card-premium">
          <UserPlus size={14} className="stat-icon" style={{ color: 'var(--red)' }} />
          <div className="stat-label" style={{ color: 'var(--red)' }}>Pending referrals</div>
          <div className="stat-value">{data.pendingReferrals.toLocaleString()}</div>
          {data.pendingReferrals > 0 && (
            <Link href="/admin/referrals" style={{ display: 'inline-block', marginTop: 12, fontSize: 11, color: 'var(--red)', textDecoration: 'none', fontWeight: 600 }}>
              Review now →
            </Link>
          )}
        </div>
      </div>

      {/* Plan distribution + activity feed in bento */}
      <div className="bento-grid" style={{ marginBottom: 24 }}>
        <div className="span-7 card-premium" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <div className="eyebrow-grad" style={{ marginBottom: 4 }}>Distribution</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em', margin: 0 }}>Plan distribution</h3>
            </div>
            <span className="pill-soft">{data.totalUsers.toLocaleString()} users</span>
          </div>
          {[
            { plan: 'Free',    count: data.counts.free,    color: '#9ca3af',    pct: data.totalUsers ? Math.round(data.counts.free    / data.totalUsers * 100) : 0 },
            { plan: 'Starter', count: data.counts.starter, color: '#60a5fa',    pct: data.totalUsers ? Math.round(data.counts.starter / data.totalUsers * 100) : 0 },
            { plan: 'Pro',     count: data.counts.pro,     color: '#2dd4a4',    pct: data.totalUsers ? Math.round(data.counts.pro     / data.totalUsers * 100) : 0 },
            { plan: 'Premium', count: data.counts.premium, color: '#a78bfa',    pct: data.totalUsers ? Math.round(data.counts.premium / data.totalUsers * 100) : 0 },
          ].map(p => (
            <div key={p.plan} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--t1)', fontSize: 13, fontWeight: 600 }}>{p.plan}</span>
                <span className="num-tabular" style={{ color: 'var(--t3)', fontSize: 12 }}>
                  <strong style={{ color: 'var(--t1)' }}>{p.count.toLocaleString()}</strong>
                  <span style={{ marginLeft: 8, opacity: 0.7 }}>{p.pct}%</span>
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${p.pct}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}66 100%)`,
                  borderRadius: 999,
                  boxShadow: `0 0 12px ${p.color}55`,
                  transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          ))}
        </div>

        <div className="span-5 card-premium" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <div className="eyebrow-grad" style={{ marginBottom: 4 }}>Audit</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em', margin: 0 }}>Recent admin actions</h3>
            </div>
            <Link href="/admin/audit-log" style={{ fontSize: 12, color: 'var(--acc)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              All <ArrowRight size={11} />
            </Link>
          </div>
          {data.recentOverrides.length === 0 ? (
            <div style={{ color: 'var(--t4)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
              No recent actions yet.
            </div>
          ) : (
            <div>
              {(data.recentOverrides as OverrideRow[]).map(o => (
                <div key={o.id} className="activity-row">
                  <div className="activity-dot">
                    <Activity size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span className="badge badge-acc" style={{ fontSize: 10, fontWeight: 800 }}>{o.type}</span>
                      <span style={{ color: 'var(--t1)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.reason || 'No reason recorded'}</span>
                    </div>
                    <div className="activity-meta">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent signups table */}
      <div className="card-premium" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="eyebrow-grad" style={{ marginBottom: 4 }}>Latest</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              Recent signups
              {data.signupsToday > 0 && <span className="pill-soft" style={{ background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'rgba(52,211,153,0.22)' }}>+{data.signupsToday} today</span>}
            </h3>
          </div>
          <Link href="/admin/users" style={{ fontSize: 12, color: 'var(--acc)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            All users <ArrowRight size={11} />
          </Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Plan', 'Joined', ''].map(h => (
                <th key={h} style={{ padding: '14px 28px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.recentUsers as RecentUser[]).map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32,
                      borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(135deg, var(--acc-bg) 0%, var(--purple-bg) 100%)`,
                      color: 'var(--acc)',
                      fontWeight: 800, fontSize: 12,
                      border: '1px solid var(--border)',
                    }}>
                      {((u.full_name || u.email || '?').slice(0,1).toUpperCase())}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.full_name || u.email?.split('@')[0] || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 28px' }}>
                  <span className={`badge ${PLAN_BADGE[u.plan || 'free'] || 'badge-muted'}`}>{u.plan || 'free'}</span>
                </td>
                <td style={{ padding: '16px 28px', fontSize: 12, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                  <Link href={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick actions */}
      <div className="bento-grid">
        {[
          { href: '/admin/finance',         icon: <DollarSign size={16}/>, label: 'Finance',       color: 'var(--green)'  },
          { href: '/admin/referrals',       icon: <UserPlus    size={16}/>, label: 'Referrals',     color: 'var(--red)'    },
          { href: '/admin/email-templates', icon: <Mail        size={16}/>, label: 'Emails',        color: 'var(--blue)'   },
          { href: '/admin/announcements',   icon: <Megaphone   size={16}/>, label: 'Announcements', color: 'var(--amber)'  },
          { href: '/admin/coupons',         icon: <Tag         size={16}/>, label: 'Coupons',       color: 'var(--purple)' },
          { href: '/admin/roles',           icon: <Shield      size={16}/>, label: 'Roles',         color: 'var(--purple)' },
          { href: '/admin/webhooks',        icon: <Webhook     size={16}/>, label: 'Webhooks',      color: 'var(--blue)'   },
          { href: '/admin/health',          icon: <Activity    size={16}/>, label: 'Health',        color: 'var(--green)'  },
          { href: '/admin/anomalies',       icon: <Bell        size={16}/>, label: 'Anomalies',     color: 'var(--red)'    },
          { href: '/admin/maintenance',     icon: <RefreshCw   size={16}/>, label: 'Maintenance',   color: 'var(--amber)'  },
          { href: '/admin/items',           icon: <FileText    size={16}/>, label: 'Open items',    color: 'var(--t2)'     },
          { href: '/admin/audit-log',       icon: <Activity    size={16}/>, label: 'Audit log',     color: 'var(--t2)'     },
        ].map(a => (
          <Link key={a.href} href={a.href} className="span-3 card-premium" style={{
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            cursor: 'pointer',
          }}>
            <span style={{
              width: 36, height: 36,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: a.color,
              flexShrink: 0,
            }}>{a.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{a.label}</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--t4)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
