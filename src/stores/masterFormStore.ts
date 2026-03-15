import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { r2StorageService } from '@/services/r2StorageService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormCode = 'itr_cover' | 'photo_report' | string

export interface MasterFormRevision {
    id: string
    form_id: string
    revision: string                         // e.g. 'Rev 0', 'Rev 1'
    revision_number: number
    is_latest: boolean
    template_url: string | null              // R2 public URL to AcroForm PDF (null for HTML revisions)
    html_content: string | null             // full HTML string (null for PDF revisions)
    field_map: Record<string, string> | null // optional JSON field name overrides
    apps_script_form_type: string | null     // Apps Script formType param
    notes: string | null
    released_date: string | null
    created_by: string | null
    created_at: string
}

export interface MasterForm {
    id: string
    project_id: string
    code: FormCode
    name: string
    description: string | null
    created_at: string
    master_form_revisions: MasterFormRevision[]
}

export interface ItrFormSnapshot {
    itr_id: string
    form_code: FormCode
    revision_id: string
    locked_at: string
    master_form_revisions?: MasterFormRevision   // joined
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMasterFormStore = defineStore('masterForm', () => {
    const forms   = ref<MasterForm[]>([])
    const loading = ref(false)
    const error   = ref<string | null>(null)

    // ── Getters ───────────────────────────────────────────────────────────────

    const getForm = (code: FormCode) => forms.value.find(f => f.code === code) ?? null

    const getLatestRevision = (code: FormCode): MasterFormRevision | null => {
        const form = getForm(code)
        if (!form) return null
        return form.master_form_revisions.find(r => r.is_latest)
            ?? form.master_form_revisions.sort((a, b) => b.revision_number - a.revision_number)[0]
            ?? null
    }

    const getRevisionById = (revisionId: string): MasterFormRevision | null => {
        for (const form of forms.value) {
            const rev = form.master_form_revisions.find(r => r.id === revisionId)
            if (rev) return rev
        }
        return null
    }

    // Returns the template URL to use for a given form, preferring the locked snapshot.
    // Falls back to latest revision, then null.
    const getTemplateUrl = (code: FormCode, snapshot?: ItrFormSnapshot | null): string | null => {
        if (snapshot?.master_form_revisions?.template_url) {
            return snapshot.master_form_revisions.template_url
        }
        return getLatestRevision(code)?.template_url ?? null
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const DEFAULT_FORMS: Array<{ code: FormCode; name: string; description: string }> = [
        { code: 'itr_cover',    name: 'ITR Cover',    description: 'Inspection & Test Request cover sheet with inspector signature' },
        { code: 'photo_report', name: 'Photo Report', description: 'Site photo documentation report' },
        { code: 'mat_receive',  name: 'Material Receive and Inspection Report', description: 'GN-02 Material Receive and Inspection Report' },
    ]

    /**
     * Fetch all master forms for the given project.
     * Auto-creates the two default form types if none exist yet for this project.
     */
    const fetchForms = async (projectId: string) => {
        if (!projectId) return
        loading.value = true; error.value = null
        const { data, error: err } = await supabase
            .from('master_forms')
            .select('*, master_form_revisions(*)')
            .eq('project_id', projectId)
            .order('name')
        if (err) { error.value = err.message; loading.value = false; return }

        // Auto-create default forms for this project on first use
        if (!data || data.length === 0) {
            const seeds = DEFAULT_FORMS.map(f => ({ ...f, project_id: projectId }))
            const { error: insertErr } = await supabase.from('master_forms').insert(seeds)
            if (insertErr) { error.value = insertErr.message; loading.value = false; return }
            // Re-fetch after seeding
            const { data: seeded, error: fetchErr } = await supabase
                .from('master_forms')
                .select('*, master_form_revisions(*)')
                .eq('project_id', projectId)
                .order('name')
            loading.value = false
            if (fetchErr) { error.value = fetchErr.message; return }
            forms.value = (seeded ?? []).map(f => ({
                ...f,
                master_form_revisions: (f.master_form_revisions ?? []).sort(
                    (a: MasterFormRevision, b: MasterFormRevision) => b.revision_number - a.revision_number
                ),
            }))
            return
        }

        loading.value = false
        // Sort revisions by revision_number desc within each form
        forms.value = (data ?? []).map(f => ({
            ...f,
            master_form_revisions: (f.master_form_revisions ?? []).sort(
                (a: MasterFormRevision, b: MasterFormRevision) => b.revision_number - a.revision_number
            ),
        }))
    }

    // ── Create revision ───────────────────────────────────────────────────────

    // Private: re-fetch forms scoped to the right project using in-memory cache
    const _refetchByFormId = (formId: string) => {
        const pid = forms.value.find(f => f.id === formId)?.project_id
        return pid ? fetchForms(pid) : Promise.resolve()
    }

    const addRevision = async (
        formId: string,
        file: File,
        payload: {
            revision: string
            revision_number: number
            apps_script_form_type?: string | null
            field_map?: Record<string, string> | null
            notes?: string | null
            released_date?: string | null
            created_by?: string | null
        },
        makeLatest = true,
    ): Promise<MasterFormRevision | null> => {
        loading.value = true; error.value = null
        try {
            const isHtml = file.name.toLowerCase().endsWith('.html') || file.type === 'text/html'
            let template_url: string | null = null
            let html_content: string | null = null

            if (isHtml) {
                html_content = await file.text()
            } else {
                template_url = await r2StorageService.uploadFile(
                    file,
                    `master_forms/${formId}`,
                )
            }

            // If marking as latest, clear existing is_latest flags first
            if (makeLatest) {
                await supabase
                    .from('master_form_revisions')
                    .update({ is_latest: false })
                    .eq('form_id', formId)
            }

            const { data, error: err } = await supabase
                .from('master_form_revisions')
                .insert({
                    form_id:                formId,
                    revision:               payload.revision,
                    revision_number:        payload.revision_number,
                    is_latest:              makeLatest,
                    template_url,
                    html_content,
                    apps_script_form_type:  payload.apps_script_form_type ?? null,
                    field_map:              payload.field_map ?? null,
                    notes:                  payload.notes ?? null,
                    released_date:          payload.released_date ?? null,
                    created_by:             payload.created_by ?? null,
                })
                .select()
                .single()

            if (err) { error.value = err.message; return null }
            await _refetchByFormId(formId)
            return data as MasterFormRevision
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : 'Upload failed'
            return null
        } finally {
            loading.value = false
        }
    }

    // ── Set latest revision ───────────────────────────────────────────────────

    const setLatestRevision = async (formId: string, revisionId: string): Promise<boolean> => {
        loading.value = true; error.value = null
        // Clear existing latest for this form
        const { error: clearErr } = await supabase
            .from('master_form_revisions')
            .update({ is_latest: false })
            .eq('form_id', formId)
        if (clearErr) { error.value = clearErr.message; loading.value = false; return false }

        // Set new latest
        const { error: setErr } = await supabase
            .from('master_form_revisions')
            .update({ is_latest: true })
            .eq('id', revisionId)
        loading.value = false
        if (setErr) { error.value = setErr.message; return false }
        await _refetchByFormId(formId)
        return true
    }

    // ── Delete revision ───────────────────────────────────────────────────────

    const deleteRevision = async (revisionId: string): Promise<boolean> => {
        loading.value = true; error.value = null
        const parentForm = forms.value.find(f => f.master_form_revisions.some(r => r.id === revisionId))
        const { error: err } = await supabase
            .from('master_form_revisions')
            .delete()
            .eq('id', revisionId)
        loading.value = false
        if (err) { error.value = err.message; return false }
        if (parentForm) await fetchForms(parentForm.project_id)
        return true
    }

    // ── Update revision ───────────────────────────────────────────────────────

    /**
     * Edit an existing revision's metadata and optionally replace the PDF file.
     * If `file` is provided the old template is replaced with a new R2 upload.
     */
    const updateRevision = async (
        revision: MasterFormRevision,
        payload: {
            revision_label: string
            revision_number: number
            apps_script_form_type?: string | null
            field_map?: Record<string, string> | null
            notes?: string | null
            released_date?: string | null
        },
        file?: File | null,
    ): Promise<boolean> => {
        loading.value = true; error.value = null
        try {
            let template_url = revision.template_url
            let html_content = revision.html_content
            if (file) {
                const isHtml = file.name.toLowerCase().endsWith('.html') || file.type === 'text/html'
                if (isHtml) {
                    html_content = await file.text()
                    template_url = null
                } else {
                    template_url = await r2StorageService.uploadFile(
                        file,
                        `master_forms/${revision.form_id}`,
                    )
                    html_content = null
                }
            }
            const { error: err } = await supabase
                .from('master_form_revisions')
                .update({
                    revision:               payload.revision_label,
                    revision_number:        payload.revision_number,
                    template_url,
                    html_content,
                    apps_script_form_type:  payload.apps_script_form_type ?? null,
                    field_map:              payload.field_map ?? null,
                    notes:                  payload.notes ?? null,
                    released_date:          payload.released_date ?? null,
                })
                .eq('id', revision.id)
            if (err) { error.value = err.message; return false }
            // Refresh: find the project_id from the in-memory form list
            const parentForm = forms.value.find(f => f.id === revision.form_id)
                            ?? forms.value.find(f => f.master_form_revisions.some(r => r.id === revision.id))
            if (parentForm) await fetchForms(parentForm.project_id)
            return true
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : 'Update failed'
            return false
        } finally {
            loading.value = false
        }
    }

    // ── Create form ────────────────────────────────────────────────────────────

    const createForm = async (
        projectId: string,
        code: string,
        name: string,
        description?: string,
    ): Promise<MasterForm | null> => {
        loading.value = true; error.value = null
        const { data, error: err } = await supabase
            .from('master_forms')
            .insert({ project_id: projectId, code: code.trim(), name: name.trim(), description: description?.trim() ?? null })
            .select('*, master_form_revisions(*)')
            .single()
        loading.value = false
        if (err) { error.value = err.message; return null }
        const form = { ...data, master_form_revisions: [] } as MasterForm
        forms.value = [...forms.value, form].sort((a, b) => a.name.localeCompare(b.name))
        return form
    }

    // ── Snapshot management ───────────────────────────────────────────────────

    /**
     * Lock the current latest revision of all known forms onto an ITR.
     * Called immediately after a new ITR is created.
     * Uses upsert so it's safe to call multiple times.
     */
    const lockSnapshots = async (itrId: string, projectId?: string) => {
        if (forms.value.length === 0 && projectId) await fetchForms(projectId)
        const rows = forms.value
            .map(f => {
                const latest = getLatestRevision(f.code)
                if (!latest) return null
                return {
                    itr_id:      itrId,
                    form_code:   f.code,
                    revision_id: latest.id,
                }
            })
            .filter(Boolean)

        if (!rows.length) return
        await supabase
            .from('itr_form_snapshots')
            .upsert(rows, { onConflict: 'itr_id,form_code' })
    }

    /**
     * Fetch the snapshots for a specific ITR, joined with revision data.
     * Returns a map keyed by form_code.
     */
    const fetchSnapshots = async (itrId: string): Promise<Record<FormCode, ItrFormSnapshot>> => {
        const { data, error: err } = await supabase
            .from('itr_form_snapshots')
            .select('*, master_form_revisions(*)')
            .eq('itr_id', itrId)
        if (err || !data) return {}
        const map: Record<FormCode, ItrFormSnapshot> = {}
        for (const row of data) map[row.form_code as FormCode] = row as ItrFormSnapshot
        return map
    }

    return {
        forms,
        loading,
        error,
        getForm,
        getLatestRevision,
        getRevisionById,
        getTemplateUrl,
        fetchForms,
        addRevision,
        setLatestRevision,
        deleteRevision,
        updateRevision,
        createForm,
        lockSnapshots,
        fetchSnapshots,
    }
})
