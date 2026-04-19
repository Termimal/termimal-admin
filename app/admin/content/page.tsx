'use client'
import AdminLayout from '@/components/admin/AdminLayout'
import { Plus, Search } from 'lucide-react'

const articles = [
  { title: 'Understanding COT Reports for S&P 500', status: 'Published', cat: 'Education', date: 'Mar 28, 2026', author: 'Editorial' },
  { title: 'Weekly Macro Brief: Fed Holds, VIX Spikes', status: 'Published', cat: 'Analysis', date: 'Mar 25, 2026', author: 'Research' },
  { title: 'v2.4.1 Release Notes', status: 'Published', cat: 'Product', date: 'Mar 28, 2026', author: 'Engineering' },
  { title: 'On-Chain Valuation Guide: MVRV Explained', status: 'Draft', cat: 'Education', date: 'Mar 30, 2026', author: 'Editorial' },
  { title: 'Crypto Market Sentiment Dashboard', status: 'Scheduled', cat: 'Product', date: 'Apr 1, 2026', author: 'Product' },
]

const statusStyle: Record<string, { color: string; bg: string }> = {
  Published: { color: 'var(--green-val)', bg: 'rgba(52,211,153,.1)' },
  Draft: { color: 'var(--amber)', bg: 'rgba(251,191,36,.1)' },
  Scheduled: { color: 'var(--blue)', bg: 'rgba(96,165,250,.1)' },
}

export default function ContentPage() {
  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Search size={14} style={{ color: 'var(--t4)' }} />
          <input placeholder="Search articles..." className="bg-transparent outline-none text-[0.78rem] w-full" style={{ color: 'var(--t1)' }} />
        </div>
        <select className="px-3 py-2 rounded-lg text-[0.72rem]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}>
          <option>All statuses</option><option>Published</option><option>Draft</option><option>Scheduled</option>
        </select>
        <button className="btn-primary text-[0.72rem] py-2 px-4 gap-1"><Plus size={14} /> New article</button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Title','Category','Author','Status','Date',''].map(h => <th key={h} className="text-left px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{articles.map(a => (
            <tr key={a.title} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-4 py-2.5 font-semibold">{a.title}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{a.cat}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{a.author}</td>
              <td className="px-4 py-2.5"><span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ color: statusStyle[a.status].color, background: statusStyle[a.status].bg }}>{a.status}</span></td>
              <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--t4)' }}>{a.date}</td>
              <td className="px-4 py-2.5 text-right"><button className="text-[0.68rem] font-medium" style={{ color: 'var(--acc)' }}>Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
