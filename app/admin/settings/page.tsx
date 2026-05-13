'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Settings, AlertTriangle, Power, Flag, Apple, Monitor, Globe } from 'lucide-react'
import { HeroCard, Section, ItemGrid, ItemCard } from '@/components/admin/PageChrome'

const FLAGS = [
  { flag: 'on_chain_analytics', label: 'On-chain analytics module',  enabled: true  },
  { flag: 'macro_intelligence', label: 'Macro intelligence module',  enabled: true  },
  { flag: 'ai_insights',        label: 'AI-powered insights (beta)', enabled: false },
  { flag: 'backtesting',        label: 'Backtesting engine',         enabled: false },
  { flag: 'social_trading',     label: 'Social/community features',  enabled: false },
]

const VERSIONS = [
  { platform: 'macOS',   version: 'v1.4.2', status: 'Latest', icon: Apple   },
  { platform: 'Windows', version: 'v1.4.2', status: 'Latest', icon: Monitor },
  { platform: 'Web',     version: 'v2.1.0', status: 'Latest', icon: Globe   },
]

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState(FLAGS)
  const enabledCount = flags.filter(f => f.enabled).length

  function toggle(flag: string) {
    setFlags(prev => prev.map(f => f.flag === flag ? { ...f, enabled: !f.enabled } : f))
  }

  return (
    <div>
      <HeroCard
        accent="acc"
        icon={<Settings size={28} />}
        eyebrow="Configuration"
        title="System settings"
        subtitle="Site-wide preferences, brand, feature flags, and system controls."
        metric={{ label: 'Modules on', value: `${enabledCount}/${flags.length}`, secondary: 'feature flags' }}
      />

      <Section accent="amber" title="Feature flags" description="Toggle modules on or off without a redeploy.">
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {flags.map((f, i) => (
            <li key={f.flag} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: i < flags.length - 1 ? '1px solid var(--border)' : 'none',
              gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: f.enabled ? 'var(--acc-bg)' : 'var(--surface2)',
                  border: `1px solid ${f.enabled ? 'var(--acc)33' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: f.enabled ? 'var(--acc)' : 'var(--t4)', flexShrink: 0,
                }}>
                  <Flag size={15}/>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', marginTop: 2 }}>{f.flag}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(f.flag)}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  border: `1px solid ${f.enabled ? 'var(--acc-border)' : 'var(--border)'}`,
                  background: f.enabled ? 'var(--acc-bg)' : 'transparent',
                  color: f.enabled ? 'var(--acc)' : 'var(--t3)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Power size={12}/> {f.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section accent="blue" title="App version management" description="Latest published versions across platforms.">
        <ItemGrid min={220}>
          {VERSIONS.map(v => (
            <ItemCard
              key={v.platform}
              accent="blue"
              icon={<v.icon size={18}/>}
              title={v.platform}
              subtitle={v.version}
              status={{ label: v.status.toUpperCase(), tone: 'green' }}
            />
          ))}
        </ItemGrid>
      </Section>

      <div className="card-premium" style={{
        padding: '24px 28px',
        borderColor: 'var(--red)44',
        background: 'linear-gradient(180deg, rgba(248,113,113,0.04) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--red-bg)', border: '1px solid var(--red)33',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--red)', flexShrink: 0,
          }}>
            <AlertTriangle size={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>Maintenance mode</h3>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.55 }}>
              Enable to show a maintenance page to all users. Admin access remains available.
            </p>
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red)33' }}>
              <Power size={12}/> Enable maintenance mode
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
