'use client'
export const dynamic = 'force-dynamic'

/**
 * Site-wide banner manager. Surfaces every row of `public.banners`
 * with create / edit / publish-toggle / delete affordances. The
 * underlying API is /api/admin/banners (GET / POST upsert / DELETE).
 *
 * NOTE: This file used to render an unrelated <LoginPage> stub from
 * the auth UI — that was a copy-paste regression we just fixed.
 */
import { useEffect, useState } from 'react'
import { Megaphone, Plus, Pencil, Trash2, ExternalLink, Power, RefreshCw, AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react'
import { HeroCard, Section, ItemCard, ItemGrid, EmptyState, Field } from '@/components/admin/PageChrome'

type BannerType = 'info' | 'warning' | 'success' | 'error' | 'promo'

type Banner = {
  id: string
  title: string
  message: string
  type: BannerType
  active: boolean
  link_url: string | null
  link_label: string | null
  created_at: string
}

type DraftState = {
  id?: string
  title: string
  message: string
  type: BannerType
  active: boolean
  link_url: string
  link_label: string
}

const BLANK_DRAFT: DraftState = {
  title: '',
  message: '',
  type: 'info',
  active: true,
  link_url: '',
  link_label: '',
}

const TYPE_META: Record<BannerType, { label: string; tone: 'blue' | 'amber' | 'green' | 'red' | 'purple'; icon: any }> = {
  info:    { label: 'Info',    tone: 'blue',   icon: Info           },
  warning: { label: 'Warning', tone: 'amber',  icon: AlertTriangle  },
  success: { label: 'Success', tone: 'green',  icon: CheckCircle2   },
  error:   { label: 'Error',   tone: 'red',    icon: AlertCircle    },
  promo:   { label: 'Promo',   tone: 'purple', icon: Megaphone      },
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/admin/banners')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setBanners(json.banners || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startNew  = () => setDraft({ ...BLANK_DRAFT })
  const startEdit = (b: Banner) => setDraft({
    id: b.id,
    title: b.title || '',
    message: b.message || '',
    type: b.type || 'info',
    active: !!b.active,
    link_url: b.link_url || '',
    link_label: b.link_label || '',
  })

  const save = async () => {
    if (!draft) return
    if (!draft.title.trim() || !draft.message.trim()) {
      setError('Title and message are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/banners', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...(draft.id ? { id: draft.id } : {}),
          title:      draft.title.trim(),
          message:    draft.message.trim(),
          type:       draft.type,
          active:     draft.active,
          link_url:   draft.link_url.trim()   || null,
          link_label: draft.link_label.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setDraft(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const togglePublish = async (b: Banner) => {
    setBusy(true)
    try {
      await fetch('/api/admin/banners', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: b.id, title: b.title, message: b.message, type: b.type, active: !b.active, link_url: b.link_url, link_label: b.link_label }),
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (b: Banner) => {
    if (!confirm(`Delete banner "${b.title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await fetch('/api/admin/banners', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: b.id }),
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const liveCount = banners.filter(b => b.active).length

  return (
    <div>
      <HeroCard
        accent="purple"
        icon={<Megaphone size={28} />}
        eyebrow="Site Comms"
        title="Banners"
        subtitle="Top-of-page strips that broadcast announcements, promos, or urgent notices across the marketing site."
        metric={{
          label: 'Live now',
          value: liveCount.toString(),
          secondary: `${banners.length} total`,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" style={{ minHeight: 38 }} onClick={load} disabled={loading || busy}>
          <RefreshCw size={13} /> Refresh
        </button>
        <button className="btn btn-primary btn-sm" style={{ minHeight: 38 }} onClick={startNew} disabled={busy}>
          <Plus size={13} /> New banner
        </button>
      </div>

      {error && (
        <div className="card-premium" style={{
          padding: '14px 18px', marginBottom: 20,
          borderColor: 'var(--red)' + '44',
          color: 'var(--red)',
          fontSize: 13, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Edit drawer (inline) ----------------------------------------- */}
      {draft && (
        <Section
          accent="purple"
          title={draft.id ? 'Edit banner' : 'New banner'}
          description="Banners render across the public site. Keep messages short — one sentence is plenty."
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setDraft(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
                {busy ? 'Saving…' : (draft.id ? 'Save changes' : 'Create banner')}
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <Field label="Title" required>
              <input
                className="input"
                value={draft.title}
                onChange={e => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Black Friday — 30% off Premium"
                disabled={busy}
              />
            </Field>

            <Field label="Type">
              <select
                className="input"
                value={draft.type}
                onChange={e => setDraft({ ...draft, type: e.target.value as BannerType })}
                disabled={busy}
              >
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={e => setDraft({ ...draft, active: e.target.checked })}
                  disabled={busy}
                  style={{ width: 16, height: 16, accentColor: 'var(--acc)' }}
                />
                Live on site
              </label>
            </Field>
          </div>

          <div style={{ marginTop: 18 }}>
            <Field label="Message" required hint="Short, scannable. Renders inside the strip.">
              <textarea
                className="input"
                rows={3}
                value={draft.message}
                onChange={e => setDraft({ ...draft, message: e.target.value })}
                placeholder="Limited time — €9.99/mo locked for 12 months when you upgrade today."
                disabled={busy}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 18 }}>
            <Field label="Link URL" hint="Optional. Where the CTA inside the banner points.">
              <input
                className="input"
                value={draft.link_url}
                onChange={e => setDraft({ ...draft, link_url: e.target.value })}
                placeholder="/pricing"
                disabled={busy}
              />
            </Field>
            <Field label="Link label" hint="Optional. The CTA text. Falls back to “Learn more”.">
              <input
                className="input"
                value={draft.link_label}
                onChange={e => setDraft({ ...draft, link_label: e.target.value })}
                placeholder="Upgrade now"
                disabled={busy}
              />
            </Field>
          </div>
        </Section>
      )}

      {/* Banner list -------------------------------------------------- */}
      {loading ? (
        <ItemGrid min={320}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium" style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 14 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '70%', height: 14, borderRadius: 6 }} />
                  <div className="skeleton" style={{ width: '90%', height: 12, borderRadius: 6, marginTop: 8 }} />
                </div>
              </div>
            </div>
          ))}
        </ItemGrid>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={20} />}
          title="No banners yet"
          description="Create one to broadcast announcements, promos, or maintenance notices across the marketing site."
        >
          <button className="btn btn-primary btn-sm" onClick={startNew}>
            <Plus size={13} /> New banner
          </button>
        </EmptyState>
      ) : (
        <ItemGrid min={340}>
          {banners.map(b => {
            const meta = TYPE_META[(b.type as BannerType)] || TYPE_META.info
            const Icon = meta.icon
            return (
              <ItemCard
                key={b.id}
                accent="purple"
                icon={<Icon size={18} />}
                title={b.title || '(untitled)'}
                subtitle={b.message}
                status={{
                  label: b.active ? 'LIVE' : 'DRAFT',
                  tone:  b.active ? 'green' : 'muted',
                  pulse: b.active,
                }}
                meta={
                  <>
                    <span>{meta.label.toLowerCase()}</span>
                    <span>·</span>
                    <span>{new Date(b.created_at).toLocaleDateString()}</span>
                    {b.link_url && (
                      <>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={11} /> {b.link_label || 'link'}
                        </span>
                      </>
                    )}
                  </>
                }
                footer={
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(b)} disabled={busy}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => togglePublish(b)} disabled={busy}>
                      <Power size={12} /> {b.active ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => remove(b)}
                      disabled={busy}
                      style={{ color: 'var(--red)' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                }
              />
            )
          })}
        </ItemGrid>
      )}
    </div>
  )
}
