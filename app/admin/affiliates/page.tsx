'use client'
export const dynamic = 'force-dynamic'

/**
 * Affiliates — placeholder until we wire a third-party affiliate
 * platform (Tolt or Rewardful are the leading options for Stripe
 * subscriptions). Building affiliates in-house means custom auth +
 * payouts + 1099/W-9 tax forms — an order of magnitude more work
 * than $39/mo of Tolt for what's effectively the same outcome.
 *
 * This page surfaces the decision + the integration playbook so
 * whoever picks it up next has a runway. Once provisioned, replace
 * this file with the dashboard fetching live affiliate stats.
 */

import { Handshake, ExternalLink, ArrowRight, Check, Zap, FileText, Sparkles, Users } from 'lucide-react'
import { HeroCard, Section, ItemCard, ItemGrid } from '@/components/admin/PageChrome'

export default function AffiliatesPage() {
  return (
    <div>
      <HeroCard
        accent="amber"
        icon={<Handshake size={28} />}
        eyebrow="Partnerships"
        title="Affiliates"
        subtitle="A 30%-recurring-for-12-months affiliate program is the highest-ROI growth lever for a B2C SaaS at our stage. We just haven't picked the platform yet."
        metric={{
          label: 'Status',
          value: 'Not live',
          secondary: 'pick a platform → ship in a day',
        }}
      />

      <Section
        accent="amber"
        title="Pick one, ship in a day"
        description="Both integrate cleanly with our existing Stripe Checkout flow — no schema changes required. The affiliate platform sits between your domain and Stripe, attributing each signup to a referral cookie set on the affiliate's tracked link."
      >
        <ItemGrid min={320}>
          <ItemCard
            accent="amber"
            icon={<Sparkles size={18} />}
            title="Tolt"
            subtitle="Cheaper. Built specifically for SaaS. Used by Resend, Cal.com, Beehiiv. ~$39/mo."
            status={{ label: 'Recommended', tone: 'amber', pulse: true }}
            meta={
              <>
                <span>Pricing: $39 / $99 / $239 mo</span>
                <span>·</span>
                <span>Stripe-native</span>
              </>
            }
            footer={
              <a
                href="https://tolt.io"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ minHeight: 34 }}
              >
                <ExternalLink size={12} /> Open Tolt
              </a>
            }
          />
          <ItemCard
            accent="blue"
            icon={<Zap size={18} />}
            title="Rewardful"
            subtitle="Older, more mature. Better admin UX and reporting. Used by Substack, Falcon Notes. ~$49/mo."
            meta={
              <>
                <span>Pricing: $49 / $99 / $149 mo</span>
                <span>·</span>
                <span>Stripe-native</span>
              </>
            }
            footer={
              <a
                href="https://www.rewardful.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ minHeight: 34 }}
              >
                <ExternalLink size={12} /> Open Rewardful
              </a>
            }
          />
          <ItemCard
            accent="purple"
            icon={<FileText size={18} />}
            title="In-house (don't)"
            subtitle="Building this yourself means custom auth, payout pipelines, 1099/W-9 collection, fraud detection, and chargeback cascades. Worth the time at 1000+ affiliates — not before."
            status={{ label: 'Skip for now', tone: 'muted' }}
          />
        </ItemGrid>
      </Section>

      <Section
        accent="acc"
        title="Integration playbook"
        description="Once a platform is picked, this is what wires it up — straightforward."
      >
        <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 0 }}>
          {[
            { n: 1, t: 'Sign up + connect Stripe',          d: 'OAuth into Stripe from Tolt/Rewardful. They auto-discover Termimal Pro / Premium products and offer commission tiers.' },
            { n: 2, t: 'Set commission: 30% recurring, 12 months', d: 'High enough that finance-Twitter / YouTube creators care; capped at 12 months so LTV math still works.' },
            { n: 3, t: 'Embed the tracking script',         d: 'Single <script> tag in the marketing site\'s <head>. Sets a 60-day cookie when ?via=affiliate-handle hits any page.' },
            { n: 4, t: 'Stripe webhook: pass referral metadata', d: 'On checkout success, the script reads the cookie and writes affiliate_id to the Stripe Customer metadata. We already have a webhook — one extra line.' },
            { n: 5, t: 'Build /affiliates page on the public site', d: 'Pitch + signup link. Ideal: founder photo, social proof, 30%/12mo headline, FAQ.' },
            { n: 6, t: 'Manual recruit first 10 partners', d: 'DM the finance-Twitter / YouTube creators we identified in the Marketing Planner. First 5-10 affiliates produce most of the early revenue; the open-link program scales after.' },
          ].map(step => (
            <li key={step.n} className="card-premium" style={{
              padding: '16px 20px',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: 'var(--acc-bg)', color: 'var(--acc)',
                border: '1px solid var(--acc-border)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              }}>
                {step.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{step.t}</div>
                <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.55 }}>{step.d}</div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        accent="green"
        title="Why a 30% / 12-month rate"
        description="It's the rate that finance-niche affiliates actually move on. Cheaper rates get ignored; more generous burns LTV."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { l: 'Pro Monthly LTV @ 12mo',  v: '€120',  s: 'gross' },
            { l: 'Affiliate cut @ 30%',      v: '€36',   s: 'first 12 months only' },
            { l: 'Net retained',             v: '€84',   s: '70% LTV after commission' },
            { l: 'Break-even CAC',           v: '~€30',  s: '≈1.2 mo payback at 30%' },
          ].map(s => (
            <div key={s.l} style={{
              padding: '16px 18px', borderRadius: 14,
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6 }}>
                {s.l}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {s.v}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>{s.s}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
