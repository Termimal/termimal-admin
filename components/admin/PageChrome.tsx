/**
 * Shared page-chrome primitives for the admin panel.
 *
 * Every admin page used to inline its own header markup, which is why
 * the dashboard and the SEO page looked like they came from different
 * apps. These components establish a single visual contract:
 *
 *   <PageHeader
 *     icon={<ShieldAlert size={16}/>}
 *     eyebrow="Anomaly Detection"
 *     title="Live alerts"
 *     description="…"
 *     accent="red"
 *     actions={<button>…</button>}
 *   />
 *
 *   <Section title="…" description="…" accent="acc">
 *     …form fields, lists, whatever
 *   </Section>
 *
 *   <SaveBar dirty={dirty} saving={saving} message={msg} onSave={…} />
 *
 *   <EmptyState icon={<Search/>} title="Nothing here" description="…">
 *     <button>…</button>
 *   </EmptyState>
 *
 *   <Tabs items={[{key,label,icon,count}]} active={tab} onChange={setTab} />
 *
 * All accent colours map back to CSS variables in globals.css so the
 * light/dark themes stay consistent.
 */
'use client'

import type { ReactNode } from 'react'

/* ── Accent palette ────────────────────────────────────────────── */

export type Accent = 'acc' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'muted'

interface AccentColors { fg: string; bg: string; border: string }

export function accentColors(accent: Accent = 'acc'): AccentColors {
  switch (accent) {
    case 'acc':    return { fg: 'var(--acc)',    bg: 'var(--acc-bg)',    border: 'var(--acc-border)' }
    case 'blue':   return { fg: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'rgba(96,165,250,0.22)' }
    case 'green':  return { fg: 'var(--green)',  bg: 'var(--green-bg)',  border: 'rgba(52,211,153,0.22)' }
    case 'amber':  return { fg: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'rgba(251,191,36,0.22)' }
    case 'red':    return { fg: 'var(--red)',    bg: 'var(--red-bg)',    border: 'rgba(248,113,113,0.22)' }
    case 'purple': return { fg: 'var(--purple)', bg: 'var(--purple-bg)', border: 'rgba(167,139,250,0.22)' }
    case 'muted':
    default:       return { fg: 'var(--t3)',     bg: 'var(--surface)',   border: 'var(--border)' }
  }
}

/* ── PageHeader ────────────────────────────────────────────────── */

interface PageHeaderProps {
  /** Lucide icon node, ~16 px. */
  icon?: ReactNode
  /** Small caps eyebrow above the title (e.g. "Anomaly Detection"). */
  eyebrow?: string
  /** Page title. */
  title: string
  /** One-line description. */
  description?: ReactNode
  /** Right-aligned action area (buttons, refresh, etc.). */
  actions?: ReactNode
  /** Drives eyebrow + icon colour. Defaults to the brand accent. */
  accent?: Accent
}

export function PageHeader({
  icon, eyebrow, title, description, actions, accent = 'acc',
}: PageHeaderProps) {
  const c = accentColors(accent)
  return (
    <header
      className="hero-panel"
      style={{
        marginBottom: 32,
        padding: '32px 36px',
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {(icon || eyebrow) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {icon && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 10,
                  background: c.bg, border: `1px solid ${c.border}`,
                  color: c.fg,
                  boxShadow: `0 0 24px -8px ${c.fg}`,
                }}>{icon}</span>
              )}
              {eyebrow && (
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: c.fg,
                }}>{eyebrow}</span>
              )}
            </div>
          )}
          <h1 style={{
            fontSize: 30, lineHeight: 1.1, fontWeight: 800,
            color: 'var(--t1)', letterSpacing: '-0.025em', marginBottom: description ? 12 : 0,
          }}>{title}</h1>
          {description && (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--t3)', maxWidth: 720 }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

/* ── Section ──────────────────────────────────────────────────── */

interface SectionProps {
  title?: ReactNode
  description?: ReactNode
  /** Optional right-aligned area in the section header. */
  actions?: ReactNode
  /** Accent stripe along the top of the card. Default no stripe. */
  accent?: Accent
  /** When true, the card has no internal padding (you control it). */
  flush?: boolean
  children: ReactNode
}

export function Section({
  title, description, actions, accent, flush, children,
}: SectionProps) {
  const c = accent ? accentColors(accent) : null
  return (
    <section style={{
      background: 'linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {c && (
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${c.fg}, transparent 80%)`,
        }} />
      )}
      {(title || description || actions) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, padding: '20px 28px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={{
              fontSize: 15, fontWeight: 700, color: 'var(--t1)',
              letterSpacing: '-0.012em', marginBottom: description ? 6 : 0,
            }}>{title}</div>}
            {description && (
              <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 640 }}>
                {description}
              </div>
            )}
          </div>
          {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: flush ? 0 : 28 }}>{children}</div>
    </section>
  )
}

/* ── SaveBar ──────────────────────────────────────────────────── */

interface SaveBarProps {
  dirty?: boolean
  saving?: boolean
  message?: { type: 'ok' | 'err'; text: string } | null
  onSave: () => void
  /** Optional secondary action (Reset, Cancel, etc.). */
  secondary?: { label: string; onClick: () => void }
  saveLabel?: string
}

export function SaveBar({
  dirty, saving, message, onSave, secondary, saveLabel = 'Save changes',
}: SaveBarProps) {
  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', marginTop: 16,
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(8px)',
      zIndex: 10,
    }}>
      <div style={{ flex: 1, fontSize: 12, color: 'var(--t3)' }}>
        {message?.type === 'ok' && (
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {message.text}</span>
        )}
        {message?.type === 'err' && (
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>✗ {message.text}</span>
        )}
        {!message && (dirty
          ? <span style={{ color: 'var(--amber)', fontWeight: 500 }}>● Unsaved changes</span>
          : <span style={{ color: 'var(--t4)' }}>All changes saved.</span>
        )}
      </div>
      {secondary && (
        <button type="button" className="btn-secondary btn-sm" onClick={secondary.onClick} disabled={saving}>
          {secondary.label}
        </button>
      )}
      <button
        type="button"
        className="btn-primary btn-sm"
        onClick={onSave}
        disabled={saving || (!dirty && !message)}
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

/* ── EmptyState ───────────────────────────────────────────────── */

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  children?: ReactNode
}

export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      background: 'var(--surface)',
      border: '1px dashed var(--border2)',
      borderRadius: 14,
    }}>
      {icon && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--surface2)', color: 'var(--t3)',
          marginBottom: 14,
        }}>{icon}</div>
      )}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>{title}</h3>
      {description && <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: children ? 14 : 0, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{description}</p>}
      {children}
    </div>
  )
}

/* ── Tabs ─────────────────────────────────────────────────────── */

interface TabItem {
  key: string
  label: string
  icon?: ReactNode
  count?: number
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  accent?: Accent
}

export function Tabs({ items, active, onChange, accent = 'acc' }: TabsProps) {
  const c = accentColors(accent)
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: 4,
      marginBottom: 16,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflowX: 'auto',
      scrollbarWidth: 'thin',
    }}>
      {items.map(t => {
        const on = t.key === active
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7,
              background: on ? c.bg : 'transparent',
              border: on ? `1px solid ${c.border}` : '1px solid transparent',
              color: on ? c.fg : 'var(--t3)',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon && <span style={{ display: 'inline-flex' }}>{t.icon}</span>}
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span style={{
                marginLeft: 2, padding: '0 6px', borderRadius: 999,
                background: on ? c.fg : 'var(--surface2)',
                color: on ? '#000' : 'var(--t3)',
                fontSize: 10, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Field helpers (consistent forms) ─────────────────────────── */

interface FieldProps {
  label: string
  hint?: ReactNode
  /** Show a small "required" indicator. */
  required?: boolean
  children: ReactNode
}

export function Field({ label, hint, required, children }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: 'var(--t4)',
      }}>
        {label}
        {required && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.5 }}>
          {hint}
        </span>
      )}
    </div>
  )
}
