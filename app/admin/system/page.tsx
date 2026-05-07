'use client'

/**
 * /admin/system — system_settings editor.
 *
 * Curated front for the most-used keys (maintenance mode, signup
 * blocking, default plan, support email) plus a JSON-edit fallback
 * for any other keys the row might hold.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings, RefreshCw, AlertTriangle, Pause, UserPlus, Mail } from 'lucide-react'
import { PageHeader, Section, SaveBar, Field } from '@/components/admin/PageChrome'

interface KnownSettings {
  maintenance_mode?:    boolean
  maintenance_message?: string
  signup_disabled?:     boolean
  default_plan?:        string
  support_email?:       string
}

export default function SystemPage() {
  const [settings, setSettings] = useState<KnownSettings>({})
  const [original, setOriginal] = useState<KnownSettings>({})
  const [other, setOther]       = useState<Record<string, unknown>>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [message, setMessage]   = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/system', { cache: 'no-store' })
      const j = await r.json() as { settings?: Record<string, unknown>; error?: string }
      if (j.error) {
        setMessage({ type: 'err', text: j.error })
        return
      }
      const all = j.settings || {}
      const known: KnownSettings = {
        maintenance_mode:    asBool(all.maintenance_mode),
        maintenance_message: asString(all.maintenance_message),
        signup_disabled:     asBool(all.signup_disabled),
        default_plan:        asString(all.default_plan) || 'free',
        support_email:       asString(all.support_email),
      }
      const otherKeys: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(all)) {
        if (!(k in known)) otherKeys[k] = v
      }
      setSettings(known); setOriginal(known); setOther(otherKeys)
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(original), [settings, original])

  function update<K extends keyof KnownSettings>(key: K, value: KnownSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
    setMessage(null)
  }

  async function save() {
    setSaving(true); setMessage(null)
    try {
      // Patch each changed key individually so we don't blow away
      // unrelated rows.
      const writes: Array<{ key: string; value: unknown }> = []
      for (const k of Object.keys(settings) as (keyof KnownSettings)[]) {
        if (settings[k] !== original[k]) writes.push({ key: k, value: settings[k] ?? null })
      }
      for (const w of writes) {
        await fetch('/api/admin/system', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(w),
        })
      }
      setOriginal(settings)
      setMessage({ type: 'ok', text: `Saved ${writes.length} setting${writes.length === 1 ? '' : 's'}.` })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, paddingBottom: 80 }}>
      <PageHeader
        icon={<Settings size={14} />}
        eyebrow="System"
        title="Operational settings"
        description="System-wide toggles and defaults. Changes are read by the marketing site + terminal SPA on each request — no redeploy required."
        accent="amber"
        actions={
          <button type="button" className="btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={11} /> Refresh
          </button>
        }
      />

      <Section
        title="Maintenance mode"
        description="When enabled, the marketing site and terminal show the maintenance page. Use this for scheduled downtime."
        accent={settings.maintenance_mode ? 'red' : 'green'}
      >
        <div className="form-grid">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 12, background: settings.maintenance_mode ? 'var(--red-bg)' : 'var(--surface)',
            border: settings.maintenance_mode ? '1px solid rgba(248,113,113,0.3)' : '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Pause size={18} style={{ color: settings.maintenance_mode ? 'var(--red)' : 'var(--t4)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: settings.maintenance_mode ? 'var(--red)' : 'var(--t1)' }}>
                  {settings.maintenance_mode ? 'Maintenance mode is ON' : 'Maintenance mode is off'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  {settings.maintenance_mode
                    ? 'Visitors see the maintenance page. Admin panel + Stripe webhook continue to work.'
                    : 'All routes serve normally.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="toggle"
              data-checked={settings.maintenance_mode}
              onClick={() => update('maintenance_mode', !settings.maintenance_mode)}
              aria-pressed={settings.maintenance_mode}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
          <Field label="Maintenance message" hint="Shown to visitors during downtime. Markdown supported.">
            <textarea
              className="input"
              rows={3}
              value={settings.maintenance_message || ''}
              onChange={e => update('maintenance_message', e.target.value)}
              placeholder="We'll be back shortly. Following us @termimal for live updates."
              disabled={!settings.maintenance_mode}
            />
          </Field>
        </div>
      </Section>

      <Section title="Signups + onboarding" accent="blue">
        <div className="form-grid">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UserPlus size={18} style={{ color: settings.signup_disabled ? 'var(--red)' : 'var(--blue)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Block new signups</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  Existing users can still log in. /signup returns a friendly error.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="toggle"
              data-checked={settings.signup_disabled}
              onClick={() => update('signup_disabled', !settings.signup_disabled)}
              aria-pressed={settings.signup_disabled}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
          <Field label="Default plan for new signups" hint="Stripe webhook overrides this on first paid subscription.">
            <select className="select" value={settings.default_plan || 'free'} onChange={e => update('default_plan', e.target.value)}>
              {['free','starter','pro','premium'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Support" accent="green">
        <div className="form-grid">
          <Field label="Support email" hint="Where contact-form submissions get cc'd.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={14} style={{ color: 'var(--t4)' }} />
              <input
                className="input"
                type="email"
                value={settings.support_email || ''}
                onChange={e => update('support_email', e.target.value)}
                placeholder="support@termimal.com"
              />
            </div>
          </Field>
        </div>
      </Section>

      {Object.keys(other).length > 0 && (
        <Section
          title="Other system settings"
          description="Raw rows in system_settings not surfaced above. Edit via SQL or extend this page to handle them."
          accent="muted"
        >
          <pre style={{
            margin: 0, padding: 14,
            fontSize: 11, color: 'var(--t2)',
            background: 'var(--bg)', borderRadius: 8,
            border: '1px solid var(--border)',
            fontFamily: 'ui-monospace, Menlo, monospace',
            overflow: 'auto', maxHeight: 240,
          }}>{JSON.stringify(other, null, 2)}</pre>
        </Section>
      )}

      <SaveBar
        dirty={dirty}
        saving={saving}
        message={message}
        onSave={save}
        secondary={dirty ? { label: 'Reset', onClick: () => setSettings(original) } : undefined}
      />
    </div>
  )
}

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string')  return v === 'true' || v === '1'
  return false
}
function asString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}
