-- ==========================================
-- POMELO QC System — Migration
-- 009: Inspection and Test Plan (ITP) table
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Create itps table
CREATE TABLE IF NOT EXISTS public.itps (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES public.projects(id)    ON DELETE CASCADE,
  discipline_id uuid        NULL     REFERENCES public.disciplines(id) ON DELETE SET NULL,
  doc_no        text        NOT NULL,
  title         text        NOT NULL,
  last_revision text        NULL,
  revision_date date        NULL,
  status        text        NULL,
  document_link text        NULL,
  created_at    timestamptz NULL DEFAULT now(),
  updated_at    timestamptz NULL DEFAULT now(),

  CONSTRAINT itps_pkey PRIMARY KEY (id),
  -- doc_no must be unique within a project (used as upsert key)
  CONSTRAINT itps_doc_no_project_unique UNIQUE (project_id, doc_no)
) TABLESPACE pg_default;

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_itps_project_id    ON public.itps USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_itps_discipline_id ON public.itps USING btree (discipline_id);
CREATE INDEX IF NOT EXISTS idx_itps_doc_no        ON public.itps USING btree (project_id, doc_no);

-- Step 3: Enable RLS
ALTER TABLE public.itps ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
DO $$ BEGIN
  CREATE POLICY "itps_select_all" ON public.itps FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itps_insert_all" ON public.itps FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itps_update_all" ON public.itps FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itps_delete_all" ON public.itps FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 5: Auto-update updated_at trigger
DROP TRIGGER IF EXISTS on_itps_updated ON public.itps;
CREATE TRIGGER on_itps_updated
  BEFORE UPDATE ON public.itps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
