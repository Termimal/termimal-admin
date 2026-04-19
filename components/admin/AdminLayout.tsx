"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, FileText, Languages, Flag, Settings, LogOut, Activity, Megaphone, Search } from "lucide-react";

const navGroups = [
  { title: "CORE", items: [ { label: "Dashboard", href: "/admin", icon: LayoutDashboard }, { label: "User Directory", href: "/admin/users", icon: Users } ] },
  { title: "REVENUE", items: [ { label: "Payments & Metrics", href: "/admin/payments", icon: Activity }, { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard } ] },
  { title: "MARKETING & CONTENT", items: [ { label: "Banners & Promos", href: "/admin/banners", icon: Megaphone }, { label: "Translations", href: "/admin/translations", icon: Languages }, { label: "SEO Manager", href: "/admin/seo", icon: Search }, { label: "Content / CMS", href: "/admin/content", icon: FileText } ] },
  { title: "SYSTEM", items: [ { label: "Feature Flags", href: "/admin/flags", icon: Flag }, { label: "Settings", href: "/admin/settings", icon: Settings } ] }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      <aside className="w-56 shrink-0 p-4 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="relative w-5 h-5"><div className="absolute inset-0 rounded-[2px] rotate-45 border-2" style={{ borderColor: 'var(--acc)', opacity: .5 }} /><div className="absolute inset-[2px] rounded-[1px] rotate-45" style={{ background: 'var(--acc)' }} /></div>
          <span className="text-[0.85rem] font-bold tracking-tight">Termimal Admin</span>
        </div>
        <nav className="flex flex-col gap-6 flex-1 overflow-y-auto no-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-2 mb-2 text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>{group.title}</div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all" style={{ background: active ? 'var(--bg)' : 'transparent', color: active ? 'var(--t1)' : 'var(--t3)', border: active ? '1px solid var(--border)' : '1px solid transparent' }}>
                      <item.icon size={14} style={{ color: active ? 'var(--acc)' : 'currentColor' }} />{item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--green-val)' }}>SA</div>
            <div className="flex flex-col"><span className="text-[0.65rem] font-bold">Super Admin</span><span className="text-[0.55rem]" style={{ color: 'var(--t4)' }}>admin@termimal.com</span></div>
          </div>
          <Link href="/" className="flex items-center gap-2 px-2 py-1.5 text-[0.7rem] hover:opacity-70 transition-opacity" style={{ color: 'var(--t3)' }}><LogOut size={12} />Exit to site</Link>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h1 className="text-lg font-bold tracking-tight">{navGroups.flatMap(g => g.items).find(n => n.href === pathname)?.label || "Dashboard"}</h1>
          <div className="text-[0.7rem] px-2 py-1 rounded-md font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>v2.4.1 (Production)</div>
        </header>
        <div className="p-8 overflow-y-auto flex-1">{children}</div>
      </main>
    </div>
  );
}
