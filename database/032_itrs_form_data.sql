-- ==========================================
-- POMELO QC System — Migration
-- 032: Add form_data JSONB column to itrs
-- Stores user-filled PDF form fields per form type.
-- Structure: { "itr_cover": { to, dwgNo, inspectionItems: [...] }, "photo_report": { ... }, ... }
-- Safe to re-run (idempotent via IF NOT EXISTS / DO $$)
-- ==========================================

ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS form_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.itrs.form_data IS
  'User-filled PDF form fields keyed by form code. '
  'Example: {"itr_cover":{"to":"Owner","dwgNo":"ZZ-001","inspectionItems":[{"item":"Pre Fab Pipes","location":"MYD","dateTime":"02 Mar 26"}]}}';
