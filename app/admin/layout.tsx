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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface p-6">
        <nav className="flex items-center gap-3 flex-wrap">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${active ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="p-8">{children}</main>
    </div>
  )
}
