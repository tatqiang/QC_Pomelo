/**
 * Attendance Service
 * Handles GPS capture, Haversine geofence check, selfie upload, and Supabase CRUD.
 */

import { supabase } from '@/lib/supabase'
import { r2StorageService } from '@/services/r2StorageService'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AttendanceEvent = 'check_in' | 'check_out'

export interface AttendanceLog {
  id: string
  user_id: string
  project_id: string
  event_type: AttendanceEvent
  timestamp: string
  lat: number | null
  lng: number | null
  geo_accuracy_m: number | null
  distance_from_site_m: number | null
  geo_verified: boolean
  selfie_url: string | null
  device_info: Record<string, unknown> | null
  notes: string | null
  created_at: string
  // Joined
  users?: { first_name: string | null; last_name: string | null; email: string }
  projects?: { name: string; code: string | null }
}

export interface AttendanceLogInsert {
  user_id: string
  project_id: string
  event_type: AttendanceEvent
  lat?: number | null
  lng?: number | null
  geo_accuracy_m?: number | null
  distance_from_site_m?: number | null
  geo_verified?: boolean
  selfie_url?: string | null
  device_info?: Record<string, unknown> | null
  notes?: string | null
}

export interface GpsResult {
  lat: number
  lng: number
  accuracy: number
}

export interface GeofenceStatus {
  gps: GpsResult
  distanceM: number
  withinGeofence: boolean
  radiusM: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Haversine formula — returns distance in metres between two lat/lng points */
export function haversineDistanceM(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000 // Earth radius metres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Request browser GPS — tries high-accuracy first, falls back to low-accuracy */
export function captureGps(): Promise<GpsResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    const tryPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        err => {
          if (highAccuracy) {
            // Timeout or permission error on high-accuracy — retry with low accuracy
            console.warn('⚠️ High-accuracy GPS failed, retrying with low accuracy:', err.message)
            tryPosition(false)
          } else {
            reject(new Error(`GPS unavailable (${err.code}): ${err.message}`))
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 20_000 : 10_000,
          maximumAge: highAccuracy ? 0 : 30_000,
        }
      )
    }

    tryPosition(true)
  })
}

/** Capture device info for audit */
export function captureDeviceInfo(): Record<string, unknown> {
  const nav = navigator as Navigator & { standalone?: boolean }
  return {
    ua: nav.userAgent,
    platform: nav.platform,
    pwa: window.matchMedia('(display-mode: standalone)').matches || !!nav.standalone,
    ts_device: new Date().toISOString(),
  }
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const attendanceService = {

  /** Get GPS and evaluate against site geofence */
  async checkGeofence(
    siteLat: number | null,
    siteLng: number | null,
    radiusM: number
  ): Promise<GeofenceStatus> {
    const gps = await captureGps() // uses high→low accuracy fallback internally
    let distanceM = 0
    let withinGeofence = true // default true when no site coords set

    if (siteLat != null && siteLng != null) {
      distanceM = haversineDistanceM(gps.lat, gps.lng, siteLat, siteLng)
      withinGeofence = distanceM <= radiusM
    }

    return { gps, distanceM, withinGeofence, radiusM }
  },

  /** Upload a selfie Blob to R2, return public URL */
  async uploadSelfie(blob: Blob, userId: string, projectId: string): Promise<string> {
    const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' })
    return r2StorageService.uploadFile(file, `attendance/${projectId}/${userId}`)
  },

  /** Insert a new attendance log row */
  async insertLog(payload: AttendanceLogInsert): Promise<AttendanceLog> {
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert(payload)
      .select(`
        *,
        users ( first_name, last_name, email ),
        projects ( name, code )
      `)
      .single()

    if (error) throw error
    return data as AttendanceLog
  },

  /** Fetch logs for the current user, optionally filtered by project and date range */
  async fetchMyLogs(opts: {
    userId: string
    projectId?: string
    from?: string
    to?: string
    limit?: number
  }): Promise<AttendanceLog[]> {
    let q = supabase
      .from('attendance_logs')
      .select(`
        *,
        projects ( name, code )
      `)
      .eq('user_id', opts.userId)
      .order('timestamp', { ascending: false })

    if (opts.projectId) q = q.eq('project_id', opts.projectId)
    if (opts.from)      q = q.gte('timestamp', opts.from)
    if (opts.to)        q = q.lte('timestamp', opts.to)
    if (opts.limit)     q = q.limit(opts.limit)

    const { data, error } = await q
    if (error) throw error
    return (data as AttendanceLog[]) ?? []
  },

  /** Admin: fetch all users' logs for a project, optionally for a month */
  async fetchProjectLogs(opts: {
    projectId: string
    from?: string
    to?: string
  }): Promise<AttendanceLog[]> {
    let q = supabase
      .from('attendance_logs')
      .select(`
        *,
        users ( first_name, last_name, email ),
        projects ( name, code )
      `)
      .eq('project_id', opts.projectId)
      .order('timestamp', { ascending: false })

    if (opts.from) q = q.gte('timestamp', opts.from)
    if (opts.to)   q = q.lte('timestamp', opts.to)

    const { data, error } = await q
    if (error) throw error
    return (data as AttendanceLog[]) ?? []
  },

  /** Admin: fetch all projects' logs for a date range (for cross-project summary) */
  async fetchAllLogs(opts: { from?: string; to?: string }): Promise<AttendanceLog[]> {
    let q = supabase
      .from('attendance_logs')
      .select(`
        *,
        users ( first_name, last_name, email ),
        projects ( name, code )
      `)
      .order('timestamp', { ascending: false })

    if (opts.from) q = q.gte('timestamp', opts.from)
    if (opts.to)   q = q.lte('timestamp', opts.to)

    const { data, error } = await q
    if (error) throw error
    return (data as AttendanceLog[]) ?? []
  },

  /** Fetch the most recent event for a user in a project today */
  async fetchTodayStatus(userId: string, projectId: string): Promise<AttendanceLog | null> {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .gte('timestamp', todayStart.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as AttendanceLog | null
  },
}
