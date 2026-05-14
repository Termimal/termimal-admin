'use client'
export const dynamic = 'force-dynamic'

/**
 * Social Studio — AI-powered composer + scheduler for Termimal's
 * social presence.
 *
 * Flow:
 *   1. Pick the platforms you're posting to (X, IG, LinkedIn, …)
 *   2. Drop a prompt or screenshot in the composer
 *   3. AI generates 3 platform-tuned variations to pick from
 *   4. Schedule for now or future, optionally attach an image
 *   5. Studio queues the post; on the schedule fires, posts via the
 *      platform OAuth tokens we store per-channel.
 *
 * Right now (this commit):
 *   - Composer + AI generation work end-to-end (calls OpenAI if
 *     OPENAI_API_KEY is set, returns canned variations otherwise).
 *   - Platform connections are STATUS-ONLY — clicking Connect opens
 *     each platform's developer portal in a new tab. Wiring real
 *     OAuth + posting is a 2-3 day follow-up per platform.
 *   - Queue persists scheduled drafts in the `admin_items` table
 *     under category='social_post' so they survive reloads and are
 *     visible from the generic Open Items board.
 */

import { useEffect, useState } from 'react'
import {
  Sparkles, Send, Calendar, Clock, Image as ImageIcon, Trash2,
  MessageCircle, RefreshCw,
  Wand2, Plus, ExternalLink, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { HeroCard, Section, ItemGrid, ItemCard, Field, EmptyState } from '@/components/admin/PageChrome'

/* Brand glyphs — lucide-react@1.x doesn't ship social brand icons,
   so we inline the standard SVG paths. ~120 bytes each, tree-shaken. */
const Twitter   = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size||16} height={props.size||16} fill="currentColor" aria-hidden>
    <path d="M18.244 2H21l-6.51 7.44L22 22h-6.84l-4.66-6.094L4.96 22H2l7-8.012L1.5 2h7.02l4.21 5.61L18.244 2zm-1.2 18.5h1.84L7.04 3.4H5.07L17.044 20.5z"/>
  </svg>
)
const Instagram = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size||16} height={props.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
)
const Linkedin  = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size||16} height={props.size||16} fill="currentColor" aria-hidden>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V10.66H5.67v7.68h2.67zM7 9.5a1.55 1.55 0 1 0 0-3.09 1.55 1.55 0 0 0 0 3.09zm11.34 8.84v-4.2c0-2.25-1.2-3.3-2.81-3.3a2.42 2.42 0 0 0-2.2 1.21h-.04v-1.04h-2.56v7.33h2.66V14.4c0-1 .19-1.96 1.43-1.96 1.22 0 1.24 1.13 1.24 2.02v3.88h2.66z"/>
  </svg>
)
const Facebook  = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size||16} height={props.size||16} fill="currentColor" aria-hidden>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9v-2.89h2.54V9.79c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.9h-2.33v6.98A10 10 0 0 0 22 12z"/>
  </svg>
)

// ────────────────────────────────────────────────────────────────
//   Platforms
// ────────────────────────────────────────────────────────────────

type Platform = 'x' | 'instagram' | 'linkedin' | 'threads' | 'facebook' | 'bluesky' | 'mastodon'

/* Brand glyphs for the two free-tier platforms. */
const Bluesky = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size||16} height={props.size||16} fill="currentColor" aria-hidden>
    <path d="M5.32 4.59C7.18 5.99 9.18 8.83 10 10.6c.82-1.77 2.82-4.61 4.68-6.01C16.18 3.48 18.5 2.7 19.85 3.85c1.07.92 1.5 2.7.94 4.35-.86 2.49-3.13 5.07-5.21 6.07.94.46 1.79 1.65 2.05 3.04.18.94.07 1.74-.34 2.27-.79.99-1.78.34-2.66-1.04C13.74 17.31 12.55 15.43 12 14.4c-.55 1.03-1.74 2.91-2.63 4.14-.88 1.38-1.87 2.03-2.66 1.04-.4-.53-.52-1.33-.34-2.27.26-1.39 1.11-2.58 2.05-3.04-2.08-1-4.35-3.58-5.21-6.07-.56-1.65-.13-3.43.94-4.35C5.5 2.7 7.82 3.48 9.32 4.59z"/>
  </svg>
)
const Mastodon = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size||16} height={props.size||16} fill="currentColor" aria-hidden>
    <path d="M21.58 12.93c-.3 1.57-2.71 3.28-5.47 3.62-1.44.18-2.86.34-4.37.27-2.47-.12-4.42-.6-4.42-.6 0 .24.02.47.05.69.32 2.47 2.43 2.62 4.43 2.69 2.02.07 3.82-.5 3.82-.5l.08 1.83s-1.41.76-3.93.9c-1.39.08-3.11-.04-5.13-.57-4.36-1.16-5.11-5.83-5.22-10.57-.04-1.41-.02-2.74-.02-3.85 0-4.85 3.16-6.27 3.16-6.27C6.16.86 8.87.5 11.69.48h.07c2.82.02 5.53.38 7.13 1.09 0 0 3.16 1.42 3.16 6.27 0 0 .04 3.58-.44 5.09zM18.6 8.27v5.8h-2.3V8.44c0-1.19-.5-1.8-1.5-1.8-1.1 0-1.66.71-1.66 2.13v3.08H10.85V8.77c0-1.42-.55-2.13-1.66-2.13-1 0-1.5.61-1.5 1.8v5.63H5.4V8.27c0-1.19.3-2.13.92-2.83.63-.7 1.46-1.06 2.49-1.06 1.19 0 2.09.46 2.7 1.37l.57.96.58-.96c.61-.91 1.51-1.37 2.7-1.37 1.02 0 1.85.36 2.49 1.06.61.7.92 1.64.92 2.83z"/>
  </svg>
)

const PLATFORMS: Array<{
  key: Platform
  label: string
  icon: any
  color: string
  bg: string
  charLimit: number
  setupUrl: string
  setupNote: string
  /** True for platforms that use credential-paste instead of OAuth.
   *  Drives the "Connect with credentials" UI instead of opening a
   *  developer-portal link in a new tab. */
  credentialBased?: boolean
}> = [
  { key: 'bluesky',   label: 'Bluesky',     icon: Bluesky,        color: '#fff',     bg: '#0085ff',        charLimit: 300,   setupUrl: 'https://bsky.app/settings/app-passwords',           setupNote: 'Go to Bluesky → Settings → App Passwords → Create. Paste handle + app password here. No OAuth, no developer review.', credentialBased: true },
  { key: 'mastodon',  label: 'Mastodon',    icon: Mastodon,       color: '#fff',     bg: '#6364ff',        charLimit: 500,   setupUrl: 'https://mastodon.social/settings/applications',     setupNote: 'On your Mastodon instance → Preferences → Development → New Application. Scope: write:statuses. Paste instance URL + the access token shown after creating the app.', credentialBased: true },
  { key: 'x',         label: 'X (Twitter)', icon: Twitter,        color: '#fff',     bg: '#000',           charLimit: 280,   setupUrl: 'https://developer.twitter.com/en/portal/dashboard', setupNote: 'Create an X dev project, enable OAuth 2.0, request "tweets.write" scope.' },
  { key: 'linkedin',  label: 'LinkedIn',    icon: Linkedin,       color: '#fff',     bg: '#0a66c2',        charLimit: 3000,  setupUrl: 'https://www.linkedin.com/developers/apps',          setupNote: 'Create a LinkedIn app, request "w_member_social" + "r_organization_social" scopes.' },
  { key: 'instagram', label: 'Instagram',   icon: Instagram,      color: '#fff',     bg: 'linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #515bd4 100%)', charLimit: 2200, setupUrl: 'https://developers.facebook.com/apps',                setupNote: 'Same as Meta — Instagram posts go through the Graph API on a Facebook Business app.' },
  { key: 'facebook',  label: 'Facebook',    icon: Facebook,       color: '#fff',     bg: '#1877f2',        charLimit: 63206, setupUrl: 'https://developers.facebook.com/apps',                setupNote: 'Create a Meta app, link the Termimal Facebook Page, request "pages_manage_posts".' },
  { key: 'threads',   label: 'Threads',     icon: MessageCircle,  color: '#fff',     bg: '#000',           charLimit: 500,   setupUrl: 'https://developers.facebook.com/docs/threads',        setupNote: 'Threads API uses the same Meta app + Instagram-business-account permissions.' },
]

const TONES = ['witty', 'professional', 'casual', 'data-driven'] as const
type Tone = typeof TONES[number]

// ────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────

type QueuedPost = {
  id: string
  body: string
  platforms: Platform[]
  scheduled_at: string | null
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
}

export default function SocialStudioPage() {
  // Composer state
  const [prompt, setPrompt]         = useState('')
  const [body, setBody]             = useState('')
  const [tone, setTone]             = useState<Tone>('witty')
  const [picked, setPicked]         = useState<Platform[]>(['x'])
  const [variants, setVariants]     = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [genErr, setGenErr]         = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [aiNote, setAiNote]         = useState('')

  // Queue state — backed by admin_items category='social_post'
  const [queue, setQueue]   = useState<QueuedPost[]>([])
  const [qLoading, setQLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Real connection state — read from /api/admin/marketing/social/status
  interface ConnState { connected: boolean; handle?: string | null; expires_at?: string | null; scope?: string | null; stale?: boolean; last_error?: string | null }
  type StatusMap = Record<string, ConnState> & { _config?: { x?: { configured: boolean } } }
  const [conns, setConns] = useState<StatusMap>({} as StatusMap)
  const [connBanner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null)

  // Credential-modal state — used by Bluesky and Mastodon which don't
  // run an OAuth dance. `identifier` is the bsky handle or mastodon
  // instance URL; `secret` is the app password or access token.
  // `service` is the optional custom PDS for self-hosted Bluesky.
  interface CredsModal {
    platform: Platform
    identifier: string
    secret: string
    service: string
    busy: boolean
    error: string | null
  }
  const [credsModal, setCredsModal] = useState<CredsModal | null>(null)

  const submitCreds = async () => {
    if (!credsModal) return
    setCredsModal({ ...credsModal, busy: true, error: null })
    const payload =
      credsModal.platform === 'bluesky'
        ? { platform: 'bluesky',  identifier: credsModal.identifier, password:    credsModal.secret, service: credsModal.service || undefined }
        : { platform: 'mastodon', instance:   credsModal.identifier, accessToken: credsModal.secret }
    try {
      const r = await fetch('/api/admin/marketing/social/connect-creds', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) {
        setCredsModal({ ...credsModal, busy: false, error: j.error || 'connect failed' })
        return
      }
      setCredsModal(null)
      setBanner({ ok: true, msg: `${credsModal.platform} connected as ${j.handle}` })
      await loadStatus()
    } catch (e) {
      setCredsModal({ ...credsModal, busy: false, error: e instanceof Error ? e.message : 'network error' })
    }
  }

  const loadStatus = async () => {
    try {
      const r = await fetch('/api/admin/marketing/social/status', { cache: 'no-store' })
      const j = await r.json()
      if (r.ok) setConns(j)
    } catch { /* swallow */ }
  }
  useEffect(() => { loadStatus() }, [])

  // Pick up ?x_connected=1 or ?x_error= from the OAuth callback redirect.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    const xc = u.searchParams.get('x_connected')
    const xe = u.searchParams.get('x_error')
    if (xc) { setBanner({ ok: true,  msg: 'X connected successfully.' }); u.searchParams.delete('x_connected'); window.history.replaceState({}, '', u.toString()) }
    if (xe) { setBanner({ ok: false, msg: `X connect failed: ${xe}` });  u.searchParams.delete('x_error');     window.history.replaceState({}, '', u.toString()) }
  }, [])

  const disconnect = async (platform: string) => {
    if (!confirm(`Disconnect ${platform.toUpperCase()}? Pending scheduled posts to that channel will fail until you reconnect.`)) return
    const r = await fetch('/api/admin/marketing/social/disconnect', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ platform }),
    })
    if (!r.ok) { setBanner({ ok: false, msg: (await r.json()).error || 'disconnect failed' }); return }
    setBanner({ ok: true, msg: `${platform.toUpperCase()} disconnected.` })
    await loadStatus()
  }

  const togglePlatform = (k: Platform) =>
    setPicked(prev => prev.includes(k) ? prev.filter(p => p !== k) : [...prev, k])

  const generate = async () => {
    if (!prompt.trim()) return
    setGenerating(true); setGenErr(''); setVariants([]); setAiNote('')
    try {
      const res = await fetch('/api/admin/marketing/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          tone,
          platform: picked[0] || 'x',
          count: 3,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setVariants(Array.isArray(j.variants) ? j.variants : [])
      if (j.source === 'mock') {
        setAiNote('OPENAI_API_KEY not set on the worker — these are canned variations. Add the key in Cloudflare → termimal-admin → Variables to enable real GPT-4o generation.')
      }
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const useVariant = (v: string) => setBody(v)

  // ─── Queue (backed by admin_items category='social_post') ─────
  const loadQueue = async () => {
    setQLoading(true)
    try {
      const res = await fetch('/api/admin/items?status=all', { cache: 'no-store' })
      const j = await res.json()
      const items = (j.items || []).filter((it: any) => it.category === 'social_post')
      setQueue(items.map((it: any) => ({
        id:           it.id,
        body:         it.description || it.title,
        platforms:    (it.tags || []).filter((t: string) => PLATFORMS.some(p => p.key === t)) as Platform[],
        scheduled_at: it.due_date,
        status:       it.status === 'done' ? 'posted' : it.status === 'in_progress' ? 'scheduled' : 'draft',
      })))
    } finally {
      setQLoading(false)
    }
  }
  useEffect(() => { loadQueue() }, [])

  const enqueue = async (status: 'scheduled' | 'draft') => {
    if (!body.trim() || picked.length === 0) return
    setSaving(true)
    try {
      await fetch('/api/admin/items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       body.slice(0, 120),
          description: body,
          status:      status === 'scheduled' ? 'in_progress' : 'todo',
          priority:    'medium',
          category:    'social_post',
          tags:        picked,
          due_date:    status === 'scheduled' ? (scheduleAt || null) : null,
        }),
      })
      setBody(''); setPrompt(''); setVariants([]); setScheduleAt('')
      await loadQueue()
    } finally {
      setSaving(false)
    }
  }

  const removeQueued = async (id: string) => {
    if (!confirm('Remove this post from the queue?')) return
    setQueue(q => q.filter(p => p.id !== id))
    await fetch(`/api/admin/items/${id}`, { method: 'DELETE' }).catch(() => null)
  }

  // ─── Render ────────────────────────────────────────────────────

  const charLimit = picked.length > 0 ? Math.min(...picked.map(p => PLATFORMS.find(x => x.key === p)!.charLimit)) : 280
  const overLimit = body.length > charLimit

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<Sparkles size={28} />}
        eyebrow="AI · Marketing"
        title="Social Studio"
        subtitle="Compose with AI, pick the channels, schedule the post. One workflow for X, Instagram, LinkedIn, Threads & Facebook."
        metric={{
          label: 'Queued',
          value: queue.filter(q => q.status === 'scheduled').length.toString(),
          secondary: `${queue.length} total in pipeline`,
        }}
      />

      {/* Banner from OAuth callback */}
      {connBanner && (
        <div style={{
          padding:'12px 16px', borderRadius:10, marginBottom:14,
          background: connBanner.ok ? 'rgba(63,185,80,0.12)' : 'rgba(248,113,113,0.12)',
          border: `1px solid ${connBanner.ok ? 'rgba(63,185,80,0.4)' : 'rgba(248,113,113,0.4)'}`,
          color: connBanner.ok ? 'var(--green-val)' : 'var(--red)',
          fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8,
        }}>
          {connBanner.ok ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
          {connBanner.msg}
        </div>
      )}

      {/* ───── Connection status row ───────────────────────────── */}
      <Section
        accent="blue"
        title="Channels"
        description="X is wired up via OAuth 2.0 PKCE — click Connect to start the flow. Other platforms still open their developer portal in a new tab; full OAuth for those is the next sprint."
      >
        <ItemGrid min={240}>
          {PLATFORMS.map(p => {
            const Icon = p.icon
            const conn = conns[p.key]
            const isX = p.key === 'x'
            const xConfigured = isX ? !!conns._config?.x?.configured : false
            const connected = !!conn?.connected
            return (
              <div key={p.key} className="card-premium" style={{
                padding: '18px 20px',
                borderColor: connected ? 'rgba(63,185,80,0.4)' : 'var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: p.bg, color: p.color,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 6px 16px -4px rgba(0,0,0,0.4)',
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap:'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--t1)' }}>{p.label}</span>
                      {connected ? (
                        <span style={{
                          fontSize: 9.5, padding: '2px 8px', borderRadius: 999,
                          background: 'rgba(63,185,80,0.14)', color: 'var(--green-val)',
                          border:'1px solid rgba(63,185,80,0.4)',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>Connected</span>
                      ) : (
                        <span style={{
                          fontSize: 9.5, padding: '2px 8px', borderRadius: 999,
                          background: 'var(--surface2)', color: 'var(--t4)',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>Not connected</span>
                      )}
                      {conn?.stale && (
                        <span style={{
                          fontSize: 9.5, padding: '2px 8px', borderRadius: 999,
                          background: 'rgba(210,153,34,0.14)', color: 'var(--amber)',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>Token expired</span>
                      )}
                    </div>
                    {connected ? (
                      <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 10 }}>
                        <strong style={{ color:'var(--t2)' }}>{conn?.handle}</strong>
                        {conn?.expires_at && <> · token expires {new Date(conn.expires_at).toLocaleString()}</>}
                        {conn?.last_error && <div style={{ color:'var(--red)', marginTop:4 }}>last error: {conn.last_error}</div>}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 10 }}>
                        {p.setupNote}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {connected ? (
                        <>
                          <button onClick={loadStatus} className="btn btn-secondary btn-sm" style={{ minHeight:30, padding:'4px 10px', fontSize:11.5 }}>
                            <RefreshCw size={11}/> Refresh
                          </button>
                          <button onClick={() => disconnect(p.key)} className="btn btn-secondary btn-sm" style={{ minHeight:30, padding:'4px 10px', fontSize:11.5, color:'var(--red)' }}>
                            <Trash2 size={11}/> Disconnect
                          </button>
                        </>
                      ) : p.credentialBased ? (
                        <>
                          <button
                            onClick={() => setCredsModal({ platform: p.key, identifier: '', secret: '', service: '', busy: false, error: null })}
                            className="btn btn-primary btn-sm"
                            style={{ minHeight:30, padding:'4px 10px', fontSize:11.5 }}
                          >
                            <Plus size={11}/> Connect
                          </button>
                          <a href={p.setupUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ minHeight:30, padding:'4px 10px', fontSize:11.5 }}>
                            <ExternalLink size={11}/> Where to find creds
                          </a>
                        </>
                      ) : (
                        <>
                          <a
                            href={isX ? '/api/admin/marketing/social/connect/x' : `/api/admin/marketing/social/connect/${p.key}`}
                            className="btn btn-primary btn-sm"
                            style={{ minHeight:30, padding:'4px 10px', fontSize:11.5 }}
                          >
                            <ExternalLink size={11}/> Connect
                          </a>
                          <a href={p.setupUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ minHeight:30, padding:'4px 10px', fontSize:11.5 }}>
                            <ExternalLink size={11}/> Dev portal
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </ItemGrid>
      </Section>

      {/* ───── Composer ───────────────────────────────────────── */}
      <Section
        accent="purple"
        title="Composer"
        description="Drop a topic or paste a screenshot link, hit Generate, then tweak the variant you like."
      >
        {/* Step 1 — pick platforms */}
        <Field label="1. Where it goes">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLATFORMS.map(p => {
              const on = picked.includes(p.key)
              const Icon = p.icon
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePlatform(p.key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 999,
                    background: on ? 'var(--acc-bg)' : 'var(--surface)',
                    border: `1px solid ${on ? 'var(--acc-border)' : 'var(--border)'}`,
                    color: on ? 'var(--acc)' : 'var(--t3)',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 140ms',
                  }}
                >
                  <Icon size={13} /> {p.label}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Step 2 — AI generation */}
        <div style={{ marginTop: 18 }}>
          <Field label="2. Topic / prompt" hint="One line is enough. Add a chart symbol, a market event, a hot take.">
            <input
              className="input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. NVDA broke above the 200-day MA on volume, here's the setup"
            />
          </Field>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)' }}>Tone</span>
            {TONES.map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                type="button"
                style={{
                  padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  background: tone === t ? 'var(--purple-bg)' : 'var(--surface)',
                  border: `1px solid ${tone === t ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
                  color: tone === t ? 'var(--purple)' : 'var(--t3)',
                  textTransform: 'capitalize',
                }}
              >{t}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={generate}
              disabled={generating || !prompt.trim()}
              className="btn btn-primary btn-sm"
              style={{ minHeight: 36 }}
            >
              {generating ? <><Loader2 size={13} className="spin" /> Generating…</> : <><Wand2 size={13} /> Generate 3 variants</>}
            </button>
          </div>
          {genErr && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 10,
              background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--red)', fontSize: 12.5,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={13} /> {genErr}
            </div>
          )}
          {aiNote && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 8,
              background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.3)',
              color: 'var(--amber)', fontSize: 11.5, lineHeight: 1.5,
            }}>
              {aiNote}
            </div>
          )}

          {variants.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {variants.map((v, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: 'var(--purple-bg)', color: 'var(--purple)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {v}
                  </div>
                  <button onClick={() => useVariant(v)} className="btn btn-secondary btn-sm" style={{ flexShrink: 0, fontSize: 11 }}>
                    Use →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3 — body + schedule */}
        <div style={{ marginTop: 18 }}>
          <Field
            label="3. Final post"
            hint={`Min channel limit: ${charLimit} chars · Used: ${body.length}`}
          >
            <textarea
              className="input"
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Paste a generated variant or write your own…"
              style={{
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55,
                borderColor: overLimit ? 'var(--red)' : undefined,
              }}
            />
          </Field>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Field label="4. When">
            <input
              className="input"
              type="datetime-local"
              value={scheduleAt}
              onChange={e => setScheduleAt(e.target.value)}
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={() => enqueue('draft')}
              disabled={saving || !body.trim()}
              className="btn btn-secondary"
              style={{ flex: 1, minHeight: 38 }}
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => enqueue('scheduled')}
              disabled={saving || !body.trim() || picked.length === 0 || overLimit}
              className="btn btn-primary"
              style={{ flex: 1, minHeight: 38 }}
            >
              <Send size={13} /> {scheduleAt ? 'Schedule' : 'Queue now'}
            </button>
          </div>
        </div>
      </Section>

      {/* ───── Queue / pipeline ────────────────────────────────── */}
      <Section
        accent="acc"
        title={`Queue (${queue.length})`}
        description="Drafts and scheduled posts are stored in admin_items so the team can see them from Open Items too."
      >
        {qLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={20} />}
            title="Empty queue"
            description="Generate a post above and queue it. Drafts are kept here until you schedule or delete them."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queue.map(p => (
              <div key={p.id} className="card-premium" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {p.platforms.map(pf => {
                      const meta = PLATFORMS.find(x => x.key === pf)
                      if (!meta) return null
                      const Icon = meta.icon
                      return (
                        <span key={pf} title={meta.label} style={{
                          width: 26, height: 26, borderRadius: 8,
                          background: meta.bg, color: meta.color,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={12} />
                        </span>
                      )
                    })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                      {p.body}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 11, color: 'var(--t4)' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999,
                        background: p.status === 'posted' ? 'var(--green-bg)' : p.status === 'scheduled' ? 'var(--blue-bg)' : 'var(--surface2)',
                        color:      p.status === 'posted' ? 'var(--green)'    : p.status === 'scheduled' ? 'var(--blue)'    : 'var(--t3)',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      }}>{p.status}</span>
                      {p.scheduled_at && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {new Date(p.scheduled_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeQueued(p.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, color: 'var(--red)', fontSize: 11 }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ───── Credential-paste modal (Bluesky + Mastodon) ─────── */}
      {credsModal && (
        <div
          onClick={() => !credsModal.busy && setCredsModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              Connect {credsModal.platform === 'bluesky' ? 'Bluesky' : 'Mastodon'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 16 }}>
              {credsModal.platform === 'bluesky'
                ? 'Generate an app password at bsky.app → Settings → App Passwords. Paste handle + app password below. We never store your account password.'
                : 'On your Mastodon instance, go to Preferences → Development → New Application. Scope: write:statuses. Paste the instance URL + access token from that page.'}
            </div>

            {/* Inputs — only labels change per platform; the form
                shape (identifier + secret + optional service) is the
                same. */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>
                {credsModal.platform === 'bluesky' ? 'Handle (e.g. yourname.bsky.social)' : 'Instance URL (e.g. https://mastodon.social)'}
              </label>
              <input
                value={credsModal.identifier}
                onChange={(e) => setCredsModal({ ...credsModal, identifier: e.target.value })}
                autoComplete="off"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t1)', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>
                {credsModal.platform === 'bluesky' ? 'App password (NOT your account password)' : 'Access token'}
              </label>
              <input
                value={credsModal.secret}
                onChange={(e) => setCredsModal({ ...credsModal, secret: e.target.value })}
                type="password"
                autoComplete="off"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t1)', outline: 'none' }}
              />
            </div>

            {credsModal.platform === 'bluesky' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>
                  Custom PDS service (optional — defaults to https://bsky.social)
                </label>
                <input
                  value={credsModal.service}
                  onChange={(e) => setCredsModal({ ...credsModal, service: e.target.value })}
                  placeholder="https://bsky.social"
                  autoComplete="off"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t1)', outline: 'none' }}
                />
              </div>
            )}

            {credsModal.error && (
              <div style={{ padding: 10, marginBottom: 12, fontSize: 12, color: 'var(--red)', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 4 }}>
                {credsModal.error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setCredsModal(null)}
                disabled={credsModal.busy}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={submitCreds}
                disabled={credsModal.busy || !credsModal.identifier || !credsModal.secret}
                className="btn btn-primary btn-sm"
                style={{ padding: '6px 14px' }}
              >
                {credsModal.busy ? <><Loader2 size={11} className="spin"/> Verifying…</> : <><CheckCircle2 size={11}/> Connect</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.spin) { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
