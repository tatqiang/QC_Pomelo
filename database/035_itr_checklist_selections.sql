-- ==========================================
-- POMELO QC System — Migration
-- 035: ITR Checklist Selections
-- Junction table: which HTML checklists an ITR has selected for use.
-- An ITR may select many checklists, but only from the ITP assigned to that ITR.
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 1: itr_checklist_selections ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.itr_checklist_selections (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  itr_id         uuid        NOT NULL REFERENCES public.itrs(id) ON DELETE CASCADE,
  checklist_id   uuid        NOT NULL REFERENCES public.itp_html_checklists(id) ON DELETE CASCADE,
  display_order  int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itr_checklist_selections_pkey      PRIMARY KEY (id),
  CONSTRAINT itr_checklist_sel_itr_checklist_uniq UNIQUE (itr_id, checklist_id)
) TABLESPACE pg_default;

-- ── Step 2: Indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_itr_checklist_sel_itr_id
  ON public.itr_checklist_selections USING btree (itr_id);

CREATE INDEX IF NOT EXISTS idx_itr_checklist_sel_checklist_id
  ON public.itr_checklist_selections USING btree (checklist_id);

-- ── Step 3: Enable RLS ───────────────────────────────────────────────────────

ALTER TABLE public.itr_checklist_selections ENABLE ROW LEVEL SECURITY;

-- ── Step 4: RLS Policies ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "itr_checklist_sel_select_all" ON public.itr_checklist_selections
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itr_checklist_sel_insert_all" ON public.itr_checklist_selections
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itr_checklist_sel_update_all" ON public.itr_checklist_selections
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itr_checklist_sel_delete_all" ON public.itr_checklist_selections
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- display_order: controls rendering sequence in the ITR checklist list / print view.
-- The unique constraint prevents duplicate selection of the same checklist on one ITR.
-- ITP-match constraint (itr.itp_id == checklist.itp_id) is enforced by the Vue store
-- at insert time, not at DB level, to avoid a complex cross-table CHECK constraint.
