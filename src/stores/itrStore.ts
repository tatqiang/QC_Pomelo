import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { r2StorageService } from '@/services/r2StorageService'
import { useItrStatusStore, type ItrStatusCode } from '@/stores/itrStatusStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthorityStore } from '@/stores/authorityStore'
import { useAuthStore } from '@/stores/authStore'
import { useItrActivityStore } from '@/stores/itrActivityStore'
import { type Material } from '@/stores/materialStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttachmentCategory =
    | 'drawing'
    | 'do'
    | 'additional'
    | 'image'
    | 'itr_request'
    | 'itr_report'
    | 'approved_report'

export interface ItrAttachment {
    id: string
    itr_id: string
    file_name: string
    file_url: string
    file_type: string | null
    file_size: number | null
    category: AttachmentCategory
    status_id: string | null
    uploaded_by: string | null
    uploaded_at: string
}

export interface ItrMaterial {
    id: string
    itr_id: string
    material_id: string
    sort_order: number
    created_at: string
    /** Joined Material document with its files */
    material?: Pick<Material, 'id' | 'doc_no' | 'title' | 'material_files'> | null
}

export interface ItrQcAssignment {
    id: string
    itr_id: string
    user_id: string
    created_at: string
    user?: { id: string; first_name: string | null; last_name: string | null; email: string } | null
}

export interface ITR {
    id: string
    project_id: string
    task_id: string | null
    area_id: string | null        // primary area (first of area_ids)
    area_ids: string[]             // all linked areas (from itr_areas junction)
    item_no: string | null          // internal running number (auto-gen) e.g. ITR-M-A001
    itr_number: string | null       // external document number (manual, from external team)
    title: string
    itr_type_id: string | null
    discipline_id: string | null
    status_id: string | null            // FK → itr_statuses
    // Legacy enum fields kept for backward compat
    status: string | null
    discipline: string | null
    itp_id: string | null
    location: string | null
    notes: string | null
    qc_notes: string | null
    drawing_number: string | null
    revision_number: string | null
    planned_inspection_date: string | null   // set in Draft form
    req_inspection_date: string | null       // confirmed in Internal Request (stage 2)
    inspection_date: string | null           // actual inspection date, filled in Report Submitted (stage 4)
    // File link fields
    itr_request_file_link: string | null
    itr_report_file_link: string | null
    approved_report_file_link: string | null
    // Per-state user tracking
    draft_by: string | null
    draft_at: string | null
    internal_request_by: string | null
    internal_request_at: string | null
    external_request_by: string | null
    external_request_at: string | null
    report_submitted_by: string | null
    report_submitted_at: string | null
    approved_by: string | null
    approved_at: string | null
    // REQUEST ITR tab scalar fields (preserved separately from core inspection data)
    req_title: string | null
    req_itr_number: string | null
    req_itr_type_id: string | null
    req_discipline_id: string | null
    req_task_id: string | null
    req_area_ids: string[]
    req_itp_id: string | null
    req_location: string | null
    req_drawing_number: string | null
    req_revision_number: string | null
    req_planned_inspection_date: string | null
    req_notes: string | null
    // Legacy fields
    submitted_at: string | null
    submitted_by: string | null
    reviewed_at: string | null
    reviewed_by: string | null
    review_notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    itr_attachments: ItrAttachment[]
    /** Linked Material Approval documents (many-to-many via itr_materials junction) */
    itr_materials: ItrMaterial[]
    /** User-filled PDF form fields, keyed by form code e.g. "itr_cover", "photo_report" */
    form_data: Record<string, unknown> | null
    /** Joined from users table via draft_by FK */
    draft_user?: { first_name: string | null; last_name: string | null; email: string } | null
    /** QC in charge assignments (many-to-many via itr_qc_assignments) */
    qc_assignments: ItrQcAssignment[]
}

export type ItrInsert = Pick<ITR, 'project_id' | 'title'> &
    Partial<Omit<ITR, 'id' | 'created_at' | 'updated_at' | 'itr_attachments' | 'project_id' | 'title'>>

export type ItrUpdate = Partial<Omit<ITR, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'itr_attachments'>>

// ─── Attachment category meta ─────────────────────────────────────────────────

export const ATTACHMENT_CATEGORIES: Record<AttachmentCategory, { label: string; icon: string; accept: string }> = {
    drawing:         { label: 'Drawing',          icon: 'mdi-floor-plan',          accept: '.pdf,image/*' },
    do:              { label: 'Delivery Order',   icon: 'mdi-truck-delivery',      accept: '.pdf,image/*' },
    additional:      { label: 'Additional',       icon: 'mdi-paperclip',           accept: '.pdf,image/*,.doc,.docx,.xls,.xlsx' },
    image:           { label: 'Photo / Image',    icon: 'mdi-camera-outline',      accept: 'image/*' },
    itr_request:     { label: 'ITR Request',      icon: 'mdi-file-send-outline',   accept: '.pdf,image/*' },
    itr_report:      { label: 'ITR Report',       icon: 'mdi-file-chart-outline',  accept: '.pdf,image/*' },
    approved_report: { label: 'Approved Report',  icon: 'mdi-file-check-outline',  accept: '.pdf,image/*' },
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useItrStore = defineStore('itr', () => {
    const itrs = ref<ITR[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // ── Filters ───────────────────────────────────────────────────────────────

    const filterStatusId = ref<string | 'all'>('all')
    const filterSearch = ref('')

    const filteredITRs = computed(() => {
        let list = itrs.value
        if (filterStatusId.value !== 'all') list = list.filter(i => i.status_id === filterStatusId.value)
        if (filterSearch.value.trim()) {
            const q = filterSearch.value.toLowerCase()
            list = list.filter(i =>
                i.title.toLowerCase().includes(q) ||
                (i.item_no ?? '').toLowerCase().includes(q) ||
                (i.itr_number ?? '').toLowerCase().includes(q)
            )
        }
        return list
    })

    // ── Stats (for dashboard) ─────────────────────────────────────────────────

    const stats = computed(() => {
        const statusStore = useItrStatusStore()
        const result: Record<string, number> = { total: itrs.value.length }
        for (const s of statusStore.statuses) {
            result[s.code] = itrs.value.filter(i => i.status_id === s.id).length
        }
        return result
    })

    // ── CRUD ──────────────────────────────────────────────────────────────────

    /** Fetch only the form_data column for one ITR and merge it into the store.
     *  Called before opening a form preview so all users always see the latest saved data. */
    const refreshFormData = async (itrId: string): Promise<void> => {
        try {
            const { data, error: dbErr } = await supabase
                .from('itrs')
                .select('id, form_data')
                .eq('id', itrId)
                .single()
            if (dbErr || !data) return
            const idx = itrs.value.findIndex(i => i.id === itrId)
            if (idx !== -1) {
                itrs.value[idx] = { ...itrs.value[idx]!, form_data: (data as any).form_data }
            }
        } catch { /* silent — stale data is still usable */ }
    }

    const fetchITRs = async (projectId: string): Promise<void> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: dbErr } = await supabase
                .from('itrs')
                .select('*, itr_attachments(*), itr_areas(area_id, sort_order), itr_materials(id, itr_id, material_id, sort_order, created_at, material:materials(id, doc_no, title, material_files(*))), draft_user:users!draft_by(first_name, last_name, email), itr_qc_assignments(id, itr_id, user_id, created_at, user:users(id, first_name, last_name, email))')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })

            if (dbErr) throw dbErr
            itrs.value = ((data as any[]) ?? []).map(row => ({
                ...row,
                area_ids: (row.itr_areas ?? [])
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((r: any) => r.area_id as string),
                itr_materials: ((row.itr_materials ?? []) as ItrMaterial[])
                    .sort((a, b) => a.sort_order - b.sort_order),
                qc_assignments: (row.itr_qc_assignments ?? []) as ItrQcAssignment[],
            })) as ITR[]
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load ITRs'
            console.error('❌ fetchITRs:', err)
        } finally {
            loading.value = false
        }
    }

    // ── Sync junction table itr_areas ─────────────────────────────────────────
    const syncItrAreas = async (itrId: string, areaIds: string[]): Promise<void> => {
        await supabase.from('itr_areas').delete().eq('itr_id', itrId)
        if (areaIds.length > 0) {
            await supabase.from('itr_areas').insert(
                areaIds.map((aid, i) => ({ itr_id: itrId, area_id: aid, sort_order: i }))
            )
        }
    }

    // ── Sync junction table itr_qc_assignments ────────────────────────────────
    const syncItrQcAssignments = async (itrId: string, userIds: string[]): Promise<void> => {
        await supabase.from('itr_qc_assignments').delete().eq('itr_id', itrId)
        if (userIds.length > 0) {
            await supabase.from('itr_qc_assignments').insert(
                userIds.map(uid => ({ itr_id: itrId, user_id: uid }))
            )
        }
        const idx = itrs.value.findIndex(i => i.id === itrId)
        if (idx !== -1) {
            itrs.value[idx].qc_assignments = userIds.map(uid => ({
                id: '', itr_id: itrId, user_id: uid,
                created_at: new Date().toISOString(),
            }))
        }
    }

    const createITR = async (payload: ItrInsert): Promise<ITR | null> => {
        loading.value = true
        error.value = null
        try {
            const { area_ids, itr_areas: _ia, ...dbPayload } = payload as any
            const { data, error: dbErr } = await supabase
                .from('itrs')
                .insert(dbPayload)
                .select('*, itr_attachments(*)')
                .single()

            if (dbErr) throw dbErr
            const itr = data as ITR
            const ids = (area_ids ?? []) as string[]
            await syncItrAreas(itr.id, ids)
            itr.area_ids = ids
            itr.itr_materials = []
            itr.qc_assignments = []
            itrs.value.unshift(itr)

            // Log
            const authStore = useAuthStore()
            if (authStore.userId) {
                useItrActivityStore().log({
                    itr_id: itr.id, project_id: itr.project_id,
                    user_id: authStore.userId, user_name: authStore.userDisplayName || authStore.user?.email || authStore.userId,
                    action: 'created', detail: `ITR created: "${itr.title}"`,
                })
            }

            return itr
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create ITR'
            console.error('❌ createITR:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    const updateITR = async (id: string, payload: ItrUpdate): Promise<ITR | null> => {
        loading.value = true
        error.value = null
        try {
            const { area_ids, itr_areas: _ia, ...dbPayload } = payload as any
            const { data, error: dbErr } = await supabase
                .from('itrs')
                .update(dbPayload)
                .eq('id', id)
                .select('*, itr_attachments(*)')
                .single()

            if (dbErr) throw dbErr
            const updated = data as ITR
            if (area_ids !== undefined) {
                const ids = area_ids as string[]
                await syncItrAreas(id, ids)
                updated.area_ids = ids
            } else {
                // preserve existing area_ids from local state
                const existing = itrs.value.find(i => i.id === id)
                updated.area_ids = existing?.area_ids ?? []
            }
            const idx = itrs.value.findIndex(i => i.id === id)
            if (idx !== -1) {
                // preserve joined data that is not returned by a plain update select
                updated.draft_user     = itrs.value[idx].draft_user
                updated.itr_materials  = itrs.value[idx].itr_materials ?? []
                updated.qc_assignments = itrs.value[idx].qc_assignments ?? []
                itrs.value[idx] = updated
            }

            // Log
            const authStore = useAuthStore()
            if (authStore.userId && !('status_id' in (payload as any) && Object.keys(payload as any).length === 1)) {
                // Only log plain data edits here; status changes are logged by advanceStatus / rejectToDraft
                const hasStatusOnly = 'status_id' in (payload as any)
                if (!hasStatusOnly) {
                    useItrActivityStore().log({
                        itr_id: id, project_id: updated.project_id,
                        user_id: authStore.userId, user_name: authStore.userDisplayName || authStore.user?.email || authStore.userId,
                        action: 'updated', detail: 'ITR data updated',
                    })
                }
            }

            return updated
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update ITR'
            console.error('❌ updateITR:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteITR = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            const { error: dbErr } = await supabase.from('itrs').delete().eq('id', id)
            if (dbErr) throw dbErr
            itrs.value = itrs.value.filter(i => i.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete ITR'
            console.error('❌ deleteITR:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    // ── Workflow transitions ──────────────────────────────────────────────────

    // ── Notification helper ─────────────────────────────────────────────────

    const notifyItrUpdate = async (
        itr: ITR,
        newStatusLabel: string,
        actorId: string,
        isRejected = false,
    ) => {
        const notifStore     = useNotificationStore()
        const authorityStore = useAuthorityStore()
        if (authorityStore.projectMembers.length === 0) {
            await authorityStore.fetchProjectMembers(itr.project_id ?? undefined)
        }
        const memberIds = authorityStore.projectMembers
            .filter(m => m.is_active)
            .map(m => m.user_id)
        if (!memberIds.length) return
        const emoji  = isRejected ? '🔴' : '🔔'
        const action = isRejected ? 'Rejected → Plan' : `→ ${newStatusLabel}`
        notifStore.sendToUsers(memberIds, {
            project_id: itr.project_id,
            type:       'itr_updated',
            title:      `${emoji} ITR Updated`,
            body:       `"${itr.title}" status changed ${action}`,
            link:       '/itrs',
            ref_id:     itr.id,
            created_by: actorId,
        })
    }

    /** Advance ITR to the next status in the workflow */
    const advanceStatus = async (
        id: string,
        userId: string,
        additionalPayload?: ItrUpdate
    ): Promise<ITR | null> => {
        const statusStore = useItrStatusStore()
        const itr = itrs.value.find(i => i.id === id)
        if (!itr) { error.value = 'ITR not found'; return null }

        const nextStatus = statusStore.getNextStatus(itr.status_id)
        if (!nextStatus) { error.value = 'No next status available'; return null }

        const now = new Date().toISOString()
        const code = nextStatus.code as ItrStatusCode

        // Build per-state tracking update
        const stateUpdate: ItrUpdate = { status_id: nextStatus.id }
        if (code === 'request_qc' || code === 'internal_request') {
            stateUpdate.internal_request_by = userId
            stateUpdate.internal_request_at = now
        } else if (code === 'external_request') {
            stateUpdate.external_request_by = userId
            stateUpdate.external_request_at = now
        } else if (code === 'report_submitted') {
            stateUpdate.report_submitted_by = userId
            stateUpdate.report_submitted_at = now
        } else if (code === 'approved') {
            stateUpdate.approved_by = userId
            stateUpdate.approved_at = now
        }

        const updated = await updateITR(id, { ...stateUpdate, ...additionalPayload })
        if (updated) {
            notifyItrUpdate(updated, nextStatus.title, userId)
            const authStore = useAuthStore()
            useItrActivityStore().log({
                itr_id: id, project_id: updated.project_id,
                user_id: userId, user_name: authStore.userDisplayName || authStore.user?.email || userId,
                action: 'status_changed', detail: `Status → ${nextStatus.title}`,
                meta: { status_code: nextStatus.code, status_title: nextStatus.title },
            })
        }
        return updated
    }

    /** Reject ITR back to plan status */
    const rejectToDraft = async (
        id: string,
        userId: string,
        notes?: string
    ): Promise<ITR | null> => {
        const statusStore = useItrStatusStore()
        const draftStatus = statusStore.getByCode('plan')
        if (!draftStatus) { error.value = 'Plan status not found'; return null }

        const updated = await updateITR(id, {
            status_id: draftStatus.id,
            qc_notes: notes ?? null,
            // Reset forward state tracking
            internal_request_by: null,
            internal_request_at: null,
            external_request_by: null,
            external_request_at: null,
            report_submitted_by: null,
            report_submitted_at: null,
            approved_by: null,
            approved_at: null,
        })
        if (updated) {
            notifyItrUpdate(updated, 'Plan', userId, true)
            const authStore = useAuthStore()
            useItrActivityStore().log({
                itr_id: id, project_id: updated.project_id,
                user_id: userId, user_name: authStore.userDisplayName || authStore.user?.email || userId,
                action: 'status_changed', detail: 'Rejected → Plan',
                meta: { status_code: 'plan', rejected: true, notes: notes ?? null },
            })
        }
        return updated
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    /** Compress an image File to JPEG ≤1200px, quality 0.70. Non-images pass through unchanged. */
    async function compressImageFile(file: File): Promise<File> {
        if (!file.type.startsWith('image/')) return file
        const MAX_PX  = 1200
        const QUALITY = 0.70
        try {
            const bmp = await createImageBitmap(file)
            let { width: w, height: h } = bmp
            if (w > MAX_PX || h > MAX_PX) {
                const scale = MAX_PX / Math.max(w, h)
                w = Math.round(w * scale)
                h = Math.round(h * scale)
            }
            const canvas = document.createElement('canvas')
            canvas.width  = w
            canvas.height = h
            canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
            bmp.close()
            return await new Promise<File>((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (!blob) { reject(new Error('toBlob failed')); return }
                    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
                    resolve(new File([blob], name, { type: 'image/jpeg' }))
                }, 'image/jpeg', QUALITY)
            })
        } catch {
            return file  // fall back to original on any error
        }
    }

    const addAttachment = async (
        itr: ITR,
        file: File,
        userId: string | null,
        category: AttachmentCategory = 'additional',
        statusId: string | null = null,
    ): Promise<ItrAttachment | null> => {
        loading.value = true
        error.value = null
        try {
            const subPath    = `itrs/${itr.project_id}/${itr.id}/${category}`
            const uploadFile = await compressImageFile(file)
            const fileUrl    = await r2StorageService.uploadFile(uploadFile, subPath)

            const { data, error: dbErr } = await supabase
                .from('itr_attachments')
                .insert({
                    itr_id: itr.id,
                    file_name: uploadFile.name,
                    file_url: fileUrl,
                    file_type: uploadFile.type || null,
                    file_size: uploadFile.size,
                    uploaded_by: userId,
                    category,
                    status_id: statusId,
                })
                .select()
                .single()

            if (dbErr) throw dbErr
            const attachment = data as ItrAttachment

            // Update local state
            const idx = itrs.value.findIndex(i => i.id === itr.id)
            const local = idx !== -1 ? itrs.value[idx] : null
            if (local) local.itr_attachments.push(attachment)

            // Log
            const authStore = useAuthStore()
            if (authStore.userId) {
                useItrActivityStore().log({
                    itr_id: itr.id, project_id: itr.project_id,
                    user_id: authStore.userId, user_name: authStore.userDisplayName || authStore.user?.email || authStore.userId,
                    action: 'file_added', detail: `File added: "${uploadFile.name}" (${category})`,
                    meta: { file_name: uploadFile.name, file_size: uploadFile.size, category },
                })
            }

            return attachment
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to upload attachment'
            console.error('❌ addAttachment:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteAttachment = async (itrId: string, attachmentId: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            // Grab file name before deleting
            const itrLocal = itrs.value.find(i => i.id === itrId)
            const attLocal = itrLocal?.itr_attachments.find(a => a.id === attachmentId)

            const { error: dbErr } = await supabase
                .from('itr_attachments')
                .delete()
                .eq('id', attachmentId)

            if (dbErr) throw dbErr

            // Update local state
            const idx = itrs.value.findIndex(i => i.id === itrId)
            const local = idx !== -1 ? itrs.value[idx] : null
            if (local) {
                local.itr_attachments = local.itr_attachments.filter(a => a.id !== attachmentId)
            }

            // Log
            const authStore = useAuthStore()
            if (authStore.userId && itrLocal) {
                useItrActivityStore().log({
                    itr_id: itrId, project_id: itrLocal.project_id,
                    user_id: authStore.userId, user_name: authStore.userDisplayName || authStore.user?.email || authStore.userId,
                    action: 'file_deleted', detail: `File deleted: "${attLocal?.file_name ?? attachmentId}"`,
                    meta: { file_name: attLocal?.file_name, category: attLocal?.category },
                })
            }

            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete attachment'
            console.error('❌ deleteAttachment:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    /** Get attachments by category */
    const getAttachmentsByCategory = (itr: ITR, category: AttachmentCategory): ItrAttachment[] => {
        return itr.itr_attachments.filter(a => a.category === category)
    }

    // ── itr_materials junction CRUD ───────────────────────────────────────────

    /** Link a material document to an ITR */
    const addItrMaterial = async (itrId: string, materialId: string): Promise<ItrMaterial | null> => {
        error.value = null
        try {
            const existing = itrs.value.find(i => i.id === itrId)
            const sortOrder = existing?.itr_materials?.length ?? 0
            const { data, error: dbErr } = await supabase
                .from('itr_materials')
                .insert({ itr_id: itrId, material_id: materialId, sort_order: sortOrder })
                .select('id, itr_id, material_id, sort_order, created_at, material:materials(id, doc_no, title, material_files(*))')
                .single()
            if (dbErr) throw dbErr
            const record = data as ItrMaterial
            const idx = itrs.value.findIndex(i => i.id === itrId)
            if (idx !== -1) {
                itrs.value[idx].itr_materials = [...(itrs.value[idx].itr_materials ?? []), record]
            }
            return record
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to add material link'
            console.error('❌ addItrMaterial:', err)
            return null
        }
    }

    /** Unlink a material document from an ITR (pass the itr_materials.id row id) */
    const removeItrMaterial = async (itrId: string, itrMaterialId: string): Promise<boolean> => {
        error.value = null
        try {
            const { error: dbErr } = await supabase
                .from('itr_materials')
                .delete()
                .eq('id', itrMaterialId)
            if (dbErr) throw dbErr
            const idx = itrs.value.findIndex(i => i.id === itrId)
            if (idx !== -1) {
                itrs.value[idx].itr_materials = itrs.value[idx].itr_materials.filter(m => m.id !== itrMaterialId)
            }
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to remove material link'
            console.error('❌ removeItrMaterial:', err)
            return false
        }
    }

    /** Persist new sort_order for all linked materials of an ITR.
     *  @param orderedIds — itr_materials row ids in desired display order */
    const reorderItrMaterials = async (itrId: string, orderedIds: string[]): Promise<boolean> => {
        error.value = null
        try {
            // Upsert each row's sort_order individually (Supabase doesn't support bulk update with different values)
            for (let i = 0; i < orderedIds.length; i++) {
                const { error: dbErr } = await supabase
                    .from('itr_materials')
                    .update({ sort_order: i })
                    .eq('id', orderedIds[i])
                if (dbErr) throw dbErr
            }
            // Update local state order
            const idx = itrs.value.findIndex(i => i.id === itrId)
            if (idx !== -1) {
                const orderMap = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
                itrs.value[idx].itr_materials = [...itrs.value[idx].itr_materials]
                    .sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0))
                    .map((m, i) => ({ ...m, sort_order: i }))
            }
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to reorder materials'
            console.error('❌ reorderItrMaterials:', err)
            return false
        }
    }

    const clearITRs = () => {
        itrs.value = []
        filterStatusId.value = 'all'
        filterSearch.value = ''
    }

    /**
     * Generate the next ITR/MIR number for a project+discipline combination.
     * Format: ITR-{DISC}-A001 … A999 → B001  (or MIR-{DISC}-A001 for material)
     */
    const generateItrNumber = async (
        projectId: string,
        discCode:  string,
        isMaterial: boolean
    ): Promise<string> => {
        const prefix = isMaterial ? 'MIR' : 'ITR'
        const pat    = `${prefix}-${discCode}-`
        const { data } = await supabase
            .from('itrs')
            .select('item_no')
            .eq('project_id', projectId)
            .like('item_no', `${pat}%`)
        let maxLetter = 'A'
        let maxNum    = 0
        for (const row of (data ?? []) as { item_no: string | null }[]) {
            const seq = row.item_no?.slice(pat.length)
            if (!seq || seq.length < 4) continue
            const letter = seq[0].toUpperCase()
            const num    = parseInt(seq.slice(1), 10)
            if (isNaN(num) || !/^[A-Z]$/.test(letter)) continue
            if (letter > maxLetter || (letter === maxLetter && num > maxNum)) {
                maxLetter = letter
                maxNum    = num
            }
        }
        let nextLetter = maxLetter
        let nextNum    = maxNum + 1
        if (nextNum > 999) {
            nextLetter = String.fromCharCode(maxLetter.charCodeAt(0) + 1)
            nextNum    = 1
        }
        return `${prefix}-${discCode}-${nextLetter}${String(nextNum).padStart(3, '0')}`
    }

    return {
        itrs, loading, error,
        filterStatusId, filterSearch, filteredITRs, stats,
        fetchITRs, createITR, updateITR, deleteITR, syncItrAreas, syncItrQcAssignments, clearITRs, refreshFormData,
        advanceStatus, rejectToDraft, generateItrNumber,
        addAttachment, deleteAttachment, getAttachmentsByCategory,
        addItrMaterial, removeItrMaterial, reorderItrMaterials,
        ATTACHMENT_CATEGORIES,
    }
})
