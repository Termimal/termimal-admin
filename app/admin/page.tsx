export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--t1)' }}>
        Admin Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/users" className="group block p-8 rounded-xl border border-dashed hover:border-primary transition-all">
          <div className="text-4xl mb-4 opacity-75 group-hover:opacity-100">👥</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--t1)' }}>User Management</h2>
          <p className="text-muted-foreground">Manage accounts, credits, subscriptions</p>
        </Link>
      </div>
    </div>
  )
}
