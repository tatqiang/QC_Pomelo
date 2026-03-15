-- ==========================================
-- POMELO QC System — Migration
-- 028: Add file_category to itp_files
-- Run ONLY if you already ran 027_itp_files.sql
-- Safe to re-run (idempotent)
-- ==========================================

-- Step 1: Add file_category column (skips if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'itp_files'
      AND column_name  = 'file_category'
  ) THEN
    ALTER TABLE public.itp_files
      ADD COLUMN file_category text NOT NULL DEFAULT 'itp';
  END IF;
END $$;

-- Step 2: Add check constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'itp_files_category_check'
  ) THEN
    ALTER TABLE public.itp_files
      ADD CONSTRAINT itp_files_category_check
      CHECK (file_category IN ('itp', 'checklist'));
  END IF;
END $$;

-- Step 3: Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_itp_files_category
  ON public.itp_files USING btree (itp_id, file_category);
