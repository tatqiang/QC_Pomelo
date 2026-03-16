-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 20: Project Authorities (Per-Project)
-- Multi-role membership: 1 user → many roles per project
-- ==========================================

-- ── Step 1: Project Role enum ────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.project_role AS ENUM (
    'project_admin',     -- Full control of this project
    'project_manager',   -- Manage tasks, team, gantt
    'planner',           -- Create/edit tasks, WBS, schedule
    'qc_admin',          -- Manage QC team, approve ITRs, all QC activities
    'qc_engineer',       -- Manage ITRs, ITPs, inspections
    'qc_inspector',      -- Submit inspection reports, attachments
    'viewer'             -- Read-only access
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Step 2: Project Members (user ↔ project) ────────────────────

CREATE TABLE IF NOT EXISTS public.project_members (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id)  ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  is_active   boolean     NOT NULL DEFAULT true,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  invited_by  uuid        NULL     REFERENCES public.users(id)     ON DELETE SET NULL,
  notes       text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_unique UNIQUE (project_id, user_id)
);

-- ── Step 3: Project Member Roles (many-to-many) ─────────────────
-- One member can have MULTIPLE roles within the same project

CREATE TABLE IF NOT EXISTS public.project_member_roles (
  id          uuid               NOT NULL DEFAULT gen_random_uuid(),
  member_id   uuid               NOT NULL REFERENCES public.project_members(id) ON DELETE CASCADE,
  role        public.project_role NOT NULL,
  granted_by  uuid               NULL     REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at  timestamptz        NOT NULL DEFAULT now(),

  CONSTRAINT project_member_roles_pkey PRIMARY KEY (id),
  CONSTRAINT project_member_roles_unique UNIQUE (member_id, role)
);

-- ── Step 4: Project Permissions ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_permissions (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  code        text        NOT NULL,
  title       text        NOT NULL,
  description text        NULL,
  category    text        NOT NULL DEFAULT 'general',
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT project_permissions_code_key UNIQUE (code)
);

-- ── Step 5: Map project_role → project_permissions ──────────────

CREATE TABLE IF NOT EXISTS public.project_role_permissions (
  id              uuid               NOT NULL DEFAULT gen_random_uuid(),
  role            public.project_role NOT NULL,
  permission_code text               NOT NULL REFERENCES public.project_permissions(code) ON DELETE CASCADE,
  created_at      timestamptz        NOT NULL DEFAULT now(),

  CONSTRAINT project_role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT project_role_permissions_unique UNIQUE (role, permission_code)
);

-- ── Step 6: Indexes ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_project_members_project  ON public.project_members USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user     ON public.project_members USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_active   ON public.project_members USING btree (project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_project_member_roles_member ON public.project_member_roles USING btree (member_id);
CREATE INDEX IF NOT EXISTS idx_project_member_roles_role   ON public.project_member_roles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_project_role_permissions_role ON public.project_role_permissions USING btree (role);

-- ── Step 7: RLS ─────────────────────────────────────────────────

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent re-run)
DROP POLICY IF EXISTS "project_members_read_all" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

DROP POLICY IF EXISTS "project_member_roles_read_all" ON public.project_member_roles;
DROP POLICY IF EXISTS "project_member_roles_insert" ON public.project_member_roles;
DROP POLICY IF EXISTS "project_member_roles_update" ON public.project_member_roles;
DROP POLICY IF EXISTS "project_member_roles_delete" ON public.project_member_roles;

DROP POLICY IF EXISTS "project_permissions_read_all" ON public.project_permissions;
DROP POLICY IF EXISTS "project_permissions_insert" ON public.project_permissions;
DROP POLICY IF EXISTS "project_permissions_update" ON public.project_permissions;
DROP POLICY IF EXISTS "project_permissions_delete" ON public.project_permissions;

DROP POLICY IF EXISTS "project_role_permissions_read_all" ON public.project_role_permissions;
DROP POLICY IF EXISTS "project_role_permissions_insert" ON public.project_role_permissions;
DROP POLICY IF EXISTS "project_role_permissions_update" ON public.project_role_permissions;
DROP POLICY IF EXISTS "project_role_permissions_delete" ON public.project_role_permissions;

-- Read policies
CREATE POLICY "project_members_read_all" ON public.project_members
  FOR SELECT USING (true);
CREATE POLICY "project_member_roles_read_all" ON public.project_member_roles
  FOR SELECT USING (true);
CREATE POLICY "project_permissions_read_all" ON public.project_permissions
  FOR SELECT USING (true);
CREATE POLICY "project_role_permissions_read_all" ON public.project_role_permissions
  FOR SELECT USING (true);

-- Write policies (open for dev)
CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (true);
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (true);

CREATE POLICY "project_member_roles_insert" ON public.project_member_roles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "project_member_roles_update" ON public.project_member_roles
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "project_member_roles_delete" ON public.project_member_roles
  FOR DELETE USING (true);

CREATE POLICY "project_permissions_insert" ON public.project_permissions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "project_permissions_update" ON public.project_permissions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "project_permissions_delete" ON public.project_permissions
  FOR DELETE USING (true);

CREATE POLICY "project_role_permissions_insert" ON public.project_role_permissions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "project_role_permissions_update" ON public.project_role_permissions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "project_role_permissions_delete" ON public.project_role_permissions
  FOR DELETE USING (true);

-- ── Step 8: Auto-update updated_at ──────────────────────────────

DROP TRIGGER IF EXISTS on_project_members_updated ON public.project_members;
CREATE TRIGGER on_project_members_updated
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ── Step 9: Seed Project Permissions ────────────────────────────

INSERT INTO public.project_permissions (code, title, description, category) VALUES
  -- Project settings
  ('project_settings',       'Manage Project Settings',  'Edit project name, dates, status',                'project'),
  ('project_team',           'Manage Project Team',      'Add/remove members, assign roles',                'project'),

  -- Tasks / Planning
  ('create_tasks',           'Create Tasks',             'Create new WBS tasks',                            'planning'),
  ('edit_tasks',             'Edit Tasks',               'Modify task details, dates, progress',            'planning'),
  ('delete_tasks',           'Delete Tasks',             'Remove tasks from project',                       'planning'),
  ('view_gantt',             'View Gantt Chart',         'Access the Gantt/schedule view',                  'planning'),
  ('edit_gantt',             'Edit Gantt Chart',         'Drag tasks, change dependencies',                 'planning'),

  -- Areas & Disciplines
  ('manage_areas',           'Manage Areas',             'Create/edit location hierarchy',                  'config'),
  ('manage_disciplines',     'Manage Disciplines',       'Create/edit discipline codes',                    'config'),
  ('manage_itr_types',       'Manage ITR Types',         'Create/edit ITR type lookup',                     'config'),
  ('manage_itr_statuses',    'Manage ITR Statuses',      'Create/edit workflow statuses',                   'config'),

  -- ITRs
  ('create_itrs',            'Create ITRs',              'Create new inspection records',                   'itr'),
  ('edit_itrs',              'Edit ITRs',                'Modify ITR details & notes',                      'itr'),
  ('delete_itrs',            'Delete ITRs',              'Remove ITRs from project',                        'itr'),
  ('advance_itr_workflow',   'Advance ITR Workflow',     'Move ITRs through status workflow',               'itr'),
  ('upload_attachments',     'Upload Attachments',       'Upload files & images to ITRs',                   'itr'),
  ('approve_itrs',           'Approve ITRs',             'Final approval of inspection records',            'itr'),

  -- ITPs & Materials
  ('manage_itps',            'Manage ITPs',              'Create/edit Inspection & Test Plans',             'document'),
  ('manage_materials',       'Manage Materials',         'Create/edit material register entries',            'document'),

  -- Reporting
  ('view_reports',           'View Reports',             'Access project reports & exports',                'report'),
  ('export_data',            'Export Data',              'Export project data (Excel, PDF)',                 'report')
ON CONFLICT (code) DO NOTHING;

-- ── Step 10: Seed Role → Permission mappings ────────────────────

-- project_admin → everything
INSERT INTO public.project_role_permissions (role, permission_code) VALUES
  ('project_admin', 'project_settings'),
  ('project_admin', 'project_team'),
  ('project_admin', 'create_tasks'),
  ('project_admin', 'edit_tasks'),
  ('project_admin', 'delete_tasks'),
  ('project_admin', 'view_gantt'),
  ('project_admin', 'edit_gantt'),
  ('project_admin', 'manage_areas'),
  ('project_admin', 'manage_disciplines'),
  ('project_admin', 'manage_itr_types'),
  ('project_admin', 'manage_itr_statuses'),
  ('project_admin', 'create_itrs'),
  ('project_admin', 'edit_itrs'),
  ('project_admin', 'delete_itrs'),
  ('project_admin', 'advance_itr_workflow'),
  ('project_admin', 'upload_attachments'),
  ('project_admin', 'approve_itrs'),
  ('project_admin', 'manage_itps'),
  ('project_admin', 'manage_materials'),
  ('project_admin', 'view_reports'),
  ('project_admin', 'export_data')
ON CONFLICT (role, permission_code) DO NOTHING;

-- project_manager → team, tasks, gantt, config, ITRs (no approve), reports
INSERT INTO public.project_role_permissions (role, permission_code) VALUES
  ('project_manager', 'project_team'),
  ('project_manager', 'create_tasks'),
  ('project_manager', 'edit_tasks'),
  ('project_manager', 'delete_tasks'),
  ('project_manager', 'view_gantt'),
  ('project_manager', 'edit_gantt'),
  ('project_manager', 'manage_areas'),
  ('project_manager', 'manage_disciplines'),
  ('project_manager', 'manage_itr_types'),
  ('project_manager', 'manage_itr_statuses'),
  ('project_manager', 'create_itrs'),
  ('project_manager', 'edit_itrs'),
  ('project_manager', 'advance_itr_workflow'),
  ('project_manager', 'upload_attachments'),
  ('project_manager', 'manage_itps'),
  ('project_manager', 'manage_materials'),
  ('project_manager', 'view_reports'),
  ('project_manager', 'export_data')
ON CONFLICT (role, permission_code) DO NOTHING;

-- planner → tasks, gantt, areas, view reports
INSERT INTO public.project_role_permissions (role, permission_code) VALUES
  ('planner', 'create_tasks'),
  ('planner', 'edit_tasks'),
  ('planner', 'view_gantt'),
  ('planner', 'edit_gantt'),
  ('planner', 'manage_areas'),
  ('planner', 'view_reports'),
  ('planner', 'export_data')
ON CONFLICT (role, permission_code) DO NOTHING;

-- qc_admin → QC team management + full QC permissions
INSERT INTO public.project_role_permissions (role, permission_code) VALUES
  ('qc_admin', 'project_team'),
  ('qc_admin', 'view_gantt'),
  ('qc_admin', 'manage_areas'),
  ('qc_admin', 'manage_disciplines'),
  ('qc_admin', 'manage_itr_types'),
  ('qc_admin', 'manage_itr_statuses'),
  ('qc_admin', 'create_itrs'),
  ('qc_admin', 'edit_itrs'),
  ('qc_admin', 'delete_itrs'),
  ('qc_admin', 'advance_itr_workflow'),
  ('qc_admin', 'upload_attachments'),
  ('qc_admin', 'approve_itrs'),
  ('qc_admin', 'manage_itps'),
  ('qc_admin', 'manage_materials'),
  ('qc_admin', 'view_reports'),
  ('qc_admin', 'export_data')
ON CONFLICT (role, permission_code) DO NOTHING;

-- qc_engineer → ITRs full, ITPs, materials, config, reports
INSERT INTO public.project_role_permissions (role, permission_code) VALUES
  ('qc_engineer', 'view_gantt'),
  ('qc_engineer', 'manage_areas'),
  ('qc_engineer', 'manage_disciplines'),
  ('qc_engineer', 'manage_itr_types'),
  ('qc_engineer', 'manage_itr_statuses'),
  ('qc_engineer', 'create_itrs'),
  ('qc_engineer', 'edit_itrs'),
  ('qc_engineer', 'delete_itrs'),
  ('qc_engineer', 'advance_itr_workflow'),
  ('qc_engineer', 'upload_attachments'),
  ('qc_engineer', 'approve_itrs'),
  ('qc_engineer', 'manage_itps'),
  ('qc_engineer', 'manage_materials'),
  ('qc_engineer', 'view_reports'),
  ('qc_engineer', 'export_data')
ON CONFLICT (role, permission_code) DO NOTHING;

-- qc_inspector → create ITRs, advance workflow, upload, view
INSERT INTO public.project_role_permissions (role, permission_code) VALUES
  ('qc_inspector', 'view_gantt'),
  ('qc_inspector', 'create_itrs'),
  ('qc_inspector', 'edit_itrs'),
  ('qc_inspector', 'advance_itr_workflow'),
  ('qc_inspector', 'upload_attachments'),
  ('qc_inspector', 'view_reports')
ON CONFLICT (role, permission_code) DO NOTHING;

-- viewer → read-only
INSERT INTO public.project_role_permissions (role, permission_code) VALUES
  ('viewer', 'view_gantt'),
  ('viewer', 'view_reports')
ON CONFLICT (role, permission_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- Helper view: flat list of user + project + all roles (for queries)
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_project_members_with_roles AS
SELECT
  pm.id           AS member_id,
  pm.project_id,
  pm.user_id,
  pm.is_active,
  pm.joined_at,
  pm.invited_by,
  u.email,
  u.first_name,
  u.last_name,
  u.role          AS pwa_role,
  u.department,
  u.job_title,
  u.profile_photo_url,
  ARRAY_AGG(pmr.role ORDER BY pmr.role) FILTER (WHERE pmr.role IS NOT NULL) AS project_roles
FROM public.project_members pm
JOIN public.users u ON u.id = pm.user_id
LEFT JOIN public.project_member_roles pmr ON pmr.member_id = pm.id
GROUP BY pm.id, pm.project_id, pm.user_id, pm.is_active, pm.joined_at, pm.invited_by,
         u.email, u.first_name, u.last_name, u.role, u.department, u.job_title, u.profile_photo_url;

-- ══════════════════════════════════════════════════════════════════
-- Helper view: user's effective permissions for each project
-- (union of all permissions from all assigned roles)
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_user_project_permissions AS
SELECT DISTINCT
  pm.user_id,
  pm.project_id,
  prp.permission_code
FROM public.project_members pm
JOIN public.project_member_roles pmr ON pmr.member_id = pm.id
JOIN public.project_role_permissions prp ON prp.role = pmr.role
WHERE pm.is_active = true;
