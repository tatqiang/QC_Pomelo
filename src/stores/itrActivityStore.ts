import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItrActivityAction =
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'file_added'
    | 'file_deleted'
    | 'comment_added'

export interface ItrActivityEntry {
    id: string
    itr_id: string
    project_id: string
    user_id: string
    user_name: string
    action: ItrActivityAction
    detail: string | null
    meta: Record<string, unknown> | null
    created_at: string
}

export interface ItrActivityInsert {
    itr_id: string
    project_id: string
    user_id: string
    user_name: string
    action: ItrActivityAction
    detail?: string | null
    meta?: Record<string, unknown> | null
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useItrActivityStore = defineStore('itrActivity', () => {
    const entries  = ref<ItrActivityEntry[]>([])
    const loading  = ref(false)
    const error    = ref<string | null>(null)

    // ── Actions ───────────────────────────────────────────────────────────────

    /** Load activity log for a single ITR */
    const fetchLog = async (itrId: string): Promise<void> => {
        loading.value = true
        error.value   = null
        entries.value = []
        try {
            const { data, error: err } = await supabase
                .from('itr_activity_log')
                .select('*')
                .eq('itr_id', itrId)
                .order('created_at', { ascending: false })
            if (err) throw err
            entries.value = (data ?? []) as ItrActivityEntry[]
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load activity log'
        } finally {
            loading.value = false
        }
    }

    /** Write a single log entry — fire-and-forget (errors are silent) */
    const log = async (entry: ItrActivityInsert): Promise<void> => {
        try {
            const { data, error: err } = await supabase
                .from('itr_activity_log')
                .insert(entry)
                .select()
                .single()
            if (err) throw err
            // Prepend to local list if we're currently viewing the same ITR
            if (data && entries.value.length && entries.value[0]?.itr_id === entry.itr_id) {
                entries.value.unshift(data as ItrActivityEntry)
            }
        } catch (err) {
            console.warn('[itrActivity] log write failed:', err)
        }
    }

    const clearLog = () => { entries.value = [] }

    return { entries, loading, error, fetchLog, log, clearLog }
})
