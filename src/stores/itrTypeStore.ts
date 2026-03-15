import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItrType {
    id: string
    project_id: string
    code: string
    title: string
    color: string | null
    sort_order: number
    is_active: boolean
    created_at: string | null
    updated_at: string | null
}

export type ItrTypeInsert = Omit<ItrType, 'id' | 'created_at' | 'updated_at'>
export type ItrTypeUpdate = Partial<Omit<ItrType, 'id' | 'project_id' | 'created_at' | 'updated_at'>>

// ── Defaults seeded for every new project ─────────────────────────────────────

export const DEFAULT_ITR_TYPES: Omit<ItrTypeInsert, 'project_id'>[] = [
    { code: 'INSP', title: 'Inspection',          color: '#2563EB', sort_order: 1, is_active: true },
    { code: 'TEST', title: 'Test',                color: '#7C3AED', sort_order: 2, is_active: true },
    { code: 'SRV',  title: 'Survey',              color: '#0891B2', sort_order: 3, is_active: true },
    { code: 'COM',  title: 'Commissioning',       color: '#059669', sort_order: 4, is_active: true },
    { code: 'MAT',  title: 'Material Inspection', color: '#D97706', sort_order: 5, is_active: true },
]

// ── Store ─────────────────────────────────────────────────────────────────────

export const useItrTypeStore = defineStore('itrType', () => {
    const itrTypes = ref<ItrType[]>([])
    const loading  = ref(false)
    const error    = ref<string | null>(null)

    // ── Computed ────────────────────────────────────────────────────────────────

    /** v-select items */
    const options = computed(() =>
        itrTypes.value
            .filter(t => t.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(t => ({
                title: `${t.code} — ${t.title}`,
                value: t.id,
                color: t.color,
            }))
    )

    const getById = (id: string | null): ItrType | undefined =>
        id ? itrTypes.value.find(t => t.id === id) : undefined

    const getLabel = (id: string | null): string => {
        const t = getById(id)
        return t ? `${t.code} — ${t.title}` : '—'
    }

    // ── Actions ─────────────────────────────────────────────────────────────────

    const fetchItrTypes = async (projectId: string) => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_types')
                .select('*')
                .eq('project_id', projectId)
                .order('sort_order')
            if (err) throw err
            itrTypes.value = data ?? []
        } catch (err) {
            error.value   = err instanceof Error ? err.message : 'Failed to fetch ITR types'
            itrTypes.value = []
        } finally {
            loading.value = false
        }
    }

    const createItrType = async (payload: ItrTypeInsert): Promise<ItrType | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_types')
                .insert(payload)
                .select()
                .single()
            if (err) throw err
            itrTypes.value.push(data)
            itrTypes.value.sort((a, b) => a.sort_order - b.sort_order)
            return data
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create ITR type'
            return null
        } finally {
            loading.value = false
        }
    }

    const updateItrType = async (id: string, payload: ItrTypeUpdate): Promise<ItrType | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_types')
                .update(payload)
                .eq('id', id)
                .select()
                .single()
            if (err) throw err
            const idx = itrTypes.value.findIndex(t => t.id === id)
            if (idx !== -1) itrTypes.value[idx] = data
            return data
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update ITR type'
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteItrType = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { error: err } = await supabase.from('itr_types').delete().eq('id', id)
            if (err) throw err
            itrTypes.value = itrTypes.value.filter(t => t.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete ITR type'
            return false
        } finally {
            loading.value = false
        }
    }

    const seedDefaults = async (projectId: string): Promise<void> => {
        const existing = itrTypes.value.map(t => t.code)
        const toInsert = DEFAULT_ITR_TYPES
            .filter(t => !existing.includes(t.code))
            .map(t => ({ ...t, project_id: projectId }))
        if (toInsert.length === 0) return
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_types')
                .insert(toInsert)
                .select()
            if (err) throw err
            itrTypes.value.push(...(data ?? []))
            itrTypes.value.sort((a, b) => a.sort_order - b.sort_order)
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to seed ITR types'
        } finally {
            loading.value = false
        }
    }

    const clearItrTypes = () => {
        itrTypes.value = []
        error.value    = null
    }

    return {
        itrTypes,
        loading,
        error,
        options,
        getById,
        getLabel,
        fetchItrTypes,
        createItrType,
        updateItrType,
        deleteItrType,
        seedDefaults,
        clearItrTypes,
    }
})
