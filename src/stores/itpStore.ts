import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { r2StorageService } from '@/services/r2StorageService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItpFileCategory = 'itp' | 'checklist'

export interface ItpFile {
    id: string
    itp_id: string
    file_name: string
    file_url: string
    file_size: number | null
    file_type: string | null
    file_category: ItpFileCategory
    created_at: string
}

export interface ITP {
    id: string
    project_id: string
    discipline_id: string | null
    doc_no: string
    title: string
    last_revision: string | null
    revision_date: string | null
    status: string | null
    document_link: string | null
    itp_files: ItpFile[]
    created_at: string | null
    updated_at: string | null
}

/** Shape used for bulk upsert (id is omitted — DB generates it on INSERT) */
export type ItpUpsertRow = Omit<ITP, 'id' | 'created_at' | 'updated_at' | 'itp_files'>

// ─── Store ────────────────────────────────────────────────────────────────────

export const useItpStore = defineStore('itp', () => {
    const itps      = ref<ITP[]>([])
    const loading   = ref(false)
    const error     = ref<string | null>(null)

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchItps = async (projectId: string): Promise<void> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itps')
                .select('*, itp_files(*)')
                .eq('project_id', projectId)
                .order('doc_no')
            if (err) throw err
            itps.value = ((data as ITP[]) ?? []).map(r => ({ ...r, itp_files: r.itp_files ?? [] }))
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load ITPs'
            itps.value  = []
        } finally {
            loading.value = false
        }
    }

    // ── Bulk insert (used by import) ──────────────────────────────────────────

    /**
     * Upsert rows by (project_id, doc_no).
     * - New Doc_No  → inserted as a new record.
     * - Existing Doc_No → updated with the imported values.
     * Returns { inserted, updated } on success or null on error.
     */
    const upsertItps = async (rows: ItpUpsertRow[]): Promise<{ inserted: number; skipped: number } | null> => {
        if (rows.length === 0) return { inserted: 0, skipped: 0 }
        loading.value = true
        error.value   = null
        try {
            // ignoreDuplicates: false (default) → conflicts on (project_id, doc_no) are updated
            const { data, error: err } = await supabase
                .from('itps')
                .upsert(rows, { onConflict: 'project_id,doc_no', ignoreDuplicates: false })
                .select()
            if (err) throw err
            // Refresh local list
            await fetchItps(rows[0]!.project_id)
            // data contains all affected rows (inserted + updated)
            return { inserted: data?.length ?? rows.length, skipped: 0 }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to import ITPs'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Create single ────────────────────────────────────────────────────────

    const createItp = async (row: ItpUpsertRow): Promise<ITP | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itps')
                .insert(row)
                .select('*, itp_files(*)')
                .single()
            if (err) throw err
            const created = data as ITP
            created.itp_files = created.itp_files ?? []
            itps.value.push(created)
            return created
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create ITP'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Update single ────────────────────────────────────────────────────────

    const updateItp = async (id: string, patch: Partial<ItpUpsertRow>): Promise<ITP | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('itps')
                .update(patch)
                .eq('id', id)
                .select('*, itp_files(*)')
                .single()
            if (err) throw err
            const updated = data as ITP
            updated.itp_files = updated.itp_files ?? []
            const idx = itps.value.findIndex(r => r.id === id)
            if (idx !== -1) itps.value[idx] = updated
            return updated
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update ITP'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Delete single ────────────────────────────────────────────────────────

    const deleteItp = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { error: err } = await supabase.from('itps').delete().eq('id', id)
            if (err) throw err
            itps.value = itps.value.filter(r => r.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete ITP'
            return false
        } finally {
            loading.value = false
        }
    }

    // ── File attachments (R2 storage) ─────────────────────────────────────────

    const addItpFile = async (
        itp: ITP,
        file: File,
        category: ItpFileCategory = 'itp',
    ): Promise<ItpFile | null> => {
        loading.value = true
        error.value   = null
        try {
            const fileUrl = await r2StorageService.uploadFile(file, `itps/${itp.project_id}/${itp.id}/${category}`)
            const { data, error: dbErr } = await supabase
                .from('itp_files')
                .insert({
                    itp_id:        itp.id,
                    file_name:     file.name,
                    file_url:      fileUrl,
                    file_size:     file.size,
                    file_type:     file.type || null,
                    file_category: category,
                })
                .select()
                .single()
            if (dbErr) throw dbErr
            const attachment = data as ItpFile
            const idx = itps.value.findIndex(r => r.id === itp.id)
            if (idx !== -1) itps.value[idx]!.itp_files.push(attachment)
            return attachment
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to upload file'
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteItpFile = async (itpId: string, fileId: string): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { error: dbErr } = await supabase.from('itp_files').delete().eq('id', fileId)
            if (dbErr) throw dbErr
            const idx = itps.value.findIndex(r => r.id === itpId)
            if (idx !== -1) {
                itps.value[idx]!.itp_files = itps.value[idx]!.itp_files.filter(f => f.id !== fileId)
            }
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete file'
            return false
        } finally {
            loading.value = false
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    const clearItps = () => { itps.value = [] }

    return { itps, loading, error, fetchItps, upsertItps, createItp, updateItp, deleteItp, clearItps, addItpFile, deleteItpFile }
})
