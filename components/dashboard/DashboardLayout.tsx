'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { LayoutDashboard, CreditCard, Download, Layout, Bell, Users, User, Shield, LogOut } from 'lucide-react'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Subscription', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Downloads', href: '/dashboard/downloads', icon: Download },
  { label: 'Workspaces', href: '/dashboard/workspaces', icon: Layout },
  { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
  { label: 'Referrals', href: '/dashboard/referrals', icon: Users },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside className="w-56 shrink-0 p-4 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <Link href="/" className="flex items-center gap-2 mb-8 px-2">
          <div className="relative w-6 h-6"><div className="absolute inset-0 rounded-[3px] rotate-45 border" style={{ borderColor: 'var(--acc)', opacity: .5 }} /><div className="absolute inset-[2px] rounded-[2px] rotate-45" style={{ background: 'var(--acc)' }} /></div>
          <span className="text-sm font-semibold" style={{ letterSpacing: '-0.02em' }}>Termimal</span>
        </Link>
        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.78rem] font-medium transition-all',
                  active ? 'font-semibold' : ''
                )}
                style={{ background: active ? 'var(--bh)' : 'transparent', color: active ? 'var(--t1)' : 'var(--t3)' }}>
                <item.icon size={15} /> {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2 mt-auto pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <ThemeToggle />
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[0.72rem] transition-all" style={{ color: 'var(--t4)' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-lg font-bold tracking-tight">{navItems.find(n => n.href === pathname)?.label || 'Dashboard'}</h1>
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-[0.72rem] py-1.5 px-3">Launch Terminal</button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.65rem] font-bold" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>KU</div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
