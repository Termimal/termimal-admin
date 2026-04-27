'use client'

export const dynamic = 'force-dynamic'
import AdminLayout from '@/components/admin/AdminLayout'
import { Search, Plus } from 'lucide-react'

const languages = [
  { code: 'en', name: 'English', keys: 1284, translated: 1284, pct: 100 },
  { code: 'tr', name: 'Turkish', keys: 1284, translated: 1180, pct: 92 },
  { code: 'de', name: 'German', keys: 1284, translated: 956, pct: 74 },
  { code: 'fr', name: 'French', keys: 1284, translated: 890, pct: 69 },
  { code: 'es', name: 'Spanish', keys: 1284, translated: 720, pct: 56 },
  { code: 'ja', name: 'Japanese', keys: 1284, translated: 340, pct: 26 },
]

const keys = [
  { key: 'hero.title', en: 'See the market faster, clearer, deeper.', tr: 'Piyasayı daha hızlı, daha net, daha derin görün.', ns: 'marketing' },
  { key: 'hero.cta', en: 'Start Free', tr: 'Ücretsiz Başla', ns: 'marketing' },
  { key: 'nav.pricing', en: 'Pricing', tr: 'Fiyatlandırma', ns: 'common' },
  { key: 'dashboard.alerts', en: 'Alerts active', tr: 'Aktif alarmlar', ns: 'portal' },
  { key: 'plan.pro.name', en: 'Pro', tr: 'Pro', ns: 'billing' },
]

export default function TranslationsPage() {
  return (
    <AdminLayout>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {languages.map(l => (
          <div key={l.code} className="p-3 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.75rem] font-bold">{l.code.toUpperCase()}</span>
              <span className="text-[0.6rem] font-bold" style={{ color: l.pct === 100 ? 'var(--green-val)' : l.pct > 70 ? 'var(--amber)' : 'var(--red-val)' }}>{l.pct}%</span>
            </div>
            <div className="text-[0.62rem]" style={{ color: 'var(--t3)' }}>{l.name}</div>
            <div className="w-full h-1 rounded-full mt-2" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: l.pct === 100 ? 'var(--green-val)' : l.pct > 70 ? 'var(--amber)' : 'var(--red-val)' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Search size={14} style={{ color: 'var(--t4)' }} />
          <input placeholder="Search translation keys..." className="bg-transparent outline-none text-[0.78rem] w-full" style={{ color: 'var(--t1)' }} />
        </div>
        <select className="px-3 py-2 rounded-lg text-[0.72rem]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}>
          <option>All namespaces</option><option>marketing</option><option>common</option><option>portal</option><option>billing</option>
        </select>
        <button className="btn-primary text-[0.72rem] py-2 px-4 gap-1"><Plus size={14} /> Add key</button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Key','Namespace','English','Turkish',''].map(h => <th key={h} className="text-left px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{keys.map(k => (
            <tr key={k.key} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-4 py-2.5 font-mono font-medium text-[0.68rem]">{k.key}</td>
              <td className="px-4 py-2.5"><span className="text-[0.58rem] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--t3)' }}>{k.ns}</span></td>
              <td className="px-4 py-2.5" style={{ color: 'var(--t2)' }}>{k.en}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{k.tr}</td>
              <td className="px-4 py-2.5 text-right"><button className="text-[0.68rem] font-medium" style={{ color: 'var(--acc)' }}>Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
