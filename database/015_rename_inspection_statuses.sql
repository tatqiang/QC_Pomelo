-- ==========================================
-- POMELO QC System — Migration
-- 015: Rename status titles: Internal Request → Internal Inspection,
--      External Request → External Inspection
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

UPDATE public.itr_statuses
SET title = 'Internal Inspection', updated_at = now()
WHERE code = 'internal_request' AND title != 'Internal Inspection';

UPDATE public.itr_statuses
SET title = 'External Inspection', updated_at = now()
WHERE code = 'external_request' AND title != 'External Inspection';
