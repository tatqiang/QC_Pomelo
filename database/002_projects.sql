-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 3: Projects table
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- Step 1: Status enum
CREATE TYPE public.project_status AS ENUM (
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

-- Step 2: Projects table
CREATE TABLE public.projects (
  id          uuid                   NOT NULL DEFAULT gen_random_uuid(),
  name        text                   NOT NULL,
  code        text                   NULL,         -- Short code, e.g. PML-001
  description text                   NULL,
  location    text                   NULL,
  client      text                   NULL,
  status      public.project_status  NULL DEFAULT 'active',
  start_date  date                   NULL,
  end_date    date                   NULL,
  created_by  uuid                   NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz            NULL DEFAULT now(),
  updated_at  timestamptz            NULL DEFAULT now(),

  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_code_key UNIQUE (code)
) TABLESPACE pg_default;

-- Step 3: Indexes
CREATE INDEX idx_projects_status     ON public.projects USING btree (status);
CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);
CREATE INDEX idx_projects_code       ON public.projects USING btree (code);

-- Step 4: Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies (open for anon key during dev — tighten in production)
CREATE POLICY "projects_select_all" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "projects_insert_auth" ON public.projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "projects_update_auth" ON public.projects
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "projects_delete_auth" ON public.projects
  FOR DELETE USING (true);

-- Step 6: Auto-update updated_at (reuse handle_updated_at from 001_users.sql)
CREATE TRIGGER on_projects_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
