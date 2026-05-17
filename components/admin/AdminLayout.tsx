"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, FileText, Languages, Flag, Settings,
  LogOut, Activity, Megaphone, Search, Mail, ShieldCheck, AlertOctagon,
  Inbox, Bell, Briefcase, Eye, GitBranch, Globe, HardDrive, Hash, Layers,
  LifeBuoy, LineChart, Map, MessageSquare, PackageOpen, Receipt, RefreshCw,
  Send, ShieldAlert, Sliders, Star, Tag, Target, TestTube, Ticket, ToggleRight,
  UserCog, Webhook, Wrench, Zap, Calendar, Coins, ClipboardList, FileSearch,
  Layout, Cog, Key, Crown, Sunrise, Trophy, Clock, ShieldOff, Globe2,
} from "lucide-react";
import { ADMIN_NAV } from "@/lib/admin/nav-catalog";

/**
 * Full admin nav — sourced from lib/admin/nav-catalog.ts so the
 * sidebar and the role-permissions matrix can never drift apart.
 *
 * History: the previous AdminLayout listed pages inline, and every
 * nav addition to nav-catalog.ts went invisible because the sidebar
 * read from this file instead. Switched to import the catalog so
 * adding a row to nav-catalog.ts automatically lights it up in the
 * sidebar.
 *
 * Icons are resolved by href via ICON_FOR_HREF below; entries with
 * no exact match fall back to a generic icon. Visual rules unchanged.
 */

// Map specific hrefs to Lucide icons. Any href not listed gets a
// generic Layers icon — that's fine because the label is what users
// actually scan.
const ICON_FOR_HREF: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  '/admin':                     LayoutDashboard,
  '/admin/digest':              Sunrise,
  '/admin/health':              Activity,
  '/admin/bi':                  LineChart,
  '/admin/funnel':              Target,
  '/admin/analytics-extras':    Layers,
  '/admin/geo-revenue':         Globe2,
  '/admin/users':               Users,
  '/admin/top-customers':       Trophy,
  '/admin/top-referrers':       Crown,
  '/admin/inactive-customers':  Clock,
  '/admin/roles':               UserCog,
  '/admin/roles/permissions':   ShieldCheck,
  '/admin/invites':             Mail,
  '/admin/approvals':           ClipboardList,
  '/admin/jit':                 Zap,
  '/admin/customer-health':     Star,
  '/admin/subscriptions':       CreditCard,
  '/admin/payments':            Activity,
  '/admin/payment-issues':      AlertOctagon,
  '/admin/coupons':             Tag,
  '/admin/cohorts':             Users,
  '/admin/site-content':        FileText,
  '/admin/banners':             Megaphone,
  '/admin/announcements':       Bell,
  '/admin/broadcasts':          Send,
  '/admin/bulk':                PackageOpen,
  '/admin/content':             FileText,
  '/admin/changelog':           GitBranch,
  '/admin/roadmap':             Map,
  '/admin/translations':        Languages,
  '/admin/seo':                 Search,
  '/admin/seo-pages':           FileSearch,
  '/admin/testimonials':        MessageSquare,
  '/admin/faqs':                LifeBuoy,
  '/admin/marketing':           Layout,
  '/admin/marketing/social':    Hash,
  '/admin/search':              Search,
  '/admin/items':               PackageOpen,
  '/admin/email-templates':     Mail,
  '/admin/email-log':           Inbox,
  '/admin/support':             LifeBuoy,
  '/admin/feedback':            MessageSquare,
  '/admin/kb':                  FileText,
  '/admin/cron':                Calendar,
  '/admin/experiments':         TestTube,
  '/admin/flags':               Flag,
  '/admin/api-health':          Activity,
  '/admin/errors':              AlertOctagon,
  '/admin/anomalies':           Activity,
  '/admin/csp-reports':         Eye,
  '/admin/webhooks':            Webhook,
  '/admin/audit-log':           FileSearch,
  '/admin/audit-chain':         GitBranch,
  '/admin/consent':             ShieldCheck,
  '/admin/dsar':                ClipboardList,
  '/admin/gdpr-sub-processors': Globe,
  '/admin/connections':         Key,
  '/admin/ip-allowlist':        ShieldCheck,
  '/admin/abuse-flags':         ShieldOff,
  '/admin/system':              Cog,
  '/admin/maintenance':         Wrench,
  '/admin/data-export':         HardDrive,
  '/admin/settings':            Settings,
};

const DEFAULT_ICON = Layers;

// Build navGroups from the shared catalog. Adding a row to
// lib/admin/nav-catalog.ts now automatically surfaces in the sidebar.
const navGroups: { title: string; items: { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }> }[] }[] =
  ADMIN_NAV.map((g) => ({
    title: g.title,
    items: g.items.map((it) => ({
      label: it.label,
      href:  it.href,
      icon:  ICON_FOR_HREF[it.href] ?? DEFAULT_ICON,
    })),
  }));

// One flat lookup for the page title in the top bar.
const navFlat = navGroups.flatMap(g => g.items);

/** Convert a nav item href to the canonical nav_key used by
 *  role_tab_permissions. Mirror of lib/admin/role-permissions.ts. */
function hrefToNavKey(href: string): string {
  const stripped = href.replace(/^\/admin\/?/, '').replace(/\/$/, '');
  return stripped || 'dashboard';
}

interface Me {
  role:             string
  email:            string | null
  /** null = super_admin (see all); array = explicit allow-list. */
  allowed_nav_keys: string[] | null
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  // Pull role + allowed nav keys once at mount. Filtering before this
  // resolves would either render the full sidebar (leak surface) or
  // a blank sidebar (looks broken) — pause filtering until we know.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() as Promise<Me> : null)
      .then(j => { if (!cancelled && j) { setMe(j); } })
      .catch(() => null)
      .finally(() => { if (!cancelled) setMeLoaded(true); });
    return () => { cancelled = true };
  }, []);

  // Filter navGroups by:
  //   1. role permissions (super_admin: pass-through; admin: only
  //      keys present in allowed_nav_keys)
  //   2. search query, applied on top of (1)
  const filteredGroups = useMemo(() => {
    // Pass 1: role permissions
    let groups = navGroups;
    if (me && me.allowed_nav_keys !== null) {
      const allow = new Set(me.allowed_nav_keys);
      groups = navGroups
        .map(g => ({ ...g, items: g.items.filter(i => allow.has(hrefToNavKey(i.href))) }))
        .filter(g => g.items.length > 0);
    }
    // Pass 2: search
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [me, search]);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      <aside
        className="w-64 shrink-0 p-4 flex flex-col border-r"
        style={{
          borderColor: 'var(--border)',
          background:  'var(--surface)',
          // Lock the sidebar to its declared width — without this, on
          // some narrow viewports the flex parent let the sidebar
          // shrink below 256px, which clipped the group header labels
          // ("OVERVIEW" → "ERVIEW") from the left.
          minWidth:    256,
          maxWidth:    256,
        }}
      >
        <div className="flex items-center gap-2 mb-4 px-2" style={{ minWidth: 0 }}>
          <div className="relative w-5 h-5 shrink-0">
            <div className="absolute inset-0 rounded-[2px] rotate-45 border-2" style={{ borderColor: 'var(--acc)', opacity: .5 }} />
            <div className="absolute inset-[2px] rounded-[1px] rotate-45" style={{ background: 'var(--acc)' }} />
          </div>
          <span
            className="text-[0.85rem] font-bold tracking-tight"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            Termimal Admin
          </span>
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
            <div key={group.title} style={{ minWidth: 0 }}>
              <div
                className="px-2 mb-1.5 text-[0.6rem] font-bold uppercase tracking-wider"
                style={{
                  color:        'var(--t4)',
                  // Group labels were clipping ("USERS & ROLES" →
                  // "RS & ROLES") on narrow viewports because the
                  // header had no overflow guard. Lock single-line +
                  // ellipsis so the label degrades cleanly.
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
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
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[0.74rem] font-medium transition-all"
                      style={{
                        background: active ? 'var(--bg)' : 'transparent',
                        color:      active ? 'var(--t1)' : 'var(--t3)',
                        border:     active ? '1px solid var(--border)' : '1px solid transparent',
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        minWidth:     0,
                      }}
                    >
                      <Icon size={13} className="shrink-0" style={{ color: active ? 'var(--acc)' : 'currentColor' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
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
          <div className="flex items-center gap-2 px-2 py-2" style={{ minWidth: 0 }}>
            <div
              className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[0.6rem] font-bold"
              style={{
                background: me?.role === 'super_admin' ? 'rgba(167,139,250,0.14)' : 'rgba(52,211,153,0.1)',
                color:      me?.role === 'super_admin' ? 'var(--purple)'         : 'var(--green-val)',
              }}
            >
              {me?.role === 'super_admin' ? 'SA' : me?.role ? me.role[0]?.toUpperCase() ?? 'A' : '·'}
            </div>
            <div className="flex flex-col" style={{ minWidth: 0 }}>
              <span className="text-[0.65rem] font-bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {me ? (me.role === 'super_admin' ? 'Super Admin' : me.role.charAt(0).toUpperCase() + me.role.slice(1)) : meLoaded ? 'No role' : 'Loading…'}
              </span>
              <span className="text-[0.55rem]" style={{ color: 'var(--t4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {me?.email ?? '—'}
              </span>
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
