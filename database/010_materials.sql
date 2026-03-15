-- ==========================================
-- POMELO QC System — Migration
-- 010: Material Approval (MTA) register table
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
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

  CONSTRAINT materials_pkey PRIMARY KEY (id),
  -- doc_no must be unique within a project (used as upsert key)
  CONSTRAINT materials_doc_no_project_unique UNIQUE (project_id, doc_no)
) TABLESPACE pg_default;

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_materials_project_id    ON public.materials USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_materials_discipline_id ON public.materials USING btree (discipline_id);
CREATE INDEX IF NOT EXISTS idx_materials_doc_no        ON public.materials USING btree (project_id, doc_no);

-- Step 3: Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
DO $$ BEGIN
  CREATE POLICY "materials_select_all" ON public.materials FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "materials_insert_all" ON public.materials FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "materials_update_all" ON public.materials FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "materials_delete_all" ON public.materials FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 5: Auto-update updated_at trigger
DROP TRIGGER IF EXISTS on_materials_updated ON public.materials;
CREATE TRIGGER on_materials_updated
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
