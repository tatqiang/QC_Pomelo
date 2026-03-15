-- ─────────────────────────────────────────────────────────────────────────────
-- 037  task_todos  — per-task to-do / action items
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists task_todos (
    id           uuid primary key default gen_random_uuid(),
    task_id      uuid not null references tasks(id) on delete cascade,
    project_id   uuid not null references projects(id) on delete cascade,
    title        text not null,
    notes        text,
    link         text,
    assigned_to  uuid references users(id) on delete set null,
    due_date     date,
    is_done      boolean not null default false,
    sort_order   integer not null default 0,
    created_by   uuid references users(id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- Add link column if table already existed without it
alter table task_todos add column if not exists link text;

-- Index for fast lookup by task
create index if not exists task_todos_task_id_idx on task_todos(task_id);
create index if not exists task_todos_project_id_idx on task_todos(project_id);

-- Auto-update updated_at
create or replace function update_task_todos_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_task_todos_updated_at on task_todos;
create trigger trg_task_todos_updated_at
    before update on task_todos
    for each row execute function update_task_todos_updated_at();

-- RLS
alter table task_todos enable row level security;

drop policy if exists "task_todos_select" on task_todos;
drop policy if exists "task_todos_insert" on task_todos;
drop policy if exists "task_todos_update" on task_todos;
drop policy if exists "task_todos_delete" on task_todos;

create policy "task_todos_select" on task_todos for select using (true);
create policy "task_todos_insert" on task_todos for insert with check (true);
create policy "task_todos_update" on task_todos for update using (true) with check (true);
create policy "task_todos_delete" on task_todos for delete using (true);
