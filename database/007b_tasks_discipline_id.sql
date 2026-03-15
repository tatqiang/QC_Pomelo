-- ==========================================
-- POMELO QC System — Migration
-- 007b: Add discipline_id FK to tasks + itrs
-- Run AFTER 007_disciplines.sql
-- Safe to re-run (idempotent)
-- ==========================================

-- Add discipline_id to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS discipline_id uuid NULL
    REFERENCES public.disciplines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_discipline_id
  ON public.tasks USING btree (discipline_id);

-- Add discipline_id to itrs
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS discipline_id uuid NULL
    REFERENCES public.disciplines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_itrs_discipline_id
  ON public.itrs USING btree (discipline_id);
