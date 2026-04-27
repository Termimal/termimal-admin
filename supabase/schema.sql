-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- TERMIMAL DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€ User Profiles â”€â”€â”€
-- Extends Supabase auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  country text,
  timezone text default 'UTC',
  language text default 'en',
  plan text default 'free' check (plan in ('free', 'pro', 'premium')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text default 'active' check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  billing_interval text check (billing_interval in ('month', 'year')),
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  role text default 'user' check (role in ('user', 'admin', 'super_admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- â”€â”€â”€ Watchlists â”€â”€â”€
create table public.watchlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  instruments jsonb default '[]'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- â”€â”€â”€ Alerts â”€â”€â”€
create table public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  instrument text not null,
  condition text not null, -- 'price_above', 'price_below', 'pct_change'
  value numeric not null,
  status text default 'active' check (status in ('active', 'triggered', 'expired', 'disabled')),
  triggered_at timestamptz,
  notify_email boolean default true,
  notify_push boolean default true,
  created_at timestamptz default now()
);

-- â”€â”€â”€ Saved Workspaces â”€â”€â”€
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  layout jsonb default '{}'::jsonb,
  instruments jsonb default '[]'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- â”€â”€â”€ Referral Events â”€â”€â”€
create table public.referral_events (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) not null,
  referred_id uuid references public.profiles(id) not null,
  status text default 'pending' check (status in ('pending', 'converted', 'rewarded', 'rejected')),
  reward_amount numeric default 0,
  created_at timestamptz default now()
);

-- â”€â”€â”€ Support Tickets â”€â”€â”€
create table public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null,
  message text not null,
  status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- â”€â”€â”€ Blog Articles (CMS) â”€â”€â”€
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  content text,
  excerpt text,
  cover_image text,
  author_id uuid references public.profiles(id),
  status text default 'draft' check (status in ('draft', 'published', 'scheduled', 'archived')),
  category text,
  tags text[] default '{}',
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- â”€â”€â”€ Invoices â”€â”€â”€
create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  stripe_invoice_id text unique,
  amount numeric not null,
  currency text default 'usd',
  status text default 'paid' check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz default now()
);

-- â”€â”€â”€ Audit Log â”€â”€â”€
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- â”€â”€â”€ Translation Keys â”€â”€â”€
create table public.translations (
  id uuid default gen_random_uuid() primary key,
  key text not null,
  namespace text default 'common',
  locale text not null default 'en',
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(key, namespace, locale)
);

-- â”€â”€â”€ Feature Flags â”€â”€â”€
create table public.feature_flags (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  enabled boolean default false,
  description text,
  created_at timestamptz default now()
);

-- â”€â”€â”€ System Settings â”€â”€â”€
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);


-- --- FAQs (CMS-managed) ---
create table public.faqs (
  id         uuid default gen_random_uuid() primary key,
  question   text not null,
  answer     text not null,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- ROW LEVEL SECURITY (RLS)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.alerts enable row level security;
alter table public.workspaces enable row level security;
alter table public.referral_events enable row level security;
alter table public.support_tickets enable row level security;
alter table public.articles enable row level security;
alter table public.invoices enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Watchlists: users can CRUD their own
create policy "Users can manage own watchlists" on public.watchlists for all using (auth.uid() = user_id);

-- Alerts: users can CRUD their own
create policy "Users can manage own alerts" on public.alerts for all using (auth.uid() = user_id);

-- Workspaces: users can CRUD their own
create policy "Users can manage own workspaces" on public.workspaces for all using (auth.uid() = user_id);

-- Referrals: users can view their own
create policy "Users can view own referrals" on public.referral_events for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- Support: users can view/create their own tickets
create policy "Users can view own tickets" on public.support_tickets for select using (auth.uid() = user_id);
create policy "Users can create tickets" on public.support_tickets for insert with check (auth.uid() = user_id);

-- Articles: everyone can read published
create policy "Anyone can read published articles" on public.articles for select using (status = 'published');
alter table public.faqs enable row level security;

create policy "Anyone can read active faqs"
  on public.faqs for select
  using (is_active = true);


-- Invoices: users can view their own
create policy "Users can view own invoices" on public.invoices for select using (auth.uid() = user_id);

-- Admin policies (users with role = 'admin' or 'super_admin')
-- These use service_role key via createAdminSupabase(), bypassing RLS

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- FUNCTIONS & TRIGGERS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'REF' || substring(new.id::text, 1, 8)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
create trigger update_watchlists_updated_at before update on public.watchlists
  for each row execute procedure public.update_updated_at();
create trigger update_workspaces_updated_at before update on public.workspaces
  for each row execute procedure public.update_updated_at();
create trigger update_articles_updated_at before update on public.articles
  for each row execute procedure public.update_updated_at();
create trigger update_faqs_updated_at before update on public.faqs
  for each row execute procedure public.update_updated_at();

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SEED DATA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Default feature flags
insert into public.feature_flags (key, enabled, description) values
  ('on_chain_analytics', true, 'On-chain analytics module'),
  ('macro_intelligence', true, 'Macro intelligence with Polymarket'),
  ('ai_insights', false, 'AI-powered market insights (beta)'),
  ('backtesting', false, 'Backtesting engine'),
  ('social_features', false, 'Social/community features');

-- Default system settings
insert into public.system_settings (key, value) values
  ('maintenance_mode', 'false'::jsonb),
  ('app_version_macos', '"v1.4.2"'::jsonb),
  ('app_version_windows', '"v1.4.2"'::jsonb),
  ('app_version_web', '"v2.1.0"'::jsonb);
