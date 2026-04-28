export const dynamic = 'force-dynamic'

export default function AdminSubscriptionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Subscriptions & Plans</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Manage plans, pricing, and subscription lifecycle.</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { name: 'Free', users: 8420, mrr: '$0' },
          { name: 'Pro', users: 3200, mrr: '$21,280' },
          { name: 'Premium', users: 1280, mrr: '$7,170' },
        ].map(p => (
          <div key={p.name} className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">{p.name}</h3>
              <button className="text-[0.62rem] font-medium" style={{ color: 'var(--acc)' }}>Edit plan</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[0.55rem] uppercase tracking-widest" style={{ color: 'var(--t4)' }}>Users</div>
                <div className="text-lg font-bold">{p.users.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[0.55rem] uppercase tracking-widest" style={{ color: 'var(--t4)' }}>MRR</div>
                <div className="text-lg font-bold">{p.mrr}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">Active coupons</h3>
          <button className="btn-primary text-xs py-1.5 px-3">+ Create coupon</button>
        </div>
        {[
          { code: 'LAUNCH2026', discount: '30% off', uses: '142 / 500', expires: 'Apr 30, 2026' },
          { code: 'WELCOME20', discount: '20% off first year', uses: '89 / unlimited', expires: 'Never' },
        ].map(c => (
          <div key={c.code} className="flex items-center justify-between py-3 text-xs border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
            <span className="font-mono font-bold">{c.code}</span>
            <span style={{ color: 'var(--t3)' }}>{c.discount}</span>
            <span style={{ color: 'var(--t4)' }}>{c.uses} uses</span>
            <span className="font-mono" style={{ color: 'var(--t4)' }}>{c.expires}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
