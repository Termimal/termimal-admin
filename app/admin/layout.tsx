export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
// Import the client component that contains your sidebar UI
import AdminSidebarLayout from '@/components/admin/AdminLayout'

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

  // Wrap the children in your nice sidebar UI component
  return (
    <AdminSidebarLayout>
      {children}
    </AdminSidebarLayout>
  )
}