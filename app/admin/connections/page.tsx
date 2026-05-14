'use client'
export const dynamic = 'force-dynamic'

/**
 * /admin/connections — central console for every API key, env var,
 * social connection, billing key, and AI provider Termimal uses.
 *
 * Tabs:
 *   Secrets    — Cloudflare Worker secrets, set/rotated via CF API
 *                (this tab is live in this PR).
 *   Vars       — wrangler.jsonc non-secret vars (read-only; rotation
 *                requires a PR; landing in a follow-up).
 *   Social     — links to the existing /admin/marketing/social page
 *                so the user has one entry point.
 *   Stripe     — price IDs + customer-portal config (follow-up).
 *   AI         — provider quotas + last-used (follow-up).
 *
 * Every action is admin-auth-gated server-side; the CF API token
 * never reaches the client.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Key, Globe, Send, CreditCard, Bot, Eye, EyeOff, ExternalLink,
  RotateCcw, CheckCircle2, AlertCircle, Loader2, Copy, RefreshCw,
} from 'lucide-react'
import { PageHeader, Section, Field } from '@/components/admin/PageChrome'

type Worker = 'termimal' | 'termimal-admin'

interface SecretRow {
  name:       string
  purpose:    string
  link:       string
  rotateUrl?: string
  configured: boolean
  known:      boolean
}

interface SecretsResp {
  worker:  Worker
  rows:    SecretRow[]
  summary: {
    total_known:      number
    configured_known: number
    missing:          string[]
    extras:           string[]
  }
}

const TABS = [
  { key: 'secrets',  label: 'Secrets',     icon: Key },
  { key: 'vars',     label: 'Vars',        icon: Globe },
  { key: 'social',   label: 'Social',      icon: Send },
  { key: 'stripe',   label: 'Stripe',      icon: CreditCard },
  { key: 'ai',       label: 'AI Providers',icon: Bot },
] as const
type TabKey = typeof TABS[number]['key']

export default function ConnectionsPage() {
  const [tab, setTab] = useState<TabKey>('secrets')

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<Key size={14} />}
        eyebrow="Platform"
        title="Connections"
        description="Manage every API key, env var, social account, Stripe config, and AI provider from one place. Set or rotate secrets without shelling out to wrangler."
        accent="blue"
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="btn-ghost btn-sm"
              style={{
                padding: '8px 14px',
                color:        active ? 'var(--t1)' : 'var(--t3)',
                borderBottom: active ? '2px solid var(--acc)' : '2px solid transparent',
                marginBottom: -1,
                fontWeight:   active ? 600 : 400,
              }}
            >
              <Icon size={13}/> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'secrets' && <SecretsTab />}
      {tab === 'vars'    && <PlaceholderTab title="Vars (read-only)" body="Worker vars from wrangler.jsonc. Rotation requires a PR. Tab content lands in the follow-up PR." />}
      {tab === 'social'  && <SocialTab />}
      {tab === 'stripe'  && <PlaceholderTab title="Stripe" body="Price IDs + customer-portal config. Tab content lands in the follow-up PR." />}
      {tab === 'ai'      && <PlaceholderTab title="AI Providers" body="Quotas + last-used per provider. Tab content lands in the follow-up PR." />}
    </div>
  )
}

/* ─── SECRETS TAB ──────────────────────────────────────────────── */

function SecretsTab() {
  const [worker, setWorker] = useState<Worker>('termimal')
  const [data, setData] = useState<SecretsResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ name: string; value: string; show: boolean; busy: boolean; err: string | null } | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/connections/secrets?worker=${worker}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) { setError(j.error || `HTTP ${r.status}`); return }
      setData(j as SecretsResp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network error')
    } finally {
      setLoading(false)
    }
  }, [worker])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!editing) return
    setEditing({ ...editing, busy: true, err: null })
    try {
      const r = await fetch('/api/admin/connections/secrets', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ worker, name: editing.name, value: editing.value }),
      })
      const j = await r.json()
      if (!r.ok) {
        setEditing({ ...editing, busy: false, err: j.error || 'failed' })
        return
      }
      setEditing(null)
      setToast({ ok: true, msg: `${editing.name} rotated on ${worker}` })
      load()
      setTimeout(() => setToast(null), 4000)
    } catch (e) {
      setEditing({ ...editing, busy: false, err: e instanceof Error ? e.message : 'network error' })
    }
  }

  return (
    <>
      {toast && (
        <div style={{
          padding: '10px 14px', marginBottom: 14,
          background: toast.ok ? 'rgba(63,185,80,0.10)' : 'rgba(248,81,73,0.10)',
          color: toast.ok ? 'var(--green-val)' : 'var(--red)',
          border: `1px solid ${toast.ok ? 'rgba(63,185,80,0.4)' : 'rgba(248,81,73,0.4)'}`,
          borderRadius: 4, fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.ok ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
          {toast.msg}
        </div>
      )}

      <Section accent="blue">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <Field label="Worker">
            <select className="select" value={worker} onChange={(e) => setWorker(e.target.value as Worker)}>
              <option value="termimal">termimal — public site (termimal.com)</option>
              <option value="termimal-admin">termimal-admin — back office (bo.termimal.com)</option>
            </select>
          </Field>
          <button className="btn-secondary btn-sm" onClick={load} disabled={loading} style={{ alignSelf: 'flex-end' }}>
            <RefreshCw size={11}/> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {error && <div className="msg-err" style={{ marginBottom: 12 }}>{error}</div>}

        {data && (
          <>
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>
              <span><strong style={{ color: 'var(--t1)' }}>{data.summary.configured_known}</strong> / {data.summary.total_known} configured</span>
              {data.summary.missing.length > 0 && (
                <span style={{ color: 'var(--amber)' }}>{data.summary.missing.length} missing</span>
              )}
              {data.summary.extras.length > 0 && (
                <span style={{ color: 'var(--t4)' }}>{data.summary.extras.length} extra (not in manifest)</span>
              )}
            </div>

            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table-root">
                <thead>
                  <tr>
                    <th>Secret</th>
                    <th>Purpose</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 200 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(s => (
                    <tr key={s.name}>
                      <td>
                        <div style={{ fontFamily: "'SF Mono', Menlo, monospace", fontSize: 12, color: 'var(--t1)' }}>{s.name}</div>
                        {!s.known && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>not in manifest</div>}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--t3)' }}>{s.purpose}</td>
                      <td>
                        {s.configured
                          ? <span className="chip chip-green" style={{ fontSize: 10 }}>set</span>
                          : <span className="chip chip-amber" style={{ fontSize: 10 }}>missing</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => setEditing({ name: s.name, value: '', show: false, busy: false, err: null })}
                            style={{ fontSize: 11 }}
                          >
                            <RotateCcw size={11}/> {s.configured ? 'Rotate' : 'Set'}
                          </button>
                          {s.link && (
                            <a href={s.link} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ fontSize: 11 }}>
                              <ExternalLink size={11}/> Source
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* Edit modal */}
      {editing && (
        <div
          onClick={() => !editing.busy && setEditing(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: 24,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              Set <span style={{ fontFamily: "'SF Mono', Menlo, monospace" }}>{editing.name}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 16 }}>
              Pasted value goes straight to Cloudflare via API. The current Worker keeps running — secrets become available within a few seconds. Never echo your password here; only the API key/token itself.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>New value</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={editing.show ? 'text' : 'password'}
                  value={editing.value}
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  autoComplete="off"
                  style={{ width: '100%', padding: '8px 38px 8px 10px', fontSize: 13, fontFamily: "'SF Mono', Menlo, monospace", background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t1)', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, show: !editing.show })}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--t3)', padding: 4, cursor: 'pointer' }}
                  aria-label={editing.show ? 'Hide' : 'Show'}
                >
                  {editing.show ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>
                {editing.value.length} chars
              </div>
            </div>

            {editing.err && (
              <div style={{ padding: 10, marginBottom: 12, fontSize: 12, color: 'var(--red)', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 4 }}>
                {editing.err}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEditing(null)} disabled={editing.busy} className="btn-secondary btn-sm" style={{ padding: '6px 14px' }}>Cancel</button>
              <button onClick={submit} disabled={editing.busy || editing.value.length < 4} className="btn-primary btn-sm" style={{ padding: '6px 14px' }}>
                {editing.busy ? <><Loader2 size={11} className="spin"/> Setting…</> : <><CheckCircle2 size={11}/> Set on {worker}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.spin) { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

/* ─── SOCIAL TAB (shortcut to /admin/marketing/social) ─────────── */

function SocialTab() {
  return (
    <Section accent="purple">
      <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 14 }}>
        Social connections (Bluesky, Mastodon via credentials; X / LinkedIn / Meta via OAuth) live on the dedicated{' '}
        <strong style={{ color: 'var(--t1)' }}>Social Studio</strong> page. Connect, disconnect, compose, and schedule from there.
      </div>
      <a href="/admin/marketing/social" className="btn-primary btn-sm">
        Open Social Studio <ExternalLink size={11}/>
      </a>
    </Section>
  )
}

/* ─── PLACEHOLDER TAB (for follow-up phases) ────────────────────── */

function PlaceholderTab({ title, body }: { title: string; body: string }) {
  return (
    <Section accent="muted" title={title}>
      <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
        {body}
      </div>
    </Section>
  )
}
