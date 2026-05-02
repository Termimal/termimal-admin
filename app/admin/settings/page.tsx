'use client'
export const dynamic = 'force-dynamic'
export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>System Settings</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Global configuration, feature flags, and system controls.</p>

      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-4">Feature Flags</h3>
        {[
          { flag: 'on_chain_analytics', label: 'On-chain analytics module', enabled: true },
          { flag: 'macro_intelligence', label: 'Macro intelligence module', enabled: true },
          { flag: 'ai_insights', label: 'AI-powered insights (beta)', enabled: false },
          { flag: 'backtesting', label: 'Backtesting engine', enabled: false },
          { flag: 'social_trading', label: 'Social/community features', enabled: false },
        ].map(f => (
          <div key={f.flag} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="text-xs font-semibold">{f.label}</div>
              <div className="text-[0.6rem] font-mono" style={{ color: 'var(--t4)' }}>{f.flag}</div>
            </div>
            <div className={`w-9 h-5 rounded-full cursor-pointer transition-colors flex items-center ${f.enabled ? 'justify-end' : 'justify-start'}`}
              style={{ background: f.enabled ? 'var(--acc2)' : 'var(--border)', padding: '2px' }}>
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-4">App Version Management</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { platform: 'macOS', version: 'v1.4.2', status: 'Latest' },
            { platform: 'Windows', version: 'v1.4.2', status: 'Latest' },
            { platform: 'Web', version: 'v2.1.0', status: 'Latest' },
          ].map(v => (
            <div key={v.platform} className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold mb-1">{v.platform}</div>
              <div className="text-sm font-bold font-mono">{v.version}</div>
              <div className="text-[0.55rem] mt-1" style={{ color: 'var(--green-val)' }}>{v.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-xl" style={{ border: '1px solid rgba(220,38,38,.2)', background: 'rgba(220,38,38,.02)' }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--red-val)' }}>Maintenance Mode</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--t3)' }}>Enable to show maintenance page to all users. Admin access remains available.</p>
        <button className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ color: 'var(--red-val)', border: '1px solid rgba(220,38,38,.3)' }}>Enable maintenance mode</button>
      </div>
    </div>
  )
}