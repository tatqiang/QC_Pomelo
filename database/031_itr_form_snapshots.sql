-- ==========================================
-- POMELO QC System — Migration
-- 031: ITR Form Snapshots
-- Records which master form revision was active when an ITR was created.
-- This ensures old ITRs always open with the same form template used at creation.
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 1: itr_form_snapshots ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.itr_form_snapshots (
  itr_id       uuid        NOT NULL REFERENCES public.itrs(id) ON DELETE CASCADE,
  form_code    text        NOT NULL,   -- 'itr_cover' | 'photo_report'
  revision_id  uuid        NOT NULL REFERENCES public.master_form_revisions(id) ON DELETE RESTRICT,
  locked_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itr_form_snapshots_pkey PRIMARY KEY (itr_id, form_code)
) TABLESPACE pg_default;

-- Index for quick lookup by itr_id
CREATE INDEX IF NOT EXISTS idx_itr_form_snapshots_itr_id
  ON public.itr_form_snapshots USING btree (itr_id);

-- ── Step 2: Enable RLS ───────────────────────────────────────────────────────

ALTER TABLE public.itr_form_snapshots ENABLE ROW LEVEL SECURITY;

-- ── Step 3: RLS Policies ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "itr_form_snapshots_select_all" ON public.itr_form_snapshots FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_form_snapshots_insert_all" ON public.itr_form_snapshots FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_form_snapshots_update_all" ON public.itr_form_snapshots FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_form_snapshots_delete_all" ON public.itr_form_snapshots FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
