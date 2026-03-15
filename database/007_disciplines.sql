-- ==========================================
-- POMELO QC System — Supabase Database Schema
-- 007: Disciplines table (per-project lookup)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.disciplines (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code        text        NOT NULL,   -- short code e.g. M, FP, E, P, S
  title       text        NOT NULL,   -- display name e.g. HVAC, Fire Protection
  color       text        NULL,       -- optional hex colour for UI badges
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NULL DEFAULT now(),
  updated_at  timestamptz NULL DEFAULT now(),

  CONSTRAINT disciplines_pkey              PRIMARY KEY (id),
  CONSTRAINT disciplines_project_code_uq   UNIQUE (project_id, code)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disciplines_project_id ON public.disciplines USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_disciplines_sort_order ON public.disciplines USING btree (project_id, sort_order);

-- RLS
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "disciplines_select_all" ON public.disciplines FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "disciplines_insert_all" ON public.disciplines FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "disciplines_update_all" ON public.disciplines FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "disciplines_delete_all" ON public.disciplines FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-update trigger
DROP TRIGGER IF EXISTS on_disciplines_updated ON public.disciplines;
CREATE TRIGGER on_disciplines_updated
  BEFORE UPDATE ON public.disciplines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
