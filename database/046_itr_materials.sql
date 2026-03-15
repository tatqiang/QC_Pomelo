-- ==========================================
-- POMELO QC System — Migration
-- 046: ITR ↔ Material Many-to-Many junction
-- Replaces the single itrs.material_id FK with a proper junction table
-- so one ITR can reference multiple Material Approval documents.
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ==========================================

-- ── Step 1: Create itr_materials junction table ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.itr_materials (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  itr_id      uuid        NOT NULL REFERENCES public.itrs(id)       ON DELETE CASCADE,
  material_id uuid        NOT NULL REFERENCES public.materials(id)  ON DELETE CASCADE,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itr_materials_pkey            PRIMARY KEY (id),
  CONSTRAINT itr_materials_itr_material_uq UNIQUE (itr_id, material_id)
) TABLESPACE pg_default;

-- ── Step 2: Indexes ───────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_itr_materials_itr_id
  ON public.itr_materials USING btree (itr_id);

CREATE INDEX IF NOT EXISTS idx_itr_materials_material_id
  ON public.itr_materials USING btree (material_id);

-- ── Step 3: Enable RLS ────────────────────────────────────────────────────────

ALTER TABLE public.itr_materials ENABLE ROW LEVEL SECURITY;

-- ── Step 4: RLS Policies ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "itr_materials_select_all" ON public.itr_materials FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_materials_insert_all" ON public.itr_materials FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_materials_update_all" ON public.itr_materials FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "itr_materials_delete_all" ON public.itr_materials FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Step 5: Migrate existing 1:1 data from itrs.material_id ──────────────────
-- Copies every existing ITR→material link into the new junction table.
-- The old itrs.material_id column is intentionally left in place for now;
-- it will be dropped in a later cleanup migration once all app reads/writes
-- have been updated to use itr_materials.

INSERT INTO public.itr_materials (itr_id, material_id, sort_order)
SELECT id, material_id, 0
FROM   public.itrs
WHERE  material_id IS NOT NULL
ON CONFLICT (itr_id, material_id) DO NOTHING;
