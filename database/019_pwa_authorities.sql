-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 19: PWA Authorities (System-Level)
-- Enhances the existing user_role enum and
-- adds permission definitions
-- ==========================================

-- The existing user_role enum already has:
--   system_admin, admin, member, registrant
-- These serve as PWA-level (system-wide) authorities.
-- No enum change needed — the current values are correct.

-- ── PWA Permissions lookup table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pwa_permissions (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  code        text        NOT NULL,       -- e.g. 'manage_users', 'manage_projects'
  title       text        NOT NULL,       -- Human-readable name
  description text        NULL,
  category    text        NOT NULL DEFAULT 'general', -- 'users', 'projects', 'system'
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pwa_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT pwa_permissions_code_key UNIQUE (code)
);

-- ── Map: which PWA role gets which permissions ───────────────────

CREATE TABLE IF NOT EXISTS public.pwa_role_permissions (
  id          uuid           NOT NULL DEFAULT gen_random_uuid(),
  role        public.user_role NOT NULL,
  permission_code text       NOT NULL REFERENCES public.pwa_permissions(code) ON DELETE CASCADE,
  created_at  timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT pwa_role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT pwa_role_permissions_unique UNIQUE (role, permission_code)
);

-- ── Index ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pwa_role_permissions_role ON public.pwa_role_permissions USING btree (role);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.pwa_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent re-run)
DROP POLICY IF EXISTS "pwa_permissions_read_all" ON public.pwa_permissions;
DROP POLICY IF EXISTS "pwa_permissions_insert" ON public.pwa_permissions;
DROP POLICY IF EXISTS "pwa_permissions_update" ON public.pwa_permissions;
DROP POLICY IF EXISTS "pwa_permissions_delete" ON public.pwa_permissions;

DROP POLICY IF EXISTS "pwa_role_permissions_read_all" ON public.pwa_role_permissions;
DROP POLICY IF EXISTS "pwa_role_permissions_insert" ON public.pwa_role_permissions;
DROP POLICY IF EXISTS "pwa_role_permissions_update" ON public.pwa_role_permissions;
DROP POLICY IF EXISTS "pwa_role_permissions_delete" ON public.pwa_role_permissions;

CREATE POLICY "pwa_permissions_read_all" ON public.pwa_permissions
  FOR SELECT USING (true);

CREATE POLICY "pwa_role_permissions_read_all" ON public.pwa_role_permissions
  FOR SELECT USING (true);

CREATE POLICY "pwa_permissions_insert" ON public.pwa_permissions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "pwa_permissions_update" ON public.pwa_permissions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pwa_permissions_delete" ON public.pwa_permissions
  FOR DELETE USING (true);

CREATE POLICY "pwa_role_permissions_insert" ON public.pwa_role_permissions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "pwa_role_permissions_update" ON public.pwa_role_permissions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pwa_role_permissions_delete" ON public.pwa_role_permissions
  FOR DELETE USING (true);

-- ── Seed: PWA Permissions ────────────────────────────────────────

INSERT INTO public.pwa_permissions (code, title, description, category) VALUES
  -- User management
  ('manage_users',        'Manage Users',         'Create, edit, deactivate any user',        'users'),
  ('view_users',          'View Users',           'View user list and profiles',               'users'),
  ('assign_pwa_roles',    'Assign PWA Roles',     'Change user system-level roles',            'users'),

  -- Project management
  ('create_projects',     'Create Projects',      'Create new projects',                       'projects'),
  ('manage_all_projects', 'Manage All Projects',  'Edit/archive any project',                  'projects'),
  ('view_all_projects',   'View All Projects',    'See all projects regardless of membership', 'projects'),

  -- System settings
  ('manage_system',       'Manage System',        'System configuration & settings',           'system'),
  ('view_audit_log',      'View Audit Log',       'View system-wide audit trail',              'system'),
  ('manage_companies',    'Manage Companies',     'Create and edit company records',            'system')
ON CONFLICT (code) DO NOTHING;

-- ── Seed: Role → Permission mapping ─────────────────────────────
-- system_admin gets everything
INSERT INTO public.pwa_role_permissions (role, permission_code) VALUES
  ('system_admin', 'manage_users'),
  ('system_admin', 'view_users'),
  ('system_admin', 'assign_pwa_roles'),
  ('system_admin', 'create_projects'),
  ('system_admin', 'manage_all_projects'),
  ('system_admin', 'view_all_projects'),
  ('system_admin', 'manage_system'),
  ('system_admin', 'view_audit_log'),
  ('system_admin', 'manage_companies')
ON CONFLICT (role, permission_code) DO NOTHING;

-- admin gets user & project management, no system config
INSERT INTO public.pwa_role_permissions (role, permission_code) VALUES
  ('admin', 'manage_users'),
  ('admin', 'view_users'),
  ('admin', 'assign_pwa_roles'),
  ('admin', 'create_projects'),
  ('admin', 'manage_all_projects'),
  ('admin', 'view_all_projects'),
  ('admin', 'view_audit_log')
ON CONFLICT (role, permission_code) DO NOTHING;

-- member can view users, create projects, view their own projects
INSERT INTO public.pwa_role_permissions (role, permission_code) VALUES
  ('member', 'view_users'),
  ('member', 'create_projects')
ON CONFLICT (role, permission_code) DO NOTHING;

-- registrant gets minimal access (view users only)
INSERT INTO public.pwa_role_permissions (role, permission_code) VALUES
  ('registrant', 'view_users')
ON CONFLICT (role, permission_code) DO NOTHING;
