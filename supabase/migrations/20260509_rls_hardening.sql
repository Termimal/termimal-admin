-- ─────────────────────────────────────────────────────────────────
-- 20260509_rls_hardening.sql
-- ─────────────────────────────────────────────────────────────────
-- RLS hardening pass — fixes findings from the security audit
-- (Supabase advisor + manual review). Apply via Supabase Dashboard
-- → SQL Editor or `supabase db push`.
--
-- Concerns addressed:
--
--   1. `public.site_settings` had policies but RLS was OFF — the
--      worst possible state. Anyone with the anon key could read
--      and write the table even though policies suggested it was
--      locked down. We turn RLS on.
--
--   2. Multiple tables had USING(true) / WITH CHECK(true) policies
--      bound to role 'public' (which means anon + authenticated).
--      Those policies effectively bypass RLS for any signed-in
--      user. We replace with proper admin-checks via the new
--      `public.is_admin()` helper.
--
--   3. SECURITY DEFINER functions had mutable search_path — fix by
--      pinning each to `public, pg_temp` so a malicious schema in
--      the caller's search_path can't shadow our table references.
--
--   4. Internal SECURITY DEFINER helpers were callable by anon /
--      authenticated via `/rest/v1/rpc/<name>`. None of them are
--      meant to be public — revoke EXECUTE.
--
-- Service-role bypasses RLS regardless, so admin API routes that
-- use SUPABASE_SERVICE_ROLE_KEY keep working unchanged.
-- ─────────────────────────────────────────────────────────────────

begin;

-- ── 1. site_settings: enable RLS ──────────────────────────────────
alter table public.site_settings enable row level security;

-- ── 2. is_admin() helper ──────────────────────────────────────────
-- A SECURITY DEFINER function that reads user_roles for the current
-- caller. Wrapped here so the policies below don't recurse on
-- user_roles itself (which has its own RLS).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (select 1 from public.user_roles where id = auth.uid())
$$;
revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to authenticated;

-- ── 3. Tighten always-true policies ───────────────────────────────
-- Pattern for each public-readable table:
--   * keep public SELECT (banners/faqs/feature_flags/seo_meta/translations
--     are rendered on the marketing site, anon needs them)
--   * gate write access on is_admin()

-- BANNERS
drop policy if exists "admins full access" on public.banners;
create policy "banners_select_public"
  on public.banners for select
  to anon, authenticated
  using (true);
create policy "banners_modify_admin"
  on public.banners for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- FAQS — already has "Anyone can read active faqs"; tighten writes only.
drop policy if exists "admins full access" on public.faqs;
create policy "faqs_modify_admin"
  on public.faqs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- FEATURE_FLAGS
drop policy if exists "admins full access" on public.feature_flags;
create policy "feature_flags_select_public"
  on public.feature_flags for select
  to anon, authenticated
  using (true);
create policy "feature_flags_modify_admin"
  on public.feature_flags for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- SEO_META
drop policy if exists "Service role full access seo_meta" on public.seo_meta;
drop policy if exists "admins full access" on public.seo_meta;
create policy "seo_meta_select_public"
  on public.seo_meta for select
  to anon, authenticated
  using (true);
create policy "seo_meta_modify_admin"
  on public.seo_meta for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- TRANSLATIONS
drop policy if exists "Service role full access translations" on public.translations;
drop policy if exists "admins full access" on public.translations;
create policy "translations_select_public"
  on public.translations for select
  to anon, authenticated
  using (true);
create policy "translations_modify_admin"
  on public.translations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- USER_ROLES — admin-only writes; users may read their own row only.
-- "Allow users to read their own role" already exists; keep it.
drop policy if exists "Service role full access to user_roles" on public.user_roles;
create policy "user_roles_modify_admin"
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PROFILES — owner can read/update their own; admins can read & update everyone.
drop policy if exists "Service role full access to profiles" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── 4. Function search_path lock-down ─────────────────────────────
alter function public.admin_items_touch_updated_at() set search_path = public, pg_temp;
alter function public.touch_updated_at()             set search_path = public, pg_temp;
alter function public.handle_new_user()              set search_path = public, pg_temp;
alter function public.update_updated_at_column()     set search_path = public, pg_temp;
alter function public.set_updated_at()               set search_path = public, pg_temp;
alter function public.prune_audit_logs()             set search_path = public, pg_temp;
alter function public.update_updated_at()            set search_path = public, pg_temp;

-- ── 5. Revoke EXECUTE on internal SECURITY DEFINER functions ──────
-- Auth triggers, cron jobs, migration utilities. None should be
-- callable via /rest/v1/rpc.
revoke execute on function public.block_disposable_signup() from public, anon, authenticated;
revoke execute on function public.handle_new_user()         from public, anon, authenticated;
revoke execute on function public.prune_audit_logs()        from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()         from public, anon, authenticated;

commit;

-- After applying, run the Supabase advisor again:
--   Supabase Dashboard → Database → Advisors → Security
-- All ERROR-level findings should clear; the only remaining items
-- should be the auth-side "leaked password protection" (enable in
-- Auth → Settings → Password Policy).
