-- ==========================================
-- POMELO QC System — Migration
-- 029: Material Files table (Cloudflare R2 storage)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Create material_files table
CREATE TABLE IF NOT EXISTS public.material_files (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  material_id uuid        NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  file_name   text        NOT NULL,
  file_url    text        NOT NULL,         -- full R2 public URL
  file_size   bigint      NULL,             -- bytes
  file_type   text        NULL,             -- MIME type
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT material_files_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Step 2: Index
CREATE INDEX IF NOT EXISTS idx_material_files_material_id
  ON public.material_files USING btree (material_id);

-- Step 3: Enable RLS
ALTER TABLE public.material_files ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
DO $$ BEGIN
  CREATE POLICY "material_files_select_all" ON public.material_files FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "material_files_insert_all" ON public.material_files FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "material_files_update_all" ON public.material_files FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "material_files_delete_all" ON public.material_files FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
