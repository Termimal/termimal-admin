export const runtime = 'edge'; // Cloudflare requires this

import AdminSidebarLayout from '@/components/admin/AdminLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Let middleware or the page components handle the auth redirect
  return (
    <AdminSidebarLayout>
      {children}
    </AdminSidebarLayout>
  )
}