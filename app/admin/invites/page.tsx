'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Plus, Copy, CheckCircle, AlertTriangle, Trash2, Mail, Shield, Clock } from 'lucide-react'
import { HeroCard, Section, EmptyState, Field } from '@/components/admin/PageChrome'

interface Invite {
  id: string
  email: string
  role: 'admin' | 'super_admin'
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}

function fmtAge(iso: string): string {
  const ms = Date.parse(iso) - Date.now()
  if (!Number.isFinite(ms)) return ''
  const s = Math.floor(Math.abs(ms) / 1000)
  const sign = ms < 0 ? 'ago' : 'left'
  if (s < 60)    return `1m ${sign}`
  if (s < 3600)  return `${Math.floor(s / 60)}m ${sign}`
  if (s < 86400) return `${Math.floor(s / 3600)}h ${sign}`
  return `${Math.floor(s / 86400)}d ${sign}`
}

export default function InvitesPage() {
  const [rows, setRows]       = useState<Invite[]>([])
  const [draft, setDraft]     = useState<{ email: string; role: 'admin' | 'super_admin'; password: string }>({ email: '', role: 'admin', password: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [lastUrl, setLastUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent]       = useState<boolean>(false)
  const [emailError, setEmailError]     = useState<string | null>(null)
  const [userCreated, setUserCreated]   = useState<boolean>(false)
  const [passwordReset, setPasswordReset] = useState<boolean>(false)
  const [copied, setCopied]   = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/invites', { cache: 'no-store' })
    const j = await r.json() as { rows?: Invite[] }
    setRows(j.rows || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    setError(null); setCreating(true); setLastUrl(null)
    setEmailSent(false); setEmailError(null); setUserCreated(false); setPasswordReset(false)
    const payload = {
      email: draft.email.trim(),
      role:  draft.role,
      ...(draft.password.trim() ? { password: draft.password.trim() } : {}),
    }
    const r = await fetch('/api/admin/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await r.json() as {
      invite_url?: string; error?: string;
      email_sent?: boolean; email_error?: string | null;
      user_created?: boolean; password_reset?: boolean;
    }
    if (j.invite_url) {
      setLastUrl(j.invite_url)
      setEmailSent(!!j.email_sent)
      setEmailError(j.email_error || null)
      setUserCreated(!!j.user_created)
      setPasswordReset(!!j.password_reset)
      setDraft({ email: '', role: 'admin', password: '' })
      load()
    } else if (j.error) {
      setError(j.error)
    }
    setCreating(false)
  }
  async function revoke(id: string) {
    if (!confirm('Revoke this invite?')) return
    await fetch(`/api/admin/invites?id=${id}`, { method: 'DELETE' })
    load()
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  function statusOf(r: Invite): { label: string; tone: 'green' | 'red' | 'amber' | 'muted' } {
    if (r.accepted_at) return { label: 'Accepted', tone: 'green' }
    if (r.revoked_at)  return { label: 'Revoked',  tone: 'muted' }
    if (Date.parse(r.expires_at) < Date.now()) return { label: 'Expired', tone: 'red' }
    return { label: 'Pending', tone: 'amber' }
  }

  const STATUS_STYLE: Record<'green' | 'red' | 'amber' | 'muted', { fg: string; bg: string; border: string }> = {
    green:  { fg: 'var(--green)', bg: 'var(--green-bg)', border: 'rgba(52,211,153,0.3)' },
    red:    { fg: 'var(--red)',   bg: 'var(--red-bg)',   border: 'rgba(248,113,113,0.3)' },
    amber:  { fg: 'var(--amber)', bg: 'var(--amber-bg)', border: 'rgba(251,191,36,0.3)' },
    muted:  { fg: 'var(--t4)',    bg: 'var(--surface2)', border: 'var(--border)' },
  }

  const pending  = rows.filter(r => !r.accepted_at && !r.revoked_at && Date.parse(r.expires_at) >= Date.now()).length
  const accepted = rows.filter(r => r.accepted_at).length

  const successHeadline = !emailSent
    ? 'Invite row created — but the email failed to send. Copy the link below and share it manually.'
    : passwordReset
      ? 'Invite sent — existing account had its password reset to the one you chose.'
      : userCreated
        ? 'Invite sent — account created. The new admin will receive credentials + accept link by email.'
        : 'Invite sent — they already had an account; the email contains only the accept link.'

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<UserPlus size={28}/>}
        eyebrow="Team"
        title="Admin invites"
        subtitle="Invite team members to the back office. We create their account with a temporary password and email both the credentials and the accept link. Existing accounts get the accept link only."
        metric={{
          label: 'Pending',
          value: pending.toLocaleString(),
          secondary: `${accepted} accepted · ${rows.length} total`,
        }}
      />

      {/* New invite form — generous spacing, big buttons */}
      <Section accent="blue" title="New invite" description="Create the account, generate a one-shot accept link, and email them.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Email">
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="teammate@termimal.com"
                autoComplete="off"
              />
            </Field>
            <Field label="Role">
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as 'admin' | 'super_admin' })}
              >
                <option value="admin">admin — manage users, content, billing</option>
                <option value="super_admin">super_admin — also manage admins + permissions</option>
              </select>
            </Field>
          </div>
          <Field label="Password (optional)">
            <input
              type="text"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              placeholder="Leave blank to auto-generate a secure password"
              autoComplete="off"
            />
            <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 8, lineHeight: 1.5 }}>
              If you type a password here (≥10 chars), we&rsquo;ll use it as the new admin&rsquo;s login
              password and include it in the email. If the address already has an account, the
              password will be <strong style={{ color: 'var(--t3)' }}>reset</strong> to what you type.
              Leave blank and we&rsquo;ll generate a strong one and email it.
            </div>
          </Field>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--red)', fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={14}/> {error}
            </div>
          )}

          <div>
            <button
              className="btn btn-primary btn-sm"
              disabled={!draft.email || creating}
              onClick={create}
              style={{ minHeight: 38, padding: '0 18px' }}
            >
              <Plus size={13}/> {creating ? 'Generating…' : 'Generate invite'}
            </button>
          </div>
        </div>
      </Section>

      {/* Success/failure card for the most recent invite */}
      {lastUrl && (
        <div
          className="card-premium"
          style={{
            padding: '18px 22px', marginBottom: 24,
            borderColor: emailSent ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)',
            background: emailSent ? 'var(--green-bg)' : 'var(--amber-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {emailSent
              ? <CheckCircle size={20} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }}/>
              : <AlertTriangle size={20} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }}/>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
                {successHeadline}
              </div>
              {emailError && (
                <div style={{ fontSize: 11.5, color: 'var(--red)', marginBottom: 8 }}>
                  Email error: {emailError}
                </div>
              )}
              <div
                style={{
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 11, color: 'var(--t3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                {lastUrl}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copy(lastUrl)}
              style={{ flexShrink: 0, minHeight: 34 }}
            >
              {copied ? <><CheckCircle size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
            </button>
          </div>
        </div>
      )}

      {/* Existing invites list */}
      {rows.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={20}/>}
          title="No invites yet"
          description="Add a teammate above to send their first invite."
        />
      ) : (
        <Section
          accent="blue"
          title={`${rows.length} invite${rows.length === 1 ? '' : 's'}`}
          description="Click revoke to disable a pending invite. Accepted invites are kept for audit."
          flush
        >
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {rows.map(r => {
              const s = statusOf(r)
              const tone = STATUS_STYLE[s.tone]
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 2fr) 1fr 1fr 0.9fr auto',
                    gap: 14, alignItems: 'center',
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: 'var(--blue-bg)', color: 'var(--blue)',
                      border: '1px solid rgba(96,165,250,0.3)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Mail size={14}/>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.email}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                        invited {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Role chip */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 999,
                      background: r.role === 'super_admin' ? 'var(--purple-bg)' : 'var(--blue-bg)',
                      border: `1px solid ${r.role === 'super_admin' ? 'rgba(167,139,250,0.3)' : 'rgba(96,165,250,0.3)'}`,
                      color:   r.role === 'super_admin' ? 'var(--purple)'        : 'var(--blue)',
                      fontSize: 11, fontWeight: 700,
                      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                    }}>
                      <Shield size={10}/> {r.role}
                    </span>
                  </div>

                  {/* Status chip */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 999,
                      background: tone.bg, color: tone.fg,
                      border: `1px solid ${tone.border}`,
                      fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {s.label}
                    </span>
                  </div>

                  {/* Expires */}
                  <div style={{ fontSize: 12, color: 'var(--t3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={11} style={{ color: 'var(--t4)' }}/>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(r.expires_at).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--t4)' }}>· {fmtAge(r.expires_at)}</span>
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {!r.accepted_at && !r.revoked_at && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => revoke(r.id)}
                        style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.3)', minHeight: 30 }}
                      >
                        <Trash2 size={11}/> Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
