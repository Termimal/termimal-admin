-- termimal admin enhancements
create extension if not exists pgcrypto;

create table if not exists public.admin_user_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  first_name text,
  last_name text,
  date_of_birth date,
  phone text,
  account_status text not null default 'active',
  credits integer not null default 0,
  notes text,
  linked_accounts jsonb not null default '[]'::jsonb,
  last_admin_action text,
  last_admin_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_user_profiles_status_chk check (account_status in ('active','suspended','closed','review'))
);

create table if not exists public.credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  id text primary key,
  name text not null unique,
  description text,
  environment text not null default 'production',
  enabled boolean not null default false,
  min_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  namespace text,
  locale text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(key, namespace, locale)
);

create table if not exists public.banners (
  id text primary key,
  title text not null,
  placement text not null,
  status text not null default 'draft',
  cta_label text,
  cta_href text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banners_status_chk check (status in ('draft','active','archived'))
);

alter table public.admin_user_profiles add column if not exists first_name text;
alter table public.admin_user_profiles add column if not exists last_name text;
alter table public.admin_user_profiles add column if not exists date_of_birth date;
alter table public.admin_user_profiles add column if not exists phone text;
alter table public.admin_user_profiles add column if not exists account_status text not null default 'active';
alter table public.admin_user_profiles add column if not exists credits integer not null default 0;
alter table public.admin_user_profiles add column if not exists notes text;
alter table public.admin_user_profiles add column if not exists linked_accounts jsonb not null default '[]'::jsonb;
alter table public.admin_user_profiles add column if not exists last_admin_action text;
alter table public.admin_user_profiles add column if not exists last_admin_action_at timestamptz;
alter table public.admin_user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.admin_user_profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_credit_adjustments_user_id_created_at on public.credit_adjustments(user_id, created_at desc);
create index if not exists idx_feature_flags_environment on public.feature_flags(environment);
create index if not exists idx_translations_key_locale on public.translations(key, locale);
create index if not exists idx_banners_placement_status on public.banners(placement, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_user_profiles_updated_at on public.admin_user_profiles;
create trigger trg_admin_user_profiles_updated_at
before update on public.admin_user_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_feature_flags_updated_at on public.feature_flags;
create trigger trg_feature_flags_updated_at
before update on public.feature_flags
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_translations_updated_at on public.translations;
create trigger trg_translations_updated_at
before update on public.translations
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_banners_updated_at on public.banners;
create trigger trg_banners_updated_at
before update on public.banners
for each row execute procedure public.set_updated_at();

insert into public.admin_user_profiles (user_id)
select p.id
from public.profiles p
left join public.admin_user_profiles aup on aup.user_id = p.id
where aup.user_id is null;