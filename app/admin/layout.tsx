'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Build marker — bumped every deploy so you can verify in the browser
// the new code is actually serving. Visible in the sidebar footer.
const BUILD_MARKER = '2026-05-08 · 18:00 UTC'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Flag,
  FileText,
  Settings,
  ChevronRight,
  Terminal,
  LogOut,
  ShieldAlert,
  ListTodo,
  Map,
  Inbox,
  History,
  Search,
  Image as ImageIcon,
  HelpCircle,
  Megaphone,
  Zap,
  Webhook,
  Languages,
  Mail,
  Tag,
  Users2,
  Beaker,
  Calendar,
  UserPlus,
  Activity,
  Download,
  DollarSign,
  Shield,
  TrendingUp,
  Handshake,
  Sparkles,
  BarChart3,
  Bug,
  Wallet,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  exact?: boolean
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { href: '/admin',           label: 'Dashboard',         icon: LayoutDashboard, exact: true },
      { href: '/admin/health',    label: 'System Health',     icon: Activity },
      { href: '/admin/anomalies', label: 'Anomaly Detection', icon: ShieldAlert },
      { href: '/admin/audit-log', label: 'Audit Log',         icon: History },
      { href: '/admin/webhooks',  label: 'Webhooks',          icon: Webhook },
    ],
  },
  {
    group: 'Workflow',
    items: [
      { href: '/admin/items',   label: 'Open Items',    icon: ListTodo },
      { href: '/admin/roadmap', label: 'Roadmap',       icon: Map },
      { href: '/admin/support', label: 'Support Inbox', icon: Inbox },
    ],
  },
  {
    group: 'Users & Billing',
    items: [
      { href: '/admin/users',           label: 'Users',           icon: Users },
      { href: '/admin/subscriptions',   label: 'Subscriptions',   icon: CreditCard },
      { href: '/admin/payments',        label: 'Payments',        icon: Package },
      { href: '/admin/payment-methods', label: 'Payment Methods', icon: CreditCard },
      { href: '/admin/coupons',         label: 'Coupons',         icon: Tag },
      { href: '/admin/cohorts',         label: 'Cohorts',         icon: Users2 },
      { href: '/admin/finance',         label: 'Finance',         icon: DollarSign },
    ],
  },
  {
    /**
     * Marketing — every growth lever. Referrals + Affiliates +
     * SEO live here together because they all answer the same
     * question ("how do we get more users?") — splitting them
     * across Users / Content was confusing.
     *
     * Marketing Planner is a dedicated kanban with seeded
     * acquisition tactics so anyone in the company can see what's
     * being worked on without poking through the generic Open
     * Items board.
     */
    group: 'Marketing',
    items: [
      { href: '/admin/marketing',          label: 'Marketing Planner', icon: Sparkles,  exact: true },
      { href: '/admin/marketing/social',   label: 'Social Studio',     icon: Megaphone },
      { href: '/admin/seo',                label: 'SEO & Meta',        icon: Search },
      { href: '/admin/seo-pages',          label: 'Per-page SEO',      icon: Search },
      { href: '/admin/referrals',          label: 'Referrals',         icon: TrendingUp },
      { href: '/admin/affiliates',         label: 'Affiliates',        icon: Handshake, exact: true },
      { href: '/admin/affiliates/payouts', label: 'Affiliate Payouts', icon: Wallet },
    ],
  },
  {
    /**
     * Analytics — read-only Tableau-style dashboards on top of every
     * mirrored Stripe / Supabase table we have. Lives separately from
     * Health/Anomalies so it doesn't get hidden behind "Overview".
     */
    group: 'Analytics',
    items: [
      { href: '/admin/bi',     label: 'Business Intelligence', icon: BarChart3 },
      { href: '/admin/errors', label: 'Error log',             icon: Bug },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: '/admin/content',         label: 'Content',         icon: FileText },
      { href: '/admin/banners',         label: 'Banners',         icon: ImageIcon },
      { href: '/admin/announcements',   label: 'Announcements',   icon: Megaphone },
      { href: '/admin/faqs',            label: 'FAQs',            icon: HelpCircle },
      { href: '/admin/translations',    label: 'Translations',    icon: Languages },
      { href: '/admin/email-templates', label: 'Email Templates', icon: Mail },
      { href: '/admin/flags',           label: 'Feature Flags',   icon: Zap },
      { href: '/admin/experiments',     label: 'Experiments',     icon: Beaker },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin/system',      label: 'System',         icon: Settings },
      { href: '/admin/maintenance', label: 'Maintenance',    icon: Calendar },
      { href: '/admin/roles',       label: 'Roles & Perms',  icon: Shield },
      { href: '/admin/invites',     label: 'Admin Invites',  icon: UserPlus },
      { href: '/admin/export',      label: 'Data Export',    icon: Download },
      { href: '/admin/settings',    label: 'Settings',       icon: Settings },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 flex flex-col"
        style={{
          width: 'var(--sidebar-w)',
          background: 'var(--bg2)',
          borderRight: '1px solid var(--border)',
          zIndex: 40,
        }}
      >
        {/* Brand bar */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)', minHeight: 'var(--header-h)' }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 34, height: 34,
              borderRadius: 11,
              background: 'linear-gradient(135deg, rgba(45,212,164,0.20) 0%, rgba(167,139,250,0.20) 100%)',
              border: '1px solid var(--border2)',
              boxShadow: '0 0 18px -4px rgba(45,212,164,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <Terminal size={15} style={{ color: 'var(--acc)' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.012em',
              color: 'var(--t1)',
            }}>Termimal</div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--t4)',
            }}>Admin · v3</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '14px 12px 24px' }}>
          {NAV.map((group, gIdx) => (
            <div key={group.group} style={{ marginTop: gIdx === 0 ? 0 : 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--t4)',
                  padding: '0 10px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{group.group}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)', opacity: 0.6 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${isActive(item.href, item.exact) ? ' active' : ''}`}
                  >
                    <item.icon className="nav-icon" />
                    <span>{item.label}</span>
                    {isActive(item.href, item.exact) && (
                      <ChevronRight size={12} className="ml-auto" style={{ color: 'var(--acc)', opacity: 0.7 }} />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '14px 12px 12px',
          borderTop: '1px solid var(--border)',
          background: 'linear-gradient(180deg, transparent 0%, var(--surface) 100%)',
        }}>
          <a href="/api/auth/logout" className="nav-item">
            <LogOut className="nav-icon" />
            <span>Sign out</span>
          </a>
          <div style={{
            marginTop: 8,
            padding: '6px 12px',
            fontSize: 9,
            color: 'var(--t4)',
            fontFamily: 'ui-monospace, Menlo, monospace',
            opacity: 0.55,
            letterSpacing: '0.02em',
          }}>
            build {BUILD_MARKER}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1" style={{ marginLeft: 'var(--sidebar-w)' }}>
        {/* Top bar */}
        <header
          className="sticky top-0 flex items-center justify-between"
          style={{
            height: 'var(--header-h)',
            padding: '0 var(--content-pad-x)',
            background: 'rgba(7,7,13,0.82)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid var(--border)',
            zIndex: 30,
          }}
        >
          <div className="flex items-center" style={{ color: 'var(--t3)', fontSize: 14, gap: 10 }}>
            <span style={{ fontWeight: 500 }}>Admin</span>
            <ChevronRight size={13} style={{ opacity: 0.5 }} />
            <span style={{ color: 'var(--t1)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
              {(() => {
                const seg = pathname.split('/').filter(Boolean)
                const last = seg[seg.length - 1]
                if (!last || last === 'admin') return 'Dashboard'
                return last.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              })()}
            </span>
          </div>
          <div className="flex items-center" style={{ gap: 14 }}>
            <span className="header-pill" style={{ fontSize: 12, padding: '7px 13px' }}>
              <span className="live-dot" /> Live
            </span>
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 38, height: 38,
                background: 'linear-gradient(135deg, var(--acc) 0%, var(--purple) 100%)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                boxShadow: '0 6px 16px -2px rgba(45,212,164,0.4)',
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-auto"
          style={{
            padding: 'var(--content-pad-y) var(--content-pad-x) calc(var(--content-pad-y) + 24px)',
          }}
        >
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
