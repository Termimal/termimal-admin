-- Defense-in-depth: revoke anon (and admin-only authenticated) on 5
-- sensitive tables. Today's RLS already blocks anon on these; this
-- removes the underlying GRANT so a future RLS misconfiguration can't
-- expose the data on its own.
--
-- Also future-proofs us for the 2026-10-30 Supabase Data API default
-- change. After that date, new tables in public won't auto-grant; with
-- this migration applied, our existing-table grants match the new
-- secure-by-default behaviour for these high-value targets.
--
-- Scope: payments, audit_logs, passkey_credentials, email_log,
-- customer_notes. All five are accessed exclusively via the
-- service_role client today (bypasses RLS, unaffected by these
-- GRANTs), so no code path breaks.
--
-- How to apply:
--   1. Supabase Dashboard → SQL Editor → paste this whole file → Run, OR
--   2. supabase db push (if the CLI is wired up locally), OR
--   3. supabase MCP `apply_migration` with name
--      `revoke_anon_5_sensitive_tables_defense_in_depth`.

revoke all on public.payments               from anon;
revoke all on public.audit_logs             from anon;
revoke all on public.passkey_credentials    from anon;
revoke all on public.email_log              from anon;
revoke all on public.customer_notes         from anon;

-- Tables that are 100% admin-only: also revoke authenticated.
-- (payments + passkey_credentials are user-owned with RLS, so
-- authenticated keeps its grants and RLS scopes per-user.)
revoke all on public.audit_logs             from authenticated;
revoke all on public.email_log              from authenticated;
revoke all on public.customer_notes         from authenticated;

-- Re-assert service_role grants so the admin client keeps working
-- even if a future revoke-all-from-public sweeps these too.
grant select, insert, update, delete on public.payments               to service_role;
grant select, insert, update, delete on public.audit_logs             to service_role;
grant select, insert, update, delete on public.passkey_credentials    to service_role;
grant select, insert, update, delete on public.email_log              to service_role;
grant select, insert, update, delete on public.customer_notes         to service_role;
