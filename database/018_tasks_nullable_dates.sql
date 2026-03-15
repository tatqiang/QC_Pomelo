-- ==========================================
-- POMELO QC System — Migration
-- 018: Allow NULL start_date / end_date on tasks
--      Parent/group tasks have no own dates — their bar span is auto-derived
--      from the earliest/latest dates of their subtasks (computed in frontend).
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent — ALTER COLUMN on already-nullable columns is a no-op)
-- ==========================================

ALTER TABLE public.tasks
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date   DROP NOT NULL;
