<template>
  <div class="min-h-full bg-gray-50">

    <!-- ─── Header ─────────────────────────────────────────────────── -->
    <div class="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div class="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-xl font-bold text-gray-800">Attendance Report</h1>
          <p class="text-xs text-gray-500 mt-0.5">Monthly summary across all users</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            v-model="selectedMonth"
            class="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-moss"
            @change="loadLogs"
          />
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium bg-moss text-white hover:bg-moss/90 transition-colors disabled:opacity-50"
            :disabled="!attendanceStore.adminLogs.length"
            @click="exportCsv"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

      <!-- ─── Summary stats ────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="stat in summaryStats" :key="stat.label" class="bg-white rounded-xl border border-gray-200 px-4 py-4">
          <p class="text-xs text-gray-500">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{{ stat.value }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="attendanceStore.loading" class="flex justify-center py-12">
        <svg class="w-8 h-8 text-moss animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>

      <!-- ─── Per-user summary table ───────────────────────────────── -->
      <div v-else-if="attendanceStore.adminLogs.length" class="space-y-4">
        <!-- User breakdown -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="text-sm font-semibold text-gray-700">User Summary — {{ monthLabel }}</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th class="px-4 py-3">User</th>
                  <th class="px-4 py-3">Days Present</th>
                  <th class="px-4 py-3">Check-ins</th>
                  <th class="px-4 py-3">Check-outs</th>
                  <th class="px-4 py-3">Off-site Events</th>
                  <th class="px-4 py-3">Approx. Hours</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="row in userSummary" :key="row.userId" class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-moss/20 flex items-center justify-center text-xs font-bold text-moss flex-shrink-0">
                        {{ row.initials }}
                      </div>
                      <div>
                        <p class="font-medium text-gray-800 text-xs">{{ row.name }}</p>
                        <p class="text-gray-400 text-xs">{{ row.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 font-semibold text-gray-800">{{ row.daysPresent }}</td>
                  <td class="px-4 py-3 text-green-700">{{ row.checkIns }}</td>
                  <td class="px-4 py-3 text-orange-600">{{ row.checkOuts }}</td>
                  <td class="px-4 py-3">
                    <span v-if="row.offsiteEvents > 0" class="text-amber-600 font-medium">{{ row.offsiteEvents }}</span>
                    <span v-else class="text-gray-400">0</span>
                  </td>
                  <td class="px-4 py-3 font-mono text-gray-700">{{ row.approxHours }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ─── Raw log table ───────────────────────────────────────── -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-700">All Events</h2>
            <span class="text-xs text-gray-500">{{ attendanceStore.adminLogs.length }} records</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th class="px-4 py-3">Date/Time</th>
                  <th class="px-4 py-3">User</th>
                  <th class="px-4 py-3">Event</th>
                  <th class="px-4 py-3">Project</th>
                  <th class="px-4 py-3">GPS</th>
                  <th class="px-4 py-3">Photo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="log in attendanceStore.adminLogs" :key="log.id" class="hover:bg-gray-50 text-xs">
                  <td class="px-4 py-2.5 font-mono text-gray-700">
                    {{ formatDate(log.timestamp) }} {{ formatTime(log.timestamp) }}
                  </td>
                  <td class="px-4 py-2.5 text-gray-800">
                    {{ [log.users?.first_name, log.users?.last_name].filter(Boolean).join(' ') || log.users?.email || '—' }}
                  </td>
                  <td class="px-4 py-2.5">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="log.event_type === 'check_in' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                    >
                      {{ log.event_type === 'check_in' ? 'In' : 'Out' }}
                    </span>
                  </td>
                  <td class="px-4 py-2.5 text-gray-600">{{ log.projects?.name ?? '—' }}</td>
                  <td class="px-4 py-2.5">
                    <span v-if="log.lat" :class="log.geo_verified ? 'text-green-600' : 'text-amber-600'">
                      {{ log.geo_verified ? '✓' : '⚠' }}
                      {{ log.distance_from_site_m != null ? Math.round(log.distance_from_site_m) + 'm' : '' }}
                    </span>
                    <span v-else class="text-gray-400">—</span>
                  </td>
                  <td class="px-4 py-2.5">
                    <img v-if="log.selfie_url" :src="log.selfie_url" class="w-6 h-6 rounded-full object-cover border border-gray-200 cursor-pointer" @click="lightboxUrl = log.selfie_url" alt="selfie" />
                    <span v-else class="text-gray-400">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-gray-500">No attendance records for {{ monthLabel }}.</p>
      </div>

      <!-- ─── Leave Requests panel ──────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold text-gray-700">Leave Requests</h2>
            <span v-if="pendingLeaves.length" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              {{ pendingLeaves.length }} pending
            </span>
          </div>
          <div class="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              v-for="f in leaveFilters" :key="f.value"
              class="px-3 py-1 rounded-md text-xs font-medium transition-all"
              :class="leaveFilter === f.value ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'"
              @click="setLeaveFilter(f.value)"
            >{{ f.label }}</button>
          </div>
        </div>

        <div v-if="leaveStore.loading" class="px-5 py-8 flex justify-center">
          <svg class="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <div v-else-if="!leaveStore.adminLeaves.length" class="px-5 py-8 text-center text-sm text-gray-400">
          No leave requests found.
        </div>
        <div v-else class="divide-y divide-gray-100">
          <div v-for="req in leaveStore.adminLeaves" :key="req.id" class="px-4 py-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                {{ initials(req) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-semibold text-gray-800">
                    {{ [req.users?.first_name, req.users?.last_name].filter(Boolean).join(' ') || req.users?.email }}
                  </span>
                  <span class="text-xs text-gray-400">{{ LEAVE_TYPE_LABELS[req.leave_type] }}</span>
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="{
                      'bg-amber-100 text-amber-700': req.status === 'pending',
                      'bg-green-100 text-green-700': req.status === 'approved',
                      'bg-red-100 text-red-600':    req.status === 'rejected',
                      'bg-gray-100 text-gray-500':  req.status === 'cancelled',
                    }"
                  >{{ LEAVE_STATUS_LABELS[req.status] }}</span>
                </div>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ formatDay(req.date_from) }}
                  <template v-if="req.date_from !== req.date_to"> → {{ formatDay(req.date_to) }}</template>
                  &nbsp;· {{ dayCount(req.date_from, req.date_to) }} day(s)
                </p>
                <p v-if="req.reason" class="text-xs text-gray-600 mt-1 italic">“{{ req.reason }}”</p>
                <p v-if="req.reviewer_notes" class="text-xs text-blue-600 mt-1">
                  Reviewer note: {{ req.reviewer_notes }}
                </p>

                <!-- Attachments -->
                <div v-if="leaveStore.attachments[req.id]?.length" class="mt-1.5 flex flex-wrap gap-1">
                  <a
                    v-for="att in leaveStore.attachments[req.id]" :key="att.id"
                    :href="att.file_url" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 hover:bg-blue-100 transition-colors"
                    :title="att.file_name"
                  >
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    {{ att.file_name.length > 22 ? att.file_name.slice(0, 20) + '…' : att.file_name }}
                  </a>
                </div>
              </div>

              <!-- Actions for pending -->
              <div v-if="req.status === 'pending'" class="flex-shrink-0 flex gap-2">
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
                  @click="openReview(req.id, 'approve')"
                >Approve</button>
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
                  @click="openReview(req.id, 'reject')"
                >Reject</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ─── Review modal ────────────────────────────────────────── -->
    <div v-if="reviewModal.open" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click.self="reviewModal.open = false">
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">
            {{ reviewModal.action === 'approve' ? '✅ Approve Leave' : '❌ Reject Leave' }}
          </h3>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Note for requester <span class="text-gray-400">(optional)</span></label>
            <textarea v-model="reviewModal.notes" rows="3"
              placeholder="e.g. Approved, enjoy your time off!"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-moss resize-none"
            ></textarea>
          </div>
        </div>
        <div class="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button class="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100" @click="reviewModal.open = false">Cancel</button>
          <button
            class="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            :class="reviewModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'"
            :disabled="reviewSubmitting"
            @click="submitReview"
          >
            <svg v-if="reviewSubmitting" class="w-4 h-4 inline animate-spin mr-1" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ reviewModal.action === 'approve' ? 'Approve' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Lightbox ────────────────────────────────────────────────── -->
    <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
      <div v-if="lightboxUrl" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" @click="lightboxUrl = null">
        <img :src="lightboxUrl" class="max-w-sm max-h-[80vh] rounded-2xl object-contain shadow-2xl" alt="selfie" />
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useAttendanceStore } from '@/stores/attendanceStore'
import { useLeaveStore } from '@/stores/leaveStore'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, type LeaveRequest, type LeaveStatus } from '@/services/leaveService'
import type { AttendanceLog } from '@/services/attendanceService'

const attendanceStore = useAttendanceStore()
const leaveStore      = useLeaveStore()
const selectedMonth   = ref(new Date().toISOString().slice(0, 7))
const lightboxUrl     = ref<string | null>(null)

const monthLabel = computed(() =>
  new Date(selectedMonth.value + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })
)

const loadLogs = async () => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const from = new Date(year, month - 1, 1).toISOString()
  const to   = new Date(year, month, 0, 23, 59, 59).toISOString()
  await attendanceStore.loadAdminLogs({ from, to })
}

// ── Summary stats ─────────────────────────────────────────────────────────────
const summaryStats = computed(() => {
  const logs  = attendanceStore.adminLogs
  const users = new Set(logs.map(l => l.user_id)).size
  const days  = new Set(logs.map(l => new Date(l.timestamp).toDateString())).size
  const offsite = logs.filter(l => l.lat && !l.geo_verified).length
  const ins   = logs.filter(l => l.event_type === 'check_in').length
  return [
    { label: 'Total Events',    value: logs.length },
    { label: 'Unique Users',    value: users },
    { label: 'Active Days',     value: days },
    { label: 'Off-site Events', value: offsite },
  ]
})

// ── Per-user summary ──────────────────────────────────────────────────────────
interface UserRow {
  userId: string
  name: string
  email: string
  initials: string
  daysPresent: number
  checkIns: number
  checkOuts: number
  offsiteEvents: number
  approxHours: string
}

const userSummary = computed<UserRow[]>(() => {
  const byUser = new Map<string, AttendanceLog[]>()
  attendanceStore.adminLogs.forEach(l => {
    const arr = byUser.get(l.user_id) ?? []
    arr.push(l)
    byUser.set(l.user_id, arr)
  })
  return Array.from(byUser.entries()).map(([userId, logs]) => {
    const first = logs[0]
    const fn  = first.users?.first_name ?? ''
    const ln  = first.users?.last_name  ?? ''
    const name = [fn, ln].filter(Boolean).join(' ') || first.users?.email || userId.slice(0, 8)
    const initials = name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
    const ins  = logs.filter(l => l.event_type === 'check_in')
    const outs = logs.filter(l => l.event_type === 'check_out')
    const days = new Set(logs.map(l => new Date(l.timestamp).toDateString())).size
    let totalMs = 0
    ins.forEach((inn, i) => {
      const out = outs[i]
      if (out) totalMs += new Date(out.timestamp).getTime() - new Date(inn.timestamp).getTime()
    })
    const h   = Math.floor(totalMs / 3_600_000)
    const m   = Math.floor((totalMs % 3_600_000) / 60_000)
    const approxHours = totalMs > 0 ? `${h}h ${m}m` : '—'
    return {
      userId,
      name,
      email: first.users?.email ?? '',
      initials,
      daysPresent:   days,
      checkIns:      ins.length,
      checkOuts:     outs.length,
      offsiteEvents: logs.filter(l => l.lat && !l.geo_verified).length,
      approxHours,
    }
  })
})

// ── CSV export ─────────────────────────────────────────────────────────────────
const exportCsv = () => {
  const rows = attendanceStore.adminLogs
  if (!rows.length) return
  const header = 'Date,Time,User,Email,Event,Project,Geo Verified,Distance (m),Notes'
  const lines = rows.map(r => {
    const name = [r.users?.first_name, r.users?.last_name].filter(Boolean).join(' ')
    return [
      formatDate(r.timestamp),
      formatTime(r.timestamp),
      name,
      r.users?.email ?? '',
      r.event_type,
      r.projects?.name ?? '',
      r.geo_verified ? 'Yes' : 'No',
      r.distance_from_site_m != null ? Math.round(r.distance_from_site_m) : '',
      r.notes ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `attendance_admin_${selectedMonth.value}.csv`; a.click()
  URL.revokeObjectURL(url)
}

const formatTime = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
const formatDate = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const formatDay = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const dayCount = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1
const initials = (req: LeaveRequest) => {
  const n = [req.users?.first_name, req.users?.last_name].filter(Boolean).join(' ') || req.users?.email || '?'
  return n.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
}

// ── Leave management ────────────────────────────────────────────────────
const leaveFilter = ref<'pending' | 'all'>('pending')
const leaveFilters = [
  { label: 'Pending', value: 'pending' as const },
  { label: 'All',     value: 'all'     as const },
]
const pendingLeaves = computed(() => leaveStore.adminLeaves.filter(l => l.status === 'pending'))

const setLeaveFilter = async (f: 'pending' | 'all') => {
  leaveFilter.value = f
  await leaveStore.loadAdminLeaves(f === 'pending' ? 'pending' : undefined)
  if (leaveStore.adminLeaves.length) {
    await leaveStore.loadAttachmentsForLeaves(leaveStore.adminLeaves.map(l => l.id))
  }
}

const reviewModal = reactive({ open: false, leaveId: '', action: 'approve' as 'approve' | 'reject', notes: '' })
const reviewSubmitting = ref(false)

const openReview = (id: string, action: 'approve' | 'reject') => {
  reviewModal.leaveId = id
  reviewModal.action  = action
  reviewModal.notes   = ''
  reviewModal.open    = true
}

const submitReview = async () => {
  reviewSubmitting.value = true
  const ok = reviewModal.action === 'approve'
    ? await leaveStore.approveLeave(reviewModal.leaveId, reviewModal.notes || undefined)
    : await leaveStore.rejectLeave(reviewModal.leaveId, reviewModal.notes || undefined)
  reviewSubmitting.value = false
  if (ok) reviewModal.open = false
}

onMounted(async () => {
  await loadLogs()
  await leaveStore.loadAdminLeaves('pending')
  if (leaveStore.adminLeaves.length) {
    await leaveStore.loadAttachmentsForLeaves(leaveStore.adminLeaves.map(l => l.id))
  }
})
</script>
