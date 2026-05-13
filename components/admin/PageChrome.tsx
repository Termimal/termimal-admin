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
        marginBottom: 40,
        padding: '40px 44px',
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
            fontSize: 36, lineHeight: 1.05, fontWeight: 800,
            color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: description ? 14 : 0,
          }}>{title}</h1>
          {description && (
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--t2)', maxWidth: 760, fontWeight: 400 }}>
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
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
      marginBottom: 28,
      boxShadow: 'var(--shadow-sm)',
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
          gap: 20, padding: '24px 32px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={{
              fontSize: 17, fontWeight: 700, color: 'var(--t1)',
              letterSpacing: '-0.015em', marginBottom: description ? 8 : 0,
            }}>{title}</div>}
            {description && (
              <div style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 680 }}>
                {description}
              </div>
            )}
          </div>
          {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: flush ? 0 : 32 }}>{children}</div>
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

/* ── HeroCard ─────────────────────────────────────────────────────
   Big status / summary panel modelled on the Health page hero. Use
   at the top of any page that has a single dominant metric / status. */

interface HeroCardProps {
  /** Optional accent — drives icon tile + ring colour. Default acc. */
  accent?: Accent
  /** Icon node, ~28-32px. */
  icon: ReactNode
  /** Small caps eyebrow above title. */
  eyebrow?: string
  /** Main title — large display text. */
  title: string
  /** Optional one-line subtitle under the title. */
  subtitle?: ReactNode
  /** Optional metric panel on the right (e.g. "12 users · 24h"). */
  metric?: { label: string; value: ReactNode; secondary?: ReactNode }
}

export function HeroCard({ accent = 'acc', icon, eyebrow, title, subtitle, metric }: HeroCardProps) {
  const c = accentColors(accent)
  return (
    <div
      className="card-premium"
      style={{
        padding: '36px 40px',
        marginBottom: 28,
        borderColor: c.fg + '44',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: c.bg,
          border: `1px solid ${c.fg}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.fg,
          boxShadow: `0 0 24px -4px ${c.fg}55`,
          flexShrink: 0,
        }}>{icon}</div>

        <div style={{ flex: 1, minWidth: 280 }}>
          {eyebrow && (
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: c.fg, marginBottom: 6,
            }}>{eyebrow}</div>
          )}
          <div style={{
            fontSize: 26, fontWeight: 800, color: 'var(--t1)',
            letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: subtitle ? 8 : 0,
          }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 14, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {subtitle}
            </div>
          )}
        </div>

        {metric && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            paddingLeft: 24, borderLeft: '1px solid var(--border)',
            minWidth: 140,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 8,
            }}>{metric.label}</div>
            <div style={{
              fontSize: 36, fontWeight: 800, color: 'var(--t1)',
              letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>{metric.value}</div>
            {metric.secondary && (
              <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>
                {metric.secondary}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── ItemCard ─────────────────────────────────────────────────────
   Generic entity card modelled on the Health-page probe cards.
   Use in grids of equally-shaped objects (users, plans, probes,
   feature flags, etc). */

interface ItemCardProps {
  /** Accent drives the icon-tile background + status pill colour. */
  accent?: Accent
  /** Icon node, ~18px. */
  icon: ReactNode
  /** Primary title (e.g. "Polymarket Gamma"). */
  title: string
  /** Optional one-line subtitle. */
  subtitle?: ReactNode
  /** Optional status pill (e.g. "OK", "DEGRADED"). */
  status?: { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'muted'; pulse?: boolean }
  /** Free-form metadata row at the bottom (e.g. "⏱ 42 ms · HTTP 200"). */
  meta?: ReactNode
  /** Optional footer block (error message, action button, etc). */
  footer?: ReactNode
  /** Click handler — turns the card into a button. */
  onClick?: () => void
  /** href — turns the card into a link. */
  href?: string
}

const TONE_FG: Record<NonNullable<ItemCardProps['status']>['tone'], string> = {
  green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)',
  blue: 'var(--blue)',   purple: 'var(--purple)', muted: 'var(--t3)',
}
const TONE_BG: Record<NonNullable<ItemCardProps['status']>['tone'], string> = {
  green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)',
  blue: 'var(--blue-bg)',   purple: 'var(--purple-bg)', muted: 'var(--surface2)',
}

export function ItemCard({
  accent = 'acc', icon, title, subtitle, status, meta, footer, onClick, href,
}: ItemCardProps) {
  const c = accentColors(accent)
  const toneFg = status ? TONE_FG[status.tone] : c.fg
  const toneBg = status ? TONE_BG[status.tone] : c.bg

  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: status ? toneBg : c.bg,
          border: `1px solid ${(status ? toneFg : c.fg) + '33'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: status ? toneFg : c.fg,
          flexShrink: 0,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: subtitle ? 4 : 0, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 15, fontWeight: 700, color: 'var(--t1)',
              letterSpacing: '-0.005em',
            }}>{title}</span>
            {status && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 999,
                background: toneBg, color: toneFg,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: toneFg,
                  boxShadow: status.pulse ? `0 0 6px ${toneFg}` : 'none',
                  animation: status.pulse ? 'admin-pulse 1.6s ease-in-out infinite' : undefined,
                }} />
                {status.label}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: meta || footer ? 10 : 0, lineHeight: 1.5 }}>
              {subtitle}
            </div>
          )}
          {meta && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 12, color: 'var(--t4)',
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              fontVariantNumeric: 'tabular-nums',
              flexWrap: 'wrap',
            }}>
              {meta}
            </div>
          )}
          {footer && (
            <div style={{ marginTop: 12 }}>{footer}</div>
          )}
        </div>
      </div>
    </>
  )

  const baseStyle: React.CSSProperties = {
    padding: '22px 24px',
    borderColor: status?.tone === 'red'   ? `${TONE_FG.red}44`
               : status?.tone === 'amber' ? `${TONE_FG.amber}44`
               : 'var(--border)',
    cursor: onClick || href ? 'pointer' : 'default',
    textDecoration: 'none',
    display: 'block',
  }

  if (href) {
    return <a className="card-premium" href={href} style={baseStyle}>{inner}</a>
  }
  if (onClick) {
    return <button className="card-premium" type="button" onClick={onClick} style={{ ...baseStyle, textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit', background: undefined }}>{inner}</button>
  }
  return <div className="card-premium" style={baseStyle}>{inner}</div>
}

/* ── ItemGrid ─────────────────────────────────────────────────────
   Auto-fitting card grid. Use as <ItemGrid> wrapping <ItemCard>s. */

export function ItemGrid({ children, min = 280 }: { children: ReactNode; min?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
      gap: 16,
    }}>
      {children}
    </div>
  )
}
