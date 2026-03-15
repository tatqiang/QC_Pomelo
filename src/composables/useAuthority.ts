import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useAuthorityStore } from '@/stores/authorityStore'
import type { PwaPermission, ProjectPermission, PwaRole, ProjectRole } from '@/types/authority'

/**
 * Composable for checking PWA-level and Project-level permissions.
 * 
 * Usage:
 *   const { hasPwaPermission, hasProjectPermission, hasProjectRole } = useAuthority()
 *   
 *   // Check PWA permissions
 *   if (hasPwaPermission('manage_users')) { ... }
 *   
 *   // Check project permissions (uses active project)
 *   if (hasProjectPermission('create_itrs')) { ... }
 *   
 *   // Check if user has a specific project role
 *   if (hasProjectRole('qc_engineer')) { ... }
 */
export function useAuthority() {
    const authStore = useAuthStore()
    const authorityStore = useAuthorityStore()

    // ── PWA-level checks ─────────────────────────────────────────────────────

    const pwaRole = computed<PwaRole | null>(
        () => (authStore.user?.role as PwaRole) ?? null
    )

    const isSystemAdmin = computed(() => pwaRole.value === 'system_admin')
    const isPwaAdmin = computed(() => pwaRole.value === 'system_admin' || pwaRole.value === 'admin')

    /**
     * Check if the current user has a specific PWA-level permission.
     * system_admin always returns true (superuser bypass).
     */
    const hasPwaPermission = (permission: PwaPermission): boolean => {
        if (isSystemAdmin.value) return true
        return authorityStore.pwaPermissions.includes(permission)
    }

    /** Reactive computed: does current user have this PWA permission? */
    const hasPwaPermissionComputed = (permission: PwaPermission) =>
        computed(() => hasPwaPermission(permission))

    // ── Project-level checks ─────────────────────────────────────────────────

    /** All project roles the current user holds on the active project */
    const activeProjectRoles = computed<ProjectRole[]>(
        () => authorityStore.currentProjectRoles
    )

    /** All effective project permissions (union of all roles) */
    const activeProjectPermissions = computed<ProjectPermission[]>(
        () => authorityStore.currentProjectPermissions
    )

    const isProjectAdmin = computed(() =>
        activeProjectRoles.value.includes('project_admin')
    )

    const isProjectMember = computed(() =>
        authorityStore.currentMembership !== null
    )

    /**
     * Check if the current user has a specific permission on the active project.
     * PWA system_admin and admin bypass project checks.
     * project_admin role bypasses all project permission checks.
     */
    const hasProjectPermission = (permission: ProjectPermission): boolean => {
        // PWA admin bypass
        if (isPwaAdmin.value) return true
        // project_admin bypass
        if (isProjectAdmin.value) return true
        return activeProjectPermissions.value.includes(permission)
    }

    /** Reactive computed version */
    const hasProjectPermissionComputed = (permission: ProjectPermission) =>
        computed(() => hasProjectPermission(permission))

    /**
     * Check if the user holds a specific role on the active project.
     */
    const hasProjectRole = (role: ProjectRole): boolean => {
        if (isPwaAdmin.value && role === 'project_admin') return true
        return activeProjectRoles.value.includes(role)
    }

    /** Reactive computed version */
    const hasProjectRoleComputed = (role: ProjectRole) =>
        computed(() => hasProjectRole(role))

    /**
     * Check if user has ANY of the given project permissions.
     */
    const hasAnyProjectPermission = (...permissions: ProjectPermission[]): boolean => {
        return permissions.some(p => hasProjectPermission(p))
    }

    /**
     * Check if user has ALL of the given project permissions.
     */
    const hasAllProjectPermissions = (...permissions: ProjectPermission[]): boolean => {
        return permissions.every(p => hasProjectPermission(p))
    }

    // ── Convenience: can* helpers for common operations ──────────────────────

    const canManageTeam = computed(() => hasProjectPermission('project_team'))
    const canEditTasks = computed(() => hasProjectPermission('edit_tasks'))
    const canEditGantt = computed(() => hasProjectPermission('edit_gantt'))
    const canCreateITRs = computed(() => hasProjectPermission('create_itrs'))
    const canApproveITRs = computed(() => hasProjectPermission('approve_itrs'))
    const canManageConfig = computed(() =>
        hasAnyProjectPermission('manage_areas', 'manage_disciplines', 'manage_itr_types', 'manage_itr_statuses')
    )
    const canViewReports = computed(() => hasProjectPermission('view_reports'))
    const canExportData = computed(() => hasProjectPermission('export_data'))

    return {
        // PWA-level
        pwaRole,
        isSystemAdmin,
        isPwaAdmin,
        hasPwaPermission,
        hasPwaPermissionComputed,

        // Project-level
        activeProjectRoles,
        activeProjectPermissions,
        isProjectAdmin,
        isProjectMember,
        hasProjectPermission,
        hasProjectPermissionComputed,
        hasProjectRole,
        hasProjectRoleComputed,
        hasAnyProjectPermission,
        hasAllProjectPermissions,

        // Convenience
        canManageTeam,
        canEditTasks,
        canEditGantt,
        canCreateITRs,
        canApproveITRs,
        canManageConfig,
        canViewReports,
        canExportData,
    }
}
