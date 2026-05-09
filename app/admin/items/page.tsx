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
import { ListTodo, Plus, Search, X, Trash2, ChevronDown, Calendar, User as UserIcon, Tag } from 'lucide-react'

import { HeroCard, Section } from '@/components/admin/PageChrome'

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
  backlog:     { bg: 'var(--surface2)',   border: 'var(--border)',           text: 'var(--t3)'    },
  todo:        { bg: 'var(--blue-bg)',    border: 'rgba(96,165,250,0.30)',   text: 'var(--blue)'  },
  in_progress: { bg: 'var(--acc-bg)',     border: 'var(--acc-border)',       text: 'var(--acc)'   },
  review:      { bg: 'var(--purple-bg)',  border: 'rgba(167,139,250,0.30)',  text: 'var(--purple)'},
  blocked:     { bg: 'var(--red-bg)',     border: 'rgba(248,113,113,0.35)',  text: 'var(--red)'   },
  done:        { bg: 'var(--green-bg)',   border: 'rgba(52,211,153,0.30)',   text: 'var(--green)' },
}

const PRIORITY_COLOR: Record<AdminItem['priority'], { bg: string; text: string; label: string }> = {
  low:      { bg: 'var(--surface2)',   text: 'var(--t3)',     label: 'Low' },
  medium:   { bg: 'var(--blue-bg)',    text: 'var(--blue)',   label: 'Med' },
  high:     { bg: 'var(--amber-bg)',   text: 'var(--amber)',  label: 'High' },
  critical: { bg: 'var(--red-bg)',     text: 'var(--red)',    label: 'Crit' },
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

  const [q, setQ]               = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | AdminItem['priority']>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

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
    const t = setTimeout(load, 200)
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
        await load()
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

  const inProgress = grouped.in_progress.length

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<ListTodo size={28} />}
        eyebrow="Workflow"
        title="Open items"
        subtitle="Tasks, tickets, and roadmap entries — kanban view of admin_items."
        metric={{ label: 'In progress', value: inProgress.toString(), secondary: `${items.length} total` }}
      />

      <Section title="Quick add" accent="purple" description="Type a title, hit Enter to push to backlog.">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newTitle.trim()) createItem() }}
            placeholder="Add a new item — press Enter to create"
            style={{ flex: 1, minWidth: 240 }}
          />
          <select
            className="input"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as AdminItem['priority'])}
            style={{ minWidth: 120 }}
          >
            {(['low','medium','high','critical'] as const).map(p => <option key={p} value={p}>{PRIORITY_COLOR[p].label}</option>)}
          </select>
          <select
            className="input"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ minWidth: 140 }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="button"
            disabled={creating || !newTitle.trim()}
            onClick={createItem}
            className="btn btn-primary btn-sm"
            style={{ minHeight: 38 }}
          >
            <Plus size={13}/> Add
          </button>
        </div>
      </Section>

      <Section title="Filters">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input
              type="search"
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title / description"
              style={{ paddingLeft: 36 }}
            />
            {q && (
              <button
                onClick={() => setQ('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: '1px solid transparent', cursor: 'pointer',
                  color: 'var(--t3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 999, transition: 'all 160ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--t1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)' }}
              >
                <X size={14}/>
              </button>
            )}
          </div>
          <select className="input" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as 'all' | AdminItem['priority'])} style={{ minWidth: 160 }}>
            <option value="all">All priorities</option>
            {(['critical','high','medium','low'] as const).map(p => <option key={p} value={p}>{PRIORITY_COLOR[p].label}</option>)}
          </select>
          <select className="input" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} style={{ minWidth: 200 }}>
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email || p.id.slice(0, 8)}</option>)}
          </select>
        </div>
      </Section>

      {error && (
        <div className="card-premium" style={{
          padding: '14px 18px', marginBottom: 20,
          borderColor: 'var(--red)44',
          color: 'var(--red)', fontSize: 13, fontWeight: 600,
        }}>{error}</div>
      )}
      {loading && (
        <div style={{ fontSize: 13, color: 'var(--t4)', padding: 20 }}>Loading…</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(240px, 1fr))',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 16,
      }}>
        {STATUSES.map(s => {
          const col   = grouped[s]
          const meta  = STATUS_COLOR[s]
          return (
            <div key={s} className="card-premium" style={{
              display: 'flex', flexDirection: 'column', minWidth: 240,
              padding: 0, overflow: 'hidden',
              borderColor: meta.border,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 16px',
                borderBottom: `1px solid ${meta.border}`,
                background: meta.bg,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: meta.text,
                }}>{STATUS_LABEL[s]}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, color: meta.text,
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  background: 'var(--surface)', border: `1px solid ${meta.border}`,
                  padding: '2px 8px', borderRadius: 999, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>{col.length}</span>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: 10, minHeight: 100, flex: 1,
              }}>
                {col.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--t4)', padding: 14, textAlign: 'center' }}>
                    Empty
                  </div>
                )}
                {col.map(it => (
                  <ItemCardLocal
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

function ItemCardLocal({
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
      background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 12,
      padding: 12, fontSize: 12, color: 'var(--t1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800,
          background: pr.bg, color: pr.text,
          letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
        }}>{pr.label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.4, fontWeight: 600 }}>
            {item.title}
          </div>
          {item.category && item.category !== 'general' && (
            <div style={{ marginTop: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                color: 'var(--t4)', textTransform: 'uppercase',
              }}>{item.category}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: 'var(--t4)', cursor: 'pointer', padding: 2,
          }}
          aria-label="Expand"
        >
          <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}/>
        </button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginTop: 8, fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap',
      }}>
        {profile && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <UserIcon size={11}/>
            {profile.full_name || profile.email?.split('@')[0] || 'user'}
          </span>
        )}
        {dueText && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: dueOverdue ? 'var(--red)' : 'var(--t4)',
          }}>
            <Calendar size={11}/>
            {dueText}
          </span>
        )}
        {item.tags && item.tags.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Tag size={11}/>
            {item.tags.slice(0, 3).join(', ')}
          </span>
        )}
      </div>

      {open && (
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {item.description && (
            <div style={{
              fontSize: 12, color: 'var(--t3)', whiteSpace: 'pre-wrap', lineHeight: 1.55,
            }}>{item.description}</div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              value={item.status}
              onChange={(e) => onPatch({ status: e.target.value as AdminItem['status'] })}
              style={{ flex: 1, minWidth: 120, padding: '8px 10px', fontSize: 12 }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select
              className="input"
              value={item.priority}
              onChange={(e) => onPatch({ priority: e.target.value as AdminItem['priority'] })}
              style={{ minWidth: 80, padding: '8px 10px', fontSize: 12 }}
            >
              {(['low','medium','high','critical'] as const).map(p => <option key={p} value={p}>{PRIORITY_COLOR[p].label}</option>)}
            </select>
            <button
              onClick={onArchive}
              title="Archive"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: '1px solid var(--border)', borderRadius: 999,
                color: 'var(--red)', cursor: 'pointer', padding: '6px 10px',
              }}
            >
              <Trash2 size={12}/>
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
