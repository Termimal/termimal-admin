'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/items — Jira-style work tracker.
 *
 * Features:
 *   - Full-text search across key/title/body/labels (server-side via
 *     admin_items_search RPC with rank scoring)
 *   - Multi-select filter chips: status, priority, labels, assignees
 *   - Sort: updated_at | created_at | due_date | priority | story_points
 *   - View modes: board (kanban) | table | list
 *   - Saved views as chips at top (per-admin, optionally shared)
 *   - Detail drawer per item: edit fields, comments, watch toggle,
 *     activity timeline (from admin_item_events)
 *   - Item keys (TT-123) shown everywhere; clickable for deep-link
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ListTodo, Plus, Search, X, Trash2, ChevronDown, ChevronRight,
  Calendar as CalendarIcon, User as UserIcon, Tag as TagIcon, Eye, EyeOff,
  Filter as FilterIcon, ArrowUpDown, Bookmark, BookmarkPlus, Layers, Rows3, Table as TableIcon,
  MessageSquare, AlertCircle,
} from 'lucide-react'
import { HeroCard, Section } from '@/components/admin/PageChrome'

interface AdminItem {
  id: string; item_key: string | null;
  title: string; description: string | null; body_md: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string | null; severity: string | null; sprint: string | null;
  story_points: number | null; parent_id: string | null;
  tags: string[]; labels: string[];
  assignee_id: string | null; reporter_id: string | null; watchers: string[];
  due_date: string | null; position: number; archived_at: string | null;
  created_at: string; updated_at: string;
}
interface ProfileLite { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
interface FacetRow { kind: 'label' | 'sprint'; value: string; hits: number }
interface ViewRow { id: string; name: string; filters: Filters; sort: SortSpec; view_mode: ViewMode; is_shared: boolean; user_id: string }
interface CommentRow { id: string; author_id: string; body_md: string; edited_at: string | null; created_at: string }
interface EventRow { id: string; actor_id: string; type: string; payload: Record<string, unknown>; created_at: string }

type ViewMode = 'board' | 'table' | 'list'
interface Filters {
  status?: string[]
  priority?: string[]
  labels?: string[]
  assignee?: string[]
  sprint?: string[]
  has_due?: 'true' | 'false' | null
}
interface SortSpec { by: string; dir: 'asc' | 'desc' }

const STATUSES: AdminItem['status'][] = ['backlog', 'todo', 'in_progress', 'review', 'blocked', 'done']
const STATUS_LABEL: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', blocked: 'Blocked', done: 'Done' }
const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  backlog:     { bg: 'var(--surface2)',  border: 'var(--border)',          text: 'var(--t3)' },
  todo:        { bg: 'rgba(56,139,253,0.14)', border: 'rgba(56,139,253,0.4)', text: 'var(--blue)' },
  in_progress: { bg: 'rgba(45,212,164,0.14)', border: 'rgba(45,212,164,0.4)', text: 'var(--acc)' },
  review:      { bg: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.4)', text: '#a78bfa' },
  blocked:     { bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.4)', text: 'var(--red)' },
  done:        { bg: 'rgba(63,185,80,0.14)', border: 'rgba(63,185,80,0.4)', text: 'var(--green-val)' },
}
const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'rgba(248,113,113,0.14)', text: 'var(--red)' },
  high:     { bg: 'rgba(210,153,34,0.14)',  text: 'var(--amber)' },
  medium:   { bg: 'rgba(56,139,253,0.12)',  text: 'var(--blue)' },
  low:      { bg: 'var(--surface2)',        text: 'var(--t3)' },
}
const SORT_OPTIONS = [
  { value: 'updated_at',   label: 'Updated' },
  { value: 'created_at',   label: 'Created' },
  { value: 'due_date',     label: 'Due date' },
  { value: 'priority',     label: 'Priority' },
  { value: 'story_points', label: 'Story points' },
] as const

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffDays = Math.floor((d.getTime() - Date.now()) / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays === -1) return 'yesterday'
  if (diffDays < 0) return `${-diffDays}d overdue`
  if (diffDays < 7) return `in ${diffDays}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminItemsPage() {
  const [items, setItems]       = useState<AdminItem[]>([])
  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [admins, setAdmins]     = useState<ProfileLite[]>([])
  const [facets, setFacets]     = useState<FacetRow[]>([])
  const [views, setViews]       = useState<ViewRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const [q, setQ]             = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [sort, setSort]       = useState<SortSpec>({ by: 'updated_at', dir: 'desc' })
  const [viewMode, setView]   = useState<ViewMode>('board')

  const [openId, setOpenId]   = useState<string | null>(null)

  const [newTitle, setNewTitle]       = useState('')
  const [newPriority, setNewPriority] = useState<AdminItem['priority']>('medium')
  const [creating, setCreating]       = useState(false)

  const buildParams = useCallback(() => {
    const p = new URLSearchParams()
    if (q.trim())                   p.set('q', q.trim())
    if (filters.status?.length)     p.set('status',   filters.status.join(','))
    if (filters.priority?.length)   p.set('priority', filters.priority.join(','))
    if (filters.labels?.length)     p.set('labels',   filters.labels.join(','))
    if (filters.assignee?.length)   p.set('assignee', filters.assignee.join(','))
    if (filters.sprint?.length)     p.set('sprint',   filters.sprint.join(','))
    if (filters.has_due === 'true' || filters.has_due === 'false') p.set('has_due', filters.has_due)
    p.set('sort_by',  sort.by)
    p.set('sort_dir', sort.dir)
    p.set('limit',    '500')
    return p
  }, [q, filters, sort])

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await fetch(`/api/admin/items?${buildParams().toString()}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setItems(j.items || []); setProfiles(j.profiles || []); setFacets(j.facets || [])
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [buildParams])

  useEffect(() => {
    const t = setTimeout(load, 200) // debounce search
    return () => clearTimeout(t)
  }, [load])

  // Load admins + views once.
  useEffect(() => {
    fetch('/api/admin/items/admins', { cache: 'no-store' }).then(r => r.json()).then(j => setAdmins(j.admins || [])).catch(() => null)
    fetch('/api/admin/items/views',  { cache: 'no-store' }).then(r => r.json()).then(j => setViews(j.views || [])).catch(() => null)
  }, [])

  const profileMap = useMemo(() => new Map<string, ProfileLite>(profiles.concat(admins).map(p => [p.id, p])), [profiles, admins])
  const labelFacets = useMemo(() => facets.filter(f => f.kind === 'label'), [facets])
  const sprintFacets = useMemo(() => facets.filter(f => f.kind === 'sprint'), [facets])

  const grouped = useMemo(() => {
    const buckets: Record<string, AdminItem[]> = { backlog: [], todo: [], in_progress: [], review: [], blocked: [], done: [] }
    for (const it of items) buckets[it.status]?.push(it)
    return buckets
  }, [items])

  const toggleArr = (key: keyof Filters, value: string) => {
    setFilters(f => {
      const cur = new Set<string>((f[key] as string[] | undefined) ?? [])
      if (cur.has(value)) cur.delete(value); else cur.add(value)
      return { ...f, [key]: cur.size ? [...cur] : undefined }
    })
  }
  const clearFilters = () => { setFilters({}); setQ('') }

  const createItem = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const r = await fetch('/api/admin/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), priority: newPriority, status: 'backlog' }),
      })
      const j = await r.json()
      if (j.item) { setItems(prev => [j.item, ...prev]); setNewTitle('') } else if (j.error) setError(j.error)
    } finally { setCreating(false) }
  }

  const patchItem = async (id: string, patch: Partial<AdminItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } as AdminItem : it))
    try {
      const r = await fetch(`/api/admin/items/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      const j = await r.json()
      if (j.item) setItems(prev => prev.map(it => it.id === id ? j.item : it))
      else if (j.error) { setError(j.error); load() }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); load() }
  }

  const saveCurrentView = async () => {
    const name = prompt('Name this view:')
    if (!name) return
    const r = await fetch('/api/admin/items/views', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, filters, sort, view_mode: viewMode }),
    })
    if (r.ok) {
      const v = await fetch('/api/admin/items/views', { cache: 'no-store' }).then(x => x.json())
      setViews(v.views || [])
    }
  }
  const applyView = (v: ViewRow) => { setFilters(v.filters || {}); setSort(v.sort || { by: 'updated_at', dir: 'desc' }); setView(v.view_mode || 'board') }
  const deleteView = async (id: string) => {
    if (!confirm('Delete this saved view?')) return
    await fetch(`/api/admin/items/views?id=${id}`, { method: 'DELETE' })
    setViews(prev => prev.filter(v => v.id !== id))
  }

  const filtersActive = !!(q.trim() || filters.status?.length || filters.priority?.length || filters.labels?.length || filters.assignee?.length || filters.sprint?.length || filters.has_due)

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<ListTodo size={28} />}
        eyebrow="Workflow"
        title="Open items"
        subtitle="Full-text searchable, multi-filter, multi-view work tracker. Auto-generated keys (TT-N), labels, story points, sprints, watchers, comments."
        metric={{ label: 'Visible', value: items.length.toString(), secondary: `${grouped.in_progress?.length || 0} in progress` }}
      />

      {/* Quick add */}
      <Section title="Quick add" accent="purple">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" className="input" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) createItem() }}
            placeholder="Add a new item — Enter to push to backlog"
            style={{ flex: 1, minWidth: 240 }}/>
          <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value as AdminItem['priority'])}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button disabled={creating || !newTitle.trim()} onClick={createItem} className="btn btn-primary btn-sm"><Plus size={13}/> Add</button>
        </div>
      </Section>

      {/* Search + filters bar */}
      <Section title="Filters" accent="purple">
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Search + view + sort row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8, alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <Search size={14} color="var(--t4)" style={{ position:'absolute', top:'50%', left:12, transform:'translateY(-50%)' }}/>
              <input className="input" style={{ paddingLeft:34 }} placeholder="Search by key, title, body, or label…" value={q} onChange={e => setQ(e.target.value)}/>
              {q && <button onClick={() => setQ('')} style={{ position:'absolute', top:'50%', right:8, transform:'translateY(-50%)', background:'none', border:'none', color:'var(--t4)', cursor:'pointer' }}><X size={14}/></button>}
            </div>
            <div style={{ display:'flex', gap:4, padding:4, borderRadius:10, background:'var(--bg)', border:'1px solid var(--border)' }}>
              {[
                { id: 'board', icon: <Layers size={13}/>, label: 'Board' },
                { id: 'table', icon: <TableIcon size={13}/>, label: 'Table' },
                { id: 'list',  icon: <Rows3 size={13}/>, label: 'List' },
              ].map(v => (
                <button key={v.id} onClick={() => setView(v.id as ViewMode)} style={{
                  padding:'6px 10px', borderRadius:7, fontSize:11.5, fontWeight:600, cursor:'pointer',
                  border:'none', display:'inline-flex', alignItems:'center', gap:4,
                  background: viewMode === v.id ? 'var(--bg3)' : 'transparent',
                  color: viewMode === v.id ? 'var(--t1)' : 'var(--t3)',
                }}>{v.icon} {v.label}</button>
              ))}
            </div>
            <select className="input" value={sort.by} onChange={e => setSort(s => ({ ...s, by: e.target.value }))} style={{ width:140 }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={() => setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))} style={{ minHeight:36 }}>
              <ArrowUpDown size={13}/> {sort.dir}
            </button>
          </div>

          {/* Chip rows */}
          <ChipRow label="Status" options={STATUSES.map(s => ({ value: s, label: STATUS_LABEL[s] }))}
            selected={filters.status ?? []} onToggle={v => toggleArr('status', v)}/>
          <ChipRow label="Priority" options={PRIORITIES.map(p => ({ value: p, label: p }))}
            selected={filters.priority ?? []} onToggle={v => toggleArr('priority', v)}/>
          {labelFacets.length > 0 && (
            <ChipRow label="Labels" options={labelFacets.map(f => ({ value: f.value, label: `${f.value} · ${f.hits}` }))}
              selected={filters.labels ?? []} onToggle={v => toggleArr('labels', v)}/>
          )}
          {admins.length > 0 && (
            <ChipRow label="Assignee" options={[{ value: '__me__', label: 'Me' }, ...admins.map(a => ({ value: a.id, label: a.full_name || a.email || a.id.slice(0,8) }))]}
              selected={filters.assignee ?? []} onToggle={v => toggleArr('assignee', v === '__me__' ? '' : v)}/>
          )}
          {sprintFacets.length > 0 && (
            <ChipRow label="Sprint" options={sprintFacets.map(f => ({ value: f.value, label: `${f.value} · ${f.hits}` }))}
              selected={filters.sprint ?? []} onToggle={v => toggleArr('sprint', v)}/>
          )}

          {/* Saved views */}
          {views.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <Bookmark size={12} color="var(--t4)"/>
              <span style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700 }}>Saved views:</span>
              {views.map(v => (
                <div key={v.id} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  <button onClick={() => applyView(v)} style={{
                    padding:'5px 10px', borderRadius:999, border:'1px solid var(--border)',
                    background:'var(--surface)', color:'var(--t2)', cursor:'pointer', fontSize:11, fontWeight:600,
                  }}>{v.name}{v.is_shared && ' 🔓'}</button>
                  <button onClick={() => deleteView(v.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--t4)', padding:2 }}><X size={11}/></button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={saveCurrentView} disabled={!filtersActive}><BookmarkPlus size={13}/> Save current as view</button>
            {filtersActive && <button className="btn btn-secondary btn-sm" onClick={clearFilters} style={{ color:'var(--red)' }}><X size={13}/> Clear all</button>}
          </div>
        </div>
      </Section>

      {error && <div style={{ padding:'12px 16px', marginBottom:14, borderRadius:10, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.4)', color:'var(--red)', fontSize:12 }}>
        <AlertCircle size={14} style={{ verticalAlign:'middle', marginRight:6 }}/> {error}
      </div>}

      {/* Body */}
      {loading ? (
        <div className="skeleton" style={{ height:220, borderRadius:14 }}/>
      ) : viewMode === 'board' ? (
        <BoardView grouped={grouped} profileMap={profileMap} onOpen={setOpenId}/>
      ) : viewMode === 'table' ? (
        <TableView items={items} profileMap={profileMap} onOpen={setOpenId}/>
      ) : (
        <ListView items={items} profileMap={profileMap} onOpen={setOpenId}/>
      )}

      {/* Detail drawer */}
      {openId && (
        <DetailDrawer
          itemId={openId}
          items={items}
          admins={admins}
          profileMap={profileMap}
          onClose={() => setOpenId(null)}
          onPatch={patchItem}
        />
      )}
    </div>
  )
}

// ─── chip row ────────────────────────────────────────────────────────
function ChipRow({ label, options, selected, onToggle }: {
  label: string; options: Array<{ value: string; label: string }>; selected: string[]; onToggle: (v: string) => void
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
      <FilterIcon size={12} color="var(--t4)"/>
      <span style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, minWidth:60 }}>{label}</span>
      {options.map(o => {
        const on = selected.includes(o.value)
        return (
          <button key={o.value} onClick={() => onToggle(o.value)} style={{
            padding:'4px 10px', borderRadius:999, border:'1px solid', cursor:'pointer',
            fontSize:11, fontWeight:600,
            background: on ? 'var(--bg3)' : 'transparent',
            borderColor: on ? 'var(--border2)' : 'var(--border)',
            color: on ? 'var(--t1)' : 'var(--t3)',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

// ─── Board view (kanban columns) ─────────────────────────────────────
function BoardView({ grouped, profileMap, onOpen }: {
  grouped: Record<string, AdminItem[]>; profileMap: Map<string, ProfileLite>; onOpen: (id: string) => void
}) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(6, minmax(220px, 1fr))', gap:12, overflowX:'auto', paddingBottom:8 }}>
      {STATUSES.map(s => {
        const items = grouped[s] ?? []
        const c = STATUS_COLOR[s]
        return (
          <div key={s} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:'uppercase', letterSpacing:'0.07em' }}>{STATUS_LABEL[s]}</span>
              <span style={{ fontSize:11, color:c.text, fontWeight:700 }}>{items.length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:'70vh', overflowY:'auto' }}>
              {items.map(it => <Card key={it.id} it={it} profileMap={profileMap} onOpen={onOpen}/>)}
              {items.length === 0 && <div style={{ fontSize:11, color:'var(--t4)', textAlign:'center', padding:'12px 0' }}>—</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Card({ it, profileMap, onOpen }: { it: AdminItem; profileMap: Map<string, ProfileLite>; onOpen: (id: string) => void }) {
  const a = it.assignee_id ? profileMap.get(it.assignee_id) : null
  const overdue = it.due_date && new Date(it.due_date) < new Date()
  return (
    <button onClick={() => onOpen(it.id)} style={{
      textAlign:'left', display:'block', padding:'10px 12px', borderRadius:10,
      background:'var(--surface)', border:'1px solid var(--border)', cursor:'pointer', width:'100%',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', gap:6 }}>
        <span style={{ fontSize:10, color:'var(--t4)', fontFamily:'monospace', fontWeight:700 }}>{it.item_key || '—'}</span>
        {it.priority !== 'medium' && (
          <span style={{ padding:'2px 7px', borderRadius:999, fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
            background: PRIORITY_COLOR[it.priority].bg, color: PRIORITY_COLOR[it.priority].text }}>{it.priority}</span>
        )}
      </div>
      <div style={{ fontSize:12.5, fontWeight:600, color:'var(--t1)', marginTop:4, lineHeight:1.35 }}>{it.title}</div>
      {(it.labels?.length || 0) > 0 && (
        <div style={{ marginTop:6, display:'flex', gap:4, flexWrap:'wrap' }}>
          {it.labels!.slice(0, 4).map(l => (
            <span key={l} style={{ padding:'1px 7px', borderRadius:999, fontSize:9.5, fontWeight:600,
              background:'rgba(167,139,250,0.12)', color:'#a78bfa' }}>{l}</span>
          ))}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8, fontSize:10.5, color:'var(--t4)' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
          {a ? <><Avatar p={a}/> {a.full_name?.split(' ')[0] || a.email?.split('@')[0]}</> : <><UserIcon size={11}/> unassigned</>}
        </span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          {it.story_points != null && <span style={{ padding:'1px 6px', borderRadius:6, background:'var(--bg3)', color:'var(--t2)' }}>{it.story_points} pt</span>}
          {it.due_date && (
            <span style={{ color: overdue ? 'var(--red)' : 'var(--t4)', display:'inline-flex', alignItems:'center', gap:3 }}>
              <CalendarIcon size={10}/> {fmtDate(it.due_date)}
            </span>
          )}
        </span>
      </div>
    </button>
  )
}

function Avatar({ p }: { p: ProfileLite | null }) {
  if (!p) return null
  const initials = (p.full_name || p.email || '?').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()
  return (
    <span style={{ width:18, height:18, borderRadius:9, background:'var(--bg3)', color:'var(--t2)',
      display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, border:'1px solid var(--border)' }}>
      {initials}
    </span>
  )
}

// ─── Table view ──────────────────────────────────────────────────────
function TableView({ items, profileMap, onOpen }: { items: AdminItem[]; profileMap: Map<string, ProfileLite>; onOpen: (id: string) => void }) {
  return (
    <div className="card-premium" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ background:'var(--bg3)', textAlign:'left' }}>
            <th style={{ padding:'10px 14px' }}>Key</th>
            <th style={{ padding:'10px 14px', minWidth:280 }}>Title</th>
            <th style={{ padding:'10px 14px' }}>Status</th>
            <th style={{ padding:'10px 14px' }}>Priority</th>
            <th style={{ padding:'10px 14px' }}>Assignee</th>
            <th style={{ padding:'10px 14px' }}>Labels</th>
            <th style={{ padding:'10px 14px' }}>Sprint</th>
            <th style={{ padding:'10px 14px' }}>Pts</th>
            <th style={{ padding:'10px 14px' }}>Due</th>
            <th style={{ padding:'10px 14px' }}>Updated</th>
          </tr></thead>
          <tbody>
            {items.map(it => {
              const a = it.assignee_id ? profileMap.get(it.assignee_id) : null
              return (
                <tr key={it.id} onClick={() => onOpen(it.id)} style={{ borderTop:'1px solid var(--border)', cursor:'pointer' }}>
                  <td style={{ padding:'10px 14px', fontFamily:'monospace', color:'var(--t3)', fontSize:11 }}>{it.item_key || '—'}</td>
                  <td style={{ padding:'10px 14px', color:'var(--t1)', fontWeight:600 }}>{it.title}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:999, fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                      background:STATUS_COLOR[it.status].bg, color:STATUS_COLOR[it.status].text, border:`1px solid ${STATUS_COLOR[it.status].border}` }}>{STATUS_LABEL[it.status]}</span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:700, textTransform:'uppercase',
                      background:PRIORITY_COLOR[it.priority].bg, color:PRIORITY_COLOR[it.priority].text }}>{it.priority}</span>
                  </td>
                  <td style={{ padding:'10px 14px', color:'var(--t3)' }}>{a ? (a.full_name || a.email?.split('@')[0]) : '—'}</td>
                  <td style={{ padding:'10px 14px' }}>{(it.labels || []).slice(0,3).join(', ') || '—'}</td>
                  <td style={{ padding:'10px 14px', color:'var(--t3)' }}>{it.sprint || '—'}</td>
                  <td style={{ padding:'10px 14px', fontFamily:'monospace', color:'var(--t3)' }}>{it.story_points ?? '—'}</td>
                  <td style={{ padding:'10px 14px', color: it.due_date && new Date(it.due_date) < new Date() ? 'var(--red)' : 'var(--t3)' }}>{fmtDate(it.due_date)}</td>
                  <td style={{ padding:'10px 14px', color:'var(--t4)' }}>{new Date(it.updated_at).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── List view ───────────────────────────────────────────────────────
function ListView({ items, profileMap, onOpen }: { items: AdminItem[]; profileMap: Map<string, ProfileLite>; onOpen: (id: string) => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map(it => {
        const a = it.assignee_id ? profileMap.get(it.assignee_id) : null
        return (
          <button key={it.id} onClick={() => onOpen(it.id)} style={{
            textAlign:'left', display:'flex', alignItems:'center', gap:14, padding:'10px 14px',
            background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, cursor:'pointer',
          }}>
            <span style={{ fontFamily:'monospace', color:'var(--t4)', fontSize:11, minWidth:64 }}>{it.item_key || '—'}</span>
            <span style={{ padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:700, textTransform:'uppercase',
              background:STATUS_COLOR[it.status].bg, color:STATUS_COLOR[it.status].text }}>{STATUS_LABEL[it.status]}</span>
            <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--t1)' }}>{it.title}</span>
            {(it.labels?.length || 0) > 0 && (
              <span style={{ fontSize:10.5, color:'#a78bfa', fontWeight:600 }}>{it.labels!.slice(0,3).join(' · ')}</span>
            )}
            {it.priority !== 'medium' && (
              <span style={{ padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:700, textTransform:'uppercase',
                background:PRIORITY_COLOR[it.priority].bg, color:PRIORITY_COLOR[it.priority].text }}>{it.priority}</span>
            )}
            {a && <Avatar p={a}/>}
            {it.due_date && (
              <span style={{ fontSize:10.5, color: it.due_date && new Date(it.due_date) < new Date() ? 'var(--red)' : 'var(--t4)' }}>
                {fmtDate(it.due_date)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Detail drawer ───────────────────────────────────────────────────
function DetailDrawer({ itemId, items, admins, profileMap, onClose, onPatch }: {
  itemId: string; items: AdminItem[]; admins: ProfileLite[]; profileMap: Map<string, ProfileLite>;
  onClose: () => void; onPatch: (id: string, patch: Partial<AdminItem>) => void
}) {
  const it = items.find(x => x.id === itemId)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [posting, setPosting] = useState(false)
  const [showRawDesc, setShowRaw] = useState(false)

  const loadComments = useCallback(async () => {
    if (!it) return
    const r = await fetch(`/api/admin/items/${it.id}/comments`, { cache: 'no-store' })
    const j = await r.json()
    setComments(j.comments || [])
  }, [it])
  useEffect(() => { loadComments() }, [loadComments])

  if (!it) return null

  const addComment = async () => {
    if (!commentBody.trim()) return
    setPosting(true)
    await fetch(`/api/admin/items/${it.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body_md: commentBody }),
    })
    setCommentBody(''); setPosting(false); loadComments()
  }
  const addLabel = () => {
    const v = newLabel.trim().toLowerCase()
    if (!v) return
    const next = Array.from(new Set([...(it.labels ?? []), v]))
    onPatch(it.id, { labels: next }); setNewLabel('')
  }
  const removeLabel = (l: string) => onPatch(it.id, { labels: (it.labels ?? []).filter(x => x !== l) })

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{
        position:'absolute', top:0, right:0, height:'100%', width:'min(680px, 100vw)',
        background:'var(--bg)', borderLeft:'1px solid var(--border)', overflow:'auto',
        display:'flex', flexDirection:'column', gap:0,
      }}>
        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontFamily:'monospace', color:'var(--t4)', fontSize:12, fontWeight:700 }}>{it.item_key || '—'}</span>
          <input className="input" value={it.title} onChange={e => onPatch(it.id, { title: e.target.value })} style={{ flex:1, fontSize:14, fontWeight:600 }}/>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer' }}><X size={18}/></button>
        </div>

        <div style={{ padding:18, display:'grid', gridTemplateColumns:'1fr 200px', gap:18 }}>
          {/* Main column */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Description / body */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700 }}>Description</span>
                <button onClick={() => setShowRaw(s => !s)} className="btn btn-secondary btn-sm" style={{ fontSize:10, minHeight:24 }}>{showRawDesc ? 'Preview' : 'Edit'}</button>
              </div>
              {showRawDesc ? (
                <textarea className="input" rows={6} value={it.body_md ?? it.description ?? ''}
                  onChange={e => onPatch(it.id, { body_md: e.target.value })}
                  placeholder="Markdown description — wraps the issue context, repro steps, etc."/>
              ) : (
                <div style={{ padding:12, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--t2)', whiteSpace:'pre-wrap', minHeight:80 }}>
                  {it.body_md || it.description || <span style={{ color:'var(--t4)' }}>(no description)</span>}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <div style={{ fontSize:11, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:8 }}>
                <MessageSquare size={11} style={{ marginRight:4, verticalAlign:'middle' }}/> Comments ({comments.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {comments.map(c => {
                  const author = profileMap.get(c.author_id)
                  return (
                    <div key={c.id} style={{ padding:10, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--t4)', marginBottom:4 }}>
                        <Avatar p={author ?? null}/>
                        <span style={{ color:'var(--t2)', fontWeight:600 }}>{author?.full_name || author?.email?.split('@')[0] || c.author_id.slice(0,8)}</span>
                        <span>·</span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                        {c.edited_at && <span>· edited</span>}
                      </div>
                      <div style={{ fontSize:13, color:'var(--t2)', whiteSpace:'pre-wrap' }}>{c.body_md}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginTop:8 }}>
                <textarea className="input" rows={2} value={commentBody} onChange={e => setCommentBody(e.target.value)}
                  placeholder="Add a comment… (Markdown supported)"/>
                <button className="btn btn-primary btn-sm" disabled={posting || !commentBody.trim()} onClick={addComment}>Post</button>
              </div>
            </div>
          </div>

          {/* Side column */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <SideField label="Status">
              <select className="input" value={it.status} onChange={e => onPatch(it.id, { status: e.target.value as AdminItem['status'] })}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </SideField>
            <SideField label="Priority">
              <select className="input" value={it.priority} onChange={e => onPatch(it.id, { priority: e.target.value as AdminItem['priority'] })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </SideField>
            <SideField label="Assignee">
              <select className="input" value={it.assignee_id ?? ''} onChange={e => onPatch(it.id, { assignee_id: e.target.value || null })}>
                <option value="">unassigned</option>
                {admins.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
              </select>
            </SideField>
            <SideField label="Story points">
              <input className="input" type="number" min={0} value={it.story_points ?? ''} onChange={e => onPatch(it.id, { story_points: e.target.value ? parseInt(e.target.value, 10) : null })}/>
            </SideField>
            <SideField label="Sprint">
              <input className="input" value={it.sprint ?? ''} onChange={e => onPatch(it.id, { sprint: e.target.value || null })} placeholder="e.g. Q3-2026 wk1"/>
            </SideField>
            <SideField label="Due date">
              <input className="input" type="date" value={it.due_date ? it.due_date.slice(0,10) : ''} onChange={e => onPatch(it.id, { due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}/>
            </SideField>
            <SideField label="Labels">
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
                {(it.labels ?? []).map(l => (
                  <span key={l} style={{ padding:'2px 8px', borderRadius:999, fontSize:10.5, fontWeight:600,
                    background:'rgba(167,139,250,0.14)', color:'#a78bfa', display:'inline-flex', alignItems:'center', gap:4 }}>
                    {l}
                    <button onClick={() => removeLabel(l)} style={{ background:'none', border:'none', cursor:'pointer', color:'#a78bfa', padding:0 }}><X size={10}/></button>
                  </span>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:4 }}>
                <input className="input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="add label" onKeyDown={e => { if (e.key === 'Enter') addLabel() }}/>
                <button className="btn btn-secondary btn-sm" onClick={addLabel} style={{ fontSize:11 }}>Add</button>
              </div>
            </SideField>
          </div>
        </div>
      </div>
    </div>
  )
}

function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:10.5, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:4 }}>{label}</div>
      {children}
    </div>
  )
}
