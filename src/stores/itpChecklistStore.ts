import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ItpHtmlChecklist {
    id:           string
    itp_id:       string
    code:         string
    title:        string
    discipline:   string | null
    html_content: string | null   // null when loaded via picker (metadata-only); full when loaded via fetchByIds/fetchChecklists
    field_schema: string[] | null   // extracted data-key list (non-sys:, non-sig:)
    version:      string
    is_active:    boolean
    created_by:   string | null
    created_at:   string
    updated_at:   string
}

export type ItpHtmlChecklistInsert = Omit<ItpHtmlChecklist, 'id' | 'created_at' | 'updated_at'>
export type ItpHtmlChecklistUpdate = Partial<Pick<ItpHtmlChecklist,
    'code' | 'title' | 'version' | 'discipline' | 'is_active' | 'html_content' | 'field_schema'>>

// ─── Store ────────────────────────────────────────────────────────────────────

export const useItpChecklistStore = defineStore('itpChecklist', () => {

    const checklists = ref<ItpHtmlChecklist[]>([])
    const loading    = ref(false)
    const error      = ref<string | null>(null)

    // ── Fetch all checklists for one ITP ─────────────────────────────────────

    const fetchChecklists = async (itpId: string): Promise<void> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itp_html_checklists')
                .select('*')
                .eq('itp_id', itpId)
                .order('code')
            if (err) throw err
            // Merge: remove old entries for this ITP, add fresh ones
            checklists.value = [
                ...checklists.value.filter(c => c.itp_id !== itpId),
                ...(data as ItpHtmlChecklist[] ?? []),
            ]
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load checklists'
        } finally {
            loading.value = false
        }
    }

    // ── Create ────────────────────────────────────────────────────────────────

    const createChecklist = async (data: ItpHtmlChecklistInsert): Promise<ItpHtmlChecklist | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data: row, error: err } = await supabase
                .from('itp_html_checklists')
                .insert(data)
                .select()
                .single()
            if (err) throw err
            const created = row as ItpHtmlChecklist
            checklists.value.push(created)
            return created
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create checklist'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Update metadata (code / title / version — NOT html_content) ──────────

    const updateChecklist = async (id: string, patch: ItpHtmlChecklistUpdate): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itp_html_checklists')
                .update(patch)
                .eq('id', id)
                .select()
                .single()
            if (err) throw err
            const updated = data as ItpHtmlChecklist
            const idx = checklists.value.findIndex(c => c.id === id)
            if (idx !== -1) checklists.value[idx] = updated
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update checklist'
            return false
        } finally {
            loading.value = false
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    const deleteChecklist = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { error: err } = await supabase
                .from('itp_html_checklists')
                .delete()
                .eq('id', id)
            if (err) throw err
            checklists.value = checklists.value.filter(c => c.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete checklist'
            return false
        } finally {
            loading.value = false
        }
    }

    // ── Helper: checklists for a specific ITP (reactive subset) ──────────────

    const forItp = (itpId: string): ItpHtmlChecklist[] =>
        checklists.value.filter(c => c.itp_id === itpId)

    // ── Fetch all active checklists for multiple ITP IDs (used by picker) ────

    const fetchForItpIds = async (itpIds: string[]): Promise<void> => {
        if (!itpIds.length) return
        loading.value = true
        error.value   = null
        try {
            // Select metadata only — html_content is NOT fetched here to reduce egress.
            // html_content is lazy-loaded on demand when a checklist is opened for viewing.
            const { data, error: err } = await supabase
                .from('itp_html_checklists')
                .select('id, itp_id, code, title, discipline, version, is_active, field_schema, created_by, created_at, updated_at')
                .in('itp_id', itpIds)
                .eq('is_active', true)
                .order('code')
            if (err) throw err
            const fetched = (data ?? []) as ItpHtmlChecklist[]
            const itpIdSet = new Set(itpIds)
            // Build lookup of entries already in store that have html_content loaded
            const existingWithContent = new Map(
                checklists.value.filter(c => c.html_content).map(c => [c.id, c])
            )
            // Merge: preserve html_content for entries already loaded, add null for the rest
            const merged = fetched.map(c => existingWithContent.get(c.id) ?? c)
            checklists.value = [
                ...checklists.value.filter(c => !itpIdSet.has(c.itp_id)),
                ...merged,
            ]
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load checklists'
        } finally {
            loading.value = false
        }
    }

    // ── Fetch specific checklists by their own IDs ────────────────────────────
    // Used when loading an existing ITR: we know the checklist UUIDs but the
    // store may not have their data yet (e.g. first open / page refresh).

    const fetchByIds = async (ids: string[]): Promise<void> => {
        if (!ids.length) return
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itp_html_checklists')
                .select('*')
                .in('id', ids)
            if (err) throw err
            const fetched = data as ItpHtmlChecklist[] ?? []
            const fetchedIds = new Set(fetched.map(c => c.id))
            // Merge: keep existing entries that aren't being replaced
            checklists.value = [
                ...checklists.value.filter(c => !fetchedIds.has(c.id)),
                ...fetched,
            ]
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load checklists by id'
        } finally {
            loading.value = false
        }
    }

    // ── Clear all (on project switch) ─────────────────────────────────────────

    const clearChecklists = () => { checklists.value = [] }

    return {
        checklists, loading, error,
        fetchChecklists, fetchForItpIds, fetchByIds,
        createChecklist, updateChecklist, deleteChecklist,
        forItp, clearChecklists,
    }
})
