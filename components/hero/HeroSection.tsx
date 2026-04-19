'use client'

import { Check, Radio } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import TerminalLite from './TerminalLite'

export default function HeroSection() {
  return (
    <section className="min-h-screen pt-24 pb-12 relative overflow-hidden flex items-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[5%] w-[700px] h-[700px] rounded-full opacity-[.03]"
          style={{ background: 'radial-gradient(circle, var(--acc), transparent 65%)' }} />
        <div className="absolute bottom-[-20%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-[.02]"
          style={{ background: 'radial-gradient(circle, var(--blue), transparent 65%)' }} />
        <div className="absolute inset-0 opacity-[.015]"
          style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      <div className="max-w-site mx-auto px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-semibold tracking-widest uppercase mb-6"
              style={{ color: 'var(--acc)', background: 'var(--acc-d)', border: '1px solid rgba(52,211,153,.1)' }}>
              <Radio size={10} /> Live market analysis
            </div>

            <div className="flex gap-1.5 flex-wrap mb-6">
              {['Charting', 'Macro', 'News', 'COT', 'Risk', 'Screener'].map(m => (
                <span key={m} className="px-2 py-0.5 rounded text-[0.6rem] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--t3)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {m}
                </span>
              ))}
            </div>

            <h1 className="text-[2.4rem] leading-[1.08] font-bold tracking-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
              See the market<br />faster, clearer,<br />
              <span style={{ color: 'var(--acc)' }}>deeper.</span>
            </h1>

            <p className="text-[0.85rem] leading-relaxed mb-6 max-w-[320px]" style={{ color: 'var(--t3)' }}>
              One terminal for price, macro, positioning, and sentiment. Professional-grade analysis without brokerage complexity.
            </p>

            <div className="flex gap-2 flex-wrap mb-6">
              <Link href="/signup" className="btn-primary py-2.5 px-6 text-[0.82rem]">Start Free →</Link>
              <Link href="/web-terminal" className="btn-secondary py-2.5 px-5">Launch Web Terminal</Link>
            </div>

            <div className="flex gap-4 text-[0.68rem]" style={{ color: 'var(--t4)' }}>
              <span className="flex items-center gap-1"><Check size={13} /> 14-day free trial</span>
              <span className="flex items-center gap-1"><Check size={13} /> Cancel anytime</span>
            </div>
          </div>

          <TerminalLite />
        </div>

        <div className="mt-16 relative">
          <div className="rounded-xl overflow-hidden relative"
            style={{ border: '1px solid var(--terminal-border)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.5)' }}>
            <Image src="/screenshots/dashboard.png" alt="Termimal Dashboard" width={1920} height={1080}
              className="w-full block" priority />
            <div className="absolute bottom-0 left-0 right-0 h-[35%] pointer-events-none"
              style={{ background: 'linear-gradient(to top, var(--bg), transparent)' }} />
            <div className="absolute bottom-6 left-6 text-[0.6rem] font-bold uppercase tracking-widest z-10" style={{ color: 'var(--t4)' }}>
              Termimal Dashboard — Live market overview
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}