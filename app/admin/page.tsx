/**
 * Admin dashboard — Revolut-style: oversize KPIs, generous spacing,
 * touch-friendly buttons, clear hierarchy. No bento clutter.
 */
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import {
  Users, CreditCard, ArrowRight, DollarSign, TrendingUp, UserPlus,
  Activity, Mail, Tag, Shield, Webhook, Bell, Megaphone, FileText,
  Settings, RefreshCw, Star, Crown,
} from 'lucide-react'
import { HeroCard } from '@/components/admin/PageChrome'

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
  const sinceToday = new Date(Date.now() - 86400 * 1000).toISOString()

  const [
    { count: totalUsers },
    { data: planRows },
    { data: recentUsers },
    { count: signupsToday },
    { count: pendingReferrals },
    { data: paidRows },
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('profiles').select('plan').not('plan', 'is', null),
    sb.from('profiles').select('id, email, full_name, plan, created_at')
      .order('created_at', { ascending: false }).limit(6),
    sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sinceToday),
    sb.from('referral_events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('profiles').select('plan')
      .in('subscription_status', ['active', 'past_due'])
      .not('stripe_subscription_id', 'is', null),
  ])

  const counts: PlanCounts = { free: 0, starter: 0, pro: 0, premium: 0 }
  ;(planRows ?? []).forEach((p: { plan?: string }) => {
    if (p.plan && p.plan in counts) counts[p.plan as keyof PlanCounts]++
  })

  const paidCounts: PlanCounts = { free: 0, starter: 0, pro: 0, premium: 0 }
  ;(paidRows ?? []).forEach((p: { plan?: string }) => {
    if (p.plan && p.plan in paidCounts) paidCounts[p.plan as keyof PlanCounts]++
  })
  const paying = paidCounts.starter + paidCounts.pro + paidCounts.premium
  const mrrEstimate = paidCounts.starter * 9 + paidCounts.pro * 9.99 + paidCounts.premium * 19.99

  return {
    totalUsers: totalUsers ?? 0,
    counts,
    paidCounts,
    paying,
    mrrEstimate,
    signupsToday: signupsToday ?? 0,
    pendingReferrals: pendingReferrals ?? 0,
    recentUsers: recentUsers ?? [],
  }
}

const PLAN_BADGE: Record<string, string> = {
  free: 'badge-muted', starter: 'badge-blue', pro: 'badge-acc', premium: 'badge-purple',
}

interface RecentUser { id: string; email: string; full_name: string | null; plan: string | null; created_at: string }

interface BigStatProps {
  label:    string
  value:    string
  delta?:   { text: string; tone: 'up' | 'down' | 'flat' }
  accent:   'acc' | 'blue' | 'green' | 'amber' | 'purple' | 'red'
  icon:     React.ReactNode
  href?:    string
}

function BigStat({ label, value, delta, accent, icon, href }: BigStatProps) {
  const colorMap = {
    acc:    'var(--acc)',    blue:   'var(--blue)',   green:  'var(--green)',
    amber:  'var(--amber)',  purple: 'var(--purple)', red:    'var(--red)',
  }
  const bgMap = {
    acc:    'var(--acc-bg)',    blue:   'var(--blue-bg)',   green:  'var(--green-bg)',
    amber:  'var(--amber-bg)',  purple: 'var(--purple-bg)', red:    'var(--red-bg)',
  }
  const fg = colorMap[accent]
  const bg = bgMap[accent]

  const inner = (
    <>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: bg, border: `1px solid ${fg}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: fg,
        }}>{icon}</div>
        {href && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--t4)',
          }}>
            View <ArrowRight size={11} />
          </span>
        )}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10,
      }}>{label}</div>
      <div style={{
        fontSize: 'clamp(28px, 3.4vw, 40px)', lineHeight: 1.05,
        fontWeight: 800, letterSpacing: '-0.03em',
        color: 'var(--t1)', fontVariantNumeric: 'tabular-nums',
        wordBreak: 'break-word',
      }}>{value}</div>
      {delta && (
        <div style={{
          marginTop: 14,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999,
          fontSize: 13, fontWeight: 700,
          color: delta.tone === 'up' ? 'var(--green)' : delta.tone === 'down' ? 'var(--red)' : 'var(--t3)',
          background: delta.tone === 'up' ? 'var(--green-bg)' : delta.tone === 'down' ? 'var(--red-bg)' : 'var(--surface2)',
        }}>
          {delta.tone === 'up' ? '↑' : delta.tone === 'down' ? '↓' : '·'}
          {delta.text}
        </div>
      )}
    </>
  )

  const baseStyle: React.CSSProperties = {
    padding: '28px 30px',
    minHeight: 200,
    display: 'flex', flexDirection: 'column',
    textDecoration: 'none', color: 'inherit',
  }

  if (href) {
    return <Link href={href} className="card-premium" style={baseStyle}>{inner}</Link>
  }
  return <div className="card-premium" style={baseStyle}>{inner}</div>
}

export default async function AdminDashboard() {
  const data = await fetchDashboard()
  const hour = new Date().getUTCHours()
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <HeroCard
        accent="acc"
        icon={<Activity size={28} />}
        eyebrow="Admin · live"
        title={`${greeting}, admin.`}
        subtitle={
          <>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green)',
              animation: 'admin-pulse 1.6s ease-in-out infinite',
              display: 'inline-block', marginRight: 4,
            }} />
            All systems operational · {data.totalUsers.toLocaleString()} accounts ·{' '}
            <strong style={{ color: 'var(--t1)' }}>${data.mrrEstimate.toLocaleString()}</strong> MRR
            {data.signupsToday > 0 && (
              <> · <span style={{ color: 'var(--green)', fontWeight: 700 }}>+{data.signupsToday}</span> today</>
            )}
          </>
        }
        metric={{
          label: 'Paying',
          value: data.paying.toLocaleString(),
          secondary: <>{data.totalUsers ? Math.round(data.paying / data.totalUsers * 100) : 0}% conversion</>,
        }}
      />

      {/* 4 large KPI cards — 2x2 grid on desktop, 1-col on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 32,
      }}>
        <BigStat
          label="Total accounts"
          value={data.totalUsers.toLocaleString()}
          delta={data.signupsToday > 0 ? { text: `+${data.signupsToday} today`, tone: 'up' } : undefined}
          accent="blue"
          icon={<Users size={22} />}
          href="/admin/users"
        />
        <BigStat
          label="MRR estimate"
          value={'$' + data.mrrEstimate.toLocaleString()}
          delta={{ text: `${data.paying.toLocaleString()} paying customers`, tone: 'flat' }}
          accent="green"
          icon={<TrendingUp size={22} />}
          href="/admin/finance"
        />
        <BigStat
          label="Pro subscribers"
          value={data.paidCounts.pro.toLocaleString()}
          delta={{ text: '€9.99 / mo', tone: 'flat' }}
          accent="acc"
          icon={<Star size={22} />}
          href="/admin/users"
        />
        <BigStat
          label="Premium subscribers"
          value={data.paidCounts.premium.toLocaleString()}
          delta={{ text: '€19.99 / mo', tone: 'flat' }}
          accent="purple"
          icon={<Crown size={22} />}
          href="/admin/users"
        />
      </div>

      {/* Two side-by-side panels: distribution + signups */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 5fr)',
        gap: 20,
        marginBottom: 32,
      }}>
        {/* Plan distribution */}
        <div className="card-premium" style={{ padding: '32px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.015em', margin: 0 }}>
              Plan distribution
            </h2>
            <span style={{ fontSize: 13, color: 'var(--t3)' }}>
              {data.totalUsers.toLocaleString()} total
            </span>
          </div>
          {[
            { plan: 'Free',    count: data.counts.free,    color: '#9ca3af',    pct: data.totalUsers ? Math.round(data.counts.free    / data.totalUsers * 100) : 0 },
            { plan: 'Starter', count: data.counts.starter, color: '#60a5fa',    pct: data.totalUsers ? Math.round(data.counts.starter / data.totalUsers * 100) : 0 },
            { plan: 'Pro',     count: data.counts.pro,     color: '#2dd4a4',    pct: data.totalUsers ? Math.round(data.counts.pro     / data.totalUsers * 100) : 0 },
            { plan: 'Premium', count: data.counts.premium, color: '#a78bfa',    pct: data.totalUsers ? Math.round(data.counts.premium / data.totalUsers * 100) : 0 },
          ].map(p => (
            <div key={p.plan} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{p.plan}</span>
                <span style={{ fontSize: 14, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                  <strong style={{ color: 'var(--t1)' }}>{p.count.toLocaleString()}</strong>
                  <span style={{ marginLeft: 10, opacity: 0.7 }}>{p.pct}%</span>
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${p.pct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}88 100%)`,
                  borderRadius: 999,
                  boxShadow: `0 0 12px ${p.color}55`,
                  transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Pending referrals + signups today (compact stack) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Link href="/admin/referrals" className="card-premium" style={{
            padding: '28px 32px',
            display: 'flex', flexDirection: 'column',
            textDecoration: 'none', color: 'inherit',
            borderColor: data.pendingReferrals > 0 ? 'rgba(248,113,113,0.4)' : 'var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.33)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--red)',
              }}>
                <UserPlus size={20} />
              </div>
              <ArrowRight size={14} style={{ color: 'var(--t4)' }} />
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8,
            }}>
              Pending referrals
            </div>
            <div style={{
              fontSize: 38, fontWeight: 800, letterSpacing: '-0.025em',
              color: 'var(--t1)', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              {data.pendingReferrals.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 10 }}>
              {data.pendingReferrals > 0 ? 'Awaiting your review' : 'All caught up'}
            </div>
          </Link>

          <Link href="/admin/anomalies" className="card-premium" style={{
            padding: '28px 32px',
            display: 'flex', flexDirection: 'column',
            textDecoration: 'none', color: 'inherit',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.33)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--amber)',
              }}>
                <Bell size={20} />
              </div>
              <ArrowRight size={14} style={{ color: 'var(--t4)' }} />
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8,
            }}>
              Anomaly detection
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.4 }}>
              Open anomalies dashboard
            </div>
          </Link>
        </div>
      </div>

      {/* Recent signups — full-width table with generous padding */}
      <div className="card-premium" style={{ marginBottom: 32, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 32px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.015em', margin: 0 }}>
            Recent signups
            {data.signupsToday > 0 && (
              <span style={{
                marginLeft: 12, padding: '4px 10px', borderRadius: 999,
                background: 'var(--green-bg)', color: 'var(--green)',
                fontSize: 12, fontWeight: 700,
              }}>+{data.signupsToday} today</span>
            )}
          </h2>
          <Link href="/admin/users" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 600, color: 'var(--acc)',
            textDecoration: 'none',
          }}>
            All users <ArrowRight size={14} />
          </Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Plan', 'Joined', ''].map(h => (
                <th key={h} style={{
                  padding: '16px 32px', textAlign: 'left',
                  fontSize: 11, fontWeight: 800, color: 'var(--t4)',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.recentUsers as RecentUser[]).map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '20px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--acc-bg) 0%, var(--purple-bg) 100%)',
                      color: 'var(--acc)',
                      fontWeight: 800, fontSize: 14,
                      border: '1px solid var(--border)',
                    }}>
                      {((u.full_name || u.email || '?').slice(0, 1).toUpperCase())}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>
                        {u.full_name || u.email?.split('@')[0] || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px 32px' }}>
                  <span className={`badge ${PLAN_BADGE[u.plan || 'free'] || 'badge-muted'}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                    {u.plan || 'free'}
                  </span>
                </td>
                <td style={{
                  padding: '20px 32px', fontSize: 13, color: 'var(--t3)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: 36, padding: '8px 16px', fontSize: 13 }}
                  >
                    Open <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick actions — touch-friendly tiles, 4-up max */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.015em', marginBottom: 18 }}>
        Quick actions
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}>
        {[
          { href: '/admin/finance',         icon: <DollarSign size={20}/>, label: 'Finance',       sub: 'Revenue, MRR, costs',     accent: 'green'  },
          { href: '/admin/users',           icon: <Users      size={20}/>, label: 'Users',         sub: 'Browse + manage accounts', accent: 'blue'   },
          { href: '/admin/referrals',       icon: <UserPlus   size={20}/>, label: 'Referrals',     sub: 'Approve / pay out',       accent: 'red'    },
          { href: '/admin/email-templates', icon: <Mail       size={20}/>, label: 'Emails',        sub: 'Transactional copy',      accent: 'blue'   },
          { href: '/admin/coupons',         icon: <Tag        size={20}/>, label: 'Coupons',       sub: 'Discount codes',          accent: 'purple' },
          { href: '/admin/announcements',   icon: <Megaphone  size={20}/>, label: 'Announcements', sub: 'Site-wide banners',       accent: 'amber'  },
          { href: '/admin/items',           icon: <FileText   size={20}/>, label: 'Open items',    sub: 'Tasks + tickets',         accent: 'purple' },
          { href: '/admin/roadmap',         icon: <TrendingUp size={20}/>, label: 'Roadmap',       sub: '2-year strategic plan',   accent: 'blue'   },
          { href: '/admin/health',          icon: <Activity   size={20}/>, label: 'System health', sub: 'Uptime + probes',         accent: 'green'  },
          { href: '/admin/roles',           icon: <Shield     size={20}/>, label: 'Roles',         sub: 'Permissions & RBAC',      accent: 'purple' },
          { href: '/admin/webhooks',        icon: <Webhook    size={20}/>, label: 'Webhooks',      sub: 'Stripe events',           accent: 'blue'   },
          { href: '/admin/maintenance',     icon: <RefreshCw  size={20}/>, label: 'Maintenance',   sub: 'Scheduled windows',       accent: 'amber'  },
        ].map(a => {
          const colorMap: Record<string, string> = {
            acc:'var(--acc)',blue:'var(--blue)',green:'var(--green)',
            amber:'var(--amber)',purple:'var(--purple)',red:'var(--red)',
          }
          const bgMap: Record<string, string> = {
            acc:'var(--acc-bg)',blue:'var(--blue-bg)',green:'var(--green-bg)',
            amber:'var(--amber-bg)',purple:'var(--purple-bg)',red:'var(--red-bg)',
          }
          const fg = colorMap[a.accent]
          const bg = bgMap[a.accent]
          return (
            <Link key={a.href} href={a.href} className="card-premium" style={{
              padding: '22px 24px',
              display: 'flex', alignItems: 'center', gap: 16,
              textDecoration: 'none',
              minHeight: 92,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: bg, border: `1px solid ${fg}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: fg, flexShrink: 0,
              }}>{a.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 700, color: 'var(--t1)',
                  marginBottom: 3, letterSpacing: '-0.005em',
                }}>{a.label}</div>
                <div style={{
                  fontSize: 12, color: 'var(--t3)', lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{a.sub}</div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--t4)', flexShrink: 0 }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
