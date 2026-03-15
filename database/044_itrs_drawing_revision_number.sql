-- ==========================================
-- 044: Add drawing_number and revision_number to itrs
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS drawing_number text NULL,
  ADD COLUMN IF NOT EXISTS revision_number text NULL;
