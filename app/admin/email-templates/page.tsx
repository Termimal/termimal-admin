'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, Save, Code } from 'lucide-react'
import { PageHeader, Section, Tabs, EmptyState, Field, SaveBar } from '@/components/admin/PageChrome'

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
    setActive(key); setDraft(r); setMessage(null)
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
    <div style={{ maxWidth: 1100, paddingBottom: 80 }}>
      <PageHeader
        icon={<Mail size={14} />}
        eyebrow="Transactional Email"
        title="Email templates"
        description="Copy for the standard transactional emails (welcome, password reset, magic link, invoice receipts). Variables are substituted at send-time using {{double_brace}} syntax."
        accent="amber"
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
            <div className="form-grid">
              <Field label="Subject">
                <input className="input" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} />
              </Field>
              <Field label="HTML body" hint="Variables: {{name}} etc. Plain HTML — keep it simple.">
                <textarea className="input" rows={8} value={draft.body_html || ''}
                  onChange={e => setDraft({ ...draft, body_html: e.target.value })}
                  style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }} />
              </Field>
              <Field label="Text fallback" hint="Plain-text body for clients that don't render HTML.">
                <textarea className="input" rows={4} value={draft.body_text || ''}
                  onChange={e => setDraft({ ...draft, body_text: e.target.value })} />
              </Field>
              <Field label="Internal description" hint="Just for the admin panel — when this email is sent.">
                <input className="input" value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              {Object.keys(draft.variables || {}).length > 0 && (
                <div>
                  <div className="label">Available variables</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(draft.variables).map(([k, v]) => (
                      <span key={k} className="chip" title={v}>
                        <Code size={9} />
                        <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{`{{${k}}}`}</span>
                      </span>
                    ))}
                  </div>
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
