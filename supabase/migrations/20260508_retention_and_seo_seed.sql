-- ════════════════════════════════════════════════════════════════════
--  Retention policy + aggressive SEO seed
-- ════════════════════════════════════════════════════════════════════
--
--  1. Schedule pg_cron jobs to prune unbounded log tables daily so
--     they don't grow forever. Conservative defaults — easy to tune
--     by changing the integer in `now() - interval 'N days'`.
--
--       audit_logs           keep 90 days
--       processed_webhooks   keep 30 days  (only if the table exists)
--
--     Anomalies are computed on demand from profiles (no own table),
--     so no retention required there. Customer_notes and referral_events
--     are intentionally never pruned — small + important for audit.
--
--  2. Aggressive SEO seed for `seo_pages` covering every public route.
--     Targets long-tail keywords that map to actual search intent:
--     "market analysis terminal", "Bloomberg alternative", "COT data",
--     "options flow", etc. Idempotent via `on conflict (path) do update`.

-- ─── 1. Retention ────────────────────────────────────────────────────

create extension if not exists pg_cron with schema extensions;

create or replace function public.prune_audit_logs() returns void as $$
  delete from public.audit_logs where created_at < now() - interval '90 days';
$$ language sql security definer;

-- Only define the webhooks pruner if the table exists. If you add
-- processed_webhooks later, re-run this migration to wire the cron.
do $$
begin
  if exists (select 1 from information_schema.tables
              where table_schema = 'public' and table_name = 'processed_webhooks') then
    execute $fn$
      create or replace function public.prune_processed_webhooks() returns void as $body$
        delete from public.processed_webhooks where created_at < now() - interval '30 days';
      $body$ language sql security definer;
    $fn$;
  end if;
end $$;

-- Schedule daily at 03:30 UTC. Idempotent — unschedule by name then
-- re-schedule, so re-running this migration is safe.
do $$
declare j int;
begin
  -- audit_logs
  select jobid into j from cron.job where jobname = 'termimal-prune-audit-logs';
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule(
    'termimal-prune-audit-logs',
    '30 3 * * *',
    'select public.prune_audit_logs();'
  );

  -- processed_webhooks (only if function exists, which only happens if
  -- the table exists per the conditional CREATE FUNCTION above).
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
              where n.nspname = 'public' and p.proname = 'prune_processed_webhooks') then
    select jobid into j from cron.job where jobname = 'termimal-prune-processed-webhooks';
    if j is not null then perform cron.unschedule(j); end if;
    perform cron.schedule(
      'termimal-prune-processed-webhooks',
      '34 3 * * *',
      'select public.prune_processed_webhooks();'
    );
  end if;
end $$;

-- ─── 2. Aggressive SEO seed ──────────────────────────────────────────

-- Ensure the columns we expect exist. The original migration that
-- created seo_pages was minimal; add keywords + is_published so the
-- admin /seo-pages editor and lib/site-content.ts have everything
-- they need.
alter table public.seo_pages add column if not exists keywords     text[]  default '{}'::text[];
alter table public.seo_pages add column if not exists is_published boolean default true;

insert into public.seo_pages (path, title, description, keywords, og_image, canonical, noindex, is_published) values
('/',
 'Termimal — Professional Market Analysis Terminal',
 'Institutional-grade charting, macro intelligence, COT positioning, options flow, and risk analytics in one terminal. Used by quants, RIAs, and serious retail.',
 ARRAY['market analysis terminal', 'professional charting', 'COT positioning', 'macro intelligence', 'options flow', 'risk analytics', 'trading terminal', 'Bloomberg alternative', 'institutional charting', 'quant tools', 'market data platform', 'financial terminal'],
 '/og.png', null, false, true),

('/pricing',
 'Pricing — Termimal Market Analysis Terminal',
 'Free, Starter, Pro, Premium plans. Real-time data, 100+ indicators, COT, options flow, AI signals. Cancel anytime. Pay monthly or save 30% annual.',
 ARRAY['Termimal pricing', 'trading platform pricing', 'market terminal cost', 'best charting software pricing', 'professional trading platform price'],
 '/og.png', null, false, true),

('/features',
 'Features — Real-Time Charting, COT, Macro, Options Flow',
 '100+ technical indicators, 30 year COT history, macro economic data, dark-pool prints, options flow, AI signals, paper trading, multi-asset cross-correlation.',
 ARRAY['trading platform features', 'charting tools', 'COT data', 'options flow analysis', 'dark pool data', 'paper trading', 'AI trading signals', 'macro economic data', 'cross-correlation analysis'],
 '/og.png', null, false, true),

('/platform',
 'Platform Overview — Termimal',
 'How Termimal works: web terminal, desktop app, real-time data feeds, 30+ years of historical data, low-latency websockets, customizable workspaces.',
 ARRAY['trading terminal platform', 'web trading platform', 'desktop trading software', 'real-time market data', 'historical price data'],
 '/og.png', null, false, true),

('/help',
 'Help & FAQ — Termimal',
 'Frequently asked questions about Termimal — billing, data sources, supported markets, account management, security, paper trading, and downloads.',
 ARRAY['Termimal FAQ', 'trading platform help', 'market terminal support', 'how to use Termimal'],
 null, null, false, true),

('/refer',
 'Refer & Earn — Termimal Affiliate Program',
 'Earn 30% recurring commission for every customer you refer to Termimal. Best-in-class market analysis terminal. Apply once, earn forever.',
 ARRAY['Termimal affiliate', 'trading platform referral', 'market terminal commission', 'refer and earn trading'],
 '/og.png', null, false, true),

('/support',
 'Contact Support — Termimal',
 'Get help with billing, data, account access, or feature requests. We typically respond within a few hours during business hours (UTC).',
 ARRAY['Termimal support', 'contact Termimal', 'trading platform support', 'market terminal help'],
 null, null, false, true),

('/status',
 'System Status — Termimal',
 'Live status of Termimal data feeds, websocket connections, API endpoints, and infrastructure. Real-time uptime + incident history.',
 ARRAY['Termimal status', 'trading platform uptime', 'market data status', 'API status'],
 null, null, false, true),

('/privacy',
 'Privacy Policy — Termimal',
 'How Termimal handles your data: account data, market interactions, telemetry, third-party processors, retention windows, and your GDPR rights.',
 ARRAY['Termimal privacy policy', 'trading platform privacy', 'market data privacy', 'GDPR compliant trading'],
 null, null, false, true),

('/terms',
 'Terms of Service — Termimal',
 'Terms governing your use of Termimal. Analysis platform — no trade execution, no personalised investment advice. Read carefully before subscribing.',
 ARRAY['Termimal terms of service', 'trading platform terms', 'market terminal terms'],
 null, null, true, true),

('/risk-disclaimer',
 'Risk Disclaimer — Termimal',
 'Termimal provides analysis, not investment advice. Trading carries risk of loss. Read the full risk disclaimer before relying on any signal or backtest.',
 ARRAY['Termimal risk disclaimer', 'trading risk warning', 'investment risk disclosure', 'no financial advice disclaimer'],
 null, null, true, true),

('/refund-policy',
 'Refund Policy — Termimal',
 '14-day no-questions refund on the first paid month. Full eligibility, exclusions, and how to request a refund through your dashboard or via support.',
 ARRAY['Termimal refund policy', 'trading platform refund', 'cancel subscription refund'],
 null, null, true, true),

('/cookies',
 'Cookie Policy — Termimal',
 'Cookies Termimal uses, why we use them, and how to control them through your browser. Strictly-necessary, analytics, and preference cookies broken out.',
 ARRAY['Termimal cookies', 'trading platform cookies', 'cookie policy'],
 null, null, true, true)

on conflict (path) do update set
  title         = excluded.title,
  description   = excluded.description,
  keywords      = excluded.keywords,
  og_image      = excluded.og_image,
  is_published  = excluded.is_published,
  noindex       = excluded.noindex;
