-- ==========================================
-- POMELO QC System — Migration
-- 049: Add description column to itr_statuses
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

ALTER TABLE public.itr_statuses
  ADD COLUMN IF NOT EXISTS description text NULL;
