-- ==========================================
-- POMELO QC System — Migration
-- 036: ITR Checklist Responses
-- Stores the user-filled form data for each selected HTML checklist on an ITR.
-- One response row per selection (upserted on each Save / Submit action).
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 1: itr_checklist_responses ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.itr_checklist_responses (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  selection_id  uuid        NOT NULL REFERENCES public.itr_checklist_selections(id) ON DELETE CASCADE,
  form_data     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- form_data stores ALL user input including signatures as base64 strings:
  --   { "report-no": "GR-001", "form-date": "04/03/2026",
  --     "pass-1-1": true, "remark-1-1": "OK",
  --     "sig-requested": "data:image/png;base64,...",
  --     "sig-boxes": [{ "key": "free-sig-1", "x": 120, "y": 840, "w": 140, "h": 55,
  --                     "data": "data:image/png;base64,..." }] }
  html_snapshot text        NULL,
  -- NULL while status='draft'  → render from master itp_html_checklists.html_content
  -- Non-null after submit/approve → frozen copy of template at time of submission (audit-safe)
  status        text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at  timestamptz NULL,
  submitted_by  uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at   timestamptz NULL,
  approved_by   uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reject_reason text        NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itr_checklist_responses_pkey        PRIMARY KEY (id),
  -- One active response per selection (upsert on selection_id)
  CONSTRAINT itr_checklist_responses_sel_uniq    UNIQUE (selection_id)
) TABLESPACE pg_default;

-- ── Step 2: Indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_itr_checklist_resp_selection_id
  ON public.itr_checklist_responses USING btree (selection_id);

CREATE INDEX IF NOT EXISTS idx_itr_checklist_resp_status
  ON public.itr_checklist_responses USING btree (status);

-- ── Step 3: Auto-update updated_at trigger ───────────────────────────────────

DROP TRIGGER IF EXISTS on_itr_checklist_responses_updated ON public.itr_checklist_responses;
CREATE TRIGGER on_itr_checklist_responses_updated
  BEFORE UPDATE ON public.itr_checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ── Step 4: Enable RLS ───────────────────────────────────────────────────────

ALTER TABLE public.itr_checklist_responses ENABLE ROW LEVEL SECURITY;

-- ── Step 5: RLS Policies ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "itr_checklist_resp_select_all" ON public.itr_checklist_responses
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itr_checklist_resp_insert_all" ON public.itr_checklist_responses
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itr_checklist_resp_update_all" ON public.itr_checklist_responses
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "itr_checklist_resp_delete_all" ON public.itr_checklist_responses
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Step 6: Useful view — responses joined with ITR + checklist context ───────

CREATE OR REPLACE VIEW public.v_itr_checklist_responses AS
SELECT
  r.id                              AS response_id,
  r.selection_id,
  r.form_data,
  r.status                          AS response_status,
  r.submitted_at,
  r.submitted_by,
  r.approved_at,
  r.approved_by,
  r.reject_reason,
  r.updated_at,
  -- selection
  s.itr_id,
  s.checklist_id,
  s.display_order,
  -- checklist
  c.code                            AS checklist_code,
  c.title                           AS checklist_title,
  c.version                         AS checklist_version,
  c.itp_id,
  -- itr
  i.itr_number,
  i.title                           AS itr_title,
  i.location,
  i.status                          AS itr_status,
  i.project_id,
  i.area_id
FROM public.itr_checklist_responses  r
JOIN public.itr_checklist_selections  s ON s.id = r.selection_id
JOIN public.itp_html_checklists       c ON c.id = s.checklist_id
JOIN public.itrs                      i ON i.id = s.itr_id;

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- UNIQUE (selection_id): one response per selection, upserted by the Vue store.
-- form_data keys convention:
--   Plain keys  → user-filled fields (e.g. "report-no", "form-date")
--   sig:<name>  → signature as base64 PNG data URI (e.g. "sig:contractor")
--   sys: keys   → NOT stored here; injected at render time from ITR context
-- status flow: draft → submitted → approved | rejected → draft (re-open)
