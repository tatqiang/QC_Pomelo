-- ==========================================
-- POMELO QC System — Migration
-- 030: Master Forms & Revisions
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 0: Drop existing tables (safe — no real data yet) ───────────────────

DROP TABLE IF EXISTS public.itr_form_snapshots   CASCADE;
DROP TABLE IF EXISTS public.master_form_revisions CASCADE;
DROP TABLE IF EXISTS public.master_forms          CASCADE;

-- ── Step 1: master_forms ─────────────────────────────────────────────────────
-- Registry of form types (itr_cover, photo_report, etc.)

CREATE TABLE IF NOT EXISTS public.master_forms (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code        text        NOT NULL,           -- e.g. 'itr_cover', 'photo_report'
  name        text        NOT NULL,           -- display name
  description text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT master_forms_pkey              PRIMARY KEY (id),
  CONSTRAINT master_forms_project_code_uniq UNIQUE (project_id, code)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_master_forms_project_id
  ON public.master_forms USING btree (project_id);

-- ── Step 2: master_form_revisions ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.master_form_revisions (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  form_id          uuid        NOT NULL REFERENCES public.master_forms(id) ON DELETE CASCADE,
  revision         text        NOT NULL,           -- e.g. 'Rev 0', 'Rev 1'
  revision_number  int         NOT NULL DEFAULT 0, -- numeric order
  is_latest        boolean     NOT NULL DEFAULT false,
  template_url     text        NOT NULL,           -- R2 public URL to PDF AcroForm template
  field_map        jsonb       NULL,               -- optional JSON field name overrides
  apps_script_form_type  text  NULL,               -- form_type param for Apps Script ('itr_cover', 'photo_report', etc.)
  notes            text        NULL,               -- release notes / change summary
  released_date    date        NULL,
  created_by       uuid        NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT master_form_revisions_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_master_form_revisions_form_id
  ON public.master_form_revisions USING btree (form_id);

CREATE INDEX IF NOT EXISTS idx_master_form_revisions_latest
  ON public.master_form_revisions USING btree (form_id, is_latest)
  WHERE is_latest = true;

-- ── Step 3: Enable RLS ───────────────────────────────────────────────────────

ALTER TABLE public.master_forms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_form_revisions  ENABLE ROW LEVEL SECURITY;

-- ── Step 4: RLS Policies ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "master_forms_select_all" ON public.master_forms FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "master_forms_insert_all" ON public.master_forms FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "master_forms_update_all" ON public.master_forms FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "master_forms_delete_all" ON public.master_forms FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "master_form_revisions_select_all" ON public.master_form_revisions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "master_form_revisions_insert_all" ON public.master_form_revisions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "master_form_revisions_update_all" ON public.master_form_revisions FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "master_form_revisions_delete_all" ON public.master_form_revisions FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Step 5: Note on default form types ──────────────────────────────────────
-- Forms are now project-scoped. The application auto-creates the two default
-- form types (itr_cover, photo_report) for each project on first access.
-- No seed data here since project_id is required.
