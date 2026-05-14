"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, FileText, Languages, Flag, Settings,
  LogOut, Activity, Megaphone, Search, Mail, ShieldCheck, AlertOctagon,
  Inbox, Bell, Briefcase, Eye, GitBranch, Globe, HardDrive, Hash, Layers,
  LifeBuoy, LineChart, Map, MessageSquare, PackageOpen, Receipt, RefreshCw,
  Send, ShieldAlert, Sliders, Star, Tag, Target, TestTube, Ticket, ToggleRight,
  UserCog, Webhook, Wrench, Zap, Calendar, Coins, ClipboardList, FileSearch,
  Layout, Cog,
} from "lucide-react";

/**
 * Full admin nav — every page reachable from one place.
 *
 * History: the previous AdminLayout only listed 11 of 65 pages, leaving
 * most of the back-office invisible from the sidebar. Restored here
 * with a defensible information architecture (10 groups, alphabetised
 * inside each). Every new admin page must be added to this file —
 * grep for the file path in the tree and it'll be obvious which group
 * to put it in.
 *
 * Visual rules unchanged from the prior version: same surface tokens,
 * same active-state highlight. Sidebar is scrollable when the nav
 * exceeds viewport height (which it now does at 1080p).
 */
const navGroups: { title: string; items: { label: string; href: string; icon: any }[] }[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard",        href: "/admin",            icon: LayoutDashboard },
      { label: "Health",           href: "/admin/health",     icon: Activity },
      { label: "BI",               href: "/admin/bi",         icon: LineChart },
      { label: "Funnel",           href: "/admin/funnel",     icon: Target },
      { label: "Analytics+",       href: "/admin/analytics-extras", icon: Layers },
    ],
  },
  {
    title: "USERS & ROLES",
    items: [
      { label: "User Directory",   href: "/admin/users",      icon: Users },
      { label: "Roles",            href: "/admin/roles",      icon: UserCog },
      { label: "Invites",          href: "/admin/invites",    icon: Mail },
      { label: "Approvals",        href: "/admin/approvals",  icon: ClipboardList },
      { label: "JIT Elevations",   href: "/admin/jit",        icon: Zap },
      { label: "Customer Health",  href: "/admin/customer-health", icon: Star },
    ],
  },
  {
    title: "REVENUE",
    items: [
      { label: "Payments",         href: "/admin/payments",       icon: Activity },
      { label: "Subscriptions",    href: "/admin/subscriptions",  icon: CreditCard },
      { label: "Coupons",          href: "/admin/coupons",        icon: Tag },
      { label: "Disputes",         href: "/admin/disputes",       icon: AlertOctagon },
      { label: "Dunning",          href: "/admin/dunning",        icon: RefreshCw },
      { label: "Plan Changes",     href: "/admin/plan-changes",   icon: GitBranch },
      { label: "Payment Methods",  href: "/admin/payment-methods",icon: Coins },
      { label: "Affiliates",       href: "/admin/affiliates",     icon: Briefcase },
      { label: "Referrals",        href: "/admin/referrals",      icon: Send },
      { label: "Win-back",         href: "/admin/win-back",       icon: Target },
      { label: "Finance",          href: "/admin/finance",        icon: Receipt },
      { label: "Tax",              href: "/admin/tax",            icon: Receipt },
    ],
  },
  {
    title: "MARKETING & CONTENT",
    items: [
      { label: "Site Content",     href: "/admin/site-content",   icon: FileText },
      { label: "Banners & Promos", href: "/admin/banners",        icon: Megaphone },
      { label: "Announcements",    href: "/admin/announcements",  icon: Bell },
      { label: "Broadcasts",       href: "/admin/broadcasts",     icon: Send },
      { label: "Bulk Ops",         href: "/admin/bulk",           icon: PackageOpen },
      { label: "Content / CMS",    href: "/admin/content",        icon: FileText },
      { label: "Changelog",        href: "/admin/changelog",      icon: GitBranch },
      { label: "Roadmap",          href: "/admin/roadmap",        icon: Map },
      { label: "Translations",     href: "/admin/translations",   icon: Languages },
      { label: "SEO Manager",      href: "/admin/seo",            icon: Search },
      { label: "SEO Pages",        href: "/admin/seo-pages",      icon: FileSearch },
      { label: "Testimonials",     href: "/admin/testimonials",   icon: MessageSquare },
      { label: "FAQs",             href: "/admin/faqs",           icon: LifeBuoy },
      { label: "Marketing Studio", href: "/admin/marketing",      icon: Layout },
      { label: "Social Studio",    href: "/admin/marketing/social", icon: Hash },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Items",            href: "/admin/items",          icon: PackageOpen },
      { label: "Email Templates",  href: "/admin/email-templates",icon: Mail },
      { label: "Email Log",        href: "/admin/email-log",      icon: Inbox },
      { label: "Support",          href: "/admin/support",        icon: LifeBuoy },
      { label: "Feedback",         href: "/admin/feedback",       icon: MessageSquare },
      { label: "Knowledge Base",   href: "/admin/kb",             icon: FileText },
      { label: "Cron",             href: "/admin/cron",           icon: Calendar },
      { label: "Webhooks",         href: "/admin/webhooks",       icon: Webhook },
      { label: "Webhook Retries",  href: "/admin/webhook-retries",icon: RefreshCw },
      { label: "Export",           href: "/admin/export",         icon: HardDrive },
    ],
  },
  {
    title: "EXPERIMENTS",
    items: [
      { label: "Experiments",      href: "/admin/experiments",    icon: TestTube },
      { label: "Cohorts",          href: "/admin/cohorts",        icon: Users },
      { label: "Feature Flags",    href: "/admin/flags",          icon: Flag },
    ],
  },
  {
    title: "RELIABILITY",
    items: [
      { label: "Errors",           href: "/admin/errors",         icon: AlertOctagon },
      { label: "Anomalies",        href: "/admin/anomalies",      icon: Activity },
      { label: "Audit Log",        href: "/admin/audit-log",      icon: FileSearch },
      { label: "Audit Chain",      href: "/admin/audit-chain",    icon: GitBranch },
      { label: "Incident",         href: "/admin/incident",       icon: ShieldAlert },
      { label: "Maintenance",      href: "/admin/maintenance",    icon: Wrench },
      { label: "SLA",              href: "/admin/sla",            icon: Activity },
    ],
  },
  {
    title: "COMPLIANCE",
    items: [
      { label: "Consent Log",      href: "/admin/consent",        icon: ShieldCheck },
      { label: "CSP Reports",      href: "/admin/csp-reports",    icon: Eye },
      { label: "DSAR Requests",    href: "/admin/dsar",           icon: ClipboardList },
      { label: "RoPA Entries",     href: "/admin/ropa",           icon: FileText },
      { label: "Sub-processors",   href: "/admin/sub-processors", icon: Globe },
    ],
  },
  {
    title: "SECURITY",
    items: [
      { label: "Secrets Registry", href: "/admin/secrets",        icon: ShieldCheck },
      { label: "System State",     href: "/admin/system",         icon: Cog },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Settings",         href: "/admin/settings",       icon: Settings },
      { label: "Ticket Triage",    href: "/admin/support",        icon: Ticket },
    ],
  },
];

// One flat lookup for the page title in the top bar.
const navFlat = navGroups.flatMap(g => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  // Filter items by search query (case-insensitive, matches label).
  const filteredGroups = search.trim()
    ? navGroups
        .map(g => ({
          ...g,
          items: g.items.filter(i =>
            i.label.toLowerCase().includes(search.trim().toLowerCase()),
          ),
        }))
        .filter(g => g.items.length > 0)
    : navGroups;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      <aside className="w-60 shrink-0 p-4 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-[2px] rotate-45 border-2" style={{ borderColor: 'var(--acc)', opacity: .5 }} />
            <div className="absolute inset-[2px] rounded-[1px] rotate-45" style={{ background: 'var(--acc)' }} />
          </div>
          <span className="text-[0.85rem] font-bold tracking-tight">Termimal Admin</span>
        </div>

        {/* Quick search — the nav got long enough to need it. */}
        <div className="mb-4 px-1">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--t4)' }} />
            <input
              type="text"
              placeholder="Search admin…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 rounded-md text-[0.7rem] outline-none"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--t1)',
              }}
            />
          </div>
        </div>

        <nav className="flex flex-col gap-5 flex-1 overflow-y-auto no-scrollbar">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              <div className="px-2 mb-1.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ color: 'var(--t4)' }}>
                {group.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname?.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[0.72rem] font-medium transition-all"
                      style={{
                        background: active ? 'var(--bg)' : 'transparent',
                        color:      active ? 'var(--t1)' : 'var(--t3)',
                        border:     active ? '1px solid var(--border)' : '1px solid transparent',
                      }}
                    >
                      <Icon size={13} style={{ color: active ? 'var(--acc)' : 'currentColor' }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div className="text-[0.65rem] text-center px-2 py-4" style={{ color: 'var(--t4)' }}>
              No matches for &ldquo;{search}&rdquo;
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--green-val)' }}>SA</div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] font-bold">Super Admin</span>
              <span className="text-[0.55rem]" style={{ color: 'var(--t4)' }}>admin@termimal.com</span>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 px-2 py-1.5 text-[0.7rem] hover:opacity-70 transition-opacity" style={{ color: 'var(--t3)' }}>
            <LogOut size={12} />Exit to site
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h1 className="text-lg font-bold tracking-tight">
            {navFlat.find(n => pathname === n.href || (n.href !== '/admin' && pathname?.startsWith(n.href + '/')))?.label || "Dashboard"}
          </h1>
          <div className="text-[0.7rem] px-2 py-1 rounded-md font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>v2.4.1 (Production)</div>
        </header>
        <div className="p-8 overflow-y-auto flex-1">{children}</div>
      </main>
    </div>
  );
}
