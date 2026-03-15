-- ==========================================
-- POMELO QC System — Migration
-- 008: Add location (free-text) to tasks
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS location text NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_location
  ON public.tasks USING gin (to_tsvector('simple', coalesce(location, '')));
