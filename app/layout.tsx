import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

// Force dynamic rendering globally to fix Cloudflare build issues
export const dynamic = 'force-dynamic';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
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
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <head>
        {/* Forces Cloudflare to load the favicon statically, fixing the image bug */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  )
}