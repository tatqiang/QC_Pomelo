-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 21: Projects – is_test flag
-- Marks projects as "under test"; only
-- system_admin / admin roles can see them.
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- Step 1: Add is_test column (default false = visible to everyone)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Step 2: Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_projects_is_test ON public.projects USING btree (is_test);

-- Step 3: (Optional) mark specific projects as test
-- UPDATE public.projects SET is_test = true WHERE name = 'Under Test';
