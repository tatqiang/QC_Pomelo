import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Serialised form of a PickerItem, extended with photo-page extras. */
export interface SavedPickerItem {
    id:             string
    type:           'html_form' | 'pdf_page' | 'image'
    label:          string
    formCode?:      string          // 'itr_cover' | 'photo_report' | checklist id
    fileUrl?:       string          // pdf_page only
    pageNum?:       number          // pdf_page only
    attachmentUrl?: string          // image only
    materialDocNo?: string          // set when page comes from a linked material PDF
    // Photo report page extras (embedded so they survive between sessions)
    photoSlots?:    Array<string | null>   // 8 image URLs (or null)
    photoDescs?:    string[]               // 4 block captions
}

export interface ReportPageConfig {
    version:   1
    selection: SavedPickerItem[]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useItrReportPagesStore = defineStore('itrReportPages', () => {

    /** Load the saved report config for a given ITR.
     *  Returns null if no config has been saved yet, or on error. */
    async function loadConfig(itrId: string): Promise<ReportPageConfig | null> {
        const { data, error } = await supabase
            .from('itr_report_pages')
            .select('config')
            .eq('itr_id', itrId)
            .maybeSingle()

        if (error) {
            console.error('[itrReportPagesStore] loadConfig:', error.message)
            return null
        }
        const raw = data?.config as ReportPageConfig | null | undefined
        // Basic validation — must be version 1 with a selection array
        if (!raw || raw.version !== 1 || !Array.isArray(raw.selection)) return null
        return raw
    }

    /** Upsert the report config for a given ITR. */
    async function saveConfig(itrId: string, config: ReportPageConfig): Promise<void> {
        const { error } = await supabase
            .from('itr_report_pages')
            .upsert(
                { itr_id: itrId, config, updated_at: new Date().toISOString() },
                { onConflict: 'itr_id' }
            )
        if (error) {
            console.error('[itrReportPagesStore] saveConfig:', error.message)
        }
    }

    return { loadConfig, saveConfig }
})
