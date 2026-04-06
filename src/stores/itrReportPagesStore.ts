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

    const _lsKey = (itrId: string) => `itr_report_config_${itrId}`

    function _isValidConfig(raw: unknown): raw is ReportPageConfig {
        return !!raw && (raw as ReportPageConfig).version === 1 && Array.isArray((raw as ReportPageConfig).selection)
    }

    /** Load the saved report config for a given ITR.
     *  localStorage is checked FIRST (always the most recent state for this device).
     *  Supabase is used as fallback when there is no local data (e.g. first open on a new device). */
    async function loadConfig(itrId: string): Promise<ReportPageConfig | null> {
        // ── 1. localStorage (primary — always up to date for this device) ────────
        try {
            const cached = JSON.parse(localStorage.getItem(_lsKey(itrId)) ?? 'null')
            if (_isValidConfig(cached)) return cached
        } catch (_) {}

        // ── 2. Supabase (fallback — used when localStorage is empty) ─────────────
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
        if (!_isValidConfig(raw)) return null

        // Seed localStorage so future loads don't need Supabase
        try { localStorage.setItem(_lsKey(itrId), JSON.stringify(raw)) } catch (_) {}
        return raw
    }

    const _isTimeout = (msg: string) =>
        msg.toLowerCase().includes('statement timeout') ||
        msg.toLowerCase().includes('canceling statement')

    /**
     * Strip base64 data URLs from photoSlots before sending to Supabase.
     * Device-uploaded images are stored as data:image/jpeg;base64,... blobs which can
     * be 200–400 KB each. With 8 slots × multiple photo pages the config JSON can reach
     * several MB, causing a DB statement_timeout. https:// URLs are kept as-is.
     * The full config (with base64) always stays in localStorage.
     */
    function _stripBase64(config: ReportPageConfig): ReportPageConfig {
        return {
            ...config,
            selection: config.selection.map(item => {
                if (!item.photoSlots) return item
                return {
                    ...item,
                    photoSlots: item.photoSlots.map(slot =>
                        slot && slot.startsWith('data:') ? null : slot
                    ),
                }
            }),
        }
    }

    /** Upsert the report config for a given ITR.
     *  Always writes the FULL config (including base64 images) to localStorage.
     *  Sends a stripped config (no base64) to Supabase to avoid statement_timeout.
     *  Returns true if Supabase upsert ultimately succeeded. */
    async function saveConfig(itrId: string, config: ReportPageConfig): Promise<boolean> {
        // Persist full config locally first — synchronous, always succeeds
        try { localStorage.setItem(_lsKey(itrId), JSON.stringify(config)) } catch (_) {}

        // Strip base64 photo slots before sending to DB (keeps payload small)
        const dbConfig = _stripBase64(config)

        const attempt = () => supabase
            .from('itr_report_pages')
            .upsert(
                { itr_id: itrId, config: dbConfig, updated_at: new Date().toISOString() },
                { onConflict: 'itr_id' }
            )

        let { error } = await attempt()

        // Only retry on transient network blips, NOT on DB statement_timeout
        // (timeout means the DB itself is rejecting the query — retrying won't help)
        if (error && !_isTimeout(error.message)) {
            await new Promise(r => setTimeout(r, 2000))
            ;({ error } = await attempt())
        }

        if (error) {
            if (_isTimeout(error.message)) {
                console.warn('[itrReportPagesStore] saveConfig: DB statement_timeout — config saved to localStorage only. Run the SQL fix in Supabase to resolve.')
            } else {
                console.error('[itrReportPagesStore] saveConfig failed:', error.message)
            }
            return false
        }
        return true
    }

    /** Push the locally-cached config to Supabase (call when DB is known to be healthy). */
    async function syncLocalToSupabase(itrId: string): Promise<void> {
        try {
            const cached = JSON.parse(localStorage.getItem(_lsKey(itrId)) ?? 'null')
            if (!_isValidConfig(cached)) return
            const { error } = await supabase
                .from('itr_report_pages')
                .upsert(
                    { itr_id: itrId, config: _stripBase64(cached), updated_at: new Date().toISOString() },
                    { onConflict: 'itr_id' }
                )
            if (!error) console.log('[itrReportPagesStore] syncLocalToSupabase: synced successfully')
        } catch (_) {}
    }

    return { loadConfig, saveConfig, syncLocalToSupabase }
})
