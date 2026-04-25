'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  FileText,
  Image as ImageIcon,
  HelpCircle,
  Search,
  Languages,
  Flag,
  CreditCard,
  Coins,
  Settings,
  Wallet,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { href: '/admin/seo', label: 'SEO', icon: Search },
  { href: '/admin/translations', label: 'Translations', icon: Languages },
  { href: '/admin/flags', label: 'Flags', icon: Flag },
  { href: '/admin/payments', label: 'Payments', icon: Wallet },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/credits', label: 'Credits', icon: Coins },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{ borderColor: 'var(--border)', background: 'var(--nav-bg)' }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--t1)' }}>
                Termimal Admin
              </h1>
              <p className="text-xs" style={{ color: 'var(--t3)' }}>
                Internal operations and content control
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-3 flex-wrap">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    active ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="p-6 md:p-8">{children}</main>
    </div>
  )
}