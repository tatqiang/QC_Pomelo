-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 22: Task → Areas (1:M junction)
-- Replaces the single area_id column with a
-- proper many-to-many junction table.
-- The original area_id column is kept for
-- backward-compatibility with ITRs (holds
-- the "primary" area = first linked area).
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- Step 1: Create junction table
CREATE TABLE IF NOT EXISTS public.task_areas (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES public.tasks(id)  ON DELETE CASCADE,
  area_id    uuid        NOT NULL REFERENCES public.areas(id)  ON DELETE CASCADE,
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT task_areas_pkey PRIMARY KEY (id),
  CONSTRAINT task_areas_unique UNIQUE (task_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_task_areas_task_id ON public.task_areas USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_task_areas_area_id ON public.task_areas USING btree (area_id);

-- Step 2: Enable RLS
ALTER TABLE public.task_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_areas_select_all" ON public.task_areas FOR SELECT USING (true);
CREATE POLICY "task_areas_insert"     ON public.task_areas FOR INSERT WITH CHECK (true);
CREATE POLICY "task_areas_update"     ON public.task_areas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "task_areas_delete"     ON public.task_areas FOR DELETE USING (true);

-- Step 3: Migrate existing area_id data → junction table
INSERT INTO public.task_areas (task_id, area_id, sort_order)
SELECT id, area_id, 0
FROM   public.tasks
WHERE  area_id IS NOT NULL
ON CONFLICT (task_id, area_id) DO NOTHING;
