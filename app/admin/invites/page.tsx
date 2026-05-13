'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Plus, Copy, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { PageHeader, Section, EmptyState, Field } from '@/components/admin/PageChrome'

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

export default function InvitesPage() {
  const [rows, setRows]       = useState<Invite[]>([])
  const [draft, setDraft]     = useState<{ email: string; role: 'admin' | 'super_admin' }>({ email: '', role: 'admin' })
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [lastUrl, setLastUrl] = useState<string | null>(null)
  // Track email delivery state separately from the URL — when Resend
  // succeeds the admin barely needs the URL, when it fails they very
  // much do.
  const [emailSent, setEmailSent]     = useState<boolean>(false)
  const [emailError, setEmailError]   = useState<string | null>(null)
  const [userCreated, setUserCreated] = useState<boolean>(false)
  const [copied, setCopied]   = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/invites', { cache: 'no-store' })
    const j = await r.json() as { rows?: Invite[] }
    setRows(j.rows || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    setError(null); setCreating(true); setLastUrl(null)
    setEmailSent(false); setEmailError(null); setUserCreated(false)
    const r = await fetch('/api/admin/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
    const j = await r.json() as {
      invite_url?: string; error?: string;
      email_sent?: boolean; email_error?: string | null; user_created?: boolean
    }
    if (j.invite_url) {
      setLastUrl(j.invite_url)
      setEmailSent(!!j.email_sent)
      setEmailError(j.email_error || null)
      setUserCreated(!!j.user_created)
      setDraft({ email: '', role: 'admin' })
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

  function statusOf(r: Invite): { label: string; chip: string } {
    if (r.accepted_at) return { label: 'accepted', chip: 'chip chip-green' }
    if (r.revoked_at)  return { label: 'revoked',  chip: 'chip' }
    if (Date.parse(r.expires_at) < Date.now()) return { label: 'expired', chip: 'chip chip-red' }
    return { label: 'pending', chip: 'chip chip-amber' }
  }

  // Headline that adapts to whether we just created the auth user, or
  // whether the user already existed, or the email failed to send.
  const successHeadline = !emailSent
    ? 'Invite row created — but the email failed to send. Copy the link below and share it manually.'
    : userCreated
      ? 'Invite sent — account created. The new admin will receive their temporary password and accept link by email.'
      : 'Invite sent — they already had an account, the email contains only the accept link.'

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        icon={<UserPlus size={14} />}
        eyebrow="Team"
        title="Admin invites"
        description="Invite team members to the back office. We create their account with a temporary password and email both the credentials and the accept link."
        accent="blue"
      />

      <Section title="New invite" accent="blue">
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <Field label="Email"><input className="input" type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} placeholder="teammate@termimal.com" /></Field>
            <Field label="Role">
              <select className="select" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as 'admin' | 'super_admin' })}>
                <option value="admin">admin — manage users, content, billing</option>
                <option value="super_admin">super_admin — also manage admins + close accounts</option>
              </select>
            </Field>
          </div>
          {error && <div className="msg-err">✗ {error}</div>}
          <button className="btn-primary btn-sm" disabled={!draft.email || creating} onClick={create} style={{ alignSelf: 'flex-start' }}>
            <Plus size={11} /> {creating ? 'Generating…' : 'Generate invite'}
          </button>
        </div>
      </Section>

      {lastUrl && (
        <Section accent={emailSent ? 'green' : 'amber'}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {emailSent
              ? <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
              : <AlertTriangle size={14} style={{ color: '#d29922', flexShrink: 0, marginTop: 2 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>{successHeadline}</div>
              {emailError && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 6 }}>Email error: {emailError}</div>
              )}
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastUrl}</div>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => copy(lastUrl)}>{copied ? <><CheckCircle size={11}/> Copied</> : <><Copy size={11}/> Copy</>}</button>
          </div>
        </Section>
      )}

      {rows.length === 0
        ? <EmptyState icon={<UserPlus size={20}/>} title="No invites yet" />
        : (
          <Section flush title={`${rows.length} invite${rows.length === 1 ? '' : 's'}`}>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table-root">
                <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th></th></tr></thead>
                <tbody>
                  {rows.map(r => {
                    const s = statusOf(r)
                    return (
                      <tr key={r.id}>
                        <td>{r.email}</td>
                        <td><span className={r.role === 'super_admin' ? 'chip chip-purple' : 'chip chip-blue'}>{r.role}</span></td>
                        <td><span className={s.chip}>{s.label}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--t4)' }}>{new Date(r.expires_at).toLocaleDateString()}</td>
                        <td>{!r.accepted_at && !r.revoked_at && (
                          <button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => revoke(r.id)}><Trash2 size={11}/> Revoke</button>
                        )}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}
    </div>
  )
}
