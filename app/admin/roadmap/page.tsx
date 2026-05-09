'use client'

/**
 * /admin/roadmap — strategic roadmap view of admin_items.
 *
 * Top section: HeroCard summary + quarterly Gantt-style visualisation
 * across 8 quarters (24 months). Each row is one item; horizontal
 * position derived from due_date. Color per category.
 *
 * Bottom section: classic Now / Next / Later kanban columns +
 * "Recently shipped" footer.
 */

import { useEffect, useMemo, useState } from 'react'
import { Map, CheckCircle2, Sparkles, TrendingUp, Calendar } from 'lucide-react'
import { HeroCard } from '@/components/admin/PageChrome'

interface AdminItem {
  id: string
  title: string
  description: string | null
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string | null
  tags: string[]
  due_date: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

const CATEGORY_COLOR: Record<string, string> = {
  bug:         '#f87171',
  feature:     '#34d399',
  security:    '#fbbf24',
  seo:         '#60a5fa',
  content:     '#a78bfa',
  ops:         '#94a3b8',
  billing:     '#fb923c',
  infra:       '#22d3ee',
  marketing:   '#a78bfa',
  sales:       '#fb923c',
  engineering: '#22d3ee',
  product:     '#34d399',
  roadmap:     '#60a5fa',
  business:    '#fbbf24',
  general:     '#94a3b8',
}

function categoryColor(c: string | null): string {
  return (c && CATEGORY_COLOR[c]) || CATEGORY_COLOR.general
}

function bucket(it: AdminItem): 'now' | 'next' | 'later' | 'done' | null {
  if (it.archived_at) return null
  if (it.status === 'done') return 'done'
  if (it.status === 'blocked') return 'next'
  if (it.status === 'in_progress' || it.status === 'review') return 'now'
  if (it.priority === 'critical' || it.priority === 'high') return 'next'
  return 'later'
}

/* ── Quarter helpers ─────────────────────────────────────────────── */

interface Quarter { label: string; start: number; end: number }

function buildQuarters(now: Date, count = 8): Quarter[] {
  const out: Quarter[] = []
  const y = now.getFullYear()
  const m = now.getMonth()
  const startQ = Math.floor(m / 3)               // 0 = Q1
  for (let i = 0; i < count; i++) {
    const qIdx  = startQ + i
    const yr    = y + Math.floor(qIdx / 4)
    const qInYr = qIdx % 4
    const sm    = qInYr * 3
    const start = new Date(yr, sm, 1).getTime()
    const end   = new Date(yr, sm + 3, 1).getTime() - 1
    out.push({ label: `Q${qInYr + 1} ${yr}`, start, end })
  }
  return out
}

function itemQuarterIndex(it: AdminItem, qs: Quarter[]): number | null {
  if (!it.due_date) return null
  const t = Date.parse(it.due_date)
  if (!Number.isFinite(t)) return null
  for (let i = 0; i < qs.length; i++) {
    if (t >= qs[i].start && t <= qs[i].end) return i
  }
  // Past = first quarter
  if (t < qs[0].start) return 0
  // Future beyond range = last quarter
  return qs.length - 1
}

export default function RoadmapPage() {
  const [items, setItems]     = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/admin/items', { cache: 'no-store' })
        const j = await r.json() as { items?: AdminItem[]; error?: string }
        if (cancelled) return
        if (!r.ok || j.error) {
          setError(j.error || `HTTP ${r.status}`)
        } else {
          setItems(j.items || [])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const grouped = useMemo(() => {
    const out: Record<'now' | 'next' | 'later' | 'done', AdminItem[]> = { now: [], next: [], later: [], done: [] }
    for (const it of items) {
      const b = bucket(it)
      if (b) out[b].push(it)
    }
    out.done = out.done
      .filter(it => {
        const t = it.archived_at ? Date.parse(it.archived_at) : Date.parse(it.updated_at)
        return Number.isFinite(t) && Date.now() - t < 30 * 86400 * 1000
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 12)
    return out
  }, [items])

  const quarters = useMemo(() => buildQuarters(new Date(), 8), [])

  // Items with a due_date that lands in our 8-quarter window.
  // Sorted by due_date asc so the visual timeline reads chronologically.
  const dated = useMemo(() => {
    return items
      .filter(it => !it.archived_at && it.status !== 'done' && it.due_date)
      .map(it => ({ it, qIdx: itemQuarterIndex(it, quarters) }))
      .filter((x): x is { it: AdminItem; qIdx: number } => x.qIdx !== null)
      .sort((a, b) => Date.parse(a.it.due_date!) - Date.parse(b.it.due_date!))
  }, [items, quarters])

  const totalOpen = grouped.now.length + grouped.next.length + grouped.later.length

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<Map size={28} />}
        eyebrow="Strategic roadmap"
        title="2-year product & business plan"
        subtitle={
          loading ? 'Loading…' : error
            ? <span style={{ color: 'var(--red)' }}>✗ {error}</span>
            : <><Calendar size={13} /> {totalOpen} open items across {quarters.length} quarters · {grouped.done.length} shipped in last 30 days</>
        }
        metric={{
          label: 'Open items',
          value: totalOpen,
          secondary: <><TrendingUp size={11} /> next 24 months</>,
        }}
      />

      {/* Visual quarterly timeline (Gantt-ish) */}
      {dated.length > 0 && (
        <section
          className="card-premium"
          style={{ padding: '28px 32px', marginBottom: 28, overflowX: 'auto' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.015em', margin: 0 }}>
              Timeline
            </h2>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>
              {dated.length} dated items · color = category
            </div>
          </div>

          <div style={{ minWidth: 920 }}>
            {/* Quarter headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${quarters.length}, 1fr)`,
                gap: 0,
                marginBottom: 8,
                borderBottom: '1px solid var(--border)',
                paddingBottom: 10,
              }}
            >
              {quarters.map((q, i) => {
                const isNow = i === 0
                return (
                  <div
                    key={q.label}
                    style={{
                      textAlign: 'center',
                      padding: '4px 0',
                      borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: isNow ? 'var(--acc)' : 'var(--t3)',
                      }}
                    >
                      {q.label}
                      {isNow && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--acc)',
                            marginLeft: 6,
                            verticalAlign: 'middle',
                            boxShadow: '0 0 6px var(--acc)',
                            animation: 'admin-pulse 1.6s ease-in-out infinite',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Item bars — one row per item */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dated.map(({ it, qIdx }) => {
                const color = categoryColor(it.category)
                const inProgress = it.status === 'in_progress' || it.status === 'review'
                return (
                  <div
                    key={it.id}
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: `repeat(${quarters.length}, 1fr)`,
                      height: 32,
                      borderRadius: 6,
                      transition: 'background 160ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Quarter columns w/ subtle dividers */}
                    {quarters.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
                          opacity: 0.4,
                        }}
                      />
                    ))}
                    {/* The item bar (positioned absolutely over the cells) */}
                    <div
                      title={`${it.title}${it.description ? ' — ' + it.description.slice(0, 100) : ''}`}
                      style={{
                        position: 'absolute',
                        top: 5,
                        bottom: 5,
                        left: `calc(${(qIdx / quarters.length) * 100}% + 4px)`,
                        width: `calc(${(1 / quarters.length) * 100}% - 8px)`,
                        background: inProgress
                          ? `linear-gradient(90deg, ${color}cc, ${color}66)`
                          : `${color}33`,
                        border: `1px solid ${color}88`,
                        borderRadius: 6,
                        padding: '0 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--t1)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        boxShadow: inProgress ? `0 0 12px -2px ${color}66` : undefined,
                      }}
                    >
                      <span
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: color, flexShrink: 0,
                          boxShadow: inProgress ? `0 0 6px ${color}` : 'none',
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                fontSize: 11,
                color: 'var(--t3)',
              }}
            >
              {Array.from(new Set(dated.map(d => d.it.category || 'general'))).map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: categoryColor(cat),
                    boxShadow: `0 0 4px ${categoryColor(cat)}66`,
                  }} />
                  <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 24, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #34d399cc, #34d39966)' }} /> in progress
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 24, height: 8, borderRadius: 4, background: '#34d39933', border: '1px solid #34d39988' }} /> planned
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Three-column kanban */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.015em', marginBottom: 16 }}>
        Operational view
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        <Column title="Now"   subtitle="In progress + review"        items={grouped.now}   accent="var(--acc)" />
        <Column title="Next"  subtitle="High-priority + blocked"     items={grouped.next}  accent="var(--amber)" />
        <Column title="Later" subtitle="Backlog · low/med priority"  items={grouped.later} accent="var(--t4)" />
      </div>

      {/* Recently shipped */}
      {grouped.done.length > 0 && (
        <section
          className="card-premium"
          style={{ padding: '24px 28px', borderColor: 'rgba(52,211,153,0.3)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--green)',
            }}>
              Recently shipped · last 30 days
            </span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped.done.map(it => (
              <li key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--t1)',
              }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: categoryColor(it.category),
                }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                {it.category && it.category !== 'general' && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: categoryColor(it.category),
                    padding: '3px 8px', borderRadius: 999,
                    background: `${categoryColor(it.category)}1f`,
                    border: `1px solid ${categoryColor(it.category)}33`,
                  }}>{it.category}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="empty-elegant">
          <div className="empty-icon"><Sparkles size={20} /></div>
          <h3>Nothing on the roadmap yet</h3>
          <p>Add items from the <a href="/admin/items" style={{ color: 'var(--acc)' }}>Open Items</a> board to see them here.</p>
        </div>
      )}
    </div>
  )
}

function Column({ title, subtitle, items, accent }: { title: string; subtitle: string; items: AdminItem[]; accent: string }) {
  return (
    <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid var(--border)',
        background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 15%, transparent), transparent)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.005em' }}>{title}</span>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
            color: accent, padding: '3px 10px',
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            borderRadius: 999,
            fontVariantNumeric: 'tabular-nums',
          }}>{items.length}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--t4)' }}>{subtitle}</div>
      </div>
      <ul style={{
        margin: 0, padding: 12, listStyle: 'none',
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 540, overflowY: 'auto',
      }}>
        {items.length === 0 && (
          <li style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: 24 }}>
            Nothing here yet
          </li>
        )}
        {items.map(it => (
          <li key={it.id} style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: categoryColor(it.category), flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.4, flex: 1 }}>
                {it.title}
              </span>
            </div>
            {it.description && (
              <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, paddingLeft: 14 }}>
                {it.description.length > 110 ? it.description.slice(0, 110) + '…' : it.description}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 14, flexWrap: 'wrap' }}>
              {it.category && it.category !== 'general' && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: categoryColor(it.category),
                  padding: '2px 8px', borderRadius: 999,
                  background: `${categoryColor(it.category)}1a`,
                  border: `1px solid ${categoryColor(it.category)}33`,
                }}>{it.category}</span>
              )}
              {it.priority === 'critical' && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--red)',
                  padding: '2px 8px', borderRadius: 999,
                  background: 'var(--red-bg)',
                }}>critical</span>
              )}
              {it.priority === 'high' && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--amber)',
                  padding: '2px 8px', borderRadius: 999,
                  background: 'var(--amber-bg)',
                }}>high</span>
              )}
              {it.due_date && (
                <span style={{
                  fontSize: 10, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums',
                  marginLeft: 'auto',
                }}>
                  {new Date(it.due_date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
