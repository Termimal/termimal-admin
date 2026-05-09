'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, Code, Eye, Send } from 'lucide-react'
import { HeroCard, Section, Tabs, EmptyState, Field, SaveBar } from '@/components/admin/PageChrome'

interface Template {
  id: string
  key: string
  subject: string
  body_html: string | null
  body_text: string | null
  description: string | null
  variables: Record<string, string>
  updated_at: string
}

export default function EmailTemplatesPage() {
  const [rows, setRows]       = useState<Template[]>([])
  const [active, setActive]   = useState<string | null>(null)
  const [draft, setDraft]     = useState<Template | null>(null)
  const [saving, setSaving]   = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [previewVars, setPreviewVars] = useState('{}')
  const [preview, setPreview]         = useState<{ subject: string; html: string; text: string; missing: string[]; unused: string[] } | null>(null)
  const [previewing, setPreviewing]   = useState(false)
  const [testTo, setTestTo]           = useState('')
  const [sending, setSending]         = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/email-templates', { cache: 'no-store' })
    const j = await r.json() as { rows?: Template[] }
    setRows(j.rows || [])
    if (!active && j.rows && j.rows.length > 0) {
      setActive(j.rows[0].key)
      setDraft(j.rows[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  const original = useMemo(() => rows.find(r => r.key === active) ?? null, [rows, active])
  const dirty    = useMemo(() => !!(original && draft && JSON.stringify(original) !== JSON.stringify(draft)), [original, draft])

  function selectTemplate(key: string) {
    const r = rows.find(x => x.key === key)
    if (!r) return
    setActive(key); setDraft(r); setMessage(null); setPreview(null)
    const seed = Object.fromEntries(Object.keys(r.variables || {}).map(k => [k, `<${k}>`]))
    setPreviewVars(JSON.stringify(seed, null, 2))
  }

  async function runPreview() {
    if (!draft) return
    let vars: Record<string, unknown> = {}
    try { vars = JSON.parse(previewVars || '{}') }
    catch { setMessage({ type: 'err', text: 'Variables must be valid JSON' }); return }
    setPreviewing(true)
    const r = await fetch('/api/admin/email-templates/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: draft.key, variables: vars }),
    })
    const j = await r.json()
    setPreviewing(false)
    if (!r.ok) { setMessage({ type: 'err', text: j.error || 'Render failed' }); return }
    setPreview({ subject: j.subject, html: j.html, text: j.text, missing: j.missing || [], unused: j.unused || [] })
    setMessage(null)
  }

  async function sendTest() {
    if (!draft || !testTo.trim()) return
    let vars: Record<string, unknown> = {}
    try { vars = JSON.parse(previewVars || '{}') }
    catch { setMessage({ type: 'err', text: 'Variables must be valid JSON' }); return }
    setSending(true)
    const r = await fetch('/api/admin/email-templates/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: draft.key, to: testTo.trim(), variables: vars }),
    })
    const j = await r.json()
    setSending(false)
    if (r.ok) setMessage({ type: 'ok', text: `Test email queued (${j.provider}, id ${j.id})` })
    else setMessage({ type: 'err', text: j.error || 'Send failed' })
  }

  async function save() {
    if (!draft) return
    setSaving(true); setMessage(null)
    const r = await fetch('/api/admin/email-templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draft.id, patch: {
        subject:     draft.subject,
        body_html:   draft.body_html,
        body_text:   draft.body_text,
        description: draft.description,
      }}),
    })
    const j = await r.json()
    if (j.row) {
      setRows(prev => prev.map(x => x.id === j.row.id ? j.row : x))
      setMessage({ type: 'ok', text: 'Saved.' })
    } else if (j.error) {
      setMessage({ type: 'err', text: j.error })
    }
    setSaving(false)
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <HeroCard
        accent="amber"
        icon={<Mail size={28} />}
        eyebrow="Transactional email"
        title="Email templates"
        subtitle="Copy for the standard transactional emails (welcome, password reset, magic link, invoice receipts). Variables are substituted at send-time using {{double_brace}} syntax."
        metric={{ label: 'Templates', value: rows.length.toString() }}
      />

      <Tabs
        items={rows.map(r => ({ key: r.key, label: r.key.replace(/_/g, ' ') }))}
        active={active || ''}
        onChange={selectTemplate}
        accent="amber"
      />

      {draft ? (
        <>
          <Section
            title={draft.key.replace(/_/g, ' ')}
            description={draft.description || undefined}
            accent="amber"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Subject">
                <input className="input" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} />
              </Field>
              <Field label="HTML body" hint="Variables: {{name}} etc. Plain HTML — keep it simple.">
                <textarea className="input" rows={10} value={draft.body_html || ''}
                  onChange={e => setDraft({ ...draft, body_html: e.target.value })}
                  style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.55 }} />
              </Field>
              <Field label="Text fallback" hint="Plain-text body for clients that don't render HTML.">
                <textarea className="input" rows={5} value={draft.body_text || ''}
                  onChange={e => setDraft({ ...draft, body_text: e.target.value })}
                  style={{ resize: 'vertical', lineHeight: 1.55 }} />
              </Field>
              <Field label="Internal description" hint="Just for the admin panel — when this email is sent.">
                <input className="input" value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              {Object.keys(draft.variables || {}).length > 0 && (
                <Field label="Available variables">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(draft.variables).map(([k, v]) => (
                      <span key={k} title={v} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px', borderRadius: 999,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        fontSize: 11, color: 'var(--t2)',
                      }}>
                        <Code size={11} />
                        <span style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{`{{${k}}}`}</span>
                      </span>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </Section>

          <Section
            title="Preview & test send"
            description="Render the template with sample variables, then optionally send a test email."
            accent="blue"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Variables (JSON)" hint="Edit values before rendering — keys not present in the template show as 'unused'.">
                <textarea
                  className="input"
                  rows={5}
                  value={previewVars}
                  onChange={e => setPreviewVars(e.target.value)}
                  style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.55 }}
                />
              </Field>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={runPreview} disabled={previewing} className="btn btn-secondary btn-sm">
                  <Eye size={13} /> {previewing ? 'Rendering…' : 'Render preview'}
                </button>
                <input
                  className="input"
                  type="email"
                  placeholder="test-recipient@yourcompany.com"
                  value={testTo}
                  onChange={e => setTestTo(e.target.value)}
                  style={{ flex: 1, minWidth: 240 }}
                />
                <button type="button" onClick={sendTest} disabled={sending || !testTo.trim()} className="btn btn-primary btn-sm">
                  <Send size={13} /> {sending ? 'Sending…' : 'Send test'}
                </button>
              </div>

              {preview && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Rendered subject</div>
                    <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 600, color: 'var(--t1)' }}>{preview.subject}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>HTML preview</div>
                    {/*
                      Render the preview inside a sandboxed iframe with
                      `srcDoc` so any <script> in the template can't
                      reach the admin page's DOM, cookies, or APIs.
                      The previous `dangerouslySetInnerHTML` was a stored
                      XSS sink — a low-trust template editor saving a
                      malicious template would phish other admins via
                      the preview.

                      `sandbox=""` (no allow-* tokens) blocks scripts,
                      forms, top-level navigation, and same-origin
                      access — content can render visually but can't
                      execute code or exfiltrate state.
                    */}
                    <iframe
                      title="HTML preview"
                      sandbox=""
                      srcDoc={preview.html}
                      style={{ width: '100%', padding: 0, background: '#fff', color: '#111', border: '1px solid var(--border)', borderRadius: 12, minHeight: 240, fontSize: 13, lineHeight: 1.5 }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Text fallback</div>
                    <pre style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, minHeight: 140, fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{preview.text}</pre>
                  </div>
                  {(preview.missing.length > 0 || preview.unused.length > 0) && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
                      {preview.missing.length > 0 && (
                        <div style={{ color: 'var(--amber)' }}>
                          <strong>Missing:</strong> {preview.missing.map(v => <code key={v} style={{ marginLeft: 6, padding: '2px 6px', background: 'var(--amber-bg)', borderRadius: 4 }}>{`{{${v}}}`}</code>)}
                        </div>
                      )}
                      {preview.unused.length > 0 && (
                        <div style={{ color: 'var(--t4)' }}>
                          <strong>Unused vars:</strong> {preview.unused.map(v => <code key={v} style={{ marginLeft: 6 }}>{v}</code>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          <SaveBar dirty={dirty} saving={saving} message={message} onSave={save}
                   secondary={dirty && original ? { label: 'Reset', onClick: () => setDraft(original) } : undefined} />
        </>
      ) : (
        <EmptyState icon={<Mail size={20}/>} title="No templates" description="Templates are seeded automatically. If this is empty, run the migration." />
      )}
    </div>
  )
}
