import Link from 'next/link'
import { Users, CreditCard, Package, TrendingUp, ArrowRight } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--t1)' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Welcome back — here&apos;s what&apos;s happening on Termimal.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: '—', icon: Users, color: 'var(--blue)' },
          { label: 'Active Subs', value: '—', icon: CreditCard, color: 'var(--acc)' },
          { label: 'Packages Given', value: '—', icon: Package, color: 'var(--purple)' },
          { label: 'MRR', value: '—', icon: TrendingUp, color: 'var(--amber)' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <k.icon size={16} style={{ color: k.color, opacity: 0.8 }} />
            </div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/users"
          className="card card-p group flex items-center justify-between hover:border-[var(--acc-border)] transition-all"
          style={{ textDecoration: 'none' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} style={{ color: 'var(--acc)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>User Management</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Manage accounts, packages, subscriptions, and user types</p>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--t4)' }} className="group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/admin/subscriptions"
          className="card card-p group flex items-center justify-between hover:border-[var(--acc-border)] transition-all"
          style={{ textDecoration: 'none' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} style={{ color: 'var(--purple)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Subscriptions</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>View and manage all active subscription plans</p>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--t4)' }} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
