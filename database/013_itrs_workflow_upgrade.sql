-- ==========================================
-- POMELO QC System — Migration
-- 013: Upgrade ITRs table for multi-step workflow
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- Requires: 012_itr_statuses.sql run first
-- ==========================================

-- Step 1: Add status_id FK (replaces old enum status)
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS status_id uuid NULL
    REFERENCES public.itr_statuses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_itrs_status_id ON public.itrs USING btree (status_id);

-- Step 2: Add ITP link
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS itp_id uuid NULL
    REFERENCES public.itps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_itrs_itp_id ON public.itrs USING btree (itp_id);

-- Step 3: Add Material link
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS material_id uuid NULL
    REFERENCES public.materials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_itrs_material_id ON public.itrs USING btree (material_id);

-- Step 4: Add file-link fields (external URL / text inputs)
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS itr_request_file_link   text NULL,
  ADD COLUMN IF NOT EXISTS itr_report_file_link    text NULL,
  ADD COLUMN IF NOT EXISTS approved_report_file_link text NULL;

-- Step 5: Add QC notes (accumulated across stages)
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS qc_notes text NULL;

-- Step 6: Add per-state user tracking (who + when for each workflow step)
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS draft_by                uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS draft_at                timestamptz NULL,
  ADD COLUMN IF NOT EXISTS internal_request_by     uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS internal_request_at     timestamptz NULL,
  ADD COLUMN IF NOT EXISTS external_request_by     uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_request_at     timestamptz NULL,
  ADD COLUMN IF NOT EXISTS report_submitted_by     uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_submitted_at     timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approved_by             uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at             timestamptz NULL;

-- Step 7: Add category column to itr_attachments
-- Categories: drawing, do, additional, image, itr_request, itr_report, approved_report
ALTER TABLE public.itr_attachments
  ADD COLUMN IF NOT EXISTS category text NULL DEFAULT 'additional';

-- Step 8: Add stage column to itr_attachments (which workflow step the file was added)
-- Stores the status code when the file was uploaded
ALTER TABLE public.itr_attachments
  ADD COLUMN IF NOT EXISTS stage text NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_itr_att_category ON public.itr_attachments USING btree (itr_id, category);
