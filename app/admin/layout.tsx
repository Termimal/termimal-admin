'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    group: 'Users & Billing',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { href: '/admin/payments', label: 'Payments', icon: Package },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: '/admin/content', label: 'Content', icon: FileText },
      { href: '/admin/banners', label: 'Banners', icon: Flag },
      { href: '/admin/flags', label: 'Feature Flags', icon: Flag },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin/settings', label: 'Settings', icon: Settings },
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
        {/* Logo */}
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV.map((group) => (
            <div key={group.group}>
              <div className="section-title px-1">{group.group}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${isActive(item.href, item.exact) ? ' active' : ''}`}
                  >
                    <item.icon className="nav-icon" />
                    <span>{item.label}</span>
                    {isActive(item.href, item.exact) && (
                      <ChevronRight size={12} className="ml-auto" style={{ color: 'var(--t4)' }} />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <a href="/api/auth/logout" className="nav-item">
            <LogOut className="nav-icon" />
            <span>Sign out</span>
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1" style={{ marginLeft: 'var(--sidebar-w)' }}>
        {/* Top bar */}
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
                return last.charAt(0).toUpperCase() + last.slice(1)
              })()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold"
              style={{ width: 28, height: 28, background: 'var(--acc-bg)', color: 'var(--acc)' }}
            >
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
