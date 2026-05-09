'use client'

import { Download, Users, FileText, CreditCard, Inbox } from 'lucide-react'
import { HeroCard, Section, ItemGrid, ItemCard } from '@/components/admin/PageChrome'

const TYPES = [
  { key: 'users',    label: 'Users',           description: 'profiles table — id, email, plan, country, etc.', icon: Users,      accent: 'blue'   as const },
  { key: 'invoices', label: 'Invoices',        description: 'Stripe-derived invoices.',                        icon: FileText,   accent: 'green'  as const },
  { key: 'payments', label: 'Payments',        description: 'All payment records.',                            icon: CreditCard, accent: 'amber'  as const },
  { key: 'tickets',  label: 'Support tickets', description: 'Inbox snapshot.',                                  icon: Inbox,      accent: 'purple' as const },
]

export default function ExportPage() {
  return (
    <div>
      <HeroCard
        accent="acc"
        icon={<Download size={28} />}
        eyebrow="Data export"
        title="CSV downloads"
        subtitle="Export operational data for accounting, CRM imports, or compliance archives. Each download streams CSV directly from Supabase via service-role read."
        metric={{ label: 'Endpoints', value: TYPES.length.toString(), secondary: 'CSV streams' }}
      />

      <Section title="Available exports" description="Click any tile to download the latest snapshot.">
        <ItemGrid min={280}>
          {TYPES.map(t => {
            const Icon = t.icon
            return (
              <ItemCard
                key={t.key}
                accent={t.accent}
                icon={<Icon size={18}/>}
                title={t.label}
                subtitle={t.description}
                meta={
                  <a
                    href={`/api/admin/export?type=${t.key}`}
                    download
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700, color: `var(--${t.accent})`,
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={13} /> Download CSV
                  </a>
                }
              />
            )
          })}
        </ItemGrid>
      </Section>

      <Section title="Tips" description="Power-user options for tweaking each download.">
        <ul style={{ margin: 0, paddingLeft: 22, fontSize: 14, color: 'var(--t2)', lineHeight: 1.8 }}>
          <li>Append <code style={{ color: 'var(--t1)', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12 }}>?since=2026-01-01T00:00:00Z</code> to limit by created_at.</li>
          <li>Each export caps at 10,000 rows. For larger sets, run multiple windowed exports.</li>
          <li>The downloads are served as <code style={{ color: 'var(--t1)', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12 }}>text/csv; charset=utf-8</code> with the standard quote-escape rules.</li>
          <li>All exports require admin auth — middleware blocks anonymous downloads.</li>
        </ul>
      </Section>
    </div>
  )
}
