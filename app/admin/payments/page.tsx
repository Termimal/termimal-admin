"use client";
import { Activity, DollarSign, RefreshCcw, AlertTriangle } from "lucide-react";
const graphData = [ { day: "Mon", rate: 98, vol: 4200 }, { day: "Tue", rate: 99, vol: 5100 }, { day: "Wed", rate: 95, vol: 3800 }, { day: "Thu", rate: 97, vol: 6200 }, { day: "Fri", rate: 100, vol: 7100 }, { day: "Sat", rate: 99, vol: 8400 }, { day: "Sun", rate: 98, vol: 5900 } ];

export default function PaymentsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gross Volume (7d)", val: ",700", icon: DollarSign, color: "var(--green-val)" },
          { label: "Success Rate", val: "98.2%", icon: Activity, color: "var(--acc)" },
          { label: "Refunds", val: ".00", icon: RefreshCcw, color: "var(--amber)" },
          { label: "Failed Charges", val: "14", icon: AlertTriangle, color: "var(--red-val)" }
        ].map((m, i) => (
          <div key={i} className="p-5 rounded-xl border flex flex-col gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{m.label}</span><m.icon size={14} style={{ color: m.color }} /></div>
            <span className="text-2xl font-bold">{m.val}</span>
          </div>
        ))}
      </div>
      <div className="p-6 rounded-xl border mb-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-6">Payment Success Rate (Last 7 Days)</h3>
        <div className="flex items-end gap-2 h-48 w-full">
          {graphData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
              <div className="absolute -top-8 bg-black text-white text-[0.6rem] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">{d.rate}% • </div>
              <div className="w-full rounded-t-sm transition-all duration-500 hover:opacity-80" style={{ height: ${d.rate}%, background: d.rate < 97 ? 'var(--amber)' : 'var(--acc)', minHeight: '10%' }} />
              <span className="text-[0.65rem] font-medium" style={{ color: 'var(--t4)' }}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
