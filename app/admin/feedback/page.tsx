'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/feedback — user-submitted feedback inbox.
 *
 * Pulls from public.feedback_submissions. Filter by status,
 * expand a row to see the body + admin_notes, change status, add
 * notes. Group-by-category at the top for a quick triage view.
 */

import { useEffect, useMemo, useState } from 'react'
import { MessageSquare, RefreshCw, Bug, Lightbulb, HelpCircle, Heart, MoreHorizontal, Filter } from 'lucide-react'
import { HeroCard, Section, EmptyState } from '@/components/admin/PageChrome'

interface Row {
  id:            string
  user_id:       string | null
  user_email:    string | null
  user_fullname: string | null
  category:      'bug' | 'idea' | 'question' | 'praise' | 'other'
  body:          string
  url:           string | null
  user_agent:    string | null
  status:        'new' | 'reviewing' | 'answered' | 'closed'
  admin_notes:   string | null
  created_at:    string
}

const CATEGORY_META: Record<Row['category'], { label: string; color: string; icon: any }> = {
  bug:      { label: 'Bug',      color: 'var(--red)',    icon: Bug },
  idea:     { label: 'Idea',     color: 'var(--amber)',  icon: Lightbulb },
  question: { label: 'Question', color: 'var(--blue)',   icon: HelpCircle },
  praise:   { label: 'Praise',   color: 'var(--green)',  icon: Heart },
  other:    { label: 'Other',    color: 'var(--t3)',     icon: MoreHorizontal },
}

const STATUS_META: Record<Row['status'], { label: string; color: string }> = {
  new:        { label: 'New',        color: 'var(--blue)'  },
  reviewing:  { label: 'Reviewing',  color: 'var(--amber)' },
  answered:   { label: 'Answered',   color: 'var(--green)' },
  closed:     { label: 'Closed',     color: 'var(--t3)'    },
}

const STATUSES: Array<'all' | Row['status']> = ['all', 'new', 'reviewing', 'answered', 'closed']

export default function FeedbackPage() {
  const [rows,    setRows]    = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | Row['status']>('all')
  const [openId,  setOpenId]  = useState<string | null>(null)
  const [busy,    setBusy]    = useState<string | null>(null)
  const [error,   setError]   = useState('')
  const [notes,   setNotes]   = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const u = filter === 'all' ? '/api/admin/feedback' : `/api/admin/feedback?status=${filter}`
      const r = await fetch(u, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(j.rows || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filter])  // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (id: string, fields: Partial<Pick<Row, 'status' | 'admin_notes'>>) => {
    setBusy(id)
    try {
      const r = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setRows(prev => prev.map(x => x.id === id ? { ...x, ...j.row } : x))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  const byCategory = useMemo(() => {
    const m: Record<Row['category'], number> = { bug: 0, idea: 0, question: 0, praise: 0, other: 0 }
    for (const r of rows) m[r.category] = (m[r.category] || 0) + 1
    return m
  }, [rows])

  const newCount = useMemo(() => rows.filter(r => r.status === 'new').length, [rows])

  return (
    <div>
      <HeroCard
        accent="acc"
        icon={<MessageSquare size={28} />}
        eyebrow="Inbox"
        title="Feedback"
        subtitle="Bugs, ideas, questions, praise — submitted from the floating feedback button on every dashboard page."
        metric={{ label: 'New', value: newCount.toString(), secondary: `${rows.length} total` }}
      />

      {/* Category mini-stats */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',
        gap:12, marginBottom:20,
      }}>
        {(Object.keys(CATEGORY_META) as Row['category'][]).map(c => {
          const meta = CATEGORY_META[c]
          const Icon = meta.icon
          return (
            <div key={c} className="card-premium" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{
                width:36, height:36, borderRadius:11,
                background:`${meta.color}1A`, color: meta.color,
                border:`1px solid ${meta.color}33`,
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon size={16}/>
              </span>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:'var(--t1)', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>
                  {byCategory[c] || 0}
                </div>
                <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--t4)', marginTop:4 }}>
                  {meta.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Filter size={13} color="var(--t4)"/>
          {STATUSES.map(s => {
            const on = filter === s
            return (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding:'6px 14px', borderRadius:999, border:'1px solid', cursor:'pointer',
                fontSize:12, fontWeight:600, textTransform:'capitalize',
                background: on ? 'var(--acc-bg)' : 'var(--surface)',
                borderColor: on ? 'var(--acc-border)' : 'var(--border)',
                color: on ? 'var(--acc)' : 'var(--t3)',
              }}>{s}</button>
            )
          })}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:36 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Section accent="acc" title="Submissions" description={loading ? 'Loading…' : error ? `Error: ${error}` : `${rows.length} total`}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length:3 }).map((_, i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }} />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={20}/>}
            title="No submissions yet"
            description="The floating feedback button on every dashboard page sends entries here. Be patient — the first one usually arrives within a day of launch."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rows.map(r => {
              const cm   = CATEGORY_META[r.category] || CATEGORY_META.other
              const sm   = STATUS_META[r.status]
              const Icon = cm.icon
              const isOpen = openId === r.id
              return (
                <div key={r.id} className="card-premium" style={{
                  padding:'16px 20px',
                  borderColor: r.status === 'new' ? 'var(--acc)44' : 'var(--border)',
                }}>
                  <div style={{
                    display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center',
                    cursor:'pointer',
                  }} onClick={() => { setOpenId(isOpen ? null : r.id); setNotes(r.admin_notes || '') }}>
                    <span style={{
                      width:36, height:36, borderRadius:11, flexShrink:0,
                      background:`${cm.color}1A`, color: cm.color,
                      border:`1px solid ${cm.color}33`,
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Icon size={15}/>
                    </span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.body.slice(0, 120)}{r.body.length > 120 && '…'}
                      </div>
                      <div style={{ fontSize:11, color:'var(--t4)', marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color: cm.color }}>{cm.label}</span>
                        <span>·</span>
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                        {r.user_email && (
                          <>
                            <span>·</span>
                            <a
                              href={`/admin/users/${r.user_id}`}
                              onClick={e => e.stopPropagation()}
                              style={{ color:'var(--blue)' }}
                            >
                              {r.user_email}
                            </a>
                          </>
                        )}
                        {!r.user_email && <><span>·</span><span style={{ fontStyle:'italic' }}>anonymous</span></>}
                      </div>
                    </div>
                    <span style={{
                      fontSize:10, padding:'3px 9px', borderRadius:999,
                      background:'var(--surface)', color: sm.color,
                      fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
                      border:`1px solid ${sm.color}33`,
                    }}>{sm.label}</span>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                      <div style={{
                        padding:'12px 14px', borderRadius:10,
                        background:'var(--bg2)', border:'1px solid var(--border)',
                        fontSize:13, color:'var(--t1)', lineHeight:1.6, whiteSpace:'pre-wrap',
                        marginBottom:12,
                      }}>{r.body}</div>
                      {r.url && (
                        <div style={{ fontSize:11.5, color:'var(--t4)', marginBottom:10 }}>
                          From: <span style={{ fontFamily:'monospace', color:'var(--t3)' }}>{r.url}</span>
                        </div>
                      )}
                      {r.user_agent && (
                        <div style={{ fontSize:11, color:'var(--t4)', marginBottom:12 }}>
                          UA: <span style={{ fontFamily:'monospace' }}>{r.user_agent.slice(0, 100)}</span>
                        </div>
                      )}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:10.5, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>
                          Admin notes
                        </div>
                        <textarea
                          rows={3}
                          className="input"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Internal notes — never sent to the user."
                          style={{ resize:'vertical', fontFamily:'inherit', lineHeight:1.55 }}
                        />
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {(Object.keys(STATUS_META) as Row['status'][]).map(s => {
                            const on = r.status === s
                            return (
                              <button
                                key={s}
                                onClick={() => patch(r.id, { status: s })}
                                disabled={busy === r.id}
                                style={{
                                  padding:'6px 12px', borderRadius:999, border:'1px solid', cursor:'pointer',
                                  fontSize:11.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
                                  background: on ? `${STATUS_META[s].color}1A` : 'var(--surface)',
                                  borderColor: on ? `${STATUS_META[s].color}66` : 'var(--border)',
                                  color: on ? STATUS_META[s].color : 'var(--t3)',
                                }}>{STATUS_META[s].label}</button>
                            )
                          })}
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => patch(r.id, { admin_notes: notes })}
                          disabled={busy === r.id}
                        >
                          Save notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
