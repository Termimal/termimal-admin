'use client'

/**
 * /admin/roadmap — read-only roadmap view of admin_items.
 *
 * Same data source as /admin/items (the kanban) but presented as a
 * stakeholder-friendly roadmap. Three columns: "Now" (in_progress + review),
 * "Next" (todo + backlog with priority high/critical), "Later"
 * (backlog with priority low/medium). Done items in the last 30 days
 * appear in a "Recently shipped" footer.
 *
 * Designed so it could later be exposed publicly (e.g. /roadmap on the
 * marketing site) — no admin-only data on each card, just title +
 * category badge.
 */

import { useEffect, useMemo, useState } from 'react'
import { Map, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'

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
  bug:      '#f87171',
  feature:  '#34d399',
  security: '#fbbf24',
  seo:      '#60a5fa',
  content:  '#a78bfa',
  ops:      '#94a3b8',
  billing:  '#fb923c',
  infra:    '#22d3ee',
  general:  '#94a3b8',
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

export default function RoadmapPage() {
  const [items, setItems]   = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

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
    // Done: last 30 days, newest first
    out.done = out.done
      .filter(it => {
        const t = it.archived_at ? Date.parse(it.archived_at) : Date.parse(it.updated_at)
        return Number.isFinite(t) && Date.now() - t < 30 * 86400 * 1000
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 12)
    return out
  }, [items])

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Map size={16} style={{ color: 'var(--acc)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--acc)', letterSpacing: '1px', textTransform: 'uppercase' }}>Roadmap</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Where we are, what's next</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>
          {loading ? 'Loading…' : error
            ? <span style={{ color: '#f87171' }}>✗ {error}</span>
            : `${grouped.now.length + grouped.next.length + grouped.later.length} open items, ${grouped.done.length} shipped recently.`}
        </p>
      </div>

      {/* Three-column roadmap */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        <Column title="Now"   subtitle="In progress + review"      items={grouped.now}   accent="var(--acc, #388bfd)" />
        <Column title="Next"  subtitle="High-priority + blocked"   items={grouped.next}  accent="#fbbf24" />
        <Column title="Later" subtitle="Backlog · low/med priority" items={grouped.later} accent="#94a3b8" />
      </div>

      {/* Recently shipped */}
      {grouped.done.length > 0 && (
        <section style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <CheckCircle2 size={14} style={{ color: '#34d399' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#34d399' }}>
              Recently shipped · last 30 days
            </span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped.done.map(it => (
              <li key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--surface, rgba(255,255,255,0.03))',
                border: '1px solid var(--border, rgba(255,255,255,0.06))',
                fontSize: 13, color: 'var(--t1)',
              }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: categoryColor(it.category),
                }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                {it.category && it.category !== 'general' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase',
                    color: categoryColor(it.category),
                    padding: '2px 6px', borderRadius: 4,
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
        <div style={{
          padding: 40, textAlign: 'center', borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--border)',
        }}>
          <Sparkles size={20} style={{ color: 'var(--t4)', marginBottom: 12 }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>Nothing on the roadmap yet</h2>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>Add items from the <a href="/admin/items" style={{ color: 'var(--acc)' }}>Open Items</a> board.</p>
        </div>
      )}
    </div>
  )
}

function Column({ title, subtitle, items, accent }: { title: string; subtitle: string; items: AdminItem[]; accent: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        background: `linear-gradient(180deg, ${accent}14, transparent)`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{subtitle}</div>
        <div style={{
          marginTop: 8, fontSize: 10, color: accent, fontWeight: 700,
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>{items.length} item{items.length === 1 ? '' : 's'}</div>
      </div>
      <ul style={{
        margin: 0, padding: 12, listStyle: 'none',
        display: 'flex', flexDirection: 'column', gap: 8, flex: 1,
      }}>
        {items.length === 0 && (
          <li style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: 16 }}>
            Nothing here yet
          </li>
        )}
        {items.map(it => (
          <li key={it.id} style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'var(--bg, #0d1117)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--t1)',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: categoryColor(it.category), flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{it.title}</span>
            </div>
            {(it.category && it.category !== 'general') || it.priority === 'critical' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {it.category && it.category !== 'general' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase',
                    color: categoryColor(it.category),
                  }}>{it.category}</span>
                )}
                {it.priority === 'critical' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase',
                    color: '#f87171',
                  }}>critical</span>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
