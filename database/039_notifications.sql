-- ─────────────────────────────────────────────────────────────────────────────
-- 039  notifications — in-app notifications for project members
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists notifications (
    id          uuid primary key default gen_random_uuid(),
    project_id  uuid references projects(id) on delete cascade,
    user_id     uuid not null references users(id) on delete cascade,
    type        text not null,           -- e.g. 'todo_created', 'todo_assigned'
    title       text not null,
    body        text,
    link        text,                    -- optional frontend route
    ref_id      uuid,                    -- e.g. task_id or todo_id
    is_read     boolean not null default false,
    created_by  uuid references users(id) on delete set null,
    created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_idx    on notifications(user_id);
create index if not exists notifications_project_id_idx on notifications(project_id);
create index if not exists notifications_is_read_idx    on notifications(user_id, is_read);

alter table notifications enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where tablename = 'notifications' loop
    execute format('drop policy if exists %I on notifications', r.policyname);
  end loop;
end $$;

create policy "notifications_select" on notifications for select using (true);
create policy "notifications_insert" on notifications for insert with check (true);
create policy "notifications_update" on notifications for update using (true) with check (true);
create policy "notifications_delete" on notifications for delete using (true);

-- Enable Realtime for this table (safe to re-run)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

notify pgrst, 'reload schema';
