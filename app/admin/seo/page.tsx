'use client'

/**
 * /admin/seo — full meta control for the marketing site.
 *
 * Sections (tabs):
 *   1. Defaults     — site title / description / keywords / canonical / robots
 *   2. Open Graph   — og:title, og:description, og:image, og:type, og:locale
 *   3. AtSign      — card type / title / description / image / handle
 *   4. Verification — Google / Bing / Yandex meta tags
 *   5. Structured   — Organization JSON-LD (name, logo, sameAs[]),
 *                     theme_color, promo banner toggle
 *
 * Live preview cards (Google search snippet + AtSign card + OG card)
 * update as the user edits. Save writes to public.site_settings.
 */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Share2, AtSign, Shield, Sparkles,
  Globe, Image as ImageIcon, Tag, ExternalLink,
} from 'lucide-react'
import {
  HeroCard, Section, SaveBar, Tabs, Field,
} from '@/components/admin/PageChrome'

interface SeoSettings {
  id: string
  site_title:        string
  site_description:  string
  site_keywords:     string
  canonical_url:     string
  og_image:          string
  twitter_handle:    string
  robots:            string
  promo_active:      boolean
  promo_text:        string
  promo_link:        string
  // Open Graph
  og_title:        string
  og_description:  string
  og_type:         string
  og_locale:       string
  // AtSign
  twitter_card:        string
  twitter_title:       string
  twitter_description: string
  twitter_image:       string
  // Verification
  google_site_verification: string
  bing_site_verification:   string
  yandex_verification:      string
  // Structured / branding
  org_name:    string
  org_logo:    string
  org_same_as: string[]
  theme_color: string
}

const DEFAULTS: SeoSettings = {
  id: 'global',
  site_title: '', site_description: '', site_keywords: '',
  canonical_url: '', og_image: '',
  twitter_handle: '', robots: 'index,follow',
  promo_active: false, promo_text: '', promo_link: '',
  og_title: '', og_description: '', og_type: 'website', og_locale: 'en_US',
  twitter_card: 'summary_large_image',
  twitter_title: '', twitter_description: '', twitter_image: '',
  google_site_verification: '', bing_site_verification: '', yandex_verification: '',
  org_name: '', org_logo: '', org_same_as: [],
  theme_color: '#0d0d17',
}

type TabKey = 'defaults' | 'og' | 'twitter' | 'verify' | 'structured'

export default function AdminSeoPage() {
  const supabase = createClient()
  const [form, setForm]       = useState<SeoSettings>(DEFAULTS)
  const [original, setOriginal] = useState<SeoSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [tab, setTab]         = useState<TabKey>('defaults')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 'global').single()
      if (cancelled) return
      const merged: SeoSettings = { ...DEFAULTS, ...(data as Partial<SeoSettings> | null) }
      // jsonb came back as string in some clients
      if (typeof (data as { org_same_as?: unknown })?.org_same_as === 'string') {
        try { merged.org_same_as = JSON.parse((data as { org_same_as: string }).org_same_as) } catch { merged.org_same_as = [] }
      } else if (Array.isArray((data as { org_same_as?: unknown })?.org_same_as)) {
        merged.org_same_as = (data as { org_same_as: string[] }).org_same_as
      }
      setForm(merged); setOriginal(merged); setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original])

  function update<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setMessage(null)
  }

  async function save() {
    setSaving(true); setMessage(null)
    const { error } = await supabase.from('site_settings').upsert({
      ...form,
      id: 'global',
      org_same_as: form.org_same_as,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      setMessage({ type: 'err', text: error.message })
    } else {
      setMessage({ type: 'ok', text: 'Saved successfully.' })
      setOriginal(form)
    }
    setSaving(false)
  }

  function reset() { setForm(original); setMessage(null) }

  if (loading) {
    return (
      <div>
        <HeroCard
          accent="blue"
          icon={<Search size={28} />}
          eyebrow="SEO & meta"
          title="Site metadata"
          subtitle="Loading…"
        />
        <div style={{ height: 240 }} className="skeleton" />
      </div>
    )
  }

  // Tab derivation — show how many fields per tab are populated.
  const tabItems = [
    { key: 'defaults',   label: 'Defaults',     icon: <Globe size={12} />,   count: countSet([form.site_title, form.site_description, form.site_keywords, form.canonical_url, form.robots]) },
    { key: 'og',         label: 'Open Graph',   icon: <Share2 size={12} />,  count: countSet([form.og_title, form.og_description, form.og_image, form.og_type]) },
    { key: 'twitter',    label: 'AtSign Card', icon: <AtSign size={12} />, count: countSet([form.twitter_card, form.twitter_title, form.twitter_handle, form.twitter_image]) },
    { key: 'verify',     label: 'Verification', icon: <Shield size={12} />,  count: countSet([form.google_site_verification, form.bing_site_verification, form.yandex_verification]) },
    { key: 'structured', label: 'Structured',   icon: <Sparkles size={12} />, count: countSet([form.org_name, form.org_logo]) + (form.org_same_as.length > 0 ? 1 : 0) },
  ] as const

  const populated = countSet([
    form.site_title, form.site_description, form.canonical_url,
    form.og_title, form.og_image, form.twitter_handle, form.org_name,
  ])

  return (
    <div style={{ paddingBottom: 80 }}>
      <HeroCard
        accent="blue"
        icon={<Search size={28} />}
        eyebrow="SEO & meta"
        title="Site metadata"
        subtitle="Control how the site appears in Google search, social link previews, and search-engine verification. Saves to public.site_settings."
        metric={{ label: 'Fields set', value: populated.toString(), secondary: 'across all tabs' }}
      />

      <Tabs items={[...tabItems]} active={tab} onChange={(k) => setTab(k as TabKey)} accent="blue" />

      {/* ── DEFAULTS ── */}
      {tab === 'defaults' && (
        <>
          <Section
            title="Search defaults"
            description="The title + description Google shows on the SERP. Keywords are ignored by Google but other engines still read them."
            accent="blue"
          >
            <div className="form-grid">
              <Field label="Site title" hint="55–60 chars typical. Brand name comes last after a separator.">
                <input className="input" value={form.site_title} onChange={e => update('site_title', e.target.value)} />
              </Field>
              <Field label="Site description" hint="155–160 chars typical. First 120 are usually visible.">
                <textarea className="input" rows={3} value={form.site_description} onChange={e => update('site_description', e.target.value)} />
              </Field>
              <Field label="Keywords" hint="Comma-separated. Google ignores; some smaller engines still use.">
                <textarea className="input" rows={2} value={form.site_keywords} onChange={e => update('site_keywords', e.target.value)} />
              </Field>
              <div className="form-grid form-grid-2">
                <Field label="Canonical URL" hint="The 'official' URL of the homepage (apex, https, no trailing slash).">
                  <input className="input" value={form.canonical_url} onChange={e => update('canonical_url', e.target.value)} placeholder="https://termimal.com" />
                </Field>
                <Field label="Robots" hint="index,follow / noindex,nofollow / index,follow,max-snippet:-1 etc.">
                  <input className="input" value={form.robots} onChange={e => update('robots', e.target.value)} />
                </Field>
              </div>
            </div>
          </Section>

          <SearchPreview form={form} />
        </>
      )}

      {/* ── OPEN GRAPH ── */}
      {tab === 'og' && (
        <>
          <Section
            title="Open Graph"
            description="What Facebook, LinkedIn, Discord, Slack and most preview-generating clients render when someone shares a link."
            accent="purple"
          >
            <div className="form-grid">
              <Field label="og:title" hint="Defaults to site title if empty. Max ~60 chars.">
                <input className="input" value={form.og_title} onChange={e => update('og_title', e.target.value)} placeholder={form.site_title} />
              </Field>
              <Field label="og:description" hint="Defaults to site description if empty.">
                <textarea className="input" rows={3} value={form.og_description} onChange={e => update('og_description', e.target.value)} placeholder={form.site_description} />
              </Field>
              <Field label="og:image" hint="1200×630 recommended. PNG/JPG, served over HTTPS.">
                <input className="input" value={form.og_image} onChange={e => update('og_image', e.target.value)} placeholder="https://termimal.com/og.png" />
              </Field>
              <div className="form-grid form-grid-2">
                <Field label="og:type">
                  <select className="select" value={form.og_type} onChange={e => update('og_type', e.target.value)}>
                    {['website', 'article', 'product', 'profile'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="og:locale">
                  <input className="input" value={form.og_locale} onChange={e => update('og_locale', e.target.value)} placeholder="en_US" />
                </Field>
              </div>
            </div>
          </Section>

          <OgPreview form={form} />
        </>
      )}

      {/* ── TWITTER ── */}
      {tab === 'twitter' && (
        <>
          <Section
            title="AtSign / X Card"
            description="AtSign has its own meta-tag namespace — falls back to Open Graph if absent."
            accent="blue"
          >
            <div className="form-grid">
              <div className="form-grid form-grid-2">
                <Field label="twitter:card">
                  <select className="select" value={form.twitter_card} onChange={e => update('twitter_card', e.target.value)}>
                    {['summary', 'summary_large_image', 'app', 'player'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="@handle" hint="Without the @. Used as twitter:site.">
                  <input className="input" value={form.twitter_handle} onChange={e => update('twitter_handle', e.target.value.replace(/^@/, ''))} placeholder="termimal" />
                </Field>
              </div>
              <Field label="twitter:title" hint="Defaults to og:title or site title.">
                <input className="input" value={form.twitter_title} onChange={e => update('twitter_title', e.target.value)} placeholder={form.og_title || form.site_title} />
              </Field>
              <Field label="twitter:description" hint="Defaults to og:description or site description.">
                <textarea className="input" rows={2} value={form.twitter_description} onChange={e => update('twitter_description', e.target.value)} placeholder={form.og_description || form.site_description} />
              </Field>
              <Field label="twitter:image" hint="Defaults to og:image. summary_large_image needs ≥ 300×157.">
                <input className="input" value={form.twitter_image} onChange={e => update('twitter_image', e.target.value)} placeholder={form.og_image} />
              </Field>
            </div>
          </Section>

          <AtSignPreview form={form} />
        </>
      )}

      {/* ── VERIFICATION ── */}
      {tab === 'verify' && (
        <Section
          title="Search-engine verification"
          description="Verification meta tags so Google Search Console / Bing Webmaster / Yandex can confirm you own the domain. Get the codes from each console's HTML-tag verification flow."
          accent="amber"
        >
          <div className="form-grid">
            <Field
              label="Google Site Verification"
              hint={<>Open <a className="a-link" target="_blank" rel="noopener noreferrer" href="https://search.google.com/search-console">Search Console</a> → Settings → Ownership verification → HTML tag → copy the <code>content</code> value.</>}
            >
              <input className="input" value={form.google_site_verification} onChange={e => update('google_site_verification', e.target.value)} />
            </Field>
            <Field label="Bing Webmaster Verification">
              <input className="input" value={form.bing_site_verification} onChange={e => update('bing_site_verification', e.target.value)} />
            </Field>
            <Field label="Yandex Verification">
              <input className="input" value={form.yandex_verification} onChange={e => update('yandex_verification', e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {/* ── STRUCTURED DATA ── */}
      {tab === 'structured' && (
        <>
          <Section
            title="Organization JSON-LD"
            description="Schema.org Organization snippet rendered into <head>. Search engines use it for the knowledge panel + brand-name autocomplete."
            accent="green"
          >
            <div className="form-grid">
              <div className="form-grid form-grid-2">
                <Field label="Organization name">
                  <input className="input" value={form.org_name} onChange={e => update('org_name', e.target.value)} placeholder="Termimal" />
                </Field>
                <Field label="Logo URL" hint="Square or wide. PNG with transparency works best.">
                  <input className="input" value={form.org_logo} onChange={e => update('org_logo', e.target.value)} />
                </Field>
              </div>
              <Field
                label="sameAs URLs"
                hint="One per line — AtSign, LinkedIn, GitHub, Crunchbase, etc. Tells Google these accounts are the same brand."
              >
                <textarea
                  className="input"
                  rows={4}
                  value={form.org_same_as.join('\n')}
                  onChange={e => update('org_same_as', e.target.value.split(/\n+/).map(s => s.trim()).filter(Boolean))}
                  placeholder="https://twitter.com/termimal&#10;https://linkedin.com/company/termimal"
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Theme + promo"
            description="Mobile browser chrome colour and the optional site-wide promo banner."
            accent="purple"
          >
            <div className="form-grid">
              <div className="form-grid form-grid-2">
                <Field label="Theme color" hint="Mobile browser chrome (Android/iOS PWA).">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="color"
                      value={form.theme_color || '#0d0d17'}
                      onChange={e => update('theme_color', e.target.value)}
                      style={{ width: 50, height: 38, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
                    />
                    <input className="input" style={{ flex: 1 }} value={form.theme_color || ''} onChange={e => update('theme_color', e.target.value)} placeholder="#0d0d17" />
                  </div>
                </Field>
                <Field label="Promo banner active">
                  <button
                    type="button"
                    className="toggle"
                    data-checked={form.promo_active}
                    onClick={() => update('promo_active', !form.promo_active)}
                    aria-pressed={form.promo_active}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </Field>
              </div>
              <Field label="Promo text">
                <input className="input" value={form.promo_text} onChange={e => update('promo_text', e.target.value)} disabled={!form.promo_active} placeholder="Black Friday — 30% off all plans" />
              </Field>
              <Field label="Promo link">
                <input className="input" value={form.promo_link} onChange={e => update('promo_link', e.target.value)} disabled={!form.promo_active} placeholder="/pricing" />
              </Field>
            </div>
          </Section>

          <JsonLdPreview form={form} />
        </>
      )}

      <SaveBar
        dirty={dirty}
        saving={saving}
        message={message}
        onSave={save}
        secondary={dirty ? { label: 'Reset', onClick: reset } : undefined}
      />
    </div>
  )
}

/* ── helpers + previews ─────────────────────────────────────── */

function countSet(values: Array<string | undefined | null>): number {
  return values.filter(v => !!(v && v.toString().trim())).length
}

function SearchPreview({ form }: { form: SeoSettings }) {
  const url   = form.canonical_url || 'https://termimal.com'
  const title = form.site_title    || 'Termimal'
  const desc  = form.site_description || 'No description set.'
  return (
    <Section title="Google search preview" accent="muted" description="Approximation of how this page appears on Google. Actual rendering varies by query and device.">
      <div style={{
        padding: 14, borderRadius: 8,
        background: '#fff', color: '#202124',
        fontFamily: 'Arial, sans-serif',
        maxWidth: 600,
      }}>
        <div style={{ fontSize: 12, color: '#5f6368' }}>{url}</div>
        <div style={{ fontSize: 18, color: '#1a0dab', marginTop: 2, lineHeight: 1.3, fontWeight: 400 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#4d5156', marginTop: 4, lineHeight: 1.45 }}>{desc}</div>
      </div>
    </Section>
  )
}

function OgPreview({ form }: { form: SeoSettings }) {
  const title = form.og_title       || form.site_title       || 'Termimal'
  const desc  = form.og_description || form.site_description || ''
  const img   = form.og_image       || ''
  const url   = form.canonical_url  || 'https://termimal.com'
  return (
    <Section title="Open Graph preview" accent="muted" description="What LinkedIn / Discord / Slack will render.">
      <div style={{
        maxWidth: 500, borderRadius: 8, overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block', background: 'var(--surface2)' }}
               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', background: 'var(--surface2)', fontSize: 12 }}>
            <ImageIcon size={20} style={{ marginRight: 6 }} /> No og:image set
          </div>
        )}
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{new URL(url).host}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginTop: 4 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4, lineHeight: 1.45 }}>{desc}</div>
        </div>
      </div>
    </Section>
  )
}

function AtSignPreview({ form }: { form: SeoSettings }) {
  const title = form.twitter_title       || form.og_title       || form.site_title || 'Termimal'
  const desc  = form.twitter_description || form.og_description || form.site_description || ''
  const img   = form.twitter_image       || form.og_image       || ''
  const handle = form.twitter_handle ? `@${form.twitter_handle}` : ''
  return (
    <Section title="AtSign / X preview" accent="muted">
      <div style={{
        maxWidth: 500, borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', background: 'var(--surface2)', fontSize: 12 }}>
            <Tag size={18} style={{ marginRight: 6 }} /> No twitter:image set
          </div>
        )}
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3, lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}>{desc}</div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink size={11} /> termimal.com {handle && <>· {handle}</>}
          </div>
        </div>
      </div>
    </Section>
  )
}

function JsonLdPreview({ form }: { form: SeoSettings }) {
  const ld = useMemo(() => {
    if (!form.org_name) return null
    return {
      '@context': 'https://schema.org',
      '@type':    'Organization',
      name:       form.org_name,
      url:        form.canonical_url || 'https://termimal.com',
      ...(form.org_logo ? { logo: form.org_logo } : {}),
      ...(form.org_same_as.length ? { sameAs: form.org_same_as } : {}),
    }
  }, [form.org_name, form.org_logo, form.org_same_as, form.canonical_url])
  if (!ld) return null
  return (
    <Section title="JSON-LD output" description="What renders in <head>." accent="muted" flush>
      <pre style={{
        margin: 0, padding: 16,
        fontSize: 11, lineHeight: 1.5,
        color: 'var(--t2)',
        fontFamily: 'ui-monospace, Menlo, monospace',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        maxHeight: 280, overflowY: 'auto',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
      }}>
{`<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>`}
      </pre>
    </Section>
  )
}
