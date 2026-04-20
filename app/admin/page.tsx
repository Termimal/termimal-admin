import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>
        Manage your platform settings, users, and SEO.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        <Link 
          href="/admin/seo" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-bold mb-2 text-lg">SEO Settings &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Update Meta titles, descriptions, and OpenGraph images.</p>
        </Link>
        
        <Link 
          href="/admin/users" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-bold mb-2 text-lg">User Management &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>View signed-up users and assign admin roles.</p>
        </Link>

        <Link 
          href="/admin/content" 
          className="p-6 rounded-xl border transition-all hover:-translate-y-1 block" 
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="font-bold mb-2 text-lg">Platform Content &rarr;</h2>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Edit homepage text, numbers, and FAQ sections.</p>
        </Link>
      </div>
    </div>
  )
}