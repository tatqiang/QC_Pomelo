-- ==========================================
-- POMELO QC System — Supabase Database Schema
-- 011: ITR Types table (per-project lookup)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- Requires: 002_projects.sql + 006_itrs.sql run first
-- ==========================================

-- Step 1: Create itr_types table (per-project, like disciplines)
CREATE TABLE IF NOT EXISTS public.itr_types (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code        text        NOT NULL,   -- short code e.g. INSP, TEST, SRV, COM
  title       text        NOT NULL,   -- display name e.g. Inspection, Test
  color       text        NULL,       -- optional hex colour for UI badges
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NULL DEFAULT now(),
  updated_at  timestamptz NULL DEFAULT now(),

  CONSTRAINT itr_types_pkey              PRIMARY KEY (id),
  CONSTRAINT itr_types_project_code_uq   UNIQUE (project_id, code)
) TABLESPACE pg_default;

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_itr_types_project_id  ON public.itr_types USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_itr_types_sort_order  ON public.itr_types USING btree (project_id, sort_order);

-- Step 3: RLS
ALTER TABLE public.itr_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "itr_types_select_all" ON public.itr_types FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_types_insert_all" ON public.itr_types FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_types_update_all" ON public.itr_types FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_types_delete_all" ON public.itr_types FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 4: Auto-update trigger
DROP TRIGGER IF EXISTS on_itr_types_updated ON public.itr_types;
CREATE TRIGGER on_itr_types_updated
  BEFORE UPDATE ON public.itr_types
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Step 5: Add itr_type_id FK column to itrs (nullable for backward compat)
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS itr_type_id uuid NULL
    REFERENCES public.itr_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_itrs_itr_type_id ON public.itrs USING btree (itr_type_id);
