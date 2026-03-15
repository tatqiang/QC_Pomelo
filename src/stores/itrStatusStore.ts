import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItrStatus {
    id: string
    project_id: string
    code: string
    title: string
    sort_order: number
    color: string | null
    icon: string | null
    is_active: boolean
    created_at: string | null
    updated_at: string | null
}

export type ItrStatusCode =
    | 'plan'
    | 'request_internal_inspection'
    | 'internal_request'
    | 'external_request'
    | 'report_submitted'
    | 'approved'

export type ItrStatusInsert = Omit<ItrStatus, 'id' | 'created_at' | 'updated_at'>
export type ItrStatusUpdate = Partial<Omit<ItrStatus, 'id' | 'project_id' | 'created_at' | 'updated_at'>>

// ── Default statuses seeded for every new project ─────────────────────────────

export const DEFAULT_ITR_STATUSES: Omit<ItrStatusInsert, 'project_id'>[] = [
    { code: 'plan',                         title: 'Plan',                         sort_order: 1, color: '#64748B', icon: 'mdi-clipboard-list-outline',  is_active: true },
    { code: 'request_internal_inspection',  title: 'Pending Internal Inspection',  sort_order: 2, color: '#1D4ED8', icon: 'mdi-clock-check-outline',     is_active: true },
    { code: 'internal_request',             title: 'Internal Inspection',          sort_order: 3, color: '#2563EB', icon: 'mdi-send-outline',            is_active: true },
    { code: 'external_request',             title: 'ITR Requested',                sort_order: 4, color: '#7C3AED', icon: 'mdi-send-check-outline',      is_active: true },
    { code: 'report_submitted',             title: 'Report Submitted',             sort_order: 5, color: '#0891B2', icon: 'mdi-file-check-outline',      is_active: true },
    { code: 'approved',                     title: 'Approved',                     sort_order: 6, color: '#059669', icon: 'mdi-check-circle-outline',    is_active: true },
]

// ── Workflow: allowed forward transitions ──────────────────────────────────────

export const STATUS_FLOW: Record<ItrStatusCode, ItrStatusCode | null> = {
    plan:                        'request_internal_inspection',
    request_internal_inspection: 'internal_request',
    internal_request:            'external_request',
    external_request:            'report_submitted',
    report_submitted:            'approved',
    approved:                    null,   // terminal
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

    /** Sync DB status rows with DEFAULT_ITR_STATUSES (title, icon, color, sort_order).
     *  Also INSERTs any missing codes (e.g. newly added statuses like request_internal_inspection). */
    const syncDefaults = async (dbRows: ItrStatus[]) => {
        if (!dbRows.length) return
        const projectId = dbRows[0].project_id
        for (const def of DEFAULT_ITR_STATUSES) {
            const row = dbRows.find(r => r.code === def.code)
            if (!row) {
                // Missing row — insert it
                const { data, error: err } = await supabase
                    .from('itr_statuses')
                    .insert({ ...def, project_id: projectId })
                    .select()
                    .single()
                if (!err && data) statuses.value.push(data)
                continue
            }
            const needsUpdate =
                row.title !== def.title ||
                row.icon !== def.icon ||
                row.color !== def.color ||
                row.sort_order !== def.sort_order
            if (needsUpdate) {
                const { data, error: err } = await supabase
                    .from('itr_statuses')
                    .update({
                        title: def.title,
                        icon: def.icon,
                        color: def.color,
                        sort_order: def.sort_order,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', row.id)
                    .select()
                    .single()
                if (!err && data) {
                    const idx = statuses.value.findIndex(s => s.id === row.id)
                    if (idx !== -1) statuses.value[idx] = data
                }
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

    const clearStatuses = () => {
        statuses.value = []
    }

    return {
        statuses, loading, error,
        sorted, activeStatuses,
        getById, getByCode, getLabel, getColor, getIcon, getCode, getSortOrder,
        canAdvance, getNextStatus, canEditSection,
        fetchStatuses, seedDefaults, clearStatuses,
        DEFAULT_ITR_STATUSES, STATUS_FLOW,
    }
})
