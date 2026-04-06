import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export interface Project {
    id: string
    name: string
    code: string | null
    description: string | null
    location: string | null
    client: string | null
    status: ProjectStatus
    start_date: string | null
    end_date: string | null
    is_test: boolean
    // GPS geofence for attendance
    site_lat: number | null
    site_lng: number | null
    geofence_radius_m: number
    created_by: string | null
    created_at: string
    updated_at: string
}

export type ProjectInsert = Pick<Project, 'name'> &
    Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>

export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>

// ─── Store ────────────────────────────────────────────────────────────────────

const ACTIVE_PROJECT_KEY  = 'pomelo_active_project_id'
const PROJECTS_CACHE_KEY  = 'pomelo_projects_cache'
const FETCH_TIMEOUT_MS    = 8000   // give up waiting for Supabase after 8 s

/** Wrap a promise with a timeout; resolves with null on timeout instead of hanging. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return Promise.race([
        promise,
        new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
    ])
}

export const useProjectStore = defineStore('project', () => {
    const projects = ref<Project[]>([])
    const activeProjectId = ref<string | null>(
        localStorage.getItem(ACTIVE_PROJECT_KEY)
    )
    const loading = ref(false)
    const error = ref<string | null>(null)

    // ── Computed ──────────────────────────────────────────────────────────────

    const activeProject = computed<Project | null>(
        () => projects.value.find(p => p.id === activeProjectId.value) ?? null
    )

    const activeProjects = computed<Project[]>(
        () => projects.value.filter(p => p.status === 'active' || p.status === 'planning')
    )

    /** Projects visible to the current user (test projects hidden for non-admins) */
    const visibleProjects = computed<Project[]>(() => {
        const auth = useAuthStore()
        if (auth.isAdmin) return projects.value
        return projects.value.filter(p => !p.is_test)
    })

    const statusColor: Record<ProjectStatus, string> = {
        planning: 'info',
        active: 'success',
        on_hold: 'warning',
        completed: 'primary',
        cancelled: 'error',
    }

    const getStatusColor = (status: ProjectStatus) => statusColor[status] ?? 'default'

    // ── Actions ───────────────────────────────────────────────────────────────

    /** Load all projects from Supabase, ordered newest first.
     *  Falls back to localStorage cache if Supabase is slow or unavailable. */
    const fetchProjects = async (): Promise<void> => {
        loading.value = true
        error.value = null
        try {
            const result = await withTimeout(
                supabase.from('projects').select('*').order('created_at', { ascending: false }),
                FETCH_TIMEOUT_MS
            )

            if (result === null) {
                // Timed out — try localStorage cache
                console.warn('⚠️ fetchProjects: Supabase timed out — loading from cache')
                const cached = localStorage.getItem(PROJECTS_CACHE_KEY)
                if (cached) projects.value = JSON.parse(cached) as Project[]
                error.value = 'Could not reach server — showing cached data'
                return
            }

            const { data, error: dbErr } = result
            if (dbErr) throw dbErr

            projects.value = (data as Project[]) ?? []

            // Persist to cache for offline/timeout fallback
            try { localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projects.value)) } catch (_) {}

            // If persisted active project no longer exists, clear it
            if (activeProjectId.value && !projects.value.find(p => p.id === activeProjectId.value)) {
                clearActiveProject()
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load projects'
            console.error('❌ fetchProjects:', err)
            // Try cache on error too
            const cached = localStorage.getItem(PROJECTS_CACHE_KEY)
            if (cached && projects.value.length === 0) {
                projects.value = JSON.parse(cached) as Project[]
            }
        } finally {
            loading.value = false
        }
    }

    /** Create a new project and add it to the local list */
    const createProject = async (payload: ProjectInsert): Promise<Project | null> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: dbErr } = await supabase
                .from('projects')
                .insert(payload)
                .select()
                .single()

            if (dbErr) throw dbErr
            const project = data as Project
            projects.value.unshift(project)
            return project
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create project'
            console.error('❌ createProject:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    /** Update an existing project in place */
    const updateProject = async (id: string, payload: ProjectUpdate): Promise<Project | null> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: dbErr } = await supabase
                .from('projects')
                .update(payload)
                .eq('id', id)
                .select()
                .single()

            if (dbErr) throw dbErr
            const updated = data as Project
            const idx = projects.value.findIndex(p => p.id === id)
            if (idx !== -1) projects.value[idx] = updated
            return updated
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update project'
            console.error('❌ updateProject:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    /** Soft-delete: set status to 'cancelled' */
    const archiveProject = async (id: string): Promise<boolean> => {
        const result = await updateProject(id, { status: 'cancelled' })
        if (result && activeProjectId.value === id) clearActiveProject()
        return !!result
    }

    /** Set the active project (persisted across sessions) */
    const setActiveProject = (project: Project): void => {
        activeProjectId.value = project.id
        localStorage.setItem(ACTIVE_PROJECT_KEY, project.id)
        console.log('📌 Active project set:', project.name)
    }

    /** Clear the active project */
    const clearActiveProject = (): void => {
        activeProjectId.value = null
        localStorage.removeItem(ACTIVE_PROJECT_KEY)
    }

    return {
        projects,
        activeProjectId,
        activeProject,
        activeProjects,
        visibleProjects,
        loading,
        error,
        getStatusColor,
        fetchProjects,
        createProject,
        updateProject,
        archiveProject,
        setActiveProject,
        clearActiveProject,
    }
})
