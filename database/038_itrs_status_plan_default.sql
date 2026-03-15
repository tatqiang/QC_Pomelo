-- ==========================================
-- POMELO QC System — Migration
-- 038: Update legacy `status` enum on itrs table
--      • Add 'plan' value to itr_status enum
--      • Change default from 'draft' to 'plan'
--      • Back-fill existing 'draft' rows to 'plan'
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Add 'plan' to the itr_status enum (no-op if already present)
DO $$ BEGIN
  ALTER TYPE public.itr_status ADD VALUE IF NOT EXISTS 'plan';
EXCEPTION WHEN others THEN NULL; END $$;

-- Step 2: Change the column default to 'plan'
ALTER TABLE public.itrs
  ALTER COLUMN status SET DEFAULT 'plan';

-- Step 3: Back-fill existing rows that still carry 'draft'
UPDATE public.itrs
  SET status = 'plan'
  WHERE status = 'draft';
