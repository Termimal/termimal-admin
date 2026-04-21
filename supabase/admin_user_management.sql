create table if not exists public.admin_user_profiles (
  user_id uuid primary key,
  account_status text not null default 'active',
  subscription_bonus_months integer not null default 0,
  credits integer not null default 0,
  notes text,
  last_admin_action text,
  last_admin_action_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_user_profiles'
      and policyname = 'admin_user_profiles_select'
  ) then
    create policy "admin_user_profiles_select"
    on public.admin_user_profiles
    for select
    to authenticated
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_user_profiles'
      and policyname = 'admin_user_profiles_insert'
  ) then
    create policy "admin_user_profiles_insert"
    on public.admin_user_profiles
    for insert
    to authenticated
    with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_user_profiles'
      and policyname = 'admin_user_profiles_update'
  ) then
    create policy "admin_user_profiles_update"
    on public.admin_user_profiles
    for update
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;
