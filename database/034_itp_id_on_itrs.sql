-- ==========================================
-- POMELO QC System — Migration
-- 034: Add itp_id foreign key to itrs
-- Each ITR can reference at most one ITP.
-- This drives which HTML checklists are available for selection on that ITR.
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 1: Add itp_id column ────────────────────────────────────────────────

ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS itp_id uuid NULL
    REFERENCES public.itps(id) ON DELETE SET NULL;

-- ── Step 2: Index ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_itrs_itp_id
  ON public.itrs USING btree (itp_id);

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- itp_id is nullable: ITRs that pre-date or don't require a formal ITP are allowed.
-- The application enforces that itr_checklist_selections.checklist_id belongs
-- to the same Itp as itr.itp_id (checked at write time in the Vue store).
