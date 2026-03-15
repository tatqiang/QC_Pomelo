-- ==========================================
-- POMELO QC System — Supabase Database Schema
-- 005b: Add area_id column to tasks table
-- Run AFTER 005_areas.sql
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS area_id uuid NULL
    REFERENCES public.areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_area_id ON public.tasks USING btree (area_id);
