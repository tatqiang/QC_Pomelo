import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Discipline {
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

export type DisciplineInsert = Omit<Discipline, 'id' | 'created_at' | 'updated_at'>
export type DisciplineUpdate = Partial<Omit<Discipline, 'id' | 'project_id' | 'created_at' | 'updated_at'>>

// ── Defaults seeded for every new project ─────────────────────────────────────

export const DEFAULT_DISCIPLINES: Omit<DisciplineInsert, 'project_id'>[] = [
    { code: 'M', title: 'HVAC / Mechanical', color: '#39ace7', sort_order: 1, is_active: true },
    { code: 'FP', title: 'Fire Protection', color: '#EF4444', sort_order: 2, is_active: true },
    { code: 'E', title: 'Electrical', color: '#F59E0B', sort_order: 3, is_active: true },
    { code: 'P', title: 'Plumbing', color: '#22C55E', sort_order: 4, is_active: true },
    { code: 'S', title: 'Structure / Civil', color: '#8B5CF6', sort_order: 5, is_active: true },
]

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDisciplineStore = defineStore('discipline', () => {
    const disciplines = ref<Discipline[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // ── Computed ────────────────────────────────────────────────────────────────

    /** v-select items */
    const options = computed(() =>
        disciplines.value
            .filter(d => d.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(d => ({
                title: `${d.code} — ${d.title}`,
                value: d.id,
                color: d.color,
            }))
    )

    const getById = (id: string | null): Discipline | undefined =>
        id ? disciplines.value.find(d => d.id === id) : undefined

    const getLabel = (id: string | null): string => {
        const d = getById(id)
        return d ? `${d.code} — ${d.title}` : '—'
    }

    // ── Actions ─────────────────────────────────────────────────────────────────

    const fetchDisciplines = async (projectId: string) => {
        loading.value = true
        error.value = null
        try {
            const { data, error: err } = await supabase
                .from('disciplines')
                .select('*')
                .eq('project_id', projectId)
                .order('sort_order')
            if (err) throw err
            disciplines.value = data ?? []
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to fetch disciplines'
            disciplines.value = []
        } finally {
            loading.value = false
        }
    }

    const createDiscipline = async (payload: DisciplineInsert): Promise<Discipline | null> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: err } = await supabase
                .from('disciplines')
                .insert(payload)
                .select()
                .single()
            if (err) throw err
            disciplines.value.push(data)
            disciplines.value.sort((a, b) => a.sort_order - b.sort_order)
            return data
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create discipline'
            return null
        } finally {
            loading.value = false
        }
    }

    const updateDiscipline = async (id: string, payload: DisciplineUpdate): Promise<Discipline | null> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: err } = await supabase
                .from('disciplines')
                .update(payload)
                .eq('id', id)
                .select()
                .single()
            if (err) throw err
            const idx = disciplines.value.findIndex(d => d.id === id)
            if (idx !== -1) disciplines.value[idx] = data
            return data
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update discipline'
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteDiscipline = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            const { error: err } = await supabase
                .from('disciplines')
                .delete()
                .eq('id', id)
            if (err) throw err
            disciplines.value = disciplines.value.filter(d => d.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete discipline'
            return false
        } finally {
            loading.value = false
        }
    }

    /** Seed default disciplines for a new project */
    const seedDefaults = async (projectId: string): Promise<void> => {
        const rows = DEFAULT_DISCIPLINES.map(d => ({ ...d, project_id: projectId }))
        const { data, error: err } = await supabase
            .from('disciplines')
            .insert(rows)
            .select()
        if (!err && data) {
            disciplines.value.push(...data)
            disciplines.value.sort((a, b) => a.sort_order - b.sort_order)
        }
    }

    const clearDisciplines = () => {
        disciplines.value = []
        error.value = null
    }

    return {
        disciplines, loading, error,
        options, getById, getLabel,
        fetchDisciplines, createDiscipline, updateDiscipline, deleteDiscipline,
        seedDefaults, clearDisciplines,
    }
})
