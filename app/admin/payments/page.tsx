'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Activity, DollarSign, RefreshCcw, AlertTriangle, CreditCard, Search } from "lucide-react";
import { HeroCard, Section } from '@/components/admin/PageChrome'

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

const TXNS = [
  { email: "sarah@example.com",      amount: "$99.00",  status: "Succeeded", date: "Just now"   },
  { email: "mike.t@domain.co",       amount: "$299.00", status: "Succeeded", date: "5 mins ago" },
  { email: "investor99@web.net",     amount: "$99.00",  status: "Failed",    date: "12 mins ago" },
]

function KPI({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: 'green'|'acc'|'amber'|'red' }) {
  return (
    <div className="card-premium" style={{
      padding: '24px 28px',
      borderColor: `var(--${accent})44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--t4)',
        }}>{label}</span>
        <Icon size={16} style={{ color: `var(--${accent})` }}/>
      </div>
      <div style={{
        fontSize: 32, fontWeight: 800, color: 'var(--t1)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', lineHeight: 1,
      }}>{value}</div>
    </div>
  )
}

export default function PaymentsPage() {
  const [search, setSearch] = useState('')

  return (
    <div>
      <HeroCard
        accent="green"
        icon={<CreditCard size={28} />}
        eyebrow="Billing"
        title="Payments"
        subtitle="Stripe charges, refunds, and invoice ledger."
        metric={{ label: 'Volume · 7d', value: '$40,700', secondary: '98.2% success' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, marginBottom: 28 }}>
        <KPI label="Gross volume · 7d" value="$40,700" icon={DollarSign}    accent="green"/>
        <KPI label="Success rate"      value="98.2%"   icon={Activity}      accent="acc"  />
        <KPI label="Refunds"           value="$420.00" icon={RefreshCcw}    accent="amber"/>
        <KPI label="Failed charges"    value="14"      icon={AlertTriangle} accent="red"  />
      </div>

      <Section title="Payment success rate" description="Last 7 days. Hover bars to see daily volume." accent="green">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 220 }}>
          {graphData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }} title={`${d.rate}% · $${d.vol.toLocaleString()}`}>
              <div
                style={{
                  width: '100%', borderRadius: '6px 6px 0 0',
                  background: d.rate < 97 ? 'var(--amber)' : 'var(--acc)',
                  height: `${d.rate}%`, minHeight: 10,
                  transition: 'opacity 200ms',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{d.day}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Recent transactions"
        description="Live ledger of charges, refunds, and disputes."
        actions={
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input
              type="text"
              className="input"
              placeholder="Search by email or ID…"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        }
        flush
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="table-root" style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Email / user','Amount','Status','Date'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '14px 24px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--t4)',
                    borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TXNS.filter(t => !search || t.email.toLowerCase().includes(search.toLowerCase())).map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 24px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13, color: 'var(--t1)' }}>{t.email}</td>
                  <td style={{ padding: '14px 24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--t1)', fontSize: 13 }}>{t.amount}</td>
                  <td style={{ padding: '14px 24px' }}>
                    <span className={`badge ${t.status === 'Succeeded' ? 'badge-green' : 'badge-red'}`}>{t.status}</span>
                  </td>
                  <td style={{ padding: '14px 24px', color: 'var(--t4)', fontSize: 12 }}>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
