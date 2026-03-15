-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 23: ITR → Areas (1:M junction)
-- Mirrors the task_areas pattern.
-- Keeps itrs.area_id as the "primary" area
-- (first in the list) for backward-compat.
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- Step 1: Create junction table
CREATE TABLE IF NOT EXISTS public.itr_areas (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  itr_id     uuid        NOT NULL REFERENCES public.itrs(id)   ON DELETE CASCADE,
  area_id    uuid        NOT NULL REFERENCES public.areas(id)  ON DELETE CASCADE,
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itr_areas_pkey   PRIMARY KEY (id),
  CONSTRAINT itr_areas_unique UNIQUE (itr_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_itr_areas_itr_id  ON public.itr_areas USING btree (itr_id);
CREATE INDEX IF NOT EXISTS idx_itr_areas_area_id ON public.itr_areas USING btree (area_id);

-- Step 2: Enable RLS
ALTER TABLE public.itr_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itr_areas_select_all" ON public.itr_areas FOR SELECT USING (true);
CREATE POLICY "itr_areas_insert"     ON public.itr_areas FOR INSERT WITH CHECK (true);
CREATE POLICY "itr_areas_update"     ON public.itr_areas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "itr_areas_delete"     ON public.itr_areas FOR DELETE USING (true);

-- Step 3: Migrate existing area_id data → junction table
INSERT INTO public.itr_areas (itr_id, area_id, sort_order)
SELECT id, area_id, 0
FROM   public.itrs
WHERE  area_id IS NOT NULL
ON CONFLICT (itr_id, area_id) DO NOTHING;
