-- ─────────────────────────────────────────────────────────────────────────────
-- 048  task_todos — allow ITR-only todos (no task required)
--      • Makes task_id nullable so todos can belong to an ITR directly
--      • Adds itr_id FK → itrs(id) on delete cascade
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make task_id optional (drop NOT NULL constraint; FK stays)
alter table task_todos alter column task_id drop not null;

-- 2. Add itr_id column (nullable FK to itrs)
alter table task_todos add column if not exists itr_id uuid
    references itrs(id) on delete cascade;

-- 3. Index for fast lookup by itr
create index if not exists task_todos_itr_id_idx on task_todos(itr_id);
