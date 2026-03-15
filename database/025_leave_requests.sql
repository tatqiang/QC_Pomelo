-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 25: Leave Requests
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- ── Step 1: Leave type enum ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.leave_type AS ENUM (
    'sick',
    'annual',
    'personal',
    'business',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Step 2: Leave status enum ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.leave_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Step 3: leave_requests table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id                uuid            NOT NULL DEFAULT gen_random_uuid(),
  user_id           uuid            NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  project_id        uuid            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  leave_type        public.leave_type        NOT NULL DEFAULT 'personal',
  date_from         date            NOT NULL,
  date_to           date            NOT NULL,
  reason            text            NULL,
  status            public.leave_status      NOT NULL DEFAULT 'pending',

  -- Review
  reviewed_by       uuid            NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at       timestamptz     NULL,
  reviewer_notes    text            NULL,

  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT leave_requests_pkey          PRIMARY KEY (id),
  CONSTRAINT leave_dates_check            CHECK (date_to >= date_from)
) TABLESPACE pg_default;

-- ── Step 4: Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leave_user_id    ON public.leave_requests USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_leave_project_id ON public.leave_requests USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_leave_status     ON public.leave_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_leave_date_from  ON public.leave_requests USING btree (date_from);

-- ── Step 5: updated_at trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_leave_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Step 6: RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_select_all" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_insert_all" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_update_all" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_delete_all" ON public.leave_requests;

CREATE POLICY "leave_select_all" ON public.leave_requests FOR SELECT USING (true);
CREATE POLICY "leave_insert_all" ON public.leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "leave_update_all" ON public.leave_requests FOR UPDATE USING (true);
CREATE POLICY "leave_delete_all" ON public.leave_requests FOR DELETE USING (true);
