/**
 * Canonical permission catalogue for the admin back office.
 *
 * Each permission slug is `<section>.<action>`. Routes — both the
 * page routes and the API routes — declare the permission they
 * require, and middleware checks the caller's role grants it before
 * letting the request through.
 *
 * The wildcard `*` grants everything (super_admin only).
 */

export const PERMISSIONS = [
  // Users
  'users.read', 'users.write', 'users.close',
  // Billing
  'billing.read', 'billing.write', 'billing.refund',
  'coupons.read', 'coupons.write',
  'finance.read', 'finance.write',
  // Content
  'content.read', 'content.write',
  'banners.read', 'banners.write',
  'announcements.read', 'announcements.write',
  'faqs.read', 'faqs.write',
  // SEO + i18n
  'seo.read', 'seo.write',
  'translations.read', 'translations.write',
  'email_templates.read', 'email_templates.write',
  // Workflow
  'items.read', 'items.write',
  'support.read', 'support.write',
  'notes.read', 'notes.write',
  // Engineering
  'flags.read', 'flags.write',
  'experiments.read', 'experiments.write',
  'cohorts.read', 'cohorts.write',
  'webhooks.read',
  'anomalies.read',
  // Operations
  'system.read', 'system.write',
  'maintenance.read', 'maintenance.write',
  'audit.read',
  'analytics.read',
  'export.read',
  // RBAC + invites
  'invites.read', 'invites.write',
  'roles.write',
  // Referrals
  'referrals.read', 'referrals.write',
] as const

export type Permission = typeof PERMISSIONS[number] | '*'

/** Map every admin path → required permission (most-specific first). */
export const PATH_PERMISSIONS: Array<{ prefix: string; perm: Permission }> = [
  // API routes — most specific first.
  { prefix: '/api/admin/users/',                  perm: 'users.write' },     // includes [id]/refund/close/etc.
  { prefix: '/api/admin/users',                   perm: 'users.read' },
  { prefix: '/api/admin/customer-notes',          perm: 'notes.read' },
  { prefix: '/api/admin/coupons',                 perm: 'coupons.write' },
  { prefix: '/api/admin/finance',                 perm: 'finance.read' },
  { prefix: '/api/admin/support',                 perm: 'support.read' },
  { prefix: '/api/admin/audit-log',               perm: 'audit.read' },
  { prefix: '/api/admin/anomalies',               perm: 'anomalies.read' },
  { prefix: '/api/admin/items',                   perm: 'items.read' },
  { prefix: '/api/admin/webhooks',                perm: 'webhooks.read' },
  { prefix: '/api/admin/seo-pages',               perm: 'seo.write' },
  { prefix: '/api/admin/translations',            perm: 'translations.write' },
  { prefix: '/api/admin/email-templates',         perm: 'email_templates.write' },
  { prefix: '/api/admin/experiments',             perm: 'experiments.write' },
  { prefix: '/api/admin/cohorts',                 perm: 'cohorts.write' },
  { prefix: '/api/admin/maintenance',             perm: 'maintenance.write' },
  { prefix: '/api/admin/invites',                 perm: 'invites.write' },
  { prefix: '/api/admin/health',                  perm: 'analytics.read' },
  { prefix: '/api/admin/export',                  perm: 'export.read' },
  { prefix: '/api/admin/system',                  perm: 'system.write' },
  { prefix: '/api/admin/roles',                   perm: 'roles.write' },
  { prefix: '/api/admin/referrals',               perm: 'referrals.write' }, // PATCH — covers reads too
  { prefix: '/api/admin',                         perm: 'users.read' },      // catch-all minimal

  // Page routes.
  { prefix: '/admin/users/',     perm: 'users.write' },
  { prefix: '/admin/users',      perm: 'users.read' },
  { prefix: '/admin/payments',   perm: 'billing.read' },
  { prefix: '/admin/subscriptions', perm: 'billing.read' },
  { prefix: '/admin/coupons',    perm: 'coupons.read' },
  { prefix: '/admin/finance',    perm: 'finance.read' },
  { prefix: '/admin/cohorts',    perm: 'cohorts.read' },
  { prefix: '/admin/audit-log',  perm: 'audit.read' },
  { prefix: '/admin/webhooks',   perm: 'webhooks.read' },
  { prefix: '/admin/anomalies',  perm: 'anomalies.read' },
  { prefix: '/admin/support',    perm: 'support.read' },
  { prefix: '/admin/items',      perm: 'items.read' },
  { prefix: '/admin/roadmap',    perm: 'items.read' },
  { prefix: '/admin/content',    perm: 'content.read' },
  { prefix: '/admin/banners',    perm: 'banners.read' },
  { prefix: '/admin/announcements', perm: 'announcements.read' },
  { prefix: '/admin/faqs',       perm: 'faqs.read' },
  { prefix: '/admin/seo-pages',  perm: 'seo.read' },
  { prefix: '/admin/seo',        perm: 'seo.read' },
  { prefix: '/admin/translations', perm: 'translations.read' },
  { prefix: '/admin/email-templates', perm: 'email_templates.read' },
  { prefix: '/admin/flags',      perm: 'flags.read' },
  { prefix: '/admin/experiments', perm: 'experiments.read' },
  { prefix: '/admin/health',     perm: 'analytics.read' },
  { prefix: '/admin/export',     perm: 'export.read' },
  { prefix: '/admin/maintenance', perm: 'maintenance.read' },
  { prefix: '/admin/invites',    perm: 'invites.write' },
  { prefix: '/admin/system',     perm: 'system.read' },
  { prefix: '/admin/roles',      perm: 'roles.write' },
  { prefix: '/admin/referrals',  perm: 'referrals.read' },
  // Dashboard + settings — minimum admin perm covers it.
  { prefix: '/admin/settings',   perm: 'system.read' },
  { prefix: '/admin',            perm: 'users.read' },
]

export function requiredPermission(path: string): Permission | null {
  for (const r of PATH_PERMISSIONS) {
    if (path.startsWith(r.prefix)) return r.perm
  }
  return null
}

/** True if the role's permission set grants `perm`. */
export function roleGrants(rolePermissions: string[] | null | undefined, perm: Permission): boolean {
  if (!rolePermissions) return false
  if (rolePermissions.includes('*')) return true
  return rolePermissions.includes(perm)
}
