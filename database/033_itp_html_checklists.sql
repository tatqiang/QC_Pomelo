-- ==========================================
-- POMELO QC System — Migration
-- 033: ITP HTML Checklists
-- Stores self-contained HTML checklist templates linked to an ITP.
-- Each HTML file is stored inline (html_content TEXT) — no external storage required.
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 1: itp_html_checklists ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.itp_html_checklists (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  itp_id        uuid        NOT NULL REFERENCES public.itps(id) ON DELETE CASCADE,
  code          text        NOT NULL,   -- e.g. 'EE-002', 'GR-01'
  title         text        NOT NULL,   -- e.g. 'Grounding Inspection Report'
  discipline    text        NULL,       -- e.g. 'E', 'M', 'FP' (informational, denormalised)
  html_content  text        NOT NULL,   -- full self-contained HTML stored inline
  field_schema  jsonb       NULL,       -- auto-extracted data-key list: ["report-no","form-date",...]
  version       text        NOT NULL DEFAULT 'Rev0',
  is_active     boolean     NOT NULL DEFAULT true,
  created_by    uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itp_html_checklists_pkey              PRIMARY KEY (id),
  CONSTRAINT itp_html_checklists_itp_code_uniq     UNIQUE (itp_id, code)
) TABLESPACE pg_default;

-- ── Step 2: Indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_itp_html_checklists_itp_id
  ON public.itp_html_checklists USING btree (itp_id);

CREATE INDEX IF NOT EXISTS idx_itp_html_checklists_active
  ON public.itp_html_checklists USING btree (itp_id, is_active)
  WHERE is_active = true;

-- ── Step 3: Auto-update updated_at trigger ───────────────────────────────────

DROP TRIGGER IF EXISTS on_itp_html_checklists_updated ON public.itp_html_checklists;
CREATE TRIGGER on_itp_html_checklists_updated
  BEFORE UPDATE ON public.itp_html_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ── Step 4: Enable RLS ───────────────────────────────────────────────────────

ALTER TABLE public.itp_html_checklists ENABLE ROW LEVEL SECURITY;

-- ── Step 5: RLS Policies ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "itp_html_checklists_select_all" ON public.itp_html_checklists
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itp_html_checklists_insert_all" ON public.itp_html_checklists
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itp_html_checklists_update_all" ON public.itp_html_checklists
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itp_html_checklists_delete_all" ON public.itp_html_checklists
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- field_schema example:
--   ["report-no", "form-date", "grounding-rod-length", "resistance-value"]
--   (sys: prefixed keys are excluded — they are injected from ITR context)
--
-- html_content: store the full HTML file text as uploaded.
--   The HtmlFormFiller.vue component will inject the postMessage bridge script
--   before rendering in <iframe srcdoc>.
