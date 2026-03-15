-- ==========================================
-- POMELO QC System — Migration
-- 012: ITR Statuses table (per-project workflow states)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Create itr_statuses table (per-project)
CREATE TABLE IF NOT EXISTS public.itr_statuses (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code        text        NOT NULL,   -- e.g. plan, internal_request, external_request, report_submitted, approved
  title       text        NOT NULL,   -- display name
  sort_order  integer     NOT NULL DEFAULT 0,
  color       text        NULL,       -- hex color for UI badges
  icon        text        NULL,       -- MDI icon name
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NULL DEFAULT now(),
  updated_at  timestamptz NULL DEFAULT now(),

  CONSTRAINT itr_statuses_pkey             PRIMARY KEY (id),
  CONSTRAINT itr_statuses_project_code_uq  UNIQUE (project_id, code)
) TABLESPACE pg_default;

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_itr_statuses_project_id  ON public.itr_statuses USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_itr_statuses_sort_order  ON public.itr_statuses USING btree (project_id, sort_order);

-- Step 3: RLS
ALTER TABLE public.itr_statuses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "itr_statuses_select_all" ON public.itr_statuses FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_statuses_insert_all" ON public.itr_statuses FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_statuses_update_all" ON public.itr_statuses FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "itr_statuses_delete_all" ON public.itr_statuses FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 4a: Rename any existing 'draft' code rows to 'plan'
UPDATE public.itr_statuses SET code = 'plan', title = 'Plan' WHERE code = 'draft';

-- Step 4b: Auto-update trigger
DROP TRIGGER IF EXISTS on_itr_statuses_updated ON public.itr_statuses;
CREATE TRIGGER on_itr_statuses_updated
  BEFORE UPDATE ON public.itr_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
