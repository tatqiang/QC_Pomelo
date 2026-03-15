-- ==========================================
-- POMELO QC System — Migration
-- 016: Change itr_attachments.stage from text code → status_id (uuid FK)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Add status_id column to itr_attachments
ALTER TABLE public.itr_attachments
  ADD COLUMN IF NOT EXISTS status_id uuid NULL
    REFERENCES public.itr_statuses(id) ON DELETE SET NULL;

-- Step 2: Migrate existing stage text values to status_id
-- Match stage text to itr_statuses.code for the same project
UPDATE public.itr_attachments a
SET status_id = s.id
FROM public.itrs i,
     public.itr_statuses s
WHERE a.itr_id = i.id
  AND s.project_id = i.project_id
  AND s.code = a.stage
  AND a.status_id IS NULL
  AND a.stage IS NOT NULL;

-- Step 3: Drop the old stage text column
ALTER TABLE public.itr_attachments DROP COLUMN IF EXISTS stage;
