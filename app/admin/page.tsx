'use client'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Users, CreditCard, Star, Crown, ArrowRight } from 'lucide-react'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export const revalidate = 60

export default async function AdminDashboard() {
  const supabase = adminClient()

  const [
    { count: totalUsers },
    { data: planCounts },
    { data: recentUsers },
    { data: recentOverrides },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('plan').not('plan', 'is', null),
    supabase.from('profiles').select('id, email, full_name, plan, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('subscription_overrides').select('*').order('created_at', { ascending: false }).limit(5),
  ])

  const counts = { free: 0, starter: 0, pro: 0, premium: 0 }
  ;(planCounts || []).forEach((p: any) => { if (p.plan in counts) (counts as any)[p.plan]++ })
  const activeSubs = counts.starter + counts.pro + counts.premium

  const PLAN_BADGE: Record<string,string> = { free:'badge-muted', starter:'badge-blue', pro:'badge-acc', premium:'badge-purple' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>Termimal back office — live data.</p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Users',   value: (totalUsers || 0).toLocaleString(), Icon: Users,       color: 'var(--blue)'   },
          { label: 'Active Subs',   value: activeSubs.toLocaleString(),         Icon: CreditCard,  color: 'var(--acc)'    },
          { label: 'Pro Users',     value: counts.pro.toLocaleString(),          Icon: Star,        color: 'var(--purple)' },
          { label: 'Premium Users', value: counts.premium.toLocaleString(),      Icon: Crown,       color: 'var(--amber)'  },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div style={{ marginBottom: 10 }}><k.Icon size={16} style={{ color: k.color, opacity: 0.8 }} /></div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Plan dist + recent actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card card-p">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 16 }}>Plan Distribution</div>
          {[
            { plan: 'Free',    count: counts.free,    color: 'var(--t4)',     pct: totalUsers ? Math.round(counts.free / totalUsers * 100) : 0 },
            { plan: 'Starter', count: counts.starter, color: 'var(--blue)',   pct: totalUsers ? Math.round(counts.starter / totalUsers * 100) : 0 },
            { plan: 'Pro',     count: counts.pro,     color: 'var(--acc)',    pct: totalUsers ? Math.round(counts.pro / totalUsers * 100) : 0 },
            { plan: 'Premium', count: counts.premium, color: 'var(--purple)', pct: totalUsers ? Math.round(counts.premium / totalUsers * 100) : 0 },
          ].map(p => (
            <div key={p.plan} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{p.plan}</span>
                <span style={{ color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{p.count} ({p.pct}%)</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 999 }}>
                <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card card-p">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Recent Admin Actions</div>
            <Link href="/admin/users" style={{ fontSize: 11, color: 'var(--acc)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {(recentOverrides || []).length === 0 ? (
            <div style={{ color: 'var(--t4)', fontSize: 13, padding: '16px 0' }}>No recent actions.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(recentOverrides || []).map((o: any) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span className="badge badge-acc" style={{ fontSize: 10 }}>{o.type}</span>
                  <span style={{ color: 'var(--t3)', flex: 1, marginLeft: 10 }}>{o.reason || '—'}</span>
                  <span style={{ color: 'var(--t4)' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent users table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Recent Signups</div>
          <Link href="/admin/users" style={{ fontSize: 11, color: 'var(--acc)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            All users <ArrowRight size={11} />
          </Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Plan', 'Joined', ''].map(h => (
                <th key={h} style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(recentUsers || []).map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.full_name || u.email?.split('@')[0] || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>{u.email}</div>
                </td>
                <td style={{ padding: '10px 20px' }}>
                  <span className={`badge ${PLAN_BADGE[u.plan || 'free'] || 'badge-muted'}`}>{u.plan || 'free'}</span>
                </td>
                <td style={{ padding: '10px 20px', fontSize: 12, color: 'var(--t4)' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '10px 20px' }}>
                  <Link href={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}