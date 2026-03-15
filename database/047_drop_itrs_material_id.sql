-- ==========================================
-- POMELO QC System — Migration
-- 047: Drop itrs.material_id (cleanup after 046)
-- All existing 1:1 links were already migrated to itr_materials by 046.
-- App code no longer reads or writes itrs.material_id.
-- Safe to re-run (IF EXISTS guards).
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- Verify no data will be lost (should return 0 rows that are NOT already in itr_materials)
-- SELECT i.id, i.material_id
-- FROM   public.itrs i
-- WHERE  i.material_id IS NOT NULL
--   AND  NOT EXISTS (
--          SELECT 1 FROM public.itr_materials m
--          WHERE  m.itr_id = i.id AND m.material_id = i.material_id
--        );

ALTER TABLE public.itrs
  DROP COLUMN IF EXISTS material_id;
