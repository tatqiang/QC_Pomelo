import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  leaveService,
  attachmentService,
  type LeaveRequest,
  type LeaveRequestInsert,
  type LeaveStatus,
  type LeaveAttachment,
} from '@/services/leaveService'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { r2StorageService } from '@/services/r2StorageService'

export const useLeaveStore = defineStore('leave', () => {
  const authStore    = useAuthStore()
  const projectStore = useProjectStore()

  // ── State ────────────────────────────────────────────────────────────────────
  const myLeaves        = ref<LeaveRequest[]>([])
  const adminLeaves     = ref<LeaveRequest[]>([])
  const submitting      = ref(false)
  const loading         = ref(false)
  const error           = ref<string | null>(null)
  const attachments     = ref<Record<string, LeaveAttachment[]>>({})
  const attachUploading = ref(false)

  // ── Actions ──────────────────────────────────────────────────────────────────

  const submitLeave = async (
    payload: Omit<LeaveRequestInsert, 'user_id' | 'project_id'>
  ): Promise<LeaveRequest | null> => {
    const userId    = authStore.user?.id
    const projectId = projectStore.activeProject?.id
    if (!userId || !projectId) { error.value = 'No user or project'; return null }
    submitting.value = true
    error.value = null
    try {
      const req = await leaveService.submitLeave({ ...payload, user_id: userId, project_id: projectId })
      myLeaves.value.unshift(req)
      return req
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Submit failed'
      console.error('❌ submitLeave:', err)
      return null
    } finally {
      submitting.value = false
    }
  }

  const loadMyLeaves = async (): Promise<void> => {
    const userId = authStore.user?.id
    if (!userId) return
    loading.value = true
    error.value = null
    try {
      myLeaves.value = await leaveService.fetchMyLeaves(userId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Load failed'
    } finally {
      loading.value = false
    }
  }

  const loadAdminLeaves = async (statusFilter?: LeaveStatus): Promise<void> => {
    const projectId = projectStore.activeProject?.id
    if (!projectId) return
    loading.value = true
    error.value = null
    try {
      adminLeaves.value = await leaveService.fetchProjectLeaves(projectId, statusFilter)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Load failed'
    } finally {
      loading.value = false
    }
  }

  const approveLeave = async (id: string, notes?: string): Promise<boolean> => {
    const reviewerId = authStore.user?.id
    if (!reviewerId) return false
    try {
      const updated = await leaveService.approveLeave(id, reviewerId, notes)
      _replaceInBoth(updated)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Approve failed'
      return false
    }
  }

  const rejectLeave = async (id: string, notes?: string): Promise<boolean> => {
    const reviewerId = authStore.user?.id
    if (!reviewerId) return false
    try {
      const updated = await leaveService.rejectLeave(id, reviewerId, notes)
      _replaceInBoth(updated)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Reject failed'
      return false
    }
  }

  const cancelLeave = async (id: string): Promise<boolean> => {
    try {
      await leaveService.cancelLeave(id)
      const idx = myLeaves.value.findIndex(l => l.id === id)
      if (idx !== -1) myLeaves.value[idx] = { ...myLeaves.value[idx], status: 'cancelled' }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Cancel failed'
      return false
    }
  }

  // ── Attachment actions ────────────────────────────────────────────────────────

  /** Fetch attachments for a list of leave IDs and cache them by ID */
  const loadAttachmentsForLeaves = async (leaveIds: string[]): Promise<void> => {
    if (!leaveIds.length) return
    try {
      const list = await attachmentService.fetchByLeaves(leaveIds)
      const grouped: Record<string, LeaveAttachment[]> = {}
      for (const att of list) {
        if (!grouped[att.leave_request_id]) grouped[att.leave_request_id] = []
        grouped[att.leave_request_id].push(att)
      }
      for (const id of leaveIds) {
        attachments.value[id] = grouped[id] ?? []
      }
    } catch (err) {
      console.error('❌ loadAttachmentsForLeaves:', err)
    }
  }

  /** Upload file to R2 then record in DB; works on any leave regardless of status */
  const addAttachment = async (
    leaveId: string,
    file: File,
    userId: string,
  ): Promise<LeaveAttachment | null> => {
    attachUploading.value = true
    error.value = null
    try {
      const url = await r2StorageService.uploadFile(file, `leave/${leaveId}`)
      const att = await attachmentService.addAttachment({
        leave_request_id: leaveId,
        uploaded_by:      userId,
        file_name:        file.name,
        file_url:         url,
        file_size:        file.size,
      })
      if (!attachments.value[leaveId]) attachments.value[leaveId] = []
      attachments.value[leaveId].push(att)
      return att
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Upload failed'
      console.error('❌ addAttachment:', err)
      return null
    } finally {
      attachUploading.value = false
    }
  }

  /** Remove an attachment record from DB and local state */
  const removeAttachment = async (id: string, leaveId: string): Promise<boolean> => {
    try {
      await attachmentService.removeAttachment(id)
      if (attachments.value[leaveId]) {
        attachments.value[leaveId] = attachments.value[leaveId].filter(a => a.id !== id)
      }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Remove failed'
      return false
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const _replaceInBoth = (updated: LeaveRequest) => {
    const replaceIn = (arr: typeof myLeaves.value) => {
      const i = arr.findIndex(l => l.id === updated.id)
      if (i !== -1) arr[i] = updated
    }
    replaceIn(myLeaves.value)
    replaceIn(adminLeaves.value)
  }

  return {
    myLeaves, adminLeaves, submitting, loading, error,
    attachments, attachUploading,
    submitLeave, loadMyLeaves, loadAdminLeaves,
    approveLeave, rejectLeave, cancelLeave,
    loadAttachmentsForLeaves, addAttachment, removeAttachment,
  }
})
