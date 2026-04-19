"use client";
import { Megaphone, Plus } from "lucide-react";
const banners = [
  { id: 1, name: "Summer Sale", location: "Global Header", text: "Get 30% off annual plans with code SUMMER30", status: "Active", ctr: "4.2%" },
  { id: 2, name: "Checkout Urgency", location: "Checkout Page", text: "High demand: Prices increase in 24 hours.", status: "Active", ctr: "12.8%" }
];

export default function BannersPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-xl font-bold tracking-tight mb-1">Banners & Promotions</h2><p className="text-sm" style={{ color: 'var(--t3)' }}>Manage site-wide announcement bars and checkout messaging.</p></div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-80" style={{ background: 'var(--acc)' }}><Plus size={14} /> Create Banner</button>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-left text-xs">
          <thead style={{ background: 'var(--surface)', color: 'var(--t4)' }}>
            <tr><th className="px-4 py-3 font-semibold uppercase">Campaign Name</th><th className="px-4 py-3 font-semibold uppercase">Placement</th><th className="px-4 py-3 font-semibold uppercase">Banner Text</th><th className="px-4 py-3 font-semibold uppercase">Status</th></tr>
          </thead>
          <tbody>
            {banners.map((b) => (
              <tr key={b.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-4 font-bold">{b.name}</td><td className="px-4 py-4 font-mono text-[0.65rem]" style={{ color: 'var(--t2)' }}>{b.location}</td><td className="px-4 py-4" style={{ color: 'var(--t3)' }}>"{b.text}"</td>
                <td className="px-4 py-4"><span className="px-2 py-1 rounded text-[0.6rem] font-bold" style={{ background: b.status === "Active" ? 'rgba(52,211,153,0.1)' : 'var(--surface)', color: b.status === "Active" ? 'var(--green-val)' : 'var(--t4)' }}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
