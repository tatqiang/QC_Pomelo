import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { r2StorageService } from '@/services/r2StorageService'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaterialFile {
    id: string
    material_id: string
    file_name: string
    file_url: string
    file_size: number | null
    file_type: string | null
    created_at: string
}

export interface Material {
    id: string
    project_id: string
    discipline_id: string | null
    doc_no: string
    title: string
    last_revision: string | null
    revision_date: string | null
    status: string | null
    document_link: string | null
    material_files: MaterialFile[]
    created_at: string | null
    updated_at: string | null
}

/** Shape used for bulk upsert (id is omitted — DB generates it on INSERT) */
export type MaterialUpsertRow = Omit<Material, 'id' | 'created_at' | 'updated_at' | 'material_files'>

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMaterialStore = defineStore('material', () => {
    const materials = ref<Material[]>([])
    const loading   = ref(false)
    const error     = ref<string | null>(null)

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchMaterials = async (projectId: string): Promise<void> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('materials')
                .select('*, material_files(*)')
                .eq('project_id', projectId)
                .order('doc_no')
            if (err) throw err
            materials.value = ((data as Material[]) ?? []).map(r => ({ ...r, material_files: r.material_files ?? [] }))
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load Materials'
            materials.value = []
        } finally {
            loading.value = false
        }
    }

    // ── Bulk upsert (used by import / sync) ──────────────────────────────────

    /**
     * Upsert rows by (project_id, doc_no).
     * - New Doc_No  → inserted as a new record.
     * - Existing Doc_No → updated with the imported values.
     * Returns { inserted, skipped } on success or null on error.
     */
    const upsertMaterials = async (rows: MaterialUpsertRow[]): Promise<{ inserted: number; skipped: number } | null> => {
        if (rows.length === 0) return { inserted: 0, skipped: 0 }
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('materials')
                .upsert(rows, { onConflict: 'project_id,doc_no', ignoreDuplicates: false })
                .select()
            if (err) throw err
            await fetchMaterials(rows[0]!.project_id)
            return { inserted: data?.length ?? rows.length, skipped: 0 }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to import Materials'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Create single ────────────────────────────────────────────────────────

    const createMaterial = async (row: MaterialUpsertRow): Promise<Material | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('materials')
                .insert(row)
                .select('*, material_files(*)')
                .single()
            if (err) throw err
            const created = data as Material
            created.material_files = created.material_files ?? []
            materials.value.push(created)
            return created
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create Material'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Update single ────────────────────────────────────────────────────────

    const updateMaterial = async (id: string, patch: Partial<MaterialUpsertRow>): Promise<Material | null> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: err } = await supabase
                .from('materials')
                .update(patch)
                .eq('id', id)
                .select('*, material_files(*)')
                .single()
            if (err) throw err
            const updated = data as Material
            updated.material_files = updated.material_files ?? []
            const idx = materials.value.findIndex(r => r.id === id)
            if (idx !== -1) materials.value[idx] = updated
            return updated
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update Material'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Delete single ────────────────────────────────────────────────────────

    const deleteMaterial = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { error: err } = await supabase
                .from('materials')
                .delete()
                .eq('id', id)
            if (err) throw err
            materials.value = materials.value.filter(r => r.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete Material'
            return false
        } finally {
            loading.value = false
        }
    }

    // ── File attachments (R2 storage) ─────────────────────────────────────────

    const addMaterialFile = async (material: Material, file: File): Promise<MaterialFile | null> => {
        loading.value = true
        error.value   = null
        try {
            const fileUrl = await r2StorageService.uploadFile(file, `materials/${material.project_id}/${material.id}`)
            const { data, error: dbErr } = await supabase
                .from('material_files')
                .insert({
                    material_id: material.id,
                    file_name:   file.name,
                    file_url:    fileUrl,
                    file_size:   file.size,
                    file_type:   file.type || null,
                })
                .select()
                .single()
            if (dbErr) throw dbErr
            const attachment = data as MaterialFile
            const idx = materials.value.findIndex(r => r.id === material.id)
            if (idx !== -1) materials.value[idx]!.material_files.push(attachment)
            return attachment
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to upload file'
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteMaterialFile = async (materialId: string, fileId: string): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const { error: dbErr } = await supabase.from('material_files').delete().eq('id', fileId)
            if (dbErr) throw dbErr
            const idx = materials.value.findIndex(r => r.id === materialId)
            if (idx !== -1) {
                materials.value[idx]!.material_files = materials.value[idx]!.material_files.filter(f => f.id !== fileId)
            }
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete file'
            return false
        } finally {
            loading.value = false
        }
    }

    // ── Reset ────────────────────────────────────────────────────────────────────

    const clearMaterials = () => {
        materials.value = []
        error.value     = null
    }

    return {
        materials,
        loading,
        error,
        fetchMaterials,
        upsertMaterials,
        createMaterial,
        updateMaterial,
        deleteMaterial,
        clearMaterials,
        addMaterialFile,
        deleteMaterialFile,
    }
})
