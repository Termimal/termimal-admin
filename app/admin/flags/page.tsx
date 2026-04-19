'use client'
import AdminLayout from '@/components/admin/AdminLayout'

const flags = [
  { name: 'macro_intelligence', desc: 'Polymarket event risk integration', env: 'production', enabled: true, plan: 'Premium' },
  { name: 'onchain_analytics', desc: 'MVRV, Z-Score, realized cap overlays', env: 'production', enabled: true, plan: 'Premium' },
  { name: 'cot_reports', desc: 'CFTC COT positioning data', env: 'production', enabled: true, plan: 'Pro' },
  { name: 'advanced_screener', desc: 'Multi-filter market screener', env: 'production', enabled: true, plan: 'Pro' },
  { name: 'api_access', desc: 'REST API for data export', env: 'beta', enabled: false, plan: 'Premium' },
  { name: 'ai_insights', desc: 'AI-generated market summaries', env: 'staging', enabled: false, plan: 'Premium' },
  { name: 'social_sentiment', desc: 'Social media sentiment feed', env: 'development', enabled: false, plan: 'Pro' },
  { name: 'backtesting', desc: 'Strategy backtesting engine', env: 'development', enabled: false, plan: 'Premium' },
]

const envColor: Record<string, { color: string; bg: string }> = {
  production: { color: 'var(--green-val)', bg: 'rgba(52,211,153,.1)' },
  beta: { color: 'var(--amber)', bg: 'rgba(251,191,36,.1)' },
  staging: { color: 'var(--blue)', bg: 'rgba(96,165,250,.1)' },
  development: { color: 'var(--t4)', bg: 'var(--surface)' },
}

export default function FlagsPage() {
  return (
    <AdminLayout>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Flag','Description','Environment','Min Plan','Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{flags.map(f => (
            <tr key={f.name} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-4 py-2.5 font-mono font-semibold text-[0.72rem]">{f.name}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{f.desc}</td>
              <td className="px-4 py-2.5"><span className="text-[0.58rem] font-bold px-1.5 py-0.5 rounded" style={{ color: envColor[f.env].color, background: envColor[f.env].bg }}>{f.env}</span></td>
              <td className="px-4 py-2.5"><span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>{f.plan}</span></td>
              <td className="px-4 py-2.5">
                <div className="w-9 h-5 rounded-full relative cursor-pointer transition-all" style={{ background: f.enabled ? 'var(--acc2)' : 'var(--border)' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.enabled ? '18px' : '2px' }} />
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
