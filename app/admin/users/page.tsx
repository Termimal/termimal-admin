'use client'
import AdminLayout from '@/components/admin/AdminLayout'
import { Search } from 'lucide-react'

const users = [
  { id: 1, email: 'john@example.com', name: 'John Smith', plan: 'Pro', status: 'Active', country: 'US', joined: 'Jan 12, 2026' },
  { id: 2, email: 'anna@trader.de', name: 'Anna Weber', plan: 'Free', status: 'Active', country: 'DE', joined: 'Feb 5, 2026' },
  { id: 3, email: 'yuki@invest.jp', name: 'Yuki Tanaka', plan: 'Premium', status: 'Active', country: 'JP', joined: 'Dec 20, 2025' },
  { id: 4, email: 'carlos@fx.es', name: 'Carlos Ruiz', plan: 'Pro', status: 'Trial', country: 'ES', joined: 'Mar 18, 2026' },
  { id: 5, email: 'sarah@crypto.io', name: 'Sarah Chen', plan: 'Free', status: 'Active', country: 'UK', joined: 'Mar 25, 2026' },
  { id: 6, email: 'mike@trade.com', name: 'Mike Johnson', plan: 'Pro', status: 'Suspended', country: 'US', joined: 'Nov 3, 2025' },
  { id: 7, email: 'lena@market.se', name: 'Lena Eriksson', plan: 'Premium', status: 'Active', country: 'SE', joined: 'Feb 14, 2026' },
]

const statusColor: Record<string, string> = { Active: 'var(--green-val)', Trial: 'var(--amber)', Suspended: 'var(--red-val)' }

export default function UsersPage() {
  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Search size={14} style={{ color: 'var(--t4)' }} />
          <input placeholder="Search users by email or name..." className="bg-transparent outline-none text-[0.78rem] w-full" style={{ color: 'var(--t1)' }} />
        </div>
        <select className="px-3 py-2 rounded-lg text-[0.72rem]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}>
          <option>All plans</option><option>Free</option><option>Pro</option><option>Premium</option>
        </select>
        <select className="px-3 py-2 rounded-lg text-[0.72rem]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t2)' }}>
          <option>All statuses</option><option>Active</option><option>Trial</option><option>Suspended</option>
        </select>
        <button className="btn-secondary text-[0.72rem] py-2 px-3">Export CSV</button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Name','Email','Plan','Status','Country','Joined',''].map(h => <th key={h} className="text-left px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-4 py-2.5 font-semibold">{u.name}</td>
              <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--t3)' }}>{u.email}</td>
              <td className="px-4 py-2.5"><span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>{u.plan}</span></td>
              <td className="px-4 py-2.5"><span className="text-[0.6rem] font-semibold" style={{ color: statusColor[u.status] }}>{u.status}</span></td>
              <td className="px-4 py-2.5" style={{ color: 'var(--t3)' }}>{u.country}</td>
              <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--t4)' }}>{u.joined}</td>
              <td className="px-4 py-2.5 text-right"><button className="text-[0.68rem] font-medium" style={{ color: 'var(--acc)' }}>View</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-[0.7rem]" style={{ color: 'var(--t4)' }}>
        <span>Showing 7 of 8,234 users</span>
        <div className="flex gap-1">
          <button className="px-3 py-1 rounded" style={{ border: '1px solid var(--border)' }}>← Prev</button>
          <button className="px-3 py-1 rounded" style={{ border: '1px solid var(--border)' }}>Next →</button>
        </div>
      </div>
    </AdminLayout>
  )
}
