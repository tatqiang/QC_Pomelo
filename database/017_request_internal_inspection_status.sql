-- ==========================================
-- POMELO QC System — Migration
-- 017: Add 'request_internal_inspection' status to itr_statuses
--      This is the gating status between Draft and Internal Inspection.
--      It is set when the user clicks "Request Internal Inspection" on the Draft form.
--      It is NOT shown in the progress bar — handled in frontend filtering.
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent via ON CONFLICT DO NOTHING)
-- ==========================================

-- Insert for all existing projects (one row per project)
INSERT INTO public.itr_statuses (project_id, code, title, sort_order, color, icon, is_active)
SELECT
    p.id AS project_id,
    'request_internal_inspection'    AS code,
    'Pending Internal Inspection'    AS title,
    2                                AS sort_order,
    '#1D4ED8'                        AS color,
    'mdi-clock-check-outline'        AS icon,
    true                             AS is_active
FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.itr_statuses s
    WHERE s.project_id = p.id AND s.code = 'request_internal_inspection'
);

-- Shift existing statuses from sort_order 2-5 to 3-6 to make room
UPDATE public.itr_statuses
SET sort_order = sort_order + 1
WHERE code IN ('internal_request', 'external_request', 'report_submitted', 'approved')
  AND sort_order < 10;   -- guard: only shift if not already shifted
