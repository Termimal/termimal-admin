'use client'

/**
 * /admin/items — open items / project management.
 *
 * Kanban-style board with 6 columns (backlog / todo / in_progress /
 * review / done / blocked), a quick-add row at the top, filters by
 * priority + assignee + free-text search, and per-card status +
 * priority controls. Drag-to-reorder is V2; for now use the status
 * dropdown on each card.
 *
 * Data flows through /api/admin/items (admin-RLS-gated). Optimistic
 * updates on patches so the UI feels snappy; on failure the local
 * row reverts to the server response.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListTodo, Plus, Search, Filter, X, Trash2, ChevronDown, AlertCircle, Calendar, User as UserIcon, Tag } from 'lucide-react'

import { HeroCard } from '@/components/admin/PageChrome'
interface AdminItem {
  id: string
  title: string
  description: string | null
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string | null
  tags: string[]
  assignee_id: string | null
  reporter_id: string | null
  due_date: string | null
  position: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

interface ProfileLite { id: string; full_name: string | null; email: string | null; avatar_url: string | null }

const STATUSES: AdminItem['status'][] = ['backlog', 'todo', 'in_progress', 'review', 'blocked', 'done']

const STATUS_LABEL: Record<AdminItem['status'], string> = {
  backlog:     'Backlog',
  todo:        'To Do',
  in_progress: 'In Progress',
  review:      'Review',
  blocked:     'Blocked',
  done:        'Done',
}

const STATUS_COLOR: Record<AdminItem['status'], { bg: string; border: string; text: string }> = {
  backlog:     { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.30)', text: '#94a3b8' },
  todo:        { bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.30)',  text: '#60a5fa' },
  in_progress: { bg: 'rgba(56,139,253,0.10)',  border: 'rgba(56,139,253,0.35)',  text: '#388bfd' },
  review:      { bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.30)', text: '#a78bfa' },
  blocked:     { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.35)', text: '#f87171' },
  done:        { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.30)',  text: '#34d399' },
}

const PRIORITY_COLOR: Record<AdminItem['priority'], { bg: string; text: string; label: string }> = {
  low:      { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', label: 'Low' },
  medium:   { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa', label: 'Med' },
  high:     { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24', label: 'High' },
  critical: { bg: 'rgba(248,113,113,0.18)', text: '#f87171', label: 'Crit' },
}

const CATEGORIES = [
  'general', 'bug', 'feature', 'security', 'seo', 'content', 'ops', 'billing', 'infra',
] as const

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)
  if (diffDays === 0)       return 'today'
  if (diffDays === 1)       return 'tomorrow'
  if (diffDays === -1)      return 'yesterday'
  if (diffDays < 0)         return `${-diffDays}d overdue`
  if (diffDays < 7)         return `in ${diffDays}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminItemsPage() {
  const [items, setItems]       = useState<AdminItem[]>([])
  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // Filters.
  const [q, setQ]               = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | AdminItem['priority']>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

  // Quick-add form.
  const [newTitle, setNewTitle]       = useState('')
  const [newPriority, setNewPriority] = useState<AdminItem['priority']>('medium')
  const [newCategory, setNewCategory] = useState<string>('general')
  const [creating, setCreating]       = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim())                  params.set('q',        q.trim())
      if (filterPriority !== 'all')  params.set('priority', filterPriority)
      if (filterAssignee !== 'all')  params.set('assignee', filterAssignee)
      const r = await fetch(`/api/admin/items?${params.toString()}`, { cache: 'no-store' })
      const j = await r.json() as { items?: AdminItem[]; profiles?: ProfileLite[]; error?: string }
      if (!r.ok || j.error) {
        setError(j.error || `HTTP ${r.status}`)
      } else {
        setItems(j.items || [])
        setProfiles(j.profiles || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [q, filterPriority, filterAssignee])

  useEffect(() => {
    const t = setTimeout(load, 200) // debounce search
    return () => clearTimeout(t)
  }, [load])

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>()
    for (const p of profiles) m.set(p.id, p)
    return m
  }, [profiles])

  const grouped = useMemo(() => {
    const buckets: Record<AdminItem['status'], AdminItem[]> = {
      backlog: [], todo: [], in_progress: [], review: [], blocked: [], done: [],
    }
    for (const it of items) buckets[it.status].push(it)
    return buckets
  }, [items])

  // ── Mutations ────────────────────────────────────────────────────

  async function createItem() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const r = await fetch('/api/admin/items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:    newTitle.trim(),
          priority: newPriority,
          category: newCategory,
          status:   'backlog',
        }),
      })
      const j = await r.json()
      if (j.item) {
        setItems(prev => [...prev, j.item])
        setNewTitle('')
      } else if (j.error) {
        setError(j.error)
      }
    } finally {
      setCreating(false)
    }
  }

  async function patchItem(id: string, patch: Partial<AdminItem>) {
    // Optimistic: apply the change locally immediately.
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } as AdminItem : it))
    try {
      const r = await fetch(`/api/admin/items/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const j = await r.json() as { item?: AdminItem; error?: string }
      if (j.item) {
        setItems(prev => prev.map(it => it.id === id ? j.item! : it))
      } else if (j.error) {
        setError(j.error)
        await load() // refetch to undo the optimistic state
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      await load()
    }
  }

  async function archiveItem(id: string) {
    if (!confirm('Archive this item?')) return
    setItems(prev => prev.filter(it => it.id !== id))
    try {
      await fetch(`/api/admin/items/${id}`, { method: 'DELETE' })
    } catch { /* swallow */ }
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1400 }}>
      <HeroCard
        accent='purple'
        icon={<ListTodo size={28} />}
        eyebrow='Workflow'
        title='Open items'
        subtitle='Tasks, tickets, and roadmap entries — kanban view of admin_items.'
      />

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <ListTodo size={16} style={{ color: 'var(--acc)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--acc)', letterSpacing: '1px', textTransform: 'uppercase' }}>Project Board</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Open items</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>
          Bugs, features, ops follow-ups. {items.length} item{items.length === 1 ? '' : 's'} on the board.
        </p>
      </div>

      {/* Quick-add row */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: 12, marginBottom: 16,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newTitle.trim()) createItem() }}
          placeholder="Add a new item — press Enter to create"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            background: 'var(--bg, #0d1117)', border: '1px solid var(--border)',
            color: 'var(--t1)', fontSize: 13,
          }}
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as AdminItem['priority'])}
          style={selectStyle}
        >
          {(['low','medium','high','critical'] as const).map(p => <option key={p} value={p}>{PRIORITY_COLOR[p].label}</option>)}
        </select>
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={selectStyle}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          disabled={creating || !newTitle.trim()}
          onClick={createItem}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: 'var(--acc, #388bfd)', border: 'none',
            color: 'white', fontSize: 12, fontWeight: 600,
            cursor: creating ? 'wait' : 'pointer',
            opacity: !newTitle.trim() ? 0.5 : 1,
          }}
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '8px 12px', marginBottom: 18,
        background: 'transparent', borderBottom: '1px solid var(--border)',
      }}>
        <Filter size={12} style={{ color: 'var(--t4)' }} />
        <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Filter</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <Search size={12} style={{ color: 'var(--t4)' }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title / description"
            style={{
              flex: 1, maxWidth: 280, padding: '4px 8px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--t1)', fontSize: 12,
            }}
          />
          {q && (
            <button onClick={() => setQ('')} style={iconBtn}><X size={11} /></button>
          )}
        </div>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as 'all' | AdminItem['priority'])} style={selectStyle}>
          <option value="all">All priorities</option>
          {(['critical','high','medium','low'] as const).map(p => <option key={p} value={p}>{PRIORITY_COLOR[p].label}</option>)}
        </select>
        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} style={selectStyle}>
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email || p.id.slice(0, 8)}</option>)}
        </select>
      </div>

      {error && (
        <div style={{
          padding: 10, marginBottom: 14, borderRadius: 8,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171', fontSize: 12,
        }}>
          ✗ {error}
        </div>
      )}
      {loading && (
        <div style={{ fontSize: 12, color: 'var(--t4)', padding: 20 }}>Loading…</div>
      )}

      {/* Kanban columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(220px, 1fr))',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 16,
      }}>
        {STATUSES.map(s => {
          const col   = grouped[s]
          const meta  = STATUS_COLOR[s]
          return (
            <div key={s} style={{
              display: 'flex', flexDirection: 'column', minWidth: 220,
              background: 'var(--surface)', borderRadius: 10,
              border: `1px solid ${meta.border}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px',
                borderBottom: `1px solid ${meta.border}`,
                background: meta.bg,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.6px',
                  textTransform: 'uppercase', color: meta.text,
                }}>{STATUS_LABEL[s]}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 10, color: meta.text,
                  fontFamily: 'var(--font-mono, monospace)',
                  background: meta.bg, border: `1px solid ${meta.border}`,
                  padding: '1px 6px', borderRadius: 4,
                }}>{col.length}</span>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: 8, minHeight: 80, flex: 1,
              }}>
                {col.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--t4)', padding: 12, textAlign: 'center' }}>
                    Empty
                  </div>
                )}
                {col.map(it => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    profile={it.assignee_id ? profileMap.get(it.assignee_id) : undefined}
                    onPatch={(patch) => patchItem(it.id, patch)}
                    onArchive={() => archiveItem(it.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 6,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--t1)', fontSize: 12, cursor: 'pointer',
}
const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none',
  color: 'var(--t4)', cursor: 'pointer', padding: 2,
}

function ItemCard({
  item, profile, onPatch, onArchive,
}: {
  item: AdminItem
  profile?: ProfileLite
  onPatch: (patch: Partial<AdminItem>) => void
  onArchive: () => void
}) {
  const [open, setOpen] = useState(false)
  const pr = PRIORITY_COLOR[item.priority]
  const dueOverdue = item.due_date ? new Date(item.due_date).getTime() < Date.now() : false
  const dueText = item.due_date ? fmtDate(item.due_date) : ''

  return (
    <article style={{
      background: 'var(--bg, #0d1117)',
      border: '1px solid var(--border)', borderRadius: 8,
      padding: 10, fontSize: 12, color: 'var(--t1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{
          padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
          background: pr.bg, color: pr.text,
          letterSpacing: '0.4px', textTransform: 'uppercase', flexShrink: 0,
        }}>{pr.label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.35, fontWeight: 500 }}>
            {item.title}
          </div>
          {item.category && item.category !== 'general' && (
            <div style={{ marginTop: 3 }}>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.4px',
                color: 'var(--t4)', textTransform: 'uppercase',
              }}>{item.category}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={iconBtn}
          aria-label="Expand"
        >
          <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }} />
        </button>
      </div>

      {/* Meta row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginTop: 6, fontSize: 10, color: 'var(--t4)',
      }}>
        {profile && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <UserIcon size={10} />
            {profile.full_name || profile.email?.split('@')[0] || 'user'}
          </span>
        )}
        {dueText && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            color: dueOverdue ? '#f87171' : 'var(--t4)',
          }}>
            <Calendar size={10} />
            {dueText}
          </span>
        )}
        {item.tags && item.tags.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Tag size={10} />
            {item.tags.slice(0, 3).join(', ')}
          </span>
        )}
      </div>

      {open && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {item.description && (
            <div style={{
              fontSize: 11, color: 'var(--t3)', whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}>{item.description}</div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={item.status}
              onChange={(e) => onPatch({ status: e.target.value as AdminItem['status'] })}
              style={selectStyle}
            >
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select
              value={item.priority}
              onChange={(e) => onPatch({ priority: e.target.value as AdminItem['priority'] })}
              style={selectStyle}
            >
              {(['low','medium','high','critical'] as const).map(p => <option key={p} value={p}>{PRIORITY_COLOR[p].label}</option>)}
            </select>
            <button
              onClick={onArchive}
              title="Archive"
              style={{
                ...iconBtn, marginLeft: 'auto',
                color: '#f87171',
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
