'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { cn, fmtPrice, fmtK } from '@/lib/utils'
import {
  instruments, indicators, newsItems, cotData,
  exploreTabs, stories, marketCards, plans, faqs, footerLinks
} from '@/data'

// ─── Market Ribbon ───
export function MarketRibbon() {
  const items = instruments.map(i => (
    <div key={i.sym} className="flex items-center gap-2 whitespace-nowrap text-[0.72rem]">
      <span className="font-semibold" style={{ color: 'var(--t2)' }}>{i.sym}</span>
      <span className="font-mono" style={{ color: 'var(--t2)' }}>{fmtPrice(i.price)}</span>
      <span className="font-mono font-semibold text-[0.65rem]" style={{ color: i.chg >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>
        {i.chg >= 0 ? '+' : ''}{i.chg.toFixed(2)}%
      </span>
    </div>
  ))

  return (
    <div className="overflow-hidden py-2" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="flex gap-8 animate-scroll w-max">
        {items}{items}
      </div>
    </div>
  )
}

// ─── Numbers Strip ───
export function NumbersStrip() {
  const nums = [
    { n: '6', label: 'Asset classes covered' },
    { n: 'Real-time', label: 'Live market data feeds' },
    { n: 'COT + On-chain', label: 'Institutional-grade data' },
    { n: '100%', label: 'Analysis only — no execution' },
  ]
  return (
    <section className="py-20">
      <div className="max-w-site mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {nums.map((m, i) => (
            <div key={i}>
              <div className="text-[2.5rem] font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.03em' }}>{m.n}</div>
              <div className="text-[0.8125rem] font-medium" style={{ color: 'var(--t3)' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Explore Section ───
export function ExploreSection() {
  const [activeIdx, setActiveIdx] = useState(0)
  const active = exploreTabs[activeIdx]

  const panelContent: Record<string, JSX.Element> = {
    chart: (
      <div>
        <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Charting workspace</h4>
        <div className="grid grid-cols-3 gap-2">
          {[{ l: 'BTC-USD', v: '66,816', c: '+1.31%', up: true }, { l: 'MVRV', v: '0.74', c: 'Depressed', up: false }, { l: 'Z-Score', v: '-0.81', c: 'Below avg', up: false }].map(d => (
            <div key={d.l} className="p-3 rounded" style={{ background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)' }}>
              <div className="text-[0.55rem] mb-0.5" style={{ color: 'var(--t4)' }}>{d.l}</div>
              <div className="text-sm font-bold font-mono text-white">{d.v}</div>
              <div className="text-[0.55rem] font-semibold font-mono" style={{ color: d.up ? 'var(--green-val)' : 'var(--red-val)' }}>{d.c}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[0.7rem]" style={{ color: 'var(--t4)' }}>Multi-timeframe candlestick charts with on-chain overlays. MVRV, realized cap, price/200d — understand cycle position, not just price.</p>
      </div>
    ),
    indicators: (
      <div>
        <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Global indicators</h4>
        <div className="grid grid-cols-3 gap-2">
          {indicators.slice(0, 6).map(ind => (
            <div key={ind.label} className="p-3 rounded" style={{ background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)' }}>
              <div className="text-[0.55rem] mb-0.5" style={{ color: 'var(--t4)' }}>{ind.label}</div>
              <div className="text-sm font-bold font-mono text-white">{ind.val}</div>
              <div className="text-[0.55rem] font-semibold" style={{ color: ind.dir === 'up' ? 'var(--green-val)' : 'var(--red-val)' }}>{ind.dir === 'up' ? '▲' : '▼'}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[0.7rem]" style={{ color: 'var(--t4)' }}>Interest rates, inflation, GDP, employment, yield curve — all structured and live with directional context.</p>
      </div>
    ),
    watchlist: (
      <div>
        <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Watchlist intelligence</h4>
        {instruments.slice(0, 5).map(inst => (
          <div key={inst.sym} className="flex justify-between py-2 border-b last:border-0 text-[0.68rem]" style={{ borderColor: 'var(--terminal-border)' }}>
            <span style={{ color: 'var(--t3)' }}>{inst.sym}</span>
            <span className="font-mono" style={{ color: 'rgba(255,255,255,.7)' }}>{fmtPrice(inst.price)}</span>
            <span className="font-mono font-semibold" style={{ color: inst.chg >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>{inst.chg >= 0 ? '+' : ''}{inst.chg.toFixed(2)}%</span>
          </div>
        ))}
        <p className="mt-4 text-[0.7rem]" style={{ color: 'var(--t4)' }}>Your watchlist connected to filtered news, signals, and contextual analysis. Not a static price list.</p>
      </div>
    ),
    news: (
      <div>
        <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>News flow</h4>
        {newsItems.slice(0, 4).map((n, i) => (
          <div key={i} className="flex justify-between py-2 border-b last:border-0 text-[0.68rem]" style={{ borderColor: 'var(--terminal-border)' }}>
            <span style={{ color: 'var(--t3)' }}>
              <span className="text-[0.5rem] font-bold mr-2 px-1 py-0.5 rounded" style={{ color: 'var(--acc)', background: 'var(--acc-d)' }}>{n.tag}</span>
              {n.title}
            </span>
            <span className="text-[0.5rem] font-mono shrink-0 ml-3" style={{ color: 'var(--t4)' }}>{n.time}</span>
          </div>
        ))}
        <p className="mt-4 text-[0.7rem]" style={{ color: 'var(--t4)' }}>Curated news filtered by watchlist with importance badges and asset tagging.</p>
      </div>
    ),
    cot: (
      <div>
        <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>COT positioning — S&P 500</h4>
        {cotData.map(c => (
          <div key={c.cat} className="flex justify-between py-2 border-b last:border-0 text-[0.65rem]" style={{ borderColor: 'var(--terminal-border)' }}>
            <span className="flex-1" style={{ color: 'var(--t3)' }}>{c.cat}</span>
            <span className="font-mono font-semibold" style={{ color: c.net >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>{fmtK(c.net)}</span>
          </div>
        ))}
        <p className="mt-4 text-[0.7rem]" style={{ color: 'var(--t4)' }}>CFTC institutional positioning. Smart money vs spec. Crowded positioning alerts.</p>
      </div>
    ),
    risk: (
      <div>
        <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Risk & sentiment</h4>
        <div className="grid grid-cols-3 gap-2">
          {[{ l: 'VIX', v: '30.6', c: 'Extreme', col: 'var(--red-val)' }, { l: 'Credit', v: '3.42%', c: 'Healthy', col: 'var(--green-val)' }, { l: 'Breadth', v: '0.298', c: 'Concentrated', col: 'var(--red-val)' }, { l: 'Liquidity', v: '0.728', c: 'Stress', col: 'var(--amber)' }, { l: 'Dollar', v: '100.5', c: 'Firm', col: 'var(--green-val)' }, { l: 'Pulse', v: 'NEUTRAL', c: 'Fragile', col: 'var(--amber)' }].map(d => (
            <div key={d.l} className="p-3 rounded" style={{ background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)' }}>
              <div className="text-[0.55rem] mb-0.5" style={{ color: 'var(--t4)' }}>{d.l}</div>
              <div className="text-sm font-bold font-mono text-white">{d.v}</div>
              <div className="text-[0.55rem] font-semibold" style={{ color: d.col }}>{d.c}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[0.7rem]" style={{ color: 'var(--t4)' }}>VIX regime, credit spreads, breadth, liquidity, dollar strength — the complete risk dashboard.</p>
      </div>
    ),
  }

  return (
    <section className="py-24" id="explore">
      <div className="max-w-site mx-auto px-8">
        <div className="mb-10">
          <div className="section-label">Explore the terminal</div>
          <div className="section-title">Every module, purpose-built for speed</div>
          <div className="section-desc">Switch between modules to see how Termimal helps you analyze faster across price, macro, positioning, and sentiment.</div>
        </div>
        <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
          <div className="flex flex-col gap-1">
            {exploreTabs.map((tab, i) => (
              <button key={tab.key} onClick={() => setActiveIdx(i)}
                className={cn('p-3 rounded-lg text-left transition-all', activeIdx === i && 'ring-1')}
                style={{
                  background: activeIdx === i ? 'var(--surface)' : 'transparent',
                  borderColor: activeIdx === i ? 'var(--border)' : 'transparent',
                }}>
                <div className="text-[0.82rem] font-semibold mb-0.5">{tab.title}</div>
                <div className="text-[0.68rem] leading-relaxed" style={{ color: 'var(--t3)' }}>{tab.desc}</div>
              </button>
            ))}
          </div>
          <div className="rounded-xl p-6 min-h-[380px]" style={{ border: '1px solid var(--terminal-border)', background: 'var(--terminal-bg)' }}>
            {panelContent[active.key]}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Product Stories ───
export function ProductStories() {
  return (
    <section className="py-20">
      <div className="max-w-site mx-auto px-8">
        {stories.map((s, i) => (
          <div key={s.tag} className={cn('grid lg:grid-cols-2 gap-12 items-center mb-24 last:mb-0', i % 2 === 1 && 'lg:[direction:rtl]')}>
            <div className={cn(i % 2 === 1 && 'lg:[direction:ltr]')}>
              <div className="text-[0.625rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--acc)' }}>{s.tag}</div>
              <h3 className="text-[1.6rem] font-bold tracking-tight leading-tight mb-3" style={{ letterSpacing: '-0.02em' }}>{s.title}</h3>
              <p className="text-[0.82rem] leading-relaxed mb-4" style={{ color: 'var(--t3)' }}>{s.desc}</p>
              <ul className="flex flex-col gap-1.5">
                {s.points.map(p => (
                  <li key={p} className="flex items-center gap-2 text-[0.72rem]" style={{ color: 'var(--t3)' }}>
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--acc)', opacity: 0.6 }} />{p}
                  </li>
                ))}
              </ul>
            </div>
            <div className={cn('rounded-xl overflow-hidden relative group', i % 2 === 1 && 'lg:[direction:ltr]')}
              style={{ border: '1px solid var(--terminal-border)', background: 'var(--terminal-bg)' }}>
              <Image src={s.img} alt={s.tag} width={1920} height={1080} className="w-full block transition-transform duration-500 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(135deg, transparent 60%, rgba(7,7,14,.25))' }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Markets ───
export function MarketsSection() {
  return (
    <section className="py-20" id="markets">
      <div className="max-w-site mx-auto px-8">
        <div className="mb-8">
          <div className="section-label">Market coverage</div>
          <div className="section-title">Every market. One workspace.</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {marketCards.map(m => (
            <div key={m.name} className="p-5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="text-2xl font-bold mb-0.5">{m.count}</div>
              <div className="text-[0.85rem] font-semibold mb-0.5">{m.name}</div>
              <div className="text-[0.68rem]" style={{ color: 'var(--t3)' }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ───
export function PricingSection() {
  const [yearly, setYearly] = useState(true)

  return (
    <section className="py-20" id="pricing">
      <div className="max-w-site mx-auto px-8">
        <div className="text-center mb-10">
          <div className="section-label">Pricing</div>
          <div className="section-title">Transparent pricing. No surprises.</div>
          <p className="text-[0.82rem] max-w-sm mx-auto mt-1" style={{ color: 'var(--t3)' }}>Start free. Upgrade when ready. Cancel anytime.</p>
          <div className="inline-flex rounded-lg p-0.5 mt-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <button onClick={() => setYearly(false)}
              className={cn('px-4 py-1.5 rounded-md text-[0.72rem] font-semibold transition-all', !yearly && 'text-white')}
              style={{ background: !yearly ? 'var(--bh)' : 'transparent', color: yearly ? 'var(--t3)' : undefined }}>
              Monthly
            </button>
            <button onClick={() => setYearly(true)}
              className={cn('px-4 py-1.5 rounded-md text-[0.72rem] font-semibold transition-all flex items-center gap-1.5', yearly && 'text-white')}
              style={{ background: yearly ? 'var(--bh)' : 'transparent', color: !yearly ? 'var(--t3)' : undefined }}>
              Yearly <span className="text-[0.58rem] px-1.5 py-0.5 rounded font-bold" style={{ color: 'var(--acc)', background: 'var(--acc-d)' }}>-33%</span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3 max-w-[960px] mx-auto">
          {plans.map(plan => (
            <div key={plan.name} className={cn('relative p-6 rounded-xl transition-all', plan.popular && 'ring-1')}
              style={{
                border: plan.popular ? '1px solid rgba(52,211,153,.25)' : '1px solid var(--border)',
                background: plan.popular ? 'var(--acc-d)' : 'var(--surface)',
              }}>
              {plan.popular && (
                <div className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-md text-[0.55rem] font-bold uppercase tracking-wide text-white"
                  style={{ background: 'var(--acc2)' }}>Popular</div>
              )}
              <h3 className="text-base font-bold mb-0.5">{plan.name}</h3>
              <p className="text-[0.7rem] mb-4" style={{ color: 'var(--t3)' }}>{plan.desc}</p>
              <div className="text-[2rem] font-bold tracking-tight mb-0.5" style={{ letterSpacing: '-0.02em' }}>
                ${yearly ? plan.priceY : plan.priceM}
                {plan.priceM > 0 && <span className="text-[0.75rem] font-normal" style={{ color: 'var(--t3)' }}>/mo</span>}
              </div>
              <div className="text-[0.62rem] mb-5" style={{ color: 'var(--t4)' }}>
                {plan.priceM === 0 ? '14-day trial' : yearly ? 'Billed annually' : 'Billed monthly'}
              </div>
              <ul className="flex flex-col gap-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-[0.7rem]" style={{ color: 'var(--t3)' }}>
                    <span className="text-[0.55rem]" style={{ color: 'var(--t4)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.priceM === 0 ? '/signup' : '/signup'}
                className={cn('w-full py-2.5 rounded-lg text-[0.72rem] font-semibold transition-all active:scale-[.98] text-center block',
                plan.popular ? 'text-white hover:brightness-110' : 'hover:border-[var(--bh)]')}
                style={{
                  background: plan.popular ? 'var(--acc2)' : 'transparent',
                  border: plan.popular ? 'none' : '1px solid var(--border)',
                  color: plan.popular ? '#fff' : 'var(--t2)',
                }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-[0.62rem] mt-6" style={{ color: 'var(--t4)' }}>Prices exclude applicable taxes. Cancel anytime.</p>
      </div>
    </section>
  )
}

// ─── FAQ ───
export function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <section className="py-20">
      <div className="max-w-site mx-auto px-8">
        <div className="max-w-[680px] mx-auto">
          <div className="section-title mb-8">Questions & answers</div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left transition-colors"
                style={{ color: 'var(--t2)' }}>
                <span className="text-[0.82rem] font-medium pr-8">{faq.q}</span>
                <ChevronDown size={14} className={cn('shrink-0 transition-transform', openIdx === i && 'rotate-180')} style={{ color: 'var(--t4)' }} />
              </button>
              <div className={cn('overflow-hidden transition-all', openIdx === i ? 'max-h-[200px] pb-4' : 'max-h-0')}>
                <p className="text-[0.78rem] leading-relaxed" style={{ color: 'var(--t3)' }}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ───
export function CTASection() {
  return (
    <section className="py-20">
      <div className="max-w-site mx-auto px-8">
        <div className="relative rounded-2xl p-16 overflow-hidden text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, var(--acc), transparent 65%)', opacity: 0.03 }} />
          <h2 className="text-[2rem] font-bold tracking-tight mb-3 relative" style={{ letterSpacing: '-0.025em' }}>Your edge starts with better analysis.</h2>
          <p className="text-[0.85rem] max-w-md mx-auto mb-6 relative" style={{ color: 'var(--t3)' }}>
            Professional-grade market intelligence. 14-day free trial. Cancel anytime.
          </p>
          <div className="flex gap-2 justify-center relative">
            <Link href="/signup" className="btn-primary py-3 px-7 text-[0.85rem]">Create free account →</Link>
            <Link href="/web-terminal" className="btn-secondary py-3 px-5">Launch Web Terminal</Link>
            <Link href="/download" className="btn-secondary py-3 px-5">Download Desktop</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───
const footerUrlMap: Record<string, string> = {
  'Web Terminal': '/web-terminal', 'Desktop App': '/download', 'Features': '/features',
  'Markets': '/#markets', 'Pricing': '/pricing', 'Changelog': '/download',
  'Status': '#', 'Blog': '#', 'Academy': '#', 'Help Center': '#', 'API': '#',
  'About': '#', 'Careers': '#', 'Contact': '#', 'Affiliates': '#', 'Refer a Friend': '#',
  'Terms': '/terms', 'Privacy': '/privacy', 'Cookies': '/cookies', 'Risk Disclaimer': '/risk-disclaimer', 'Refund Policy': '/refund-policy',
}
function footerLinkUrl(label: string) { return footerUrlMap[label] || '#' }

export function Footer() {
  const cols = [
    { title: 'Product', links: footerLinks.product },
    { title: 'Resources', links: footerLinks.resources },
    { title: 'Company', links: footerLinks.company },
    { title: 'Legal', links: footerLinks.legal },
  ]

  return (
    <footer className="pt-16 pb-8" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-site mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 transition-opacity hover:opacity-80">
              {/* Light Mode Logo (Black) */}
              <Image 
                src="/logo-dark.png" 
                alt="Termimal Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                style={{ display: 'var(--logo-light-theme-display)' }}
              />
              {/* Dark Mode Logo (White) */}
              <Image 
                src="/logo-light.png" 
                alt="Termimal Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                style={{ display: 'var(--logo-dark-theme-display)' }}
              />
              <span className="text-[1.05rem] font-bold" style={{ letterSpacing: '-0.02em', color: 'var(--t1)' }}>
                Termimal
              </span>
            </Link>

            <p className="text-[0.78rem] leading-relaxed max-w-[260px]" style={{ color: 'var(--t2)' }}>
              Professional market analysis terminal. Research only — no trade execution, no financial advice.
            </p>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <h4
                className="text-[0.65rem] font-bold uppercase tracking-widest mb-4"
                style={{ color: 'var(--acc)' }}
              >
                {col.title}
              </h4>

              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <Link
                      href={footerLinkUrl(link)}
                      className="text-[0.78rem] transition-all hover:text-white"
                      style={{ color: 'var(--t3)' }}
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col md:flex-row justify-between items-start gap-4 pt-8"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-[0.72rem]" style={{ color: 'var(--t3)' }}>
            © 2026 Hiram OÜ
          </p>

          <p className="text-[0.68rem] max-w-xl md:text-right leading-relaxed" style={{ color: 'var(--t3)' }}>
            Termimal is a market analysis platform. It does not execute trades, hold client funds, provide financial advice,
            or operate as a broker, dealer, or exchange. Data is for informational purposes only.
          </p>
        </div>
      </div>
    </footer>
  )
}