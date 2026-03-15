-- ==========================================
-- POMELO QC System — Migration
-- 042: ITR Report Pages Config
-- Stores the user's last report-builder configuration per ITR so it can be
-- restored automatically when the builder is reopened.
-- One row per ITR (upserted on each save).
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 1: itr_report_pages ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.itr_report_pages (
  itr_id     uuid        NOT NULL REFERENCES public.itrs(id) ON DELETE CASCADE,
  config     jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid        REFERENCES auth.users(id),

  CONSTRAINT itr_report_pages_pkey PRIMARY KEY (itr_id)
) TABLESPACE pg_default;

-- Index for quick lookup by itr_id
CREATE INDEX IF NOT EXISTS idx_itr_report_pages_itr_id
  ON public.itr_report_pages USING btree (itr_id);

-- ── Step 2: Enable RLS ───────────────────────────────────────────────────────

ALTER TABLE public.itr_report_pages ENABLE ROW LEVEL SECURITY;

-- ── Step 3: RLS Policies ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "itr_report_pages_select_all" ON public.itr_report_pages FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_report_pages_insert_all" ON public.itr_report_pages FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_report_pages_update_all" ON public.itr_report_pages FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_report_pages_delete_all" ON public.itr_report_pages FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── config JSONB schema (informational) ──────────────────────────────────────
--
-- {
--   "version": 1,
--   "selection": [
--     {
--       "id": "<local uid>",
--       "type": "html_form" | "pdf_page" | "image",
--       "label": "...",
--       "formCode": "itr_cover" | "photo_report" | "<checklist id>",   -- html_form only
--       "fileUrl": "https://...",                                        -- pdf_page only
--       "pageNum": 1,                                                    -- pdf_page only
--       "attachmentUrl": "https://...",                                  -- image only
--       "photoSlots": [null, "https://...", ...],                        -- photo_report only (8 items)
--       "photoDescs": ["caption 1", ...],                                -- photo_report only (4 items)
--     },
--     ...
--   ]
-- }
--
-- ─────────────────────────────────────────────────────────────────────────────
