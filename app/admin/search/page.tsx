'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/search — power search across users + recent activity.
 *
 * One textbox. Type email / name / Supabase user UUID / Stripe
 * customer ID — get up to 20 user hits with subscription state and
 * the last 5 audit-log actions per hit. Each row links into
 * /admin/users/[id] for the full record.
 *
 * Debounced 220ms so typing doesn't fire 10 requests. Empty query
 * shows the recent-search hint card instead of an empty grid.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Loader2, User, CreditCard, History, X, Filter, Bookmark, Trash2, Star } from 'lucide-react'
import { PageHeader, Section, EmptyState } from '@/components/admin/PageChrome'

const SAVED_KEY = 'termimal-admin-saved-searches:v1'

interface SavedSearch {
  id:    string
  label: string
  query: string
  added: number
}

function loadSaved(): SavedSearch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedSearch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSaved(list: SavedSearch[]) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(SAVED_KEY, JSON.stringify(list)) } catch { /* quota / disabled — fine */ }
}

interface UserHit {
  id:                   string
  email:                string | null
  full_name:            string | null
  plan:                 string | null
  subscription_status:  string | null
  stripe_customer_id:   string | null
  created_at:           string
  current_period_end:   string | null
  recent_actions:       Array<{ action: string; entity_type: string | null; created_at: string }>
}

const PLAN_TONE: Record<string, string> = {
  free:    'chip chip-muted',
  starter: 'chip chip-blue',
  pro:     'chip chip-acc',
  premium: 'chip chip-purple',
}

const STATUS_TONE: Record<string, string> = {
  active:        'chip chip-green',
  trialing:      'chip chip-blue',
  past_due:      'chip chip-amber',
  canceled:      'chip chip-muted',
  unpaid:        'chip chip-red',
  incomplete:    'chip chip-amber',
}

function ymd(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

export default function SearchPage() {
  const [q, setQ]             = useState('')
  const [hits, setHits]       = useState<UserHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [saved, setSaved]     = useState<SavedSearch[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)

  // Hydrate saved searches from localStorage on mount.
  useEffect(() => { setSaved(loadSaved()) }, [])

  const saveCurrent = () => {
    const trimmed = q.trim()
    if (trimmed.length < 2) return
    const label = window.prompt('Name this saved search:', trimmed) || trimmed
    const item: SavedSearch = {
      id:    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: label.trim() || trimmed,
      query: trimmed,
      added: Date.now(),
    }
    setSaved(prev => {
      // De-dupe by query; newest position wins.
      const next = [item, ...prev.filter(p => p.query !== item.query)].slice(0, 20)
      persistSaved(next)
      return next
    })
  }

  const removeSaved = (id: string) => {
    setSaved(prev => {
      const next = prev.filter(s => s.id !== id)
      persistSaved(next)
      return next
    })
  }

  const applySaved = (s: SavedSearch) => {
    setQ(s.query)
    inputRef.current?.focus()
  }

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? `HTTP ${r.status}`)
      }
      const j = await r.json() as { hits: UserHit[] }
      setHits(j.hits ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced auto-search on q change.
  useEffect(() => {
    setTouched(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void search(q) }, 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q, search])

  // Auto-focus on mount.
  useEffect(() => { inputRef.current?.focus() }, [])

  const empty = touched && !loading && hits.length === 0 && q.trim().length >= 2

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Search size={14}/>}
        eyebrow="Operations"
        title="Power search"
        description="Find users by email, name, Supabase ID, or Stripe customer ID. Each hit shows subscription state and the last 5 audit actions."
        accent="acc"
      />

      <Section flush>
        <div style={{ padding: 18 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input
              ref={inputRef}
              className="input"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="email · name · user-uuid · cus_…"
              style={{ paddingLeft: 44, paddingRight: q ? 80 : 16, fontSize: '0.95rem' }}
              autoComplete="off"
              spellCheck={false}
            />
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {loading && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--t3)' }}/>}
              {q.trim().length >= 2 && !loading && (
                <button
                  type="button"
                  onClick={saveCurrent}
                  aria-label="Save this search"
                  title="Save this search for later"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}
                >
                  <Bookmark size={14}/>
                </button>
              )}
              {q && !loading && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  aria-label="Clear search"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}
                >
                  <X size={14}/>
                </button>
              )}
            </div>
          </div>

          {/* Saved searches row — only shows when the user has at least one. */}
          {saved.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                <Star size={11}/> Saved
              </span>
              {saved.map(s => (
                <span key={s.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 4px 4px 10px', borderRadius: 999,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  fontSize: 11.5, fontWeight: 600,
                }}>
                  <button
                    type="button"
                    onClick={() => applySaved(s)}
                    title={s.query}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--t1)', padding: 0, fontWeight: 'inherit',
                      fontSize: 'inherit',
                    }}
                  >
                    {s.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSaved(s.id)}
                    aria-label={`Remove saved search ${s.label}`}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--t4)', padding: '2px 4px', borderRadius: 999,
                      display: 'inline-flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={11}/>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick filter hints */}
          {!touched && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t4)', fontSize: 11 }}>
              <Filter size={11}/>
              <span>Hint: paste a Stripe <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>cus_…</code> ID, a Supabase UUID, or just type a name fragment.</span>
            </div>
          )}
        </div>
      </Section>

      {error && (
        <div className="msg-err" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {empty && (
        <EmptyState icon={<Search size={20}/>} title={`No matches for "${q}"`} description="Try a different fragment, or check the spelling."/>
      )}

      {hits.length > 0 && (
        <Section title={`${hits.length} hit${hits.length === 1 ? '' : 's'}`} flush>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)' }}>
            {hits.map((h) => (
              <Link
                key={h.id}
                href={`/admin/users/${h.id}`}
                style={{
                  background: 'var(--bg2)', padding: '16px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  textDecoration: 'none', color: 'inherit',
                  transition: 'background 160ms',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--acc-bg)', border: '1px solid var(--acc-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--acc)', flexShrink: 0,
                }}>
                  <User size={14}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{h.full_name ?? '(no name)'}</span>
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>{h.email ?? '—'}</span>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {h.plan && <span className={PLAN_TONE[h.plan] ?? 'chip'}>{h.plan}</span>}
                    {h.subscription_status && <span className={STATUS_TONE[h.subscription_status] ?? 'chip'}>{h.subscription_status}</span>}
                    {h.current_period_end && (
                      <span className="chip">
                        <CreditCard size={9}/> {ymd(h.current_period_end)}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>signed up {ymd(h.created_at)}</span>
                  </div>
                  {h.recent_actions.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, color: 'var(--t4)' }}>
                      <History size={10}/>
                      {h.recent_actions.slice(0, 5).map((a, i) => (
                        <span key={i} className="chip" style={{ fontSize: 9.5, padding: '1px 7px' }}>
                          {a.action} · {ymd(a.created_at)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ alignSelf: 'center', fontSize: 11, fontWeight: 700, color: 'var(--t4)' }}>OPEN ›</div>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
