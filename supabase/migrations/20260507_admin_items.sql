-- Admin items / project management board.
--
-- A lightweight task tracker that lives inside the admin panel.
-- Designed for the team-of-one-or-few use case (no external Linear /
-- Jira), so it covers what an admin actually needs:
--
--   - title + description (markdown allowed in the UI; we store text)
--   - status: backlog -> todo -> in_progress -> review -> done -> blocked
--   - priority: low | medium | high | critical
--   - category (bug, feature, security, seo, content, ops, billing, …)
--   - assignee (any admin profile)
--   - reporter (the admin who created the item)
--   - due_date (optional)
--   - tags (jsonb array of strings — quick filtering without a join)
--   - archived_at (soft delete; rows survive so audit history stays intact)
--   - position (numeric float for drag-to-reorder within a column without
--     having to renumber siblings; insert between A and B by setting
--     position = (A.position + B.position) / 2)
--
-- RLS gates everything to admin / super_admin via public.user_roles —
-- non-admin sessions can't read or write. The reporter/assignee can be
-- any user, but only admins use the table.

create table if not exists public.admin_items (
  id              uuid default gen_random_uuid() primary key,
  title           text not null check (length(title) between 1 and 280),
  description     text,
  status          text not null default 'backlog'
                  check (status in ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked')),
  priority        text not null default 'medium'
                  check (priority in ('low', 'medium', 'high', 'critical')),
  category        text default 'general',
  tags            jsonb default '[]'::jsonb,
  assignee_id     uuid references public.profiles(id) on delete set null,
  reporter_id     uuid references public.profiles(id) on delete set null,
  due_date        timestamptz,
  position        double precision default 0,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists admin_items_status_position_idx
  on public.admin_items (status, position)
  where archived_at is null;

create index if not exists admin_items_assignee_idx
  on public.admin_items (assignee_id)
  where archived_at is null;

create index if not exists admin_items_priority_idx
  on public.admin_items (priority)
  where archived_at is null;

-- Auto-touch updated_at on every UPDATE so clients can do
-- last-writer-wins without their own clock.
create or replace function public.admin_items_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists admin_items_touch on public.admin_items;
create trigger admin_items_touch
  before update on public.admin_items
  for each row execute function public.admin_items_touch_updated_at();

-- Activity log per item — small audit trail so we can see who moved
-- the card from "todo" to "done" without digging into pg logs.
create table if not exists public.admin_item_events (
  id           uuid default gen_random_uuid() primary key,
  item_id      uuid not null references public.admin_items(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,
  type         text not null check (type in ('create','status_change','priority_change','assign','comment','archive')),
  payload      jsonb,
  created_at   timestamptz default now()
);

create index if not exists admin_item_events_item_idx
  on public.admin_item_events (item_id, created_at desc);

-- RLS — only admins can touch the table.
alter table public.admin_items       enable row level security;
alter table public.admin_item_events enable row level security;

-- Helper predicate inlined into each policy. We don't make a SQL
-- function for this because the cost of the EXISTS lookup is trivial
-- compared to the round-trip and inlining keeps RLS auditable in one
-- place.
drop policy if exists "Admins read items"   on public.admin_items;
create policy "Admins read items"   on public.admin_items
  for select using (
    exists (select 1 from public.user_roles
            where user_id = auth.uid() and role in ('admin','super_admin'))
  );

drop policy if exists "Admins write items"  on public.admin_items;
create policy "Admins write items"  on public.admin_items
  for all using (
    exists (select 1 from public.user_roles
            where user_id = auth.uid() and role in ('admin','super_admin'))
  ) with check (
    exists (select 1 from public.user_roles
            where user_id = auth.uid() and role in ('admin','super_admin'))
  );

drop policy if exists "Admins read events"  on public.admin_item_events;
create policy "Admins read events"  on public.admin_item_events
  for select using (
    exists (select 1 from public.user_roles
            where user_id = auth.uid() and role in ('admin','super_admin'))
  );

drop policy if exists "Admins write events" on public.admin_item_events;
create policy "Admins write events" on public.admin_item_events
  for all using (
    exists (select 1 from public.user_roles
            where user_id = auth.uid() and role in ('admin','super_admin'))
  ) with check (
    exists (select 1 from public.user_roles
            where user_id = auth.uid() and role in ('admin','super_admin'))
  );
