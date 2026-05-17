/**
 * Single source of truth for "every admin nav entry that exists."
 *
 * AdminLayout imports this for sidebar rendering; the
 * /admin/roles/permissions matrix imports it so super_admin can
 * toggle visibility per entry without us duplicating the list.
 *
 * Keep `nav_key` URL-safe and stable — it's the primary key joined
 * to role_tab_permissions. The labels can change; the keys cannot
 * without a migration that renames the rows.
 */

export interface NavItem {
  /** UI label. */
  label:    string
  /** Route. /admin/users → nav_key 'users'. */
  href:     string
  /** Optional lucide icon name (resolved by the consumer). */
  iconName?: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard',         href: '/admin' },
      { label: 'Daily Digest',      href: '/admin/digest' },
      { label: 'Health',            href: '/admin/health' },
      { label: 'BI',                href: '/admin/bi' },
      { label: 'Funnel',            href: '/admin/funnel' },
      { label: 'Analytics+',        href: '/admin/analytics-extras' },
      { label: 'Geo Revenue',       href: '/admin/geo-revenue' },
    ],
  },
  {
    title: 'USERS & ROLES',
    items: [
      { label: 'User Directory',    href: '/admin/users' },
      { label: 'Top Customers',     href: '/admin/top-customers' },
      { label: 'Top Referrers',     href: '/admin/top-referrers' },
      { label: 'Inactive Customers',href: '/admin/inactive-customers' },
      { label: 'Roles',             href: '/admin/roles' },
      { label: 'Permissions',       href: '/admin/roles/permissions' },
      { label: 'Invites',           href: '/admin/invites' },
      { label: 'Approvals',         href: '/admin/approvals' },
      { label: 'JIT Elevations',    href: '/admin/jit' },
      { label: 'Customer Health',   href: '/admin/customer-health' },
    ],
  },
  {
    title: 'REVENUE',
    items: [
      { label: 'Subscriptions',     href: '/admin/subscriptions' },
      { label: 'Payments',          href: '/admin/payments' },
      { label: 'Payment Issues',    href: '/admin/payment-issues' },
      { label: 'Coupons',           href: '/admin/coupons' },
      { label: 'Cohorts',           href: '/admin/cohorts' },
    ],
  },
  {
    title: 'MARKETING & CONTENT',
    items: [
      { label: 'Site Content',      href: '/admin/site-content' },
      { label: 'Banners & Promos',  href: '/admin/banners' },
      { label: 'Announcements',     href: '/admin/announcements' },
      { label: 'Broadcasts',        href: '/admin/broadcasts' },
      { label: 'Bulk Ops',          href: '/admin/bulk' },
      { label: 'Content / CMS',     href: '/admin/content' },
      { label: 'Changelog',         href: '/admin/changelog' },
      { label: 'Roadmap',           href: '/admin/roadmap' },
      { label: 'Translations',      href: '/admin/translations' },
      { label: 'SEO Manager',       href: '/admin/seo' },
      { label: 'SEO Pages',         href: '/admin/seo-pages' },
      { label: 'Testimonials',      href: '/admin/testimonials' },
      { label: 'FAQs',              href: '/admin/faqs' },
      { label: 'Marketing Studio',  href: '/admin/marketing' },
      { label: 'Social Studio',     href: '/admin/marketing/social' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Power Search',      href: '/admin/search' },
      { label: 'Items',             href: '/admin/items' },
      { label: 'Email Templates',   href: '/admin/email-templates' },
      { label: 'Email Log',         href: '/admin/email-log' },
      { label: 'Support',           href: '/admin/support' },
      { label: 'Feedback',          href: '/admin/feedback' },
      { label: 'Knowledge Base',    href: '/admin/kb' },
      { label: 'Automations',       href: '/admin/cron' },
    ],
  },
  {
    title: 'EXPERIMENTS',
    items: [
      { label: 'Experiments',       href: '/admin/experiments' },
      { label: 'Feature Flags',     href: '/admin/flags' },
    ],
  },
  {
    title: 'RELIABILITY',
    items: [
      { label: 'API Health',        href: '/admin/api-health' },
      { label: 'Errors',            href: '/admin/errors' },
      { label: 'Anomalies',         href: '/admin/anomalies' },
      { label: 'CSP Reports',       href: '/admin/csp-reports' },
      { label: 'Webhooks',          href: '/admin/webhooks' },
      { label: 'Audit Log',         href: '/admin/audit-log' },
      { label: 'Audit Chain',       href: '/admin/audit-chain' },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'Consent',           href: '/admin/consent' },
      { label: 'DSAR',              href: '/admin/dsar' },
      { label: 'GDPR Sub-processors', href: '/admin/gdpr-sub-processors' },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      { label: 'Connections',       href: '/admin/connections' },
      { label: 'IP Allowlist',      href: '/admin/ip-allowlist' },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'System',            href: '/admin/system' },
      { label: 'Maintenance',       href: '/admin/maintenance' },
      { label: 'Data Export',       href: '/admin/data-export' },
      { label: 'Admin Invites',     href: '/admin/invites' },
      { label: 'Settings',          href: '/admin/settings' },
    ],
  },
]

/** Flatten to a single { nav_key, label, href, group } list. */
export function flatten(): Array<NavItem & { nav_key: string; group: string }> {
  return ADMIN_NAV.flatMap((g) =>
    g.items.map((i) => ({
      ...i,
      nav_key: i.href.replace(/^\/admin\/?/, '').replace(/\/$/, '') || 'dashboard',
      group:   g.title,
    })),
  )
}
