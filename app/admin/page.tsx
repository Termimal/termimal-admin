import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>
        Manage your platform settings, users, and SEO.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* SEO Settings */}
        <Link 
          href="/admin/seo" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-bold mb-2 text-lg">SEO Settings &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Update Meta titles, descriptions, and OpenGraph images.</p>
        </Link>
        
        {/* Promo Banner */}
        <Link 
          href="/admin/promo" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block relative overflow-hidden" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'var(--acc)' }} />
          <h2 className="font-bold mb-2 text-lg mt-1">Promo Banner &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Control the global announcement bar on your live site.</p>
        </Link>

        {/* User Management */}
        <Link 
          href="/admin/users" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-bold mb-2 text-lg">User Directory &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Manage customers, billing, and support.</p>
        </Link>

        {/* Content Management */}
        <Link 
          href="/admin/content" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-bold mb-2 text-lg">Platform Content &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Manage articles, reports, and homepage text.</p>
        </Link>

        {/* FAQ Management */}
        <Link 
          href="/admin/faqs" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-bold mb-2 text-lg">FAQ Manager &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Add or update frequently asked questions.</p>
        </Link>
      </div>
    </div>
  )
}