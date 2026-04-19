'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CreditCard, FileText, Languages, Flag, Tag, Shield, BarChart3, Settings, LogOut } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { label: 'Content / CMS', href: '/admin/content', icon: FileText },
  { label: 'Translations', href: '/admin/translations', icon: Languages },
  { label: 'Feature Flags', href: '/admin/flags', icon: Flag },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside className="w-52 shrink-0 p-3 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-6 px-2 pt-1">
          <div className="relative w-5 h-5"><div className="absolute inset-0 rounded-[2px] rotate-45 border" style={{ borderColor: 'var(--acc)', opacity: .5 }} /><div className="absolute inset-[2px] rounded-[1px] rotate-45" style={{ background: 'var(--acc)' }} /></div>
          <span className="text-[0.78rem] font-semibold">Termimal</span>
          <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded ml-auto" style={{ color: 'var(--red-val)', background: 'rgba(248,113,113,.1)' }}>ADMIN</span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[0.72rem] font-medium transition-all"
                style={{ background: active ? 'var(--bh)' : 'transparent', color: active ? 'var(--t1)' : 'var(--t3)' }}>
                <item.icon size={14} /> {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2 mt-auto pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link href="/" className="text-[0.65rem] font-medium" style={{ color: 'var(--t4)' }}>← Back to site</Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-base font-bold tracking-tight">{navItems.find(n => n.href === pathname)?.label || 'Admin'}</h1>
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-mono" style={{ color: 'var(--t4)' }}>Super Admin</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>SA</div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}