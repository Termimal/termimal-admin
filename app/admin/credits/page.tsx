export default function AdminCreditsPage() {
  const creditPackages = [
    { label: 'Starter bonus', amount: 25, note: 'For onboarding or support recovery' },
    { label: 'Pro allocation', amount: 100, note: 'Monthly promotional credit top-up' },
    { label: 'Premium allocation', amount: 250, note: 'High-tier support adjustment' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
        Credits Management
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>
        Manual credit edits currently happen from User Management so support actions stay tied to the user account record.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {creditPackages.map((item) => (
          <div
            key={item.label}
            className="p-5 rounded-xl"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <div className="text-sm font-semibold mb-1">{item.label}</div>
            <div className="text-2xl font-bold mb-2">{item.amount}</div>
            <div className="text-xs" style={{ color: 'var(--t3)' }}>{item.note}</div>
          </div>
        ))}
      </div>

      <div
        className="p-6 rounded-xl"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <h2 className="text-sm font-bold mb-4">Manual adjustment workflow</h2>
        <ol className="space-y-3 text-sm" style={{ color: 'var(--t3)' }}>
          <li>1. Open the target user in User Management.</li>
          <li>2. Adjust the credits field in the admin profile panel.</li>
          <li>3. Save the change and leave an internal note for auditability.</li>
        </ol>
      </div>
    </div>
  )
}