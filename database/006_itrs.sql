-- ==========================================
-- POMELO QC System — Supabase Database Schema
-- 006: ITR (Inspection & Test Requests) tables
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- Requires: 003_tasks.sql + 005_areas.sql run first
-- ==========================================

-- Step 1: Enums (guarded against already-exists)
DO $$ BEGIN
  CREATE TYPE public.itr_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.itr_type AS ENUM ('inspection', 'test', 'survey', 'commissioning');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 2: itrs table
CREATE TABLE IF NOT EXISTS public.itrs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id         uuid        NULL     REFERENCES public.tasks(id)    ON DELETE SET NULL,
  area_id         uuid        NULL     REFERENCES public.areas(id)    ON DELETE SET NULL,
  itr_number      text        NULL,        -- e.g. "ITR-001", unique per project
  title           text        NOT NULL,
  itr_type        public.itr_type    NOT NULL DEFAULT 'inspection',
  discipline      public.discipline  NOT NULL DEFAULT 'general',
  status          public.itr_status  NOT NULL DEFAULT 'draft',
  location        text        NULL,
  notes           text        NULL,
  inspection_date date        NULL,
  submitted_at    timestamptz NULL,
  submitted_by    uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz NULL,
  reviewed_by     uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  review_notes    text        NULL,
  created_by      uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NULL DEFAULT now(),
  updated_at      timestamptz NULL DEFAULT now(),

  CONSTRAINT itrs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Step 3: itr_attachments table
CREATE TABLE IF NOT EXISTS public.itr_attachments (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  itr_id      uuid        NOT NULL REFERENCES public.itrs(id) ON DELETE CASCADE,
  file_name   text        NOT NULL,
  file_url    text        NOT NULL,   -- R2 public URL
  file_type   text        NULL,       -- MIME type
  file_size   integer     NULL,       -- bytes
  uploaded_by uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NULL DEFAULT now(),

  CONSTRAINT itr_attachments_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Step 4: Indexes
CREATE INDEX IF NOT EXISTS idx_itrs_project_id    ON public.itrs USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_itrs_task_id       ON public.itrs USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_itrs_area_id       ON public.itrs USING btree (area_id);
CREATE INDEX IF NOT EXISTS idx_itrs_status        ON public.itrs USING btree (project_id, status);
CREATE INDEX IF NOT EXISTS idx_itr_att_itr_id     ON public.itr_attachments USING btree (itr_id);

-- Step 5: RLS
ALTER TABLE public.itrs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itr_attachments  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "itrs_select_all" ON public.itrs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itrs_insert_all" ON public.itrs FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itrs_update_all" ON public.itrs FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itrs_delete_all" ON public.itrs FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "itr_att_select_all" ON public.itr_attachments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_att_insert_all" ON public.itr_attachments FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_att_update_all" ON public.itr_attachments FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_att_delete_all" ON public.itr_attachments FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 6: Auto-update trigger
DROP TRIGGER IF EXISTS on_itrs_updated ON public.itrs;
CREATE TRIGGER on_itrs_updated
  BEFORE UPDATE ON public.itrs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
