"use client"

export const dynamic = 'force-dynamic';

import { Activity, DollarSign, RefreshCcw, AlertTriangle } from "lucide-react";

// Mock graph data
const graphData = [
  { day: "Mon", rate: 98, vol: 4200 },
  { day: "Tue", rate: 99, vol: 5100 },
  { day: "Wed", rate: 95, vol: 3800 },
  { day: "Thu", rate: 97, vol: 6200 },
  { day: "Fri", rate: 100, vol: 7100 },
  { day: "Sat", rate: 99, vol: 8400 },
  { day: "Sun", rate: 98, vol: 5900 },
];

export default function PaymentsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Top Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gross Volume (7d)", val: "$40,700", icon: DollarSign, color: "var(--green-val)" },
          { label: "Success Rate", val: "98.2%", icon: Activity, color: "var(--acc)" },
          { label: "Refunds", val: "$420.00", icon: RefreshCcw, color: "var(--amber)" },
          { label: "Failed Charges", val: "14", icon: AlertTriangle, color: "var(--red-val)" }
        ].map((m, i) => (
          <div key={i} className="p-5 rounded-xl border flex flex-col gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{m.label}</span>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <span className="text-2xl font-bold">{m.val}</span>
          </div>
        ))}
      </div>

      {/* Success Rate Graph */}
      <div className="p-6 rounded-xl border mb-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-6">Payment Success Rate (Last 7 Days)</h3>
        <div className="flex items-end gap-2 h-48 w-full">
          {graphData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
              {/* Tooltip */}
              <div className="absolute -top-8 bg-black text-white text-[0.6rem] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {d.rate}% • ${d.vol}
              </div>
              {/* Bar */}
              <div 
                className="w-full rounded-t-sm transition-all duration-500 hover:opacity-80" 
                style={{ 
                  height: d.rate + "%", 
                  background: d.rate < 97 ? 'var(--amber)' : 'var(--acc)',
                  minHeight: '10%'
                }} 
              />
              <span className="text-[0.65rem] font-medium" style={{ color: 'var(--t4)' }}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-sm font-bold">Recent Transactions</h3>
          <input type="text" placeholder="Search by email or ID..." className="px-3 py-1.5 text-xs rounded-md outline-none w-64" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
        </div>
        <table className="w-full text-left text-xs">
          <thead style={{ background: 'var(--surface)', color: 'var(--t4)' }}>
            <tr>
              <th className="px-4 py-3 font-semibold uppercase">Email / User</th>
              <th className="px-4 py-3 font-semibold uppercase">Amount</th>
              <th className="px-4 py-3 font-semibold uppercase">Status</th>
              <th className="px-4 py-3 font-semibold uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {[
              { email: "sarah@example.com", amount: "$99.00", status: "Succeeded", date: "Just now" },
              { email: "mike.t@domain.co", amount: "$299.00", status: "Succeeded", date: "5 mins ago" },
              { email: "investor99@web.net", amount: "$99.00", status: "Failed", date: "12 mins ago" },
            ].map((t, i) => (
              <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-mono">{t.email}</td>
                <td className="px-4 py-3 font-bold">{t.amount}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-[0.6rem] font-bold" style={{ 
                    background: t.status === "Succeeded" ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    color: t.status === "Succeeded" ? 'var(--green-val)' : 'var(--red-val)'
                  }}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--t4)' }}>{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}