-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 4: Tasks table (WBS hierarchy for Gantt)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Enums (DO blocks guard against "already exists")
DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM (
    'not_started', 'in_progress', 'completed', 'on_hold'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discipline AS ENUM (
    'civil', 'mechanical', 'electrical', 'plumbing',
    'hvac', 'fire', 'instrumentation', 'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid                   NOT NULL DEFAULT gen_random_uuid(),
  project_id   uuid                   NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id    uuid                   NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  wbs_code     text                   NULL,      -- e.g. "1", "1.1", "1.1.2"
  name         text                   NOT NULL,
  discipline   public.discipline      NULL DEFAULT 'general',
  status       public.task_status     NULL DEFAULT 'not_started',
  progress     integer                NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date   date                   NOT NULL,
  end_date     date                   NOT NULL,
  sort_order   integer                NOT NULL DEFAULT 0,
  notes        text                   NULL,
  created_by   uuid                   NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz            NULL DEFAULT now(),
  updated_at   timestamptz            NULL DEFAULT now(),

  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_dates_check CHECK (end_date >= start_date)
) TABLESPACE pg_default;

-- Step 3: Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id  ON public.tasks USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wbs_code   ON public.tasks USING btree (project_id, wbs_code);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks USING btree (project_id, sort_order);

-- Step 4: Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies
DO $$ BEGIN
  CREATE POLICY "tasks_select_all" ON public.tasks FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "tasks_insert_all" ON public.tasks FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "tasks_update_all" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "tasks_delete_all" ON public.tasks FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 6: Auto-update updated_at trigger
DROP TRIGGER IF EXISTS on_tasks_updated ON public.tasks;
CREATE TRIGGER on_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

