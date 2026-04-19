'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CandlestickChart, Crosshair, Layout, Search, SlidersHorizontal } from 'lucide-react'
import { cn, fmtPrice, fmtK } from '@/lib/utils'
import { instruments, indicators, newsItems, cotData } from '@/data'

const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M']
const tabs = ['Chart', 'Indicators', 'News', 'COT'] as const
type Tab = typeof tabs[number]

export default function TerminalLite() {
  const [symIdx, setSymIdx] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('Chart')
  const [activeTF, setActiveTF] = useState('3M')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inst = instruments[symIdx]

  const drawChart = useCallback(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const parent = cvs.parentElement
    if (!parent) return
    const w = parent.offsetWidth
    const h = 200
    cvs.width = w * 2
    cvs.height = h * 2
    cvs.style.width = w + 'px'
    cvs.style.height = h + 'px'
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, w, h)

    let price = inst.price * 0.92
    const candles: { o: number; c: number; h: number; l: number }[] = []
    for (let i = 0; i < 60; i++) {
      const o = price
      const move = (Math.random() - 0.47) * inst.price * 0.008
      const c = o + move
      const hi = Math.max(o, c) + Math.random() * inst.price * 0.004
      const lo = Math.min(o, c) - Math.random() * inst.price * 0.004
      price = c
      candles.push({ o, c, h: hi, l: lo })
    }

    const max = Math.max(...candles.map(c => c.h))
    const min = Math.min(...candles.map(c => c.l))
    const range = max - min || 1
    const cw = Math.floor(w / 65)
    const yScale = (v: number) => h - 10 - ((v - min) / range) * (h - 20)

    candles.forEach((c, i) => {
      const x = i * (cw + 1) + 10
      const bull = c.c >= c.o
      ctx.strokeStyle = bull ? '#34d399' : '#f87171'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x + cw / 2, yScale(c.h))
      ctx.lineTo(x + cw / 2, yScale(c.l))
      ctx.stroke()
      ctx.fillStyle = bull ? '#34d399' : '#f87171'
      const top = yScale(Math.max(c.o, c.c))
      const bot = yScale(Math.min(c.o, c.c))
      ctx.fillRect(x, top, cw, Math.max(bot - top, 1))
    })
  }, [inst.price])

  useEffect(() => {
    drawChart()
    window.addEventListener('resize', drawChart)
    return () => window.removeEventListener('resize', drawChart)
  }, [drawChart])

  const cycleSym = () => {
    const next = (symIdx + 1) % instruments.length
    setSymIdx(next)
  }

  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().split(' ')[0])
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-xl overflow-hidden relative" style={{
      border: '1px solid var(--terminal-border)',
      background: 'var(--terminal-bg)',
      boxShadow: '0 20px 60px -15px rgba(0,0,0,.5)',
    }}>
      {/* glow border */}
      <div className="absolute -inset-px rounded-xl pointer-events-none z-0"
        style={{ background: 'linear-gradient(135deg, rgba(52,211,153,.08), transparent 40%, transparent 60%, rgba(96,165,250,.06))' }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--terminal-border)', background: 'rgba(0,0,0,.3)' }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <button onClick={cycleSym} className="flex items-center gap-1.5 px-2 py-1 rounded text-[0.65rem] font-mono transition-colors"
            style={{ background: 'var(--terminal-surface)', color: 'var(--t3)' }}>
            <Search size={10} /> {inst.sym} <span className="opacity-40">⌘K</span>
          </button>
          <div className="flex">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wide border-b-2 transition-all',
                  activeTab === tab ? 'border-[var(--acc)]' : 'border-transparent'
                )}
                style={{ color: activeTab === tab ? 'var(--acc)' : 'var(--t4)', background: 'none', fontFamily: 'inherit' }}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[0.58rem] font-mono" style={{ color: 'var(--t4)' }}>
          <span className="flex items-center gap-1" style={{ color: 'var(--green-val)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--green-val)' }} /> Live
          </span>
          <span>{time}</span>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10">
        {/* Chart tab */}
        {activeTab === 'Chart' && (
          <div className="grid" style={{ gridTemplateColumns: '1fr 200px' }}>
            <div className="p-3 border-r" style={{ borderColor: 'var(--terminal-border)' }}>
              <div className="flex items-baseline gap-3 mb-1 px-1">
                <span className="text-lg font-bold text-white font-mono">{fmtPrice(inst.price)}</span>
                <span className="text-xs font-mono font-semibold" style={{ color: inst.chg >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>
                  {inst.chg >= 0 ? '+' : ''}{inst.chg.toFixed(2)}%
                </span>
                {inst.mcap && <span className="text-[0.55rem] font-mono ml-auto" style={{ color: 'var(--t4)' }}>MCAP {inst.mcap}</span>}
              </div>
              <div className="flex gap-0.5 mb-2 px-1">
                {timeframes.map(tf => (
                  <button key={tf}
                    className={cn('px-1.5 py-0.5 text-[0.55rem] font-mono font-semibold rounded transition-all')}
                    style={{
                      color: activeTF === tf ? 'var(--acc)' : 'var(--t4)',
                      background: activeTF === tf ? 'rgba(52,211,153,.1)' : 'transparent',
                    }}
                    onClick={() => { setActiveTF(tf); drawChart() }}>
                    {tf}
                  </button>
                ))}
              </div>
              <div className="w-full h-[200px]">
                <canvas ref={canvasRef} />
              </div>
            </div>

            {/* Watchlist */}
            <div className="p-2 hidden md:block">
              <div className="text-[0.55rem] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--t4)' }}>Watchlist</div>
              {instruments.slice(0, 8).map((item, i) => (
                <div key={item.sym} onClick={() => setSymIdx(i)}
                  className={cn('flex items-center justify-between py-1.5 px-1.5 rounded cursor-pointer transition-colors',
                    i === symIdx ? 'bg-white/[.03]' : 'hover:bg-white/[.02]'
                  )}>
                  <div>
                    <div className="text-[0.68rem] font-semibold" style={{ color: 'rgba(255,255,255,.7)' }}>{item.sym}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.62rem] font-mono" style={{ color: 'rgba(255,255,255,.5)' }}>{fmtPrice(item.price)}</div>
                    <div className="text-[0.55rem] font-mono font-semibold" style={{ color: item.chg >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>
                      {item.chg >= 0 ? '+' : ''}{item.chg.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--terminal-border)' }}>
                <div className="text-[0.55rem] font-bold uppercase tracking-widest mb-1.5 px-1" style={{ color: 'var(--t4)' }}>Alerts</div>
                <div className="flex items-center gap-1.5 text-[0.6rem] px-1 mb-1" style={{ color: 'var(--t3)' }}>
                  <Bell size={10} className="text-amber-400/50" /> BTC &gt; 68,000
                </div>
                <div className="flex items-center gap-1.5 text-[0.6rem] px-1" style={{ color: 'var(--t3)' }}>
                  <Bell size={10} style={{ color: 'var(--t4)' }} /> ETH &lt; 3,400
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indicators tab */}
        {activeTab === 'Indicators' && (
          <div className="p-4">
            <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Global indicators</h4>
            <div className="grid grid-cols-3 gap-2">
              {indicators.map(ind => (
                <div key={ind.label} className="p-2.5 rounded" style={{ background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)' }}>
                  <div className="text-[0.55rem] mb-0.5" style={{ color: 'var(--t4)' }}>{ind.label}</div>
                  <div className="text-sm font-bold font-mono text-white">{ind.val}</div>
                  <div className="text-[0.55rem] font-semibold font-mono" style={{ color: ind.dir === 'up' ? 'var(--green-val)' : ind.dir === 'down' ? 'var(--red-val)' : 'var(--t4)' }}>
                    {ind.dir === 'up' ? '▲' : ind.dir === 'down' ? '▼' : '--'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News tab */}
        {activeTab === 'News' && (
          <div className="p-4">
            <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>News flow</h4>
            {newsItems.map((n, i) => (
              <div key={i} className="flex justify-between py-2 border-b last:border-0 text-[0.68rem]" style={{ borderColor: 'var(--terminal-border)' }}>
                <span style={{ color: 'var(--t3)' }}>
                  <span className="text-[0.55rem] font-bold mr-2 px-1 py-0.5 rounded" style={{ color: 'var(--acc)', background: 'var(--acc-d)' }}>{n.tag}</span>
                  {n.title}
                </span>
                <span className="text-[0.55rem] font-mono shrink-0 ml-4" style={{ color: 'var(--t4)' }}>{n.time}</span>
              </div>
            ))}
          </div>
        )}

        {/* COT tab */}
        {activeTab === 'COT' && (
          <div className="p-4">
            <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>COT positioning — S&P 500</h4>
            <div className="flex justify-between py-2 border-b text-[0.65rem] font-bold" style={{ borderColor: 'var(--terminal-border)', color: 'var(--t3)' }}>
              <span className="flex-1">Category</span>
              <span className="w-20 text-right">Net</span>
              <span className="w-20 text-right">Net Δ</span>
            </div>
            {cotData.map(c => (
              <div key={c.cat} className="flex justify-between py-2 border-b last:border-0 text-[0.65rem]" style={{ borderColor: 'var(--terminal-border)' }}>
                <span className="flex-1" style={{ color: 'var(--t3)' }}>{c.cat}</span>
                <span className="w-20 text-right font-mono font-semibold" style={{ color: c.net >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>{fmtK(c.net)}</span>
                <span className="w-20 text-right font-mono font-semibold" style={{ color: c.netChg >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>{c.netChg >= 0 ? '+' : ''}{fmtK(c.netChg)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 flex items-center justify-between px-3 py-1.5 border-t" style={{ borderColor: 'var(--terminal-border)' }}>
        <div className="flex items-center gap-3 text-[0.55rem] font-mono" style={{ color: 'var(--t4)' }}>
          <span style={{ color: 'var(--green-val)' }}>● Connected</span>
          <span>Latency: 12ms</span>
        </div>
        <div className="text-[0.5rem] uppercase tracking-widest font-semibold" style={{ color: 'var(--t4)' }}>
          Analysis only · No execution
        </div>
      </div>
    </div>
  )
}
