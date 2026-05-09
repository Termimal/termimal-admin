'use client'
export const dynamic = 'force-dynamic'

/**
 * Marketing Planner — the team's growth dashboard.
 *
 * It's a kanban over the existing `admin_items` table, scoped to
 * `category = 'marketing'`. Every card is a concrete acquisition
 * tactic with a status, effort tag, and expected impact.
 *
 * On first visit (when no marketing items exist yet) we offer to
 * seed ~30 starter tactics — battle-tested levers for a B2C
 * SaaS in the market-analysis space — so the team starts with a
 * full backlog instead of an empty board.
 *
 * Items are stored in `admin_items`, so they're visible in the
 * generic Open Items board too — but here we render a focused
 * marketing-only view with effort/impact pills, drag-friendly
 * columns, and a compact "what to do this week" hero.
 */

import { useEffect, useState, useMemo } from 'react'
import {
  Sparkles, RefreshCw, Plus, ArrowRight, Zap, Target, Calendar,
  TrendingUp, Search, Send, Users, MessageSquare, FileText,
  Globe, Megaphone, Trash2, GripVertical, ChevronDown, Rocket,
  CircleDashed, Activity, CheckCircle2, X, Sliders,
} from 'lucide-react'
import { HeroCard, EmptyState, Field } from '@/components/admin/PageChrome'

// ────────────────────────────────────────────────────────────────
//   Types & constants
// ────────────────────────────────────────────────────────────────

type Status   = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

type AdminItem = {
  id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  category: string | null
  tags: string[]
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
}

const COLUMNS: { key: Status; label: string; icon: any; accent: string; sub: string }[] = [
  { key: 'in_progress', label: 'This Week',    icon: Zap,           accent: 'var(--acc)',    sub: 'Active right now' },
  { key: 'todo',        label: 'Next 30 Days', icon: Target,        accent: 'var(--blue)',   sub: 'Queued — do soon'  },
  { key: 'backlog',     label: 'Backlog',      icon: CircleDashed,  accent: 'var(--t3)',     sub: 'Later / nice to have' },
  { key: 'done',        label: 'Shipped',      icon: CheckCircle2,  accent: 'var(--green)',  sub: 'Completed' },
]

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: 'var(--red)',    bg: 'var(--red-bg)'    },
  high:   { label: 'High',   color: 'var(--amber)',  bg: 'var(--amber-bg)'  },
  medium: { label: 'Medium', color: 'var(--blue)',   bg: 'var(--blue-bg)'   },
  low:    { label: 'Low',    color: 'var(--t3)',     bg: 'var(--surface2)'  },
}

// Tag → channel icon
const CHANNEL_ICON: Record<string, any> = {
  seo: Search, content: FileText, social: Megaphone, paid: TrendingUp,
  email: Send, partnerships: Users, community: MessageSquare, product: Sparkles,
  international: Globe, retention: Activity,
}

/**
 * The seed playbook. Each entry becomes one row in `admin_items`.
 *
 * Tags are an ad-hoc taxonomy — channel + effort/impact size — so
 * the planner can filter by them. Effort/impact are encoded as
 * `e:s|m|l` and `i:s|m|l` so they're machine-readable too.
 */
const SEED_PLAYBOOK: Array<{
  title: string
  description: string
  status: Status
  priority: Priority
  tags: string[]
}> = [
  // ───── Do this week ─────
  { title: 'Launch on Product Hunt', priority: 'urgent', status: 'in_progress',
    tags: ['social','e:m','i:l'],
    description: 'Schedule a Tuesday launch (best traffic). Prep: 4 GIFs of the terminal in action, a one-line pitch ("market analysis terminal for retail traders"), 40 hunters DM\'d 7 days prior asking for upvotes. Goal: top 5 of the day → ~3-5k visitors and PH badge backlink.' },
  { title: 'Daily X/Twitter chart drop', priority: 'urgent', status: 'in_progress',
    tags: ['social','content','e:s','i:m'],
    description: 'Post 3 charts per weekday from the terminal with a one-line take + watermark pointing to termimal.com. Use trending tickers (NVDA, BTC, ES futures). Compounds — 60 posts ≈ first follower wave.' },
  { title: 'Submit to 20 startup directories', priority: 'high', status: 'in_progress',
    tags: ['seo','partnerships','e:s','i:m'],
    description: 'BetaList, AlternativeTo, SaaSHub, ToolFinder, Indie Hackers, GetApp, Capterra (free tier), G2, Stackshare, Tools by Tom, Hey Marketers, Marketing Stack, Flair.so, Top Startups, StartupBase, Tinylaunch, MicroLaunch, Open Tools, Awesome Indie, ProductHunt Ship. Each = a high-DA backlink.' },

  // ───── Next 30 days ─────
  { title: 'Programmatic SEO: /symbols/[ticker] pages', priority: 'high', status: 'todo',
    tags: ['seo','content','e:l','i:l'],
    description: 'Generate 1 page per S&P 500 ticker + top 100 crypto. Each shows live chart, key indicators, and "open in Termimal" CTA. Target long-tail searches like "NVDA chart analysis" — these are 2M+ aggregate monthly searches with low competition.' },
  { title: 'Ship 30 long-form SEO articles', priority: 'high', status: 'todo',
    tags: ['seo','content','e:l','i:l'],
    description: '"How to read [indicator]", "[ticker] forecast 2026", "[index] support and resistance". 1500-2000 words, internal-linked. Goal: 5 articles per week for 6 weeks → first organic traffic in 90 days.' },
  { title: 'Affiliate program live (Tolt or Rewardful)', priority: 'high', status: 'todo',
    tags: ['partnerships','e:s','i:l'],
    description: '30% recurring for 12 months. Tolt is cheaper at $39/mo (vs Rewardful $49). Embed the affiliate signup link on /affiliates. Recruit first 10 finance-Twitter accounts manually — they convert at 4-7%.' },
  { title: 'Hacker News "Show HN"', priority: 'high', status: 'todo',
    tags: ['social','content','e:s','i:l'],
    description: 'Write a 600-word technical post: "Show HN: I built a market-analysis terminal in [stack]". Best window: Tuesday 8am ET. Even page-2 = 5-10k visitors. Have a load-tested deploy ready.' },
  { title: 'Influencer seeding — 50 micro-finfluencers', priority: 'high', status: 'todo',
    tags: ['social','partnerships','e:m','i:l'],
    description: 'Target finance-Twitter / YouTube accounts with 5k-50k followers (high engagement rate, not yet swamped with sponsorship requests). Free Premium for 12 months in exchange for one organic mention. ~5 will do it; ~2 will convert traffic.' },
  { title: 'Email opt-in: free symbol screener tool', priority: 'high', status: 'todo',
    tags: ['email','product','e:m','i:m'],
    description: 'Build a free, no-signup screener at /screener that shows top movers / volume spikes. Soft-gate the "save filter" feature behind email capture. Drives ~12% email-to-trial conversion.' },
  { title: 'Comparison pages — vs TradingView, vs Bloomberg', priority: 'medium', status: 'todo',
    tags: ['seo','content','e:m','i:l'],
    description: '"Termimal vs TradingView" / "Termimal vs Bloomberg Terminal" — these queries have buyer intent and convert at 8-12% trial rate. Keep them honest (give competitors fair credit) for trustworthiness.' },
  { title: 'Newsletter — weekly market wrap-up', priority: 'medium', status: 'todo',
    tags: ['email','content','e:m','i:m'],
    description: 'Friday 4pm ET, 5 min read, screenshots from Termimal. Substack at first (free, fast); migrate to Resend once at 2k subs. Newsletter readers convert to trial 3-4× better than cold visitors.' },
  { title: 'Reddit organic — r/options, r/stocks, r/investing', priority: 'medium', status: 'todo',
    tags: ['community','social','e:m','i:m'],
    description: 'Build karma first (3 weeks of useful, no-link comments). Then mention Termimal naturally in answer threads. Mods will ban you if you don\'t. Goal: 1 useful comment per day with 1 mention per week.' },
  { title: 'YouTube Shorts — 30 sec terminal clips', priority: 'medium', status: 'todo',
    tags: ['social','content','e:m','i:m'],
    description: 'Screen-record a chart explanation, voice-over in 30s, post 3×/week. Algorithmic distribution = high reach for low effort. Best: market open / close / FOMC days.' },

  // ───── Backlog / later ─────
  { title: 'Localize site to Spanish + German', priority: 'medium', status: 'backlog',
    tags: ['international','seo','e:l','i:m'],
    description: 'Spanish: 500M speakers, low SaaS competition. German: high-purchase-power audience, finance-savvy. Start with /pricing, /features, top 10 SEO articles. Use the existing Translations admin tool.' },
  { title: 'Podcast tour — 10 finance podcasts', priority: 'medium', status: 'backlog',
    tags: ['partnerships','content','e:l','i:m'],
    description: '"Chat with Traders", "Acquired", "Indie Hackers Podcast", "Animal Spirits", "Macro Voices". Founder-led story. 10 episodes ≈ 50-100k impressions, ~300-700 trials.' },
  { title: 'Backlinks — guest post on Investopedia / Seeking Alpha', priority: 'medium', status: 'backlog',
    tags: ['seo','partnerships','e:l','i:l'],
    description: 'Each accepted guest post on a DA 80+ finance site is worth more than 100 directory links. Pitch original data ("we analysed 1M trades and found X").' },
  { title: 'TikTok — 60-sec terminal explainers', priority: 'medium', status: 'backlog',
    tags: ['social','content','e:m','i:m'],
    description: 'TikTok finance ("FinTok") audience skews younger (Gen Z) — long-term LTV play. Start with 20 videos to find a hook, double down on what works.' },
  { title: 'Discord community for power users', priority: 'medium', status: 'backlog',
    tags: ['community','retention','e:m','i:m'],
    description: 'Free Discord, gated to verified-email users. Channels for tickers + strategies + product feedback. Power users become ambassadors and post screenshots elsewhere.' },
  { title: 'Schema markup on /symbols pages', priority: 'medium', status: 'backlog',
    tags: ['seo','e:s','i:m'],
    description: 'FAQ schema, FinancialProduct schema, breadcrumbs. Rich snippets in Google = 30-40% higher CTR on the same ranking.' },
  { title: 'Retargeting ads — Meta + Google for visitors', priority: 'low', status: 'backlog',
    tags: ['paid','e:m','i:m'],
    description: 'Pixel installed; retarget anyone who hits /pricing without signing up. Budget €5/day → €15/day once we know CAC. Expect 2-4× ROAS on retargeting (vs 0.5× on cold).' },
  { title: 'Cold-email finance newsletter operators', priority: 'low', status: 'backlog',
    tags: ['email','partnerships','e:m','i:m'],
    description: 'Find newsletters with 5k-50k subs (sub-stack search "stocks"). Offer a free 6-month Pro account in exchange for one organic mention. ~10% reply rate, ~3% take the deal.' },
  { title: 'Press pitch — TechCrunch / Decrypt / The Block', priority: 'low', status: 'backlog',
    tags: ['partnerships','content','e:l','i:m'],
    description: 'Pitch when there\'s a hook (funding round, product launch, data report). Cold pitches from no-name SaaS rarely land — wait until traction is undeniable.' },
  { title: 'Founders post daily on LinkedIn', priority: 'low', status: 'backlog',
    tags: ['social','content','e:m','i:m'],
    description: 'LinkedIn is undervalued for B2C trading SaaS — finance professionals scroll there too. 1 post/day for 30 days, then assess. Best: insights, not promos.' },
  { title: 'Cohort emails — re-engage trial-expired', priority: 'low', status: 'backlog',
    tags: ['email','retention','e:s','i:m'],
    description: 'Day 1 / 7 / 30 after trial expiry: "What stopped you from upgrading?" Survey link + 30% discount code. Win-back ~6-8% of churned trials.' },
  { title: 'Page speed >95 Lighthouse on /pricing /features', priority: 'low', status: 'backlog',
    tags: ['product','seo','e:m','i:s'],
    description: 'Already mostly there since we\'re on Cloudflare. Audit images (next/image), bundle (route-split), and 3rd-party scripts (defer non-critical). 100ms LCP improvement ≈ 7% conversion lift.' },
]

// ────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────

export default function MarketingPlannerPage() {
  const [items, setItems]     = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState<string>('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/admin/items?status=all', { cache: 'no-store' })
      const json = await res.json() as { items?: AdminItem[]; error?: string }
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      // Filter to marketing items client-side. The API doesn't yet
      // filter by category (would need a schema migration), so we
      // tag every seeded item with category=marketing and filter here.
      setItems((json.items || []).filter(it => (it.category || '') === 'marketing'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load planner')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const seed = async () => {
    if (!confirm(`Seed ${SEED_PLAYBOOK.length} starter marketing tactics? You can edit / delete any of them after.`)) return
    setSeeding(true)
    try {
      // Sequential POSTs — small enough volume that we don't need
      // a batch endpoint; serial keeps the audit log clean.
      for (const tactic of SEED_PLAYBOOK) {
        await fetch('/api/admin/items', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:       tactic.title,
            description: tactic.description,
            status:      tactic.status,
            priority:    tactic.priority,
            category:    'marketing',
            tags:        tactic.tags,
          }),
        })
      }
      await load()
    } finally {
      setSeeding(false)
    }
  }

  const updateStatus = async (id: string, status: Status) => {
    setBusy(true)
    setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it))
    try {
      await fetch(`/api/admin/items/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
    } finally {
      setBusy(false)
    }
  }
  const updatePriority = async (id: string, priority: Priority) => {
    setBusy(true)
    setItems(prev => prev.map(it => it.id === id ? { ...it, priority } : it))
    try {
      await fetch(`/api/admin/items/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priority }),
      })
    } finally {
      setBusy(false)
    }
  }
  const remove = async (id: string) => {
    if (!confirm('Delete this tactic?')) return
    setItems(prev => prev.filter(it => it.id !== id))
    await fetch(`/api/admin/items/${id}`, { method: 'DELETE' }).catch(() => null)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(it => it.tags?.includes(filter))
  }, [items, filter])

  const byColumn = useMemo(() => {
    const buckets: Record<Status, AdminItem[]> = {
      backlog: [], todo: [], in_progress: [], review: [], done: [], blocked: [],
    }
    for (const it of filtered) {
      const s = (it.status as Status) || 'backlog'
      buckets[s] = buckets[s] || []
      buckets[s].push(it)
    }
    // Sort each column by priority, then by updated time
    const order: Priority[] = ['urgent', 'high', 'medium', 'low']
    Object.keys(buckets).forEach(k => {
      buckets[k as Status].sort((a, b) => {
        const ap = order.indexOf(a.priority || 'medium')
        const bp = order.indexOf(b.priority || 'medium')
        if (ap !== bp) return ap - bp
        return (b.updated_at || '').localeCompare(a.updated_at || '')
      })
    })
    return buckets
  }, [filtered])

  const channels = useMemo(() => {
    const tags = new Set<string>()
    for (const it of items) {
      for (const t of it.tags || []) {
        // Skip the 'e:s|m|l' / 'i:s|m|l' technical tags — surface only channels.
        if (!/^[ei]:/.test(t)) tags.add(t)
      }
    }
    return Array.from(tags).sort()
  }, [items])

  const stats = useMemo(() => ({
    total:    items.length,
    thisWeek: byColumn.in_progress.length,
    next30:   byColumn.todo.length,
    shipped:  byColumn.done.length,
  }), [items, byColumn])

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Sparkles size={28} />}
        eyebrow="Growth"
        title="Marketing Planner"
        subtitle="The single source of truth for how Termimal grows. Move tactics across the columns as they ship."
        metric={{
          label: 'In play',
          value: stats.thisWeek.toString(),
          secondary: `${stats.total} total · ${stats.shipped} shipped`,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Channel filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)', marginRight: 4 }}>Channel</span>
          <FilterChip label="All"  on={filter === 'all'} onClick={() => setFilter('all')} />
          {channels.map(c => (
            <FilterChip key={c} label={c} on={filter === c} onClick={() => setFilter(c)} icon={CHANNEL_ICON[c]} />
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ minHeight: 38 }} onClick={load} disabled={loading || busy || seeding}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="card-premium" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--red)' + '44', color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Empty / seed state */}
      {!loading && items.length === 0 && (
        <div className="card-premium" style={{ padding: '40px 32px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--purple-bg)', color: 'var(--purple)',
            border: '1px solid rgba(167,139,250,0.3)',
            marginBottom: 16, boxShadow: '0 0 24px -4px rgba(167,139,250,0.5)',
          }}>
            <Rocket size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Seed the playbook
          </h2>
          <p style={{ fontSize: 14, color: 'var(--t3)', maxWidth: 540, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Load {SEED_PLAYBOOK.length} battle-tested acquisition tactics for B2C SaaS in market-analysis —
            organised across "this week / next 30 days / backlog". Edit, delete, or re-prioritise any of
            them after.
          </p>
          <button className="btn btn-primary" onClick={seed} disabled={seeding}
            style={{ minHeight: 44, padding: '0 24px', fontSize: 14 }}>
            {seeding ? <><RefreshCw size={14} className="spin" /> Seeding…</> : <><Sparkles size={14} /> Seed {SEED_PLAYBOOK.length} starter tactics</>}
          </button>
        </div>
      )}

      {/* Kanban */}
      {!loading && items.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
        className="kanban-grid"
        >
          {COLUMNS.map(col => {
            const Icon = col.icon
            const colItems = byColumn[col.key] || []
            return (
              <div key={col.key} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                minHeight: 200,
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: `linear-gradient(180deg, ${col.accent}10 0%, transparent 100%)`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: `${col.accent}20`,
                    border: `1px solid ${col.accent}33`,
                    color: col.accent,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{col.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 1 }}>{col.sub}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                    background: `${col.accent}20`, color: col.accent,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{colItems.length}</span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {colItems.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 12, color: 'var(--t4)' }}>
                      No tactics here yet.
                    </div>
                  ) : (
                    colItems.map(it => (
                      <TacticCard
                        key={it.id}
                        item={it}
                        onMove={s => updateStatus(it.id, s)}
                        onPriority={p => updatePriority(it.id, p)}
                        onDelete={() => remove(it.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium" style={{ padding: 16, minHeight: 220 }}>
              <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 6, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 70, width: '100%', borderRadius: 12, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 70, width: '100%', borderRadius: 12 }} />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 1100px) {
          .kanban-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .kanban-grid { grid-template-columns: 1fr !important; }
        }
        :global(.spin) { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
//   Card + filter chip
// ────────────────────────────────────────────────────────────────

function TacticCard({
  item, onMove, onPriority, onDelete,
}: {
  item: AdminItem
  onMove: (s: Status) => void
  onPriority: (p: Priority) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const prio    = PRIORITY_META[item.priority || 'medium']
  const channel = item.tags?.find(t => CHANNEL_ICON[t])
  const Channel = channel ? CHANNEL_ICON[channel] : null
  const effort  = item.tags?.find(t => /^e:/.test(t))?.slice(2)
  const impact  = item.tags?.find(t => /^i:/.test(t))?.slice(2)

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--bg2)',
        border: `1px solid ${item.priority === 'urgent' ? prio.color + '55' : 'var(--border)'}`,
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'all 160ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {Channel && (
          <span style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--t3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Channel size={13} />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.4, marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '2px 7px', borderRadius: 999,
              background: prio.bg, color: prio.color,
            }}>{prio.label}</span>
            {effort && (
              <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--t4)' }}>
                Effort {effort.toUpperCase()}
              </span>
            )}
            {impact && (
              <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--green)' }}>
                · Impact {impact.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <button
          aria-label="Toggle details"
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--t4)', padding: 2,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 160ms',
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <>
          {item.description && (
            <p style={{
              fontSize: 12, color: 'var(--t3)', lineHeight: 1.55,
              margin: '2px 0', whiteSpace: 'pre-wrap',
            }}>
              {item.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <select
              value={item.status}
              onChange={e => onMove(e.target.value as Status)}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 7,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--t2)', cursor: 'pointer',
              }}
            >
              {COLUMNS.map(c => <option key={c.key} value={c.key}>Move → {c.label}</option>)}
            </select>
            <select
              value={item.priority}
              onChange={e => onPriority(e.target.value as Priority)}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 7,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--t2)', cursor: 'pointer',
              }}
            >
              {Object.entries(PRIORITY_META).map(([k, m]) =>
                <option key={k} value={k}>Priority: {m.label}</option>
              )}
            </select>
            <button
              onClick={onDelete}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 7,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--red)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function FilterChip({
  label, on, onClick, icon,
}: { label: string; on: boolean; onClick: () => void; icon?: any }) {
  const Icon = icon
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 999,
        background: on ? 'var(--purple-bg)' : 'var(--surface)',
        border: `1px solid ${on ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
        color: on ? 'var(--purple)' : 'var(--t3)',
        fontSize: 12, fontWeight: 600,
        cursor: 'pointer', transition: 'all 140ms',
        textTransform: 'capitalize',
      }}
    >
      {Icon && <Icon size={11} />}
      {label}
    </button>
  )
}
