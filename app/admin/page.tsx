import Link from 'next/link'
import {
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

const cards = [
  {
    href: '/admin/users',
    title: 'User Management',
    description: 'Manage accounts, credits, subscriptions, and account actions.',
    icon: Users,
  },
  {
    href: '/admin/content',
    title: 'Content',
    description: 'Create and manage content entries and editorial records.',
    icon: FileText,
  },
  {
    href: '/admin/banners',
    title: 'Banners',
    description: 'Manage homepage and promo banners with visibility controls.',
    icon: ImageIcon,
  },
  {
    href: '/admin/faqs',
    title: 'FAQs',
    description: 'Add, edit, and remove frequently asked questions.',
    icon: HelpCircle,
  },
  {
    href: '/admin/seo',
    title: 'SEO',
    description: 'Update site metadata, previews, canonical URLs, and robots settings.',
    icon: Search,
  },
  {
    href: '/admin/translations',
    title: 'Translations',
    description: 'Manage translation strings and localized content.',
    icon: Languages,
  },
  {
    href: '/admin/flags',
    title: 'Feature Flags',
    description: 'Enable or disable product modules and experimental features.',
    icon: Flag,
  },
  {
    href: '/admin/payments',
    title: 'Payments',
    description: 'Review payment activity and billing related operations.',
    icon: Wallet,
  },
  {
    href: '/admin/subscriptions',
    title: 'Subscriptions',
    description: 'Manage plans, pricing, coupons, and subscription lifecycle.',
    icon: CreditCard,
  },
  {
    href: '/admin/credits',
    title: 'Credits',
    description: 'Adjust user credits and review credit allocation rules.',
    icon: Coins,
  },
  {
    href: '/admin/settings',
    title: 'Settings',
    description: 'Control maintenance mode, app versions, and system settings.',
    icon: Settings,
  },
]

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--t1)' }}>
          Admin Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          Central operations panel for Termimal administration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group block p-8 rounded-xl border border-dashed hover:border-primary transition-all"
            >
              <div className="mb-4 opacity-75 group-hover:opacity-100">
                <Icon className="h-10 w-10" style={{ color: 'var(--t2)' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--t1)' }}>
                {card.title}
              </h2>
              <p className="text-sm" style={{ color: 'var(--t3)' }}>
                {card.description}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}