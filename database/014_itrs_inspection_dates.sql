-- ==========================================
-- POMELO QC System — Migration
-- 014: Split inspection_date into three separate fields
--   1. planned_inspection_date  — requested date set in Draft form
--   2. req_inspection_date      — confirmed date set in Internal Request (stage 2)
--   3. inspection_date          — actual inspection date filled in Report Submitted (stage 4)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS planned_inspection_date text NULL,
  ADD COLUMN IF NOT EXISTS req_inspection_date     text NULL;

-- Migrate any existing data: copy old inspection_date into planned_inspection_date
-- (best-effort — old rows had only one date stored at draft time)
UPDATE public.itrs
SET planned_inspection_date = inspection_date
WHERE planned_inspection_date IS NULL
  AND inspection_date IS NOT NULL;

-- inspection_date is now reserved for the ACTUAL inspection date (stage 4)
-- Optionally clear it so existing rows don't show a stale value in the Report Submitted panel:
-- UPDATE public.itrs SET inspection_date = NULL;
-- (commented out — leave decision to the operator)
