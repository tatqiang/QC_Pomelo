-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 24: Time Attendance Module
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- ── Step 1: Add GPS geofence columns to projects ──────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS site_lat          double precision NULL,
  ADD COLUMN IF NOT EXISTS site_lng          double precision NULL,
  ADD COLUMN IF NOT EXISTS geofence_radius_m integer          NOT NULL DEFAULT 200;

COMMENT ON COLUMN public.projects.site_lat          IS 'Latitude of project site centre for geofence check-in';
COMMENT ON COLUMN public.projects.site_lng          IS 'Longitude of project site centre for geofence check-in';
COMMENT ON COLUMN public.projects.geofence_radius_m IS 'Radius in metres within which check-in is considered on-site';

-- ── Step 2: Attendance event type enum ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.attendance_event AS ENUM ('check_in', 'check_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Step 3: attendance_logs table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id                   uuid             NOT NULL DEFAULT gen_random_uuid(),
  user_id              uuid             NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  project_id           uuid             NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type           public.attendance_event NOT NULL,
  timestamp            timestamptz      NOT NULL DEFAULT now(),

  -- GPS capture
  lat                  double precision NULL,
  lng                  double precision NULL,
  geo_accuracy_m       real             NULL,
  distance_from_site_m real             NULL,     -- calculated on insert
  geo_verified         boolean          NOT NULL DEFAULT false,   -- within geofence?

  -- Photo
  selfie_url           text             NULL,     -- R2 / Supabase Storage path

  -- Metadata
  device_info          jsonb            NULL,     -- {ua, platform, pwa: true/false}
  notes                text             NULL,

  created_at           timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- ── Step 4: Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_user_id    ON public.attendance_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_project_id ON public.attendance_logs USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp  ON public.attendance_logs USING btree (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_event_type ON public.attendance_logs USING btree (event_type);

-- ── Step 5: Enable RLS ───────────────────────────────────────────────────────
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- ── Step 6: RLS Policies ─────────────────────────────────────────────────────
-- NOTE: This app uses Azure AD (not Supabase Auth), so auth.uid() is always
-- NULL. Access control is handled at the application layer. Policies below
-- match the open pattern used by all other tables in this project.

-- Drop old restrictive policies if they were created previously
DROP POLICY IF EXISTS "attendance_select"    ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_insert"    ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_delete"    ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_select_all" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_insert_all" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_update_all" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_delete_all" ON public.attendance_logs;

CREATE POLICY "attendance_select_all" ON public.attendance_logs
  FOR SELECT USING (true);

CREATE POLICY "attendance_insert_all" ON public.attendance_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "attendance_update_all" ON public.attendance_logs
  FOR UPDATE USING (true);

CREATE POLICY "attendance_delete_all" ON public.attendance_logs
  FOR DELETE USING (true);
