'use client'

import Link from 'next/link'
import { Users, Home } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b bg-surface p-6">
        <nav className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg btn-secondary">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary">
            <Users className="h-4 w-4" />
            Users
          </Link>
        </nav>
      </header>

      {/* Admin Content */}
      <main className="p-8">{children}</main>
    </div>
  )
}
