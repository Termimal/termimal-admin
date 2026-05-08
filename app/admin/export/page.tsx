'use client'

import { Download, Users, FileText, CreditCard, Inbox } from 'lucide-react'
import { PageHeader, Section } from '@/components/admin/PageChrome'

const TYPES = [
  { key: 'users',    label: 'Users',           description: 'profiles table — id, email, plan, country, etc.', icon: Users,      accent: 'blue'   as const },
  { key: 'invoices', label: 'Invoices',        description: 'Stripe-derived invoices.',                        icon: FileText,   accent: 'green'  as const },
  { key: 'payments', label: 'Payments',        description: 'All payment records.',                            icon: CreditCard, accent: 'amber'  as const },
  { key: 'tickets',  label: 'Support tickets', description: 'Inbox snapshot.',                                  icon: Inbox,      accent: 'purple' as const },
]

const ACCENT_BG: Record<string, { bg: string; color: string }> = {
  blue:   { bg: 'rgba(96,165,250,0.1)',  color: 'var(--blue)'   },
  green:  { bg: 'rgba(52,211,153,0.1)',  color: 'var(--green)'  },
  amber:  { bg: 'rgba(251,191,36,0.1)',  color: 'var(--amber)'  },
  purple: { bg: 'rgba(167,139,250,0.1)', color: 'var(--purple)' },
}

export default function ExportPage() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Download size={14} />}
        eyebrow="Data Export"
        title="CSV downloads"
        description="Export operational data for accounting, CRM imports, or compliance archives. Each download streams CSV directly from Supabase via service-role read."
        accent="acc"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {TYPES.map(t => {
          const Icon = t.icon
          const c = ACCENT_BG[t.accent]
          return (
            <a
              key={t.key}
              href={`/api/admin/export?type=${t.key}`}
              download
              className="card card-link card-p"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: c.bg, marginBottom: 12 }}>
                <Icon size={16} style={{ color: c.color }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.5 }}>{t.description}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c.color }}>
                <Download size={12} /> Download CSV
              </div>
            </a>
          )
        })}
      </div>

      <Section title="Tips" accent="muted">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--t3)', lineHeight: 1.7 }}>
          <li>Append <code style={{ color: 'var(--t1)' }}>?since=2026-01-01T00:00:00Z</code> to limit by created_at.</li>
          <li>Each export caps at 10,000 rows. For larger sets, run multiple windowed exports.</li>
          <li>The downloads are served as <code style={{ color: 'var(--t1)' }}>text/csv; charset=utf-8</code> with the standard quote-escape rules.</li>
          <li>All exports require admin auth — middleware blocks anonymous downloads.</li>
        </ul>
      </Section>
    </div>
  )
}
