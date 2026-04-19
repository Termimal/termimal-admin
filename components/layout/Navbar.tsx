'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { label: 'Platform', href: '/#explore' },
  { label: 'Features', href: '/features' },
  { label: 'Markets', href: '/#markets' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Web Terminal', href: '/web-terminal' },
  { label: 'Download', href: '/download' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)

    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={cn('fixed top-0 inset-x-0 z-50 transition-all duration-500', scrolled ? 'py-2' : 'py-4')}>
      <div
        className={cn(
          'max-w-site mx-auto px-8 flex items-center justify-between transition-all duration-500 rounded-2xl',
          scrolled && 'py-2.5 px-6'
        )}
        style={scrolled ? { background: 'var(--nav-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--border)' } : {}}
      >
        <Link href="/" className="flex items-center gap-2 group">
          {/* Light Mode Logo (Black) */}
          <Image 
            src="/logo-dark.png" 
            alt="Termimal Logo" 
            width={36} 
            height={36} 
            className="object-contain"
            style={{ display: 'var(--logo-light-theme-display)' }}
          />
          {/* Dark Mode Logo (White) */}
          <Image 
            src="/logo-light.png" 
            alt="Termimal Logo" 
            width={36} 
            height={36} 
            className="object-contain"
            style={{ display: 'var(--logo-dark-theme-display)' }}
          />
          <span className="text-lg font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Termimal</span>
        </Link>

        <nav className="hidden lg:flex items-center">
          {navLinks.map(item => (
            <Link key={item.label} href={item.href}
              className="px-3 py-1.5 text-[0.78rem] font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--t2)' }}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-primary text-[0.78rem] px-4 py-2">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-[0.78rem] font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--t2)' }}>Sign in</Link>
              <Link href="/signup" className="btn-primary text-[0.78rem] px-4 py-2">Start Free</Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}