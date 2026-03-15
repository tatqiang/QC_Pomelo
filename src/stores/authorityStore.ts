import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { useProjectStore } from './projectStore'
import type {
    PwaPermission,
    ProjectRole,
    ProjectPermission,
    ProjectMemberWithRoles,
} from '@/types/authority'

// ─── Hardcoded PWA role → permission map (matches DB seed) ───────────────────
// Kept client-side so we don't need an extra DB call on every page load
const PWA_ROLE_PERMISSION_MAP: Record<string, PwaPermission[]> = {
    system_admin: [
        'manage_users', 'view_users', 'assign_pwa_roles',
        'create_projects', 'manage_all_projects', 'view_all_projects',
        'manage_system', 'view_audit_log', 'manage_companies',
    ],
    admin: [
        'manage_users', 'view_users', 'assign_pwa_roles',
        'create_projects', 'manage_all_projects', 'view_all_projects',
        'view_audit_log',
    ],
    member: ['view_users', 'create_projects'],
    registrant: ['view_users'],
}

// ─── Hardcoded project role → permission map (matches DB seed) ───────────────
const PROJECT_ROLE_PERMISSION_MAP: Record<ProjectRole, ProjectPermission[]> = {
    project_admin: [
        'project_settings', 'project_team',
        'create_tasks', 'edit_tasks', 'delete_tasks', 'view_gantt', 'edit_gantt',
        'manage_areas', 'manage_disciplines', 'manage_itr_types', 'manage_itr_statuses',
        'create_itrs', 'edit_itrs', 'delete_itrs', 'advance_itr_workflow', 'upload_attachments', 'approve_itrs',
        'manage_itps', 'manage_materials',
        'view_reports', 'export_data',
    ],
    project_manager: [
        'project_team',
        'create_tasks', 'edit_tasks', 'delete_tasks', 'view_gantt', 'edit_gantt',
        'manage_areas', 'manage_disciplines', 'manage_itr_types', 'manage_itr_statuses',
        'create_itrs', 'edit_itrs', 'advance_itr_workflow', 'upload_attachments',
        'manage_itps', 'manage_materials',
        'view_reports', 'export_data',
    ],
    planner: [
        'create_tasks', 'edit_tasks', 'view_gantt', 'edit_gantt',
        'manage_areas',
        'view_reports', 'export_data',
    ],
    qc_engineer: [
        'view_gantt',
        'manage_areas', 'manage_disciplines', 'manage_itr_types', 'manage_itr_statuses',
        'create_itrs', 'edit_itrs', 'delete_itrs', 'advance_itr_workflow', 'upload_attachments', 'approve_itrs',
        'manage_itps', 'manage_materials',
        'view_reports', 'export_data',
    ],
    qc_inspector: [
        'view_gantt',
        'create_itrs', 'edit_itrs', 'advance_itr_workflow', 'upload_attachments',
        'view_reports',
    ],
    viewer: [
        'view_gantt',
        'view_reports',
    ],
}

export const useAuthorityStore = defineStore('authority', () => {
    // ── State ────────────────────────────────────────────────────────────────

    /** Current user's membership record for the active project */
    const currentMembership = ref<ProjectMemberWithRoles | null>(null)

    /** All members of the active project (for team management UI) */
    const projectMembers = ref<ProjectMemberWithRoles[]>([])

    const loading = ref(false)
    const error = ref<string | null>(null)

    // ── Computed ─────────────────────────────────────────────────────────────

    const authStore = useAuthStore()
    const projectStore = useProjectStore()

    /** PWA permissions based on user's system role */
    const pwaPermissions = computed<PwaPermission[]>(() => {
        const role = authStore.user?.role as string
        return PWA_ROLE_PERMISSION_MAP[role] ?? []
    })

    /** Project roles the current user holds on the active project */
    const currentProjectRoles = computed<ProjectRole[]>(() => {
        return currentMembership.value?.project_roles ?? []
    })

    /** Effective project permissions (union from all held project roles) */
    const currentProjectPermissions = computed<ProjectPermission[]>(() => {
        const roles = currentProjectRoles.value
        const permsSet = new Set<ProjectPermission>()
        for (const role of roles) {
            const perms = PROJECT_ROLE_PERMISSION_MAP[role] ?? []
            for (const p of perms) permsSet.add(p)
        }
        return [...permsSet]
    })

    // ── Actions ──────────────────────────────────────────────────────────────

    /**
     * Load current user's membership & roles for the active project.
     * Called when active project changes.
     */
    const fetchCurrentMembership = async (): Promise<void> => {
        const userId = authStore.userId
        const projectId = projectStore.activeProjectId
        if (!userId || !projectId) {
            currentMembership.value = null
            return
        }

        try {
            const { data, error: dbErr } = await supabase
                .from('v_project_members_with_roles')
                .select('*')
                .eq('project_id', projectId)
                .eq('user_id', userId)
                .limit(1)

            if (dbErr) throw dbErr

            currentMembership.value = data && data.length > 0
                ? data[0] as ProjectMemberWithRoles
                : null

            console.log('🔐 Project membership loaded:', currentMembership.value?.project_roles ?? 'none')
        } catch (err) {
            console.error('❌ fetchCurrentMembership:', err)
            currentMembership.value = null
        }
    }

    /**
     * Load all members of the active project (for team management).
     */
    const fetchProjectMembers = async (projectId?: string): Promise<void> => {
        const pid = projectId ?? projectStore.activeProjectId
        if (!pid) {
            projectMembers.value = []
            return
        }

        loading.value = true
        error.value = null
        try {
            const { data, error: dbErr } = await supabase
                .from('v_project_members_with_roles')
                .select('*')
                .eq('project_id', pid)
                .order('joined_at', { ascending: true })

            if (dbErr) throw dbErr
            projectMembers.value = (data as ProjectMemberWithRoles[]) ?? []
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load team members'
            console.error('❌ fetchProjectMembers:', err)
        } finally {
            loading.value = false
        }
    }

    /**
     * Add a user to the active project with one or more roles.
     */
    const addProjectMember = async (
        userId: string,
        roles: ProjectRole[],
        projectId?: string
    ): Promise<boolean> => {
        const pid = projectId ?? projectStore.activeProjectId
        const invitedBy = authStore.userId
        if (!pid || !invitedBy) return false

        loading.value = true
        error.value = null
        try {
            // 1. Insert project_members row
            const { data: member, error: memberErr } = await supabase
                .from('project_members')
                .insert({
                    project_id: pid,
                    user_id: userId,
                    invited_by: invitedBy,
                    is_active: true,
                })
                .select()
                .single()

            if (memberErr) throw memberErr

            // 2. Insert role assignments
            if (roles.length > 0) {
                const roleRows = roles.map(role => ({
                    member_id: member.id,
                    role,
                    granted_by: invitedBy,
                }))

                const { error: roleErr } = await supabase
                    .from('project_member_roles')
                    .insert(roleRows)

                if (roleErr) throw roleErr
            }

            console.log('✅ Member added with roles:', roles)
            await fetchProjectMembers(pid)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to add member'
            console.error('❌ addProjectMember:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    /**
     * Update a member's roles (replace all roles with new set).
     */
    const updateMemberRoles = async (
        memberId: string,
        newRoles: ProjectRole[]
    ): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            // 1. Delete existing roles
            const { error: delErr } = await supabase
                .from('project_member_roles')
                .delete()
                .eq('member_id', memberId)

            if (delErr) throw delErr

            // 2. Insert new roles
            if (newRoles.length > 0) {
                const roleRows = newRoles.map(role => ({
                    member_id: memberId,
                    role,
                    granted_by: authStore.userId,
                }))

                const { error: insertErr } = await supabase
                    .from('project_member_roles')
                    .insert(roleRows)

                if (insertErr) throw insertErr
            }

            console.log('✅ Member roles updated:', newRoles)
            await fetchProjectMembers()
            // Refresh own membership if we changed our own roles
            if (currentMembership.value?.member_id === memberId) {
                await fetchCurrentMembership()
            }
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update roles'
            console.error('❌ updateMemberRoles:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    /**
     * Remove a member from the project (soft: set is_active = false).
     */
    const deactivateMember = async (memberId: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            const { error: dbErr } = await supabase
                .from('project_members')
                .update({ is_active: false })
                .eq('id', memberId)

            if (dbErr) throw dbErr

            console.log('✅ Member deactivated:', memberId)
            await fetchProjectMembers()
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to remove member'
            console.error('❌ deactivateMember:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    /**
     * Re-activate a previously deactivated member.
     */
    const reactivateMember = async (memberId: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            const { error: dbErr } = await supabase
                .from('project_members')
                .update({ is_active: true })
                .eq('id', memberId)

            if (dbErr) throw dbErr

            console.log('✅ Member reactivated:', memberId)
            await fetchProjectMembers()
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to reactivate member'
            console.error('❌ reactivateMember:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    /**
     * Remove a member from the project entirely (hard delete).
     */
    const removeMember = async (memberId: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            // Roles cascade-delete thanks to FK
            const { error: dbErr } = await supabase
                .from('project_members')
                .delete()
                .eq('id', memberId)

            if (dbErr) throw dbErr

            console.log('✅ Member removed:', memberId)
            await fetchProjectMembers()
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to remove member'
            console.error('❌ removeMember:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    // ── Watch active project → reload membership ─────────────────────────────

    watch(
        () => projectStore.activeProjectId,
        async () => {
            await fetchCurrentMembership()
        },
        { immediate: true }
    )

    return {
        // State
        currentMembership,
        projectMembers,
        loading,
        error,

        // Computed
        pwaPermissions,
        currentProjectRoles,
        currentProjectPermissions,

        // Actions
        fetchCurrentMembership,
        fetchProjectMembers,
        addProjectMember,
        updateMemberRoles,
        deactivateMember,
        reactivateMember,
        removeMember,
    }
})
