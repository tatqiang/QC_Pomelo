-- ─────────────────────────────────────────────────────────────────────────────
-- 038  task_todo_files  — file attachments for task to-do items
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists task_todo_files (
    id           uuid primary key default gen_random_uuid(),
    todo_id      uuid not null references task_todos(id) on delete cascade,
    project_id   uuid not null references projects(id) on delete cascade,
    file_name    text not null,
    file_url     text not null,
    file_type    text,
    file_size    bigint,
    uploaded_by  uuid references users(id) on delete set null,
    uploaded_at  timestamptz not null default now()
);

create index if not exists task_todo_files_todo_id_idx     on task_todo_files(todo_id);
create index if not exists task_todo_files_project_id_idx  on task_todo_files(project_id);

-- RLS
alter table task_todo_files enable row level security;

drop policy if exists "task_todo_files_select" on task_todo_files;
drop policy if exists "task_todo_files_insert" on task_todo_files;
drop policy if exists "task_todo_files_update" on task_todo_files;
drop policy if exists "task_todo_files_delete" on task_todo_files;

create policy "task_todo_files_select" on task_todo_files for select using (true);
create policy "task_todo_files_insert" on task_todo_files for insert with check (true);
create policy "task_todo_files_update" on task_todo_files for update using (true) with check (true);
create policy "task_todo_files_delete" on task_todo_files for delete using (true);
