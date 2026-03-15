import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ItrChecklistSelection {
    id:            string
    itr_id:        string
    checklist_id:  string
    display_order: number
    created_at:    string
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useItrChecklistSelectionStore = defineStore('itrChecklistSelection', () => {

    /** checklist_ids selected for a given itr_id, keyed by itr_id */
    const selectionsByItr = ref<Record<string, string[]>>({})
    const loading         = ref(false)
    const error           = ref<string | null>(null)

    // ── Fetch selections for one ITR ─────────────────────────────────────────

    const fetchSelections = async (itrId: string): Promise<string[]> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itr_checklist_selections')
                .select('checklist_id, display_order')
                .eq('itr_id', itrId)
                .order('display_order')
            if (err) throw err
            const ids = (data as { checklist_id: string }[]).map(r => r.checklist_id)
            selectionsByItr.value[itrId] = ids
            return ids
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load checklist selections'
            return []
        } finally {
            loading.value = false
        }
    }

    // ── Sync (replace) selections for one ITR ────────────────────────────────
    // Deletes all existing rows for this ITR, inserts the new set.

    const syncSelections = async (itrId: string, checklistIds: string[]): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            // Delete all existing
            const { error: delErr } = await supabase
                .from('itr_checklist_selections')
                .delete()
                .eq('itr_id', itrId)
            if (delErr) throw delErr

            // Insert new batch (skip if empty)
            if (checklistIds.length > 0) {
                const rows = checklistIds.map((checklist_id, idx) => ({
                    itr_id:        itrId,
                    checklist_id:  checklist_id,
                    display_order: idx,
                }))
                const { error: insErr } = await supabase
                    .from('itr_checklist_selections')
                    .insert(rows)
                if (insErr) throw insErr
            }

            selectionsByItr.value[itrId] = [...checklistIds]
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to save checklist selections'
            return false
        } finally {
            loading.value = false
        }
    }

    const getSelections = (itrId: string): string[] =>
        selectionsByItr.value[itrId] ?? []

    return {
        selectionsByItr, loading, error,
        fetchSelections, syncSelections, getSelections,
    }
})
