import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      <header className="px-8 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold text-lg tracking-tight">Termimal Admin</Link>
          <nav className="flex gap-4 text-sm" style={{ color: 'var(--t2)' }}>
            <Link href="/admin/seo" className="hover:text-white transition-colors">SEO</Link>
            <Link href="/admin/users" className="hover:text-white transition-colors">Users</Link>
            <Link href="/admin/content" className="hover:text-white transition-colors">Content</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span style={{ color: 'var(--t3)' }}>{user.email}</span>
          <Link href="/" className="btn-secondary py-1.5 px-4 text-xs">Exit Admin</Link>
        </div>
      </header>
      <main className="max-w-site mx-auto p-8 w-full flex-1">
        {children}
      </main>
    </div>
  )
}