'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Plus, Bell, Send, X, Trash2, Megaphone, AlertTriangle, RefreshCw } from 'lucide-react'
import { HeroCard, Section, ItemGrid, ItemCard, EmptyState, Field } from '@/components/admin/PageChrome'

type Ann = { id?:string; title:string; content:string; type:string; target:string; status?:string; created_at?:string }
const empty = ():Ann => ({ title:'', content:'', type:'announcement', target:'all' })

const TYPE_META: Record<string, { tone: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'muted'; label: string; icon: any }> = {
  announcement: { tone: 'purple', label: 'Announcement', icon: Bell           },
  email:        { tone: 'blue',   label: 'Email',        icon: Send           },
  alert:        { tone: 'red',    label: 'Alert',        icon: AlertTriangle  },
}

export default function AnnouncementsPage() {
  const [items,   setItems]   = useState<Ann[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Ann|null>(null)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/admin/announcements')
    const j = await r.json()
    if (j.error) setErr(j.error)
    else setItems(j.announcements || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const r = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(editing),
    })
    const j = await r.json()
    if (!j.error) { await load(); setEditing(null) }
    setSaving(false)
  }
  const del = async (id:string) => {
    if (!confirm('Delete?')) return
    await fetch('/api/admin/announcements', {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id }),
    })
    await load()
  }

  const liveCount = items.filter(a => a.status === 'sent').length

  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Megaphone size={28} />}
        eyebrow="Site comms"
        title="Announcements"
        subtitle="Broadcast messages, emails, and alerts to all customers across the marketing site."
        metric={{ label: 'Sent', value: liveCount.toString(), secondary: `${items.length} total` }}
      />

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginBottom:20 }}>
        <button className="btn btn-secondary btn-sm" style={{ minHeight:38 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
        <button className="btn btn-primary btn-sm" style={{ minHeight:38 }} onClick={() => setEditing(empty())}>
          <Plus size={13}/> New announcement
        </button>
      </div>

      {err && (
        <div className="card-premium" style={{
          padding:'14px 18px', marginBottom:20,
          borderColor:'var(--red)44', color:'var(--red)',
          fontSize:13, fontWeight:600,
        }}>
          {err}
        </div>
      )}

      {editing && (
        <Section
          accent="amber"
          title={editing.id ? 'Edit announcement' : 'New announcement'}
          description="Drafts are saved and can be sent later. Keep messages short and direct."
          actions={
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)} disabled={saving}>
                <X size={12}/> Cancel
              </button>
              <button className="btn btn-primary btn-sm" disabled={!editing.title || saving} onClick={save}>
                {saving ? 'Saving…' : (<><Send size={12}/> Save draft</>)}
              </button>
            </div>
          }
        >
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:18 }}>
            <Field label="Title" required>
              <input
                className="input"
                value={editing.title}
                onChange={e => setEditing({ ...editing, title:e.target.value })}
                placeholder="Title"
              />
            </Field>
            <Field label="Type">
              <select
                className="input"
                value={editing.type}
                onChange={e => setEditing({ ...editing, type:e.target.value })}
              >
                <option value="announcement">Announcement</option>
                <option value="email">Email</option>
                <option value="alert">Alert</option>
              </select>
            </Field>
            <Field label="Audience">
              <select
                className="input"
                value={editing.target}
                onChange={e => setEditing({ ...editing, target:e.target.value })}
              >
                <option value="all">All users</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop:18 }}>
            <Field label="Content" hint="Renders as the body of the message.">
              <textarea
                className="input"
                rows={5}
                value={editing.content}
                onChange={e => setEditing({ ...editing, content:e.target.value })}
                placeholder="Message…"
                style={{ resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}
              />
            </Field>
          </div>
        </Section>
      )}

      {loading ? (
        <ItemGrid min={320}>
          {Array.from({ length:3 }).map((_,i) => (
            <div key={i} className="card-premium" style={{ padding:'22px 24px' }}>
              <div className="skeleton" style={{ width:'70%', height:14, borderRadius:6 }}/>
              <div className="skeleton" style={{ width:'90%', height:12, borderRadius:6, marginTop:10 }}/>
            </div>
          ))}
        </ItemGrid>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell size={20}/>}
          title="No announcements yet"
          description="Create announcements to communicate with users."
        >
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(empty())}>
            <Plus size={13}/> Create first
          </button>
        </EmptyState>
      ) : (
        <ItemGrid min={340}>
          {items.map((a, i) => {
            const meta = TYPE_META[a.type] || TYPE_META.announcement
            const Icon = meta.icon
            return (
              <ItemCard
                key={a.id || i}
                accent="amber"
                icon={<Icon size={18}/>}
                title={a.title || '(untitled)'}
                subtitle={a.content?.slice(0, 140) + ((a.content?.length || 0) > 140 ? '…' : '')}
                status={{
                  label: (a.status || 'draft').toUpperCase(),
                  tone:  a.status === 'sent' ? 'green' : 'muted',
                  pulse: a.status === 'sent',
                }}
                meta={
                  <>
                    <span>{meta.label.toLowerCase()}</span>
                    <span>·</span>
                    <span>→ {a.target}</span>
                    {a.created_at && (
                      <>
                        <span>·</span>
                        <span>{new Date(a.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                      </>
                    )}
                  </>
                }
                footer={a.id && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => del(a.id!)}
                      style={{ color:'var(--red)' }}
                    >
                      <Trash2 size={12}/> Delete
                    </button>
                  </div>
                )}
              />
            )
          })}
        </ItemGrid>
      )}
    </div>
  )
}
