import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItrStatus {
    id: string
    project_id: string
    code: string
    title: string
    description: string | null
    sort_order: number
    color: string | null
    icon: string | null
    is_active: boolean
    created_at: string | null
    updated_at: string | null
}

export type ItrStatusCode =
    | 'plan'
    | 'request_qc'
    | 'request_internal_inspection'
    | 'internal_request'
    | 'external_request'
    | 'report_submitted'
    | 'approved'
    | 'pending'
    | 'cancelled'

export type ItrStatusInsert = Omit<ItrStatus, 'id' | 'created_at' | 'updated_at'>
export type ItrStatusUpdate = Partial<Omit<ItrStatus, 'id' | 'project_id' | 'created_at' | 'updated_at'>>

// ── Default statuses seeded for every new project ─────────────────────────────

export const DEFAULT_ITR_STATUSES: Omit<ItrStatusInsert, 'project_id'>[] = [
    { code: 'plan',             title: 'Plan',             sort_order: 1, color: '#64748B', icon: 'mdi-clipboard-list-outline', is_active: true },
    { code: 'request_qc',        title: 'Requested to QC',  sort_order: 2, color: '#1D4ED8', icon: 'mdi-clock-check-outline',    is_active: true },
    { code: 'external_request',  title: 'ITR Requested',    sort_order: 3, color: '#7C3AED', icon: 'mdi-send-check-outline',     is_active: true },
    { code: 'report_submitted',             title: 'Report Submitted',             sort_order: 4, color: '#0891B2', icon: 'mdi-file-check-outline',      is_active: true },
    { code: 'approved',                     title: 'Approved',                     sort_order: 5, color: '#059669', icon: 'mdi-check-circle-outline',    is_active: true },
    { code: 'pending',                      title: 'Pending',                      sort_order: 6, color: '#F59E0B', icon: 'mdi-clock-outline',           is_active: true },
    { code: 'cancelled',                    title: 'Cancelled',                    sort_order: 7, color: '#EF4444', icon: 'mdi-close-circle-outline',    is_active: true },
]

// ── Workflow: allowed forward transitions ──────────────────────────────────────

export const STATUS_FLOW: Record<ItrStatusCode, ItrStatusCode | null> = {
    plan:                        'request_qc',
    request_qc:                  'external_request',
    request_internal_inspection: 'external_request',  // legacy — kept for existing ITRs
    internal_request:            'external_request',  // legacy — kept for existing ITRs
    external_request:            'report_submitted',
    report_submitted:            'approved',
    approved:                    null,    // terminal
    pending:                     null,    // terminal — on hold
    cancelled:                   null,    // terminal — cancelled
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useItrStatusStore = defineStore('itrStatus', () => {
    const statuses  = ref<ItrStatus[]>([])
    const loading   = ref(false)
    const error     = ref<string | null>(null)

    // ── Computed ───────────────────────────────────────────────────────────────

    const sorted = computed(() =>
        [...statuses.value].sort((a, b) => a.sort_order - b.sort_order)
    )

    const activeStatuses = computed(() => sorted.value.filter(s => s.is_active))

    const getById = (id: string | null): ItrStatus | undefined =>
        id ? statuses.value.find(s => s.id === id) : undefined

    const getByCode = (code: string): ItrStatus | undefined =>
        statuses.value.find(s => s.code === code)

    const getLabel = (id: string | null): string => {
        const s = getById(id)
        if (!s) return '—'
        // Code-based overrides take priority over whatever title the DB has
        if (s.code === 'external_request') return 'ITR Requested'
        return s.title
    }

    const getColor = (id: string | null): string => {
        const s = getById(id)
        return s?.color ?? '#64748B'
    }

    const getIcon = (id: string | null): string => {
        const s = getById(id)
        return s?.icon ?? 'mdi-circle-outline'
    }

    const getCode = (id: string | null): ItrStatusCode | null => {
        const s = getById(id)
        return (s?.code as ItrStatusCode) ?? null
    }

    /** Get the sort_order for a status id — used for comparing "is further along" */
    const getSortOrder = (id: string | null): number => {
        const s = getById(id)
        return s?.sort_order ?? 0
    }

    /** Can the ITR advance from its current status? */
    const canAdvance = (currentStatusId: string | null): boolean => {
        const code = getCode(currentStatusId)
        return code !== null && STATUS_FLOW[code] !== null
    }

    /** Get the next status for advancing */
    const getNextStatus = (currentStatusId: string | null): ItrStatus | undefined => {
        const code = getCode(currentStatusId)
        if (!code || !STATUS_FLOW[code]) return undefined
        return getByCode(STATUS_FLOW[code]!)
    }

    /** Can a section at sectionStatusId be edited given the ITR's current status? */
    const canEditSection = (
        sectionStatusId: string | null,
        currentItrStatusId: string | null,
        sectionUserId: string | null,
        loggedInUserId: string | null,
    ): boolean => {
        // Section can only be edited if it's the current status
        if (sectionStatusId !== currentItrStatusId) return false
        // And only by the user who actioned it (or anyone if no user assigned yet)
        if (!sectionUserId) return true
        return sectionUserId === loggedInUserId
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    const fetchStatuses = async (projectId: string) => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_statuses')
                .select('*')
                .eq('project_id', projectId)
                .order('sort_order')
            if (err) throw err

            if (!data || data.length === 0) {
                // Auto-seed default statuses for this project
                await seedDefaults(projectId)
            } else {
                statuses.value = data
                // Auto-sync titles/icons/colors from code defaults
                await syncDefaults(data)
            }
        } catch (err) {
            error.value   = err instanceof Error ? err.message : 'Failed to fetch ITR statuses'
            statuses.value = []
        } finally {
            loading.value = false
        }
    }

    /** Sync DB status rows with DEFAULT_ITR_STATUSES — only INSERTs missing codes.
     *  Does NOT overwrite existing rows so user customizations (title, color, icon) are preserved. */
    const syncDefaults = async (dbRows: ItrStatus[]) => {
        if (!dbRows.length) return
        const projectId = dbRows[0].project_id
        for (const def of DEFAULT_ITR_STATUSES) {
            const row = dbRows.find(r => r.code === def.code)
            if (!row) {
                // Missing code — insert with defaults
                const { data, error: err } = await supabase
                    .from('itr_statuses')
                    .insert({ ...def, project_id: projectId })
                    .select()
                    .single()
                if (!err && data) statuses.value.push(data)
            }
        }
    }

    const seedDefaults = async (projectId: string) => {
        try {
            const rows = DEFAULT_ITR_STATUSES.map(s => ({ ...s, project_id: projectId }))
            const { data, error: err } = await supabase
                .from('itr_statuses')
                .insert(rows)
                .select()
            if (err) throw err
            statuses.value = data ?? []
        } catch (err) {
            console.error('❌ Failed to seed default ITR statuses:', err)
        }
    }

    const createStatus = async (payload: ItrStatusInsert): Promise<ItrStatus | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_statuses')
                .insert(payload)
                .select()
                .single()
            if (err) throw err
            if (data) statuses.value.push(data)
            return data
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create status'
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteStatus = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { error: err } = await supabase
                .from('itr_statuses')
                .delete()
                .eq('id', id)
            if (err) throw err
            statuses.value = statuses.value.filter(s => s.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete status'
            return false
        } finally {
            loading.value = false
        }
    }

    const updateStatus = async (id: string, patch: ItrStatusUpdate): Promise<ItrStatus | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_statuses')
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()
            if (err) throw err
            const idx = statuses.value.findIndex(s => s.id === id)
            if (idx !== -1 && data) statuses.value[idx] = data
            return data
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update status'
            return null
        } finally {
            loading.value = false
        }
    }

    const clearStatuses = () => {
        statuses.value = []
    }

    return {
        statuses, loading, error,
        sorted, activeStatuses,
        getById, getByCode, getLabel, getColor, getIcon, getCode, getSortOrder,
        canAdvance, getNextStatus, canEditSection,
        fetchStatuses, createStatus, updateStatus, deleteStatus, seedDefaults, clearStatuses,
        DEFAULT_ITR_STATUSES, STATUS_FLOW,
    }
})
