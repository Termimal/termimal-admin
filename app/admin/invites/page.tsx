'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Plus, Copy, CheckCircle, Trash2 } from 'lucide-react'
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

export default function InvitesPage() {
  const [rows, setRows]       = useState<Invite[]>([])
  const [draft, setDraft]     = useState<{ email: string; role: 'admin' | 'super_admin' }>({ email: '', role: 'admin' })
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [lastUrl, setLastUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent]   = useState<boolean>(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [userCreated, setUserCreated] = useState<boolean>(false)
  const [copied, setCopied]   = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/invites', { cache: 'no-store' })
    const j = await r.json() as { rows?: Invite[] }
    setRows(j.rows || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    setError(null); setCreating(true); setLastUrl(null); setEmailSent(false); setEmailError(null); setUserCreated(false)
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

  function statusOf(r: Invite): { label: string; badge: string } {
    if (r.accepted_at) return { label: 'accepted', badge: 'badge-green' }
    if (r.revoked_at)  return { label: 'revoked',  badge: 'badge-muted' }
    if (Date.parse(r.expires_at) < Date.now()) return { label: 'expired', badge: 'badge-red' }
    return { label: 'pending', badge: 'badge-amber' }
  }

  const pending = rows.filter(r => !r.accepted_at && !r.revoked_at && Date.parse(r.expires_at) >= Date.now()).length

  return (
    <div>
      <HeroCard
        accent="blue"
        icon={<UserPlus size={28}/>}
        eyebrow="Team"
        title="Admin invites"
        subtitle="Invite team members to the back office. We create their account with a temporary password and email both the credentials and the accept link."
        metric={{ label: 'Pending', value: pending.toString(), secondary: `${rows.length} total` }}
      />

      <Section title="New invite" accent="blue" description="Generate an invite. We'll create the auth account, email a temporary password + the accept link, and you can revoke any time.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Email" required>
              <input className="input" type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} placeholder="teammate@termimal.com" />
            </Field>
            <Field label="Role">
              <select className="input" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as 'admin' | 'super_admin' })}>
                <option value="admin">admin — manage users, content, billing</option>
                <option value="super_admin">super_admin — also manage admins + close accounts</option>
              </select>
            </Field>
          </div>
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--red)', fontSize: 13, fontWeight: 600,
            }}>{error}</div>
          )}
          <div>
            <button className="btn btn-primary btn-sm" disabled={!draft.email || creating} onClick={create}>
              <Plus size={13}/> {creating ? 'Generating…' : 'Generate invite'}
            </button>
          </div>
        </div>
      </Section>

      {lastUrl && (
        <div className="card-premium" style={{
          padding: '20px 24px', marginBottom: 28,
          borderColor: emailSent ? 'var(--green)44' : 'rgba(210,153,34,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: emailSent ? 'var(--green-bg)' : 'rgba(210,153,34,0.15)',
              border: `1px solid ${emailSent ? 'var(--green)33' : 'rgba(210,153,34,0.35)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: emailSent ? 'var(--green)' : '#d29922', flexShrink: 0,
            }}>
              <CheckCircle size={18}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
                {emailSent
                  ? (userCreated
                      ? 'Invite sent — account created. The new admin will receive their temporary password and accept link.'
                      : 'Invite sent — they already had an account, the email contains only the accept link.')
                  : 'Invite row created — but the email failed to send. Copy the link below and share it manually.'}
              </div>
              {emailError && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 6 }}>Email error: {emailError}</div>
              )}
              <div style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastUrl}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => copy(lastUrl)} style={{ flexShrink: 0 }}>
              {copied ? <><CheckCircle size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={<UserPlus size={20}/>} title="No invites yet" description="Generate one above to get started." />
      ) : (
        <Section flush title={`${rows.length} invite${rows.length === 1 ? '' : 's'}`}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-root" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Email','Role','Status','Expires',''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '14px 24px',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--t4)',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const s = statusOf(r)
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 24px', color: 'var(--t1)', fontSize: 13, fontWeight: 600 }}>{r.email}</td>
                      <td style={{ padding: '14px 24px' }}>
                        <span className={`badge ${r.role === 'super_admin' ? 'badge-purple' : 'badge-blue'}`}>{r.role}</span>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span className={`badge ${s.badge}`}>{s.label}</span>
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: 12, color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(r.expires_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        {!r.accepted_at && !r.revoked_at && (
                          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }} onClick={() => revoke(r.id)}>
                            <Trash2 size={12}/> Revoke
                          </button>
                        )}
                      </td>
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
