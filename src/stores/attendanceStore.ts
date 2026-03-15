import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { attendanceService, type AttendanceLog, type AttendanceLogInsert, type GeofenceStatus } from '@/services/attendanceService'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'

export const useAttendanceStore = defineStore('attendance', () => {
  const authStore    = useAuthStore()
  const projectStore = useProjectStore()

  // ── State ────────────────────────────────────────────────────────────────────
  const todayLog       = ref<AttendanceLog | null>(null)        // latest event today
  const myLogs         = ref<AttendanceLog[]>([])               // personal history
  const adminLogs      = ref<AttendanceLog[]>([])               // admin cross-user view
  const loading        = ref(false)
  const submitting     = ref(false)
  const error          = ref<string | null>(null)

  // Geofence result from last GPS check
  const geofenceStatus = ref<GeofenceStatus | null>(null)
  const gpsLoading     = ref(false)
  const gpsError       = ref<string | null>(null)

  // ── Computed ─────────────────────────────────────────────────────────────────

  /** true when the user's last event today was a check_in */
  const isClockedIn = computed(() =>
    todayLog.value?.event_type === 'check_in'
  )

  const currentUserId = computed(() => authStore.user?.id ?? null)

  const activeProject = computed(() => projectStore.activeProject)

  // ── Actions ──────────────────────────────────────────────────────────────────

  /** Load today's status for the current user + active project */
  const loadTodayStatus = async (): Promise<void> => {
    if (!currentUserId.value || !activeProject.value) return
    loading.value = true
    error.value = null
    try {
      todayLog.value = await attendanceService.fetchTodayStatus(
        currentUserId.value,
        activeProject.value.id
      )
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load status'
      console.error('❌ loadTodayStatus:', err)
    } finally {
      loading.value = false
    }
  }

  /** Load GPS and check against project geofence */
  const loadGps = async (): Promise<GeofenceStatus | null> => {
    if (!activeProject.value) return null
    gpsLoading.value = true
    gpsError.value = null
    try {
      const proj = activeProject.value as typeof activeProject.value & {
        site_lat?: number | null
        site_lng?: number | null
        geofence_radius_m?: number
      }
      const status = await attendanceService.checkGeofence(
        proj.site_lat ?? null,
        proj.site_lng ?? null,
        proj.geofence_radius_m ?? 200
      )
      geofenceStatus.value = status
      return status
    } catch (err) {
      gpsError.value = err instanceof Error ? err.message : 'GPS capture failed'
      console.error('❌ loadGps:', err)
      return null
    } finally {
      gpsLoading.value = false
    }
  }

  /** Submit a check-in or check-out event */
  const submitEvent = async (opts: {
    eventType: 'check_in' | 'check_out'
    selfieBlob?: Blob | null
    notes?: string
  }): Promise<AttendanceLog | null> => {
    if (!currentUserId.value || !activeProject.value) return null
    submitting.value = true
    error.value = null
    try {
      let selfieUrl: string | null = null
      if (opts.selfieBlob) {
        selfieUrl = await attendanceService.uploadSelfie(
          opts.selfieBlob,
          currentUserId.value,
          activeProject.value.id
        )
      }

      const geo = geofenceStatus.value

      const payload: AttendanceLogInsert = {
        user_id:              currentUserId.value,
        project_id:           activeProject.value.id,
        event_type:           opts.eventType,
        lat:                  geo?.gps.lat ?? null,
        lng:                  geo?.gps.lng ?? null,
        geo_accuracy_m:       geo?.gps.accuracy ?? null,
        distance_from_site_m: geo?.distanceM ?? null,
        geo_verified:         geo?.withinGeofence ?? false,
        selfie_url:           selfieUrl,
        device_info:          { ua: navigator.userAgent, pwa: window.matchMedia('(display-mode: standalone)').matches },
        notes:                opts.notes ?? null,
      }

      const log = await attendanceService.insertLog(payload)
      todayLog.value = log

      // Prepend to personal history if already loaded
      if (myLogs.value.length > 0) {
        myLogs.value.unshift(log)
      }

      return log
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Submit failed'
      console.error('❌ submitEvent:', err)
      return null
    } finally {
      submitting.value = false
    }
  }

  /** Load personal attendance history */
  const loadMyLogs = async (opts: { from?: string; to?: string } = {}): Promise<void> => {
    if (!currentUserId.value) return
    loading.value = true
    error.value = null
    try {
      myLogs.value = await attendanceService.fetchMyLogs({
        userId:    currentUserId.value,
        projectId: activeProject.value?.id,
        from:      opts.from,
        to:        opts.to,
        limit:     200,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load history'
      console.error('❌ loadMyLogs:', err)
    } finally {
      loading.value = false
    }
  }

  /** Admin: load all logs for active project */
  const loadAdminLogs = async (opts: { from?: string; to?: string } = {}): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      if (activeProject.value) {
        adminLogs.value = await attendanceService.fetchProjectLogs({
          projectId: activeProject.value.id,
          from:      opts.from,
          to:        opts.to,
        })
      } else {
        adminLogs.value = await attendanceService.fetchAllLogs(opts)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load admin logs'
      console.error('❌ loadAdminLogs:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    todayLog,
    myLogs,
    adminLogs,
    loading,
    submitting,
    error,
    geofenceStatus,
    gpsLoading,
    gpsError,
    isClockedIn,
    currentUserId,
    activeProject,
    loadTodayStatus,
    loadGps,
    submitEvent,
    loadMyLogs,
    loadAdminLogs,
  }
})
