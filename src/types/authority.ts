// ─── Authority Types ──────────────────────────────────────────────────────────
// Shared types for PWA-level and Project-level authority system

// ══════════════════════════════════════════════════════════════════════════════
// PWA (System-Wide) Authorities
// ══════════════════════════════════════════════════════════════════════════════

export type PwaRole = 'system_admin' | 'admin' | 'member' | 'registrant'

export type PwaPermission =
    | 'manage_users'
    | 'view_users'
    | 'assign_pwa_roles'
    | 'create_projects'
    | 'manage_all_projects'
    | 'view_all_projects'
    | 'manage_system'
    | 'view_audit_log'
    | 'manage_companies'

export interface PwaPermissionRecord {
    id: string
    code: PwaPermission
    title: string
    description: string | null
    category: string
}

// ══════════════════════════════════════════════════════════════════════════════
// Project-Level Authorities
// ══════════════════════════════════════════════════════════════════════════════

export type ProjectRole =
    | 'project_admin'
    | 'project_manager'
    | 'planner'
    | 'qc_engineer'
    | 'qc_inspector'
    | 'viewer'

export type ProjectPermission =
    // Project settings
    | 'project_settings'
    | 'project_team'
    // Tasks / Planning
    | 'create_tasks'
    | 'edit_tasks'
    | 'delete_tasks'
    | 'view_gantt'
    | 'edit_gantt'
    // Areas & Disciplines
    | 'manage_areas'
    | 'manage_disciplines'
    | 'manage_itr_types'
    | 'manage_itr_statuses'
    // ITRs
    | 'create_itrs'
    | 'edit_itrs'
    | 'delete_itrs'
    | 'advance_itr_workflow'
    | 'upload_attachments'
    | 'approve_itrs'
    // ITPs & Materials
    | 'manage_itps'
    | 'manage_materials'
    // Reports
    | 'view_reports'
    | 'export_data'

export interface ProjectPermissionRecord {
    id: string
    code: ProjectPermission
    title: string
    description: string | null
    category: string
}

// ══════════════════════════════════════════════════════════════════════════════
// Project Membership
// ══════════════════════════════════════════════════════════════════════════════

export interface ProjectMember {
    id: string
    project_id: string
    user_id: string
    is_active: boolean
    joined_at: string
    invited_by: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface ProjectMemberRole {
    id: string
    member_id: string
    role: ProjectRole
    granted_by: string | null
    granted_at: string
}

/** Flat view row from v_project_members_with_roles */
export interface ProjectMemberWithRoles {
    member_id: string
    project_id: string
    user_id: string
    is_active: boolean
    joined_at: string
    invited_by: string | null
    email: string
    first_name: string | null
    last_name: string | null
    pwa_role: PwaRole
    department: string | null
    job_title: string | null
    profile_photo_url: string | null
    project_roles: ProjectRole[]
}

// ══════════════════════════════════════════════════════════════════════════════
// UI label / color mappings
// ══════════════════════════════════════════════════════════════════════════════

export const PWA_ROLE_LABELS: Record<PwaRole, string> = {
    system_admin: 'System Admin',
    admin: 'Admin',
    member: 'Member',
    registrant: 'Registrant',
}

export const PWA_ROLE_COLORS: Record<PwaRole, string> = {
    system_admin: 'bg-red-100 text-red-800',
    admin: 'bg-orange-100 text-orange-800',
    member: 'bg-blue-100 text-blue-800',
    registrant: 'bg-gray-100 text-gray-600',
}

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
    project_admin: 'Project Admin',
    project_manager: 'Project Manager',
    planner: 'Planner',
    qc_engineer: 'QC Engineer',
    qc_inspector: 'QC Inspector',
    viewer: 'Viewer',
}

export const PROJECT_ROLE_COLORS: Record<ProjectRole, string> = {
    project_admin: 'bg-red-100 text-red-800',
    project_manager: 'bg-purple-100 text-purple-800',
    planner: 'bg-blue-100 text-blue-800',
    qc_engineer: 'bg-teal-100 text-teal-800',
    qc_inspector: 'bg-cyan-100 text-cyan-800',
    viewer: 'bg-gray-100 text-gray-600',
}

export const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
    project_admin: 'Full control of this project — settings, team, and all data',
    project_manager: 'Manage tasks, team, gantt, config, ITRs, and reports',
    planner: 'Create/edit tasks, WBS, gantt chart, and areas',
    qc_engineer: 'Manage ITRs, ITPs, materials, inspections, and approvals',
    qc_inspector: 'Submit inspection reports and upload attachments',
    viewer: 'Read-only access to all project data',
}

export const ALL_PROJECT_ROLES: ProjectRole[] = [
    'project_admin',
    'project_manager',
    'planner',
    'qc_engineer',
    'qc_inspector',
    'viewer',
]

export const ALL_PWA_ROLES: PwaRole[] = [
    'system_admin',
    'admin',
    'member',
    'registrant',
]
