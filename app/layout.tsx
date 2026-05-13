export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Inter — variable axis, tight tracking, sharp at small sizes. The
// premium-feel admin needs better typography than DM Sans.
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})
// JetBrains Mono for monospaced numbers (KPI tickers, IDs, etc.).
const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Termimal Admin',
  description: 'Admin dashboard for Termimal',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  )
}