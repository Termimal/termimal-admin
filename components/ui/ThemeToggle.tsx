'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('termimal-theme') as 'dark' | 'light' | null
    const sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    const t = saved || sys || 'dark'
    setTheme(t as 'dark' | 'light')
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('termimal-theme', next)
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all flex-shrink-0"
      style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}
    >
      {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  )
}
