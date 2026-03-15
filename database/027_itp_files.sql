-- ==========================================
-- POMELO QC System — Migration
-- 027: ITP Files table (Cloudflare R2 storage)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Create itp_files table
CREATE TABLE IF NOT EXISTS public.itp_files (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  itp_id          uuid        NOT NULL REFERENCES public.itps(id) ON DELETE CASCADE,
  file_name       text        NOT NULL,
  file_url        text        NOT NULL,         -- full R2 public URL
  file_size       bigint      NULL,             -- bytes
  file_type       text        NULL,             -- MIME type
  file_category   text        NOT NULL DEFAULT 'itp'
                              CHECK (file_category IN ('itp', 'checklist')),
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itp_files_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Step 2: Index
CREATE INDEX IF NOT EXISTS idx_itp_files_itp_id ON public.itp_files USING btree (itp_id);

-- Step 3: Enable RLS
ALTER TABLE public.itp_files ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
DO $$ BEGIN
  CREATE POLICY "itp_files_select_all" ON public.itp_files FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itp_files_insert_all" ON public.itp_files FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itp_files_update_all" ON public.itp_files FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itp_files_delete_all" ON public.itp_files FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
