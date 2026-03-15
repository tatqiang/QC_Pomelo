-- ==========================================
-- POMELO QC System — Supabase Database Schema
-- 005: Areas table (hierarchical location tree per project)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.areas (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id   uuid        NULL     REFERENCES public.areas(id)   ON DELETE CASCADE,
  name        text        NOT NULL,
  code        text        NULL,        -- short label e.g. "BLD-A", "Z1", "RM-101"
  description text        NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NULL DEFAULT now(),
  updated_at  timestamptz NULL DEFAULT now(),

  CONSTRAINT areas_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_areas_project_id ON public.areas USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_areas_parent_id  ON public.areas USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_areas_sort_order ON public.areas USING btree (project_id, sort_order);

-- RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "areas_select_all" ON public.areas FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "areas_insert_all" ON public.areas FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "areas_update_all" ON public.areas FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "areas_delete_all" ON public.areas FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS on_areas_updated ON public.areas;
CREATE TRIGGER on_areas_updated
  BEFORE UPDATE ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
