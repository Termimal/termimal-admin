'use client'

/**
 * /admin/system — system_settings editor.
 *
 * Curated front for the most-used keys (maintenance mode, signup
 * blocking, default plan, support email) plus a JSON-edit fallback
 * for any other keys the row might hold.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings, RefreshCw, Pause, UserPlus, Mail, Sparkles, Megaphone } from 'lucide-react'
import { HeroCard, Section, SaveBar, Field } from '@/components/admin/PageChrome'

interface KnownSettings {
  maintenance_mode?:    boolean
  maintenance_message?: string
  signup_disabled?:     boolean
  default_plan?:        string
  support_email?:       string
  // Beta-program flags. Mirror the seed defaults in
  // termimal/supabase/migrations/20260515_1200_beta_mode.sql and the
  // reader in termimal/app/api/site-state/route.ts. Flipping
  // `beta_mode` to false hides every visible beta marker on the
  // public site within the 30s edge-cache window.
  beta_mode?:             boolean
  beta_label?:            string
  beta_version?:          string
  beta_show_in_nav?:      boolean
  beta_show_in_footer?:   boolean
  beta_show_banner?:      boolean
  beta_banner_text?:      string
  beta_banner_link?:      string
  beta_feedback_enabled?: boolean
  beta_feedback_url?:     string
}

function ToggleRow({ on, onClick, label, hint }: { on?: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 10,
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <ToggleSwitch on={on} onClick={onClick} />
    </div>
  )
}

function ToggleSwitch({ on, onClick, danger }: { on?: boolean; onClick: () => void; danger?: boolean }) {
  const onColor = danger ? 'var(--red)' : 'var(--green)'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        width: 48, height: 28, borderRadius: 999,
        border: `1px solid ${on ? onColor : 'var(--border)'}`,
        background: on ? `${onColor}22` : 'var(--surface2)',
        cursor: 'pointer', flexShrink: 0,
        transition: 'background 160ms, border-color 160ms',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 22, height: 22, borderRadius: '50%',
        background: on ? onColor : 'var(--t4)',
        transition: 'left 160ms, background 160ms',
      }}/>
    </button>
  )
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
        // Beta defaults match the public-site fail-safes: if the row
        // is missing entirely, treat the site as in-beta and let the
        // operator turn it off explicitly.
        beta_mode:             all.beta_mode === false || all.beta_mode === 'false' ? false : true,
        beta_label:            asString(all.beta_label) || 'Beta',
        beta_version:          asString(all.beta_version),
        beta_show_in_nav:      all.beta_show_in_nav    === false || all.beta_show_in_nav    === 'false' ? false : true,
        beta_show_in_footer:   all.beta_show_in_footer === false || all.beta_show_in_footer === 'false' ? false : true,
        beta_show_banner:      asBool(all.beta_show_banner),
        beta_banner_text:      asString(all.beta_banner_text),
        beta_banner_link:      asString(all.beta_banner_link),
        beta_feedback_enabled: all.beta_feedback_enabled === false || all.beta_feedback_enabled === 'false' ? false : true,
        beta_feedback_url:     asString(all.beta_feedback_url) || '/support?topic=beta-feedback',
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
    <div style={{ paddingBottom: 80 }}>
      <HeroCard
        accent={settings.maintenance_mode ? 'red' : 'amber'}
        icon={<Settings size={28}/>}
        eyebrow="System"
        title="Operational settings"
        subtitle="System-wide toggles and defaults. Changes are read on each request — no redeploy required."
        metric={{
          label: 'Status',
          value: settings.maintenance_mode
            ? 'MAINTENANCE'
            : settings.signup_disabled
              ? 'SIGNUPS OFF'
              : settings.beta_mode
                ? 'BETA'
                : 'GA',
          secondary: loading ? 'loading…' : 'live',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: 38 }} onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      <Section
        title="Maintenance mode"
        description="When enabled, the marketing site and terminal show the maintenance page. Use this for scheduled downtime."
        accent={settings.maintenance_mode ? 'red' : 'green'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px', borderRadius: 14,
            background: settings.maintenance_mode ? 'var(--red-bg)' : 'var(--surface)',
            border: `1px solid ${settings.maintenance_mode ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: settings.maintenance_mode ? 'var(--red-bg)' : 'var(--surface2)',
                border: `1px solid ${settings.maintenance_mode ? 'var(--red)33' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: settings.maintenance_mode ? 'var(--red)' : 'var(--t4)', flexShrink: 0,
              }}>
                <Pause size={18}/>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: settings.maintenance_mode ? 'var(--red)' : 'var(--t1)', marginBottom: 4 }}>
                  {settings.maintenance_mode ? 'Maintenance mode is ON' : 'Maintenance mode is off'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
                  {settings.maintenance_mode
                    ? 'Visitors see the maintenance page. Admin panel + Stripe webhook continue to work.'
                    : 'All routes serve normally.'}
                </div>
              </div>
            </div>
            <ToggleSwitch on={settings.maintenance_mode} onClick={() => update('maintenance_mode', !settings.maintenance_mode)} danger />
          </div>
          <Field label="Maintenance message" hint="Shown to visitors during downtime. Markdown supported.">
            <textarea
              className="input"
              rows={3}
              value={settings.maintenance_message || ''}
              onChange={e => update('maintenance_message', e.target.value)}
              placeholder="We'll be back shortly. Follow @termimal for live updates."
              disabled={!settings.maintenance_mode}
              style={{ resize: 'vertical', lineHeight: 1.55 }}
            />
          </Field>
        </div>
      </Section>

      <Section title="Signups + onboarding" accent="blue" description="Manage who can join the platform.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px', borderRadius: 14,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: settings.signup_disabled ? 'var(--red-bg)' : 'var(--blue-bg)',
                border: `1px solid ${settings.signup_disabled ? 'var(--red)33' : 'var(--blue)33'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: settings.signup_disabled ? 'var(--red)' : 'var(--blue)', flexShrink: 0,
              }}>
                <UserPlus size={18}/>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Block new signups</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
                  Existing users can still log in. /signup returns a friendly error.
                </div>
              </div>
            </div>
            <ToggleSwitch on={settings.signup_disabled} onClick={() => update('signup_disabled', !settings.signup_disabled)} danger />
          </div>
          <Field label="Default plan for new signups" hint="Stripe webhook overrides this on first paid subscription.">
            <select className="input" value={settings.default_plan || 'free'} onChange={e => update('default_plan', e.target.value)}>
              {['free','starter','pro','premium'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Support" accent="green" description="Where customer messages are routed.">
        <Field label="Support email" hint="Where contact-form submissions get cc'd.">
          <div style={{ position: 'relative' }}>
            <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }}/>
            <input
              className="input"
              type="email"
              value={settings.support_email || ''}
              onChange={e => update('support_email', e.target.value)}
              placeholder="support@termimal.com"
              style={{ paddingLeft: 36 }}
            />
          </div>
        </Field>
      </Section>

      {/* ─────────────────────────── Beta program ───────────────────────────
          The master switch (beta_mode) controls every visible beta marker
          on the public site: nav pill, footer pill, top ribbon, signup
          callout, risk-disclaimer callout, pricing callout, and the
          floating feedback FAB. Flipping it off is a clean GA transition
          with no code touch — changes propagate within the 30s edge-cache
          window on /api/site-state.
          ───────────────────────────────────────────────────────────────── */}
      <Section
        title="Beta program"
        description="Master switch for every beta marker shown on the public site. When OFF, the site presents as GA — no pills, no ribbon, no feedback FAB. Granular toggles let you mute individual surfaces without leaving beta."
        accent={settings.beta_mode ? 'blue' : 'green'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px', borderRadius: 14,
            background: settings.beta_mode ? 'var(--blue-bg)' : 'var(--surface)',
            border: `1px solid ${settings.beta_mode ? 'rgba(56,139,253,0.3)' : 'var(--border)'}`,
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: settings.beta_mode ? 'var(--blue-bg)' : 'var(--surface2)',
                border: `1px solid ${settings.beta_mode ? 'var(--blue)33' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: settings.beta_mode ? 'var(--blue)' : 'var(--t4)', flexShrink: 0,
              }}>
                <Sparkles size={18}/>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
                  {settings.beta_mode ? 'Site is in BETA' : 'Site is GA'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
                  {settings.beta_mode
                    ? 'Visitors see the beta pill, feedback FAB, and any callouts you enable below.'
                    : 'All beta markers are hidden. The site reads as a finished product.'}
                </div>
              </div>
            </div>
            <ToggleSwitch on={settings.beta_mode} onClick={() => update('beta_mode', !settings.beta_mode)} />
          </div>

          {/* Sub-controls only matter while beta_mode is ON. Disable
              the row when off so an operator doesn't tweak fields
              that won't render. */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 14,
            opacity: settings.beta_mode ? 1 : 0.5,
            pointerEvents: settings.beta_mode ? 'auto' : 'none',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Pill label" hint='Shown in nav + footer. Default: "Beta".'>
                <input
                  className="input"
                  type="text"
                  value={settings.beta_label || ''}
                  onChange={e => update('beta_label', e.target.value)}
                  placeholder="Beta"
                  maxLength={24}
                />
              </Field>
              <Field label="Version tag (optional)" hint='Appended after a dot, e.g. "Beta · v0.9".'>
                <input
                  className="input"
                  type="text"
                  value={settings.beta_version || ''}
                  onChange={e => update('beta_version', e.target.value)}
                  placeholder="v0.9"
                  maxLength={24}
                />
              </Field>
            </div>

            <Field label="Where to show the pill" hint="The master switch is above. These limit individual surfaces without leaving beta.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ToggleRow
                  on={settings.beta_show_in_nav}
                  onClick={() => update('beta_show_in_nav', !settings.beta_show_in_nav)}
                  label="Show in navbar"
                  hint="Pill next to the Termimal wordmark in the top nav."
                />
                <ToggleRow
                  on={settings.beta_show_in_footer}
                  onClick={() => update('beta_show_in_footer', !settings.beta_show_in_footer)}
                  label="Show in footer"
                  hint="Pill beside the copyright line."
                />
              </div>
            </Field>

            <div style={{
              padding: '14px 18px', borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: settings.beta_show_banner ? 14 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: settings.beta_show_banner ? 'var(--blue-bg)' : 'var(--surface2)',
                    color: settings.beta_show_banner ? 'var(--blue)' : 'var(--t4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Megaphone size={16}/>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Top-of-page ribbon</div>
                    <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>
                      Renders below the SiteBanner. Useful for the first week of public launch.
                    </div>
                  </div>
                </div>
                <ToggleSwitch on={settings.beta_show_banner} onClick={() => update('beta_show_banner', !settings.beta_show_banner)} />
              </div>
              {settings.beta_show_banner && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 6 }}>
                  <Field label="Ribbon text">
                    <input
                      className="input"
                      type="text"
                      value={settings.beta_banner_text || ''}
                      onChange={e => update('beta_banner_text', e.target.value)}
                      placeholder="You're using Termimal Beta — features may change."
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Click-through URL" hint="Optional. Leave blank for a non-clickable ribbon.">
                    <input
                      className="input"
                      type="text"
                      value={settings.beta_banner_link || ''}
                      onChange={e => update('beta_banner_link', e.target.value)}
                      placeholder="/changelog"
                    />
                  </Field>
                </div>
              )}
            </div>

            <div style={{
              padding: '14px 18px', borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: settings.beta_feedback_enabled ? 14 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Floating &quot;Send beta feedback&quot; pill</div>
                  <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>
                    Bottom-left of every page. Auto-hides post-GA.
                  </div>
                </div>
                <ToggleSwitch on={settings.beta_feedback_enabled} onClick={() => update('beta_feedback_enabled', !settings.beta_feedback_enabled)} />
              </div>
              {settings.beta_feedback_enabled && (
                <Field label="Feedback destination" hint='Can be a relative path (e.g. "/support?topic=beta-feedback"), a mailto:, or an external Typeform/Tally URL.'>
                  <input
                    className="input"
                    type="text"
                    value={settings.beta_feedback_url || ''}
                    onChange={e => update('beta_feedback_url', e.target.value)}
                    placeholder="/support?topic=beta-feedback"
                  />
                </Field>
              )}
            </div>
          </div>
        </div>
      </Section>

      {Object.keys(other).length > 0 && (
        <Section
          title="Other system settings"
          description="Raw rows in system_settings not surfaced above. Edit via SQL or extend this page to handle them."
        >
          <pre style={{
            margin: 0, padding: 16,
            fontSize: 12, color: 'var(--t2)',
            background: 'var(--bg2)', borderRadius: 12,
            border: '1px solid var(--border)',
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            overflow: 'auto', maxHeight: 280, lineHeight: 1.55,
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
