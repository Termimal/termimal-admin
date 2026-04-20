export const runtime = 'edge';

import AdminSidebarLayout from '@/components/admin/AdminLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSidebarLayout>
      {children}
    </AdminSidebarLayout>
  )
}