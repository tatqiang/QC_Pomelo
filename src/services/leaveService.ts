/**
 * Leave Request Service
 * CRUD for leave_requests table.
 */
import { supabase } from '@/lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type LeaveType   = 'sick' | 'annual' | 'personal' | 'business' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id:             string
  user_id:        string
  project_id:     string
  leave_type:     LeaveType
  date_from:      string  // YYYY-MM-DD
  date_to:        string  // YYYY-MM-DD
  reason:         string | null
  status:         LeaveStatus
  reviewed_by:    string | null
  reviewed_at:    string | null
  reviewer_notes: string | null
  created_at:     string
  updated_at:     string
  // Joined
  users?:    { first_name: string | null; last_name: string | null; email: string }
  projects?: { name: string; code: string | null }
  reviewer?: { first_name: string | null; last_name: string | null; email: string }
}

export interface LeaveRequestInsert {
  user_id:    string
  project_id: string
  leave_type: LeaveType
  date_from:  string
  date_to:    string
  reason?:    string | null
}

// ─── Label helpers ─────────────────────────────────────────────────────────────

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  sick:     'Sick Leave',
  annual:   'Annual Leave',
  personal: 'Personal Leave',
  business: 'Business Trip',
  other:    'Other',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending:   'Pending',
  approved:  'Approved',
  rejected:  'Rejected',
  cancelled: 'Cancelled',
}

// ─── Select fragment ───────────────────────────────────────────────────────────

const SELECT_FULL = `
  *,
  users!leave_requests_user_id_fkey ( first_name, last_name, email ),
  projects ( name, code ),
  reviewer:users!leave_requests_reviewed_by_fkey ( first_name, last_name, email )
`

// ─── Service ───────────────────────────────────────────────────────────────────

export const leaveService = {

  /** Submit a new leave request */
  async submitLeave(payload: LeaveRequestInsert): Promise<LeaveRequest> {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert(payload)
      .select(SELECT_FULL)
      .single()
    if (error) throw error
    return data as LeaveRequest
  },

  /** Fetch all leave requests for a specific user (personal view) */
  async fetchMyLeaves(userId: string): Promise<LeaveRequest[]> {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(SELECT_FULL)
      .eq('user_id', userId)
      .order('date_from', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data ?? []) as LeaveRequest[]
  },

  /** Fetch all leave requests for a project (admin view) */
  async fetchProjectLeaves(projectId: string, statusFilter?: LeaveStatus): Promise<LeaveRequest[]> {
    let q = supabase
      .from('leave_requests')
      .select(SELECT_FULL)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as LeaveRequest[]
  },

  /** Approve a leave request */
  async approveLeave(id: string, reviewerId: string, notes?: string): Promise<LeaveRequest> {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status:         'approved',
        reviewed_by:    reviewerId,
        reviewed_at:    new Date().toISOString(),
        reviewer_notes: notes ?? null,
      })
      .eq('id', id)
      .select(SELECT_FULL)
      .single()
    if (error) throw error
    return data as LeaveRequest
  },

  /** Reject a leave request */
  async rejectLeave(id: string, reviewerId: string, notes?: string): Promise<LeaveRequest> {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status:         'rejected',
        reviewed_by:    reviewerId,
        reviewed_at:    new Date().toISOString(),
        reviewer_notes: notes ?? null,
      })
      .eq('id', id)
      .select(SELECT_FULL)
      .single()
    if (error) throw error
    return data as LeaveRequest
  },

  /** Cancel own leave request (before review) */
  async cancelLeave(id: string): Promise<void> {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) throw error
  },
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export interface LeaveAttachment {
  id:               string
  leave_request_id: string
  uploaded_by:      string
  file_name:        string
  file_url:         string
  file_size:        number | null
  created_at:       string
  users?: { first_name: string | null; last_name: string | null; email: string }
}

const ATTACH_SELECT = '*, users!leave_request_attachments_uploaded_by_fkey(first_name,last_name,email)'

export const attachmentService = {

  /** Fetch all attachments for a single leave request */
  async fetchByLeave(leaveRequestId: string): Promise<LeaveAttachment[]> {
    const { data, error } = await supabase
      .from('leave_request_attachments')
      .select(ATTACH_SELECT)
      .eq('leave_request_id', leaveRequestId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as LeaveAttachment[]
  },

  /** Fetch attachments for multiple leaves in one query */
  async fetchByLeaves(leaveIds: string[]): Promise<LeaveAttachment[]> {
    if (!leaveIds.length) return []
    const { data, error } = await supabase
      .from('leave_request_attachments')
      .select(ATTACH_SELECT)
      .in('leave_request_id', leaveIds)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as LeaveAttachment[]
  },

  /** Insert an attachment record after file is uploaded */
  async addAttachment(record: {
    leave_request_id: string
    uploaded_by:      string
    file_name:        string
    file_url:         string
    file_size?:       number | null
  }): Promise<LeaveAttachment> {
    const { data, error } = await supabase
      .from('leave_request_attachments')
      .insert(record)
      .select(ATTACH_SELECT)
      .single()
    if (error) throw error
    return data as LeaveAttachment
  },

  /** Delete an attachment record */
  async removeAttachment(id: string): Promise<void> {
    const { error } = await supabase
      .from('leave_request_attachments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
