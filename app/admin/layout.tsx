'use client'

/**
 * Admin layout — wraps every /admin/* route.
 *
 * Sidebar items come from lib/admin/nav-catalog.ts so adding a row
 * to the catalog automatically lights it up. Per-role visibility
 * comes from /api/admin/me which returns allowed_nav_keys
 * (null = super_admin = all, or an explicit array for restricted
 * roles).
 *
 * History: this file used to hardcode its own NAV list with five
 * groups (Overview / Workflow / Users & Billing / Content /
 * System). Every page added after that list — Marketing Studio,
 * Social Studio, Power Search, Top Customers, Top Referrers, Daily
 * Digest, Payment Issues, Permissions, Abuse Flags, API Health,
 * Geo Revenue, Inactive Customers — was invisible from the sidebar.
 * A previous attempt at this rewrite introduced new Lucide imports
 * that broke runtime rendering on /login + other unrelated routes;
 * this version uses ONLY the icon set already imported by the
 * original layout, with sensible fallbacks for new entries.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { ADMIN_NAV } from '@/lib/admin/nav-catalog'

// Icon resolver. Restricted to the proven-working set already
// imported above — keeps the bundle stable. New nav rows fall back
// to FileText, which renders cleanly for anything text-y.
type Icon = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
const ICON_FOR_HREF: Record<string, Icon> = {
  '/admin':                     LayoutDashboard,
  '/admin/digest':              Activity,
  '/admin/health':              Activity,
  '/admin/bi':                  Activity,
  '/admin/funnel':              ShieldAlert,
  '/admin/analytics-extras':    Activity,
  '/admin/geo-revenue':         Map,
  '/admin/users':               Users,
  '/admin/top-customers':       Users,
  '/admin/top-referrers':       UserPlus,
  '/admin/inactive-customers':  Users,
  '/admin/roles':               Users2,
  '/admin/roles/permissions':   ShieldAlert,
  '/admin/invites':             UserPlus,
  '/admin/approvals':           Inbox,
  '/admin/jit':                 Zap,
  '/admin/customer-health':     Activity,
  '/admin/subscriptions':       CreditCard,
  '/admin/payments':            Package,
  '/admin/payment-issues':      ShieldAlert,
  '/admin/coupons':             Tag,
  '/admin/cohorts':             Users2,
  '/admin/site-content':        FileText,
  '/admin/banners':             ImageIcon,
  '/admin/announcements':       Megaphone,
  '/admin/broadcasts':          Megaphone,
  '/admin/bulk':                Package,
  '/admin/content':             FileText,
  '/admin/changelog':           History,
  '/admin/roadmap':             Map,
  '/admin/translations':        Languages,
  '/admin/seo':                 Search,
  '/admin/seo-pages':           Search,
  '/admin/testimonials':        Inbox,
  '/admin/faqs':                HelpCircle,
  '/admin/marketing':           Megaphone,
  '/admin/marketing/social':    Megaphone,
  '/admin/search':              Search,
  '/admin/items':               ListTodo,
  '/admin/email-templates':     Mail,
  '/admin/email-log':           Mail,
  '/admin/support':             Inbox,
  '/admin/feedback':            Inbox,
  '/admin/kb':                  FileText,
  '/admin/cron':                Calendar,
  '/admin/experiments':         Beaker,
  '/admin/flags':               Flag,
  '/admin/api-health':          Activity,
  '/admin/errors':              ShieldAlert,
  '/admin/anomalies':           ShieldAlert,
  '/admin/csp-reports':         ShieldAlert,
  '/admin/webhooks':            Webhook,
  '/admin/audit-log':           History,
  '/admin/audit-chain':         History,
  '/admin/consent':             FileText,
  '/admin/dsar':                FileText,
  '/admin/gdpr-sub-processors': FileText,
  '/admin/connections':         Webhook,
  '/admin/ip-allowlist':        ShieldAlert,
  '/admin/abuse-flags':         ShieldAlert,
  '/admin/system':              Settings,
  '/admin/maintenance':         Calendar,
  '/admin/data-export':         Download,
  '/admin/settings':            Settings,
}
const DEFAULT_ICON: Icon = FileText

interface Me {
  role:              string
  email:             string | null
  /** null = super_admin (see all); array = explicit allow-list. */
  allowed_nav_keys:  string[] | null
}

/** href → nav_key used by role_tab_permissions. */
function hrefToNavKey(href: string): string {
  const stripped = href.replace(/^\/admin\/?/, '').replace(/\/$/, '')
  return stripped || 'dashboard'
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .then((j) => { if (!cancelled && j) setMe(j) })
      .catch(() => null)
    return () => { cancelled = true }
  }, [])

  // Filter by role permissions. super_admin sees everything
  // (allowed_nav_keys === null).
  const filteredNav = useMemo(() => {
    if (!me || me.allowed_nav_keys === null) return ADMIN_NAV
    const allow = new Set(me.allowed_nav_keys)
    return ADMIN_NAV
      .map((g) => ({ ...g, items: g.items.filter((i) => allow.has(hrefToNavKey(i.href))) }))
      .filter((g) => g.items.length > 0)
  }, [me])

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <aside
        className="fixed inset-y-0 left-0 flex flex-col"
        style={{
          width: 'var(--sidebar-w)',
          background: 'var(--bg2)',
          borderRight: '1px solid var(--border)',
          zIndex: 40,
        }}
      >
        <div
          className="flex items-center gap-2.5 px-4 py-4"
          style={{ borderBottom: '1px solid var(--border)', minHeight: 'var(--header-h)' }}
        >
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: 'var(--acc-bg)', border: '1px solid var(--acc-border)' }}
          >
            <Terminal size={14} style={{ color: 'var(--acc)' }} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--t1)' }}>Termimal</div>
            <div className="text-xs" style={{ color: 'var(--t4)' }}>Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {filteredNav.map((group) => (
            <div key={group.title}>
              <div className="section-title px-1">{group.title}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICON_FOR_HREF[item.href] ?? DEFAULT_ICON
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item${active ? ' active' : ''}`}
                    >
                      <Icon className="nav-icon" />
                      <span>{item.label}</span>
                      {active && <ChevronRight size={12} className="ml-auto" style={{ color: 'var(--t4)' }} />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 px-2 py-2 mb-1" style={{ minWidth: 0 }}>
            <div
              className="flex items-center justify-center rounded-full text-[10px] font-bold shrink-0"
              style={{
                width: 24, height: 24,
                background: 'var(--acc-bg)',
                color: 'var(--acc)',
              }}
            >
              {me?.role === 'super_admin' ? 'SA' : me?.role ? me.role[0]?.toUpperCase() ?? 'A' : '·'}
            </div>
            <div className="flex flex-col" style={{ minWidth: 0 }}>
              <span className="text-[11px] font-bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--t1)' }}>
                {me ? (me.role === 'super_admin' ? 'Super Admin' : me.role.charAt(0).toUpperCase() + me.role.slice(1)) : 'Loading…'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--t4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {me?.email ?? '—'}
              </span>
            </div>
          </div>
          <a href="/api/auth/logout" className="nav-item">
            <LogOut className="nav-icon" />
            <span>Sign out</span>
          </a>
        </div>
      </aside>

      <div className="flex flex-col flex-1" style={{ marginLeft: 'var(--sidebar-w)' }}>
        <header
          className="sticky top-0 flex items-center justify-between px-6"
          style={{
            height: 'var(--header-h)',
            background: 'rgba(8,8,15,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
            zIndex: 30,
          }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--t3)' }}>
            <span>Admin</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--t1)' }}>
              {(() => {
                const seg = pathname.split('/').filter(Boolean)
                const last = seg[seg.length - 1]
                if (!last || last === 'admin') return 'Dashboard'
                return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ')
              })()}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
