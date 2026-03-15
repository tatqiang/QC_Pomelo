<template>
  <div class="min-h-full bg-gray-50">

    <!-- ─── Page header ────────────────────────────────────────────── -->
    <div class="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div class="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-gray-800">Time Attendance</h1>
          <p class="text-xs text-gray-500 mt-0.5">
            <span v-if="attendanceStore.activeProject" class="font-medium text-moss">
              {{ attendanceStore.activeProject.name }}
            </span>
            <span v-else class="text-amber-600">No project selected — choose one from the top bar</span>
          </p>
        </div>
        <!-- Live clock -->
        <div class="text-right">
          <div class="text-2xl font-mono font-bold text-gray-800">{{ liveClock }}</div>
          <div class="text-xs text-gray-500">{{ liveDate }}</div>
        </div>
      </div>
    </div>

    <div class="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">

      <!-- ─── No project warning ──────────────────────────────────── -->
      <div v-if="!attendanceStore.activeProject" class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-sm text-amber-800">Please select an active project from the top bar before clocking in.</p>
      </div>

      <!-- ─── Today status card ───────────────────────────────────── -->
      <div v-if="attendanceStore.activeProject" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-700">Today's Status</span>
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            :class="attendanceStore.isClockedIn
              ? 'bg-green-100 text-green-700'
              : attendanceStore.loading ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'"
          >
            <span class="w-2 h-2 rounded-full" :class="attendanceStore.isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-red-400'"></span>
            {{ attendanceStore.loading ? 'Loading…' : attendanceStore.isClockedIn ? 'Clocked In' : 'Clocked Out' }}
          </span>
        </div>

        <!-- Today's log pairs -->
        <div v-if="todayEvents.length" class="px-5 py-3 space-y-2">
          <div v-for="ev in todayEvents" :key="ev.id" class="flex items-center gap-3 text-sm">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              :class="ev.event_type === 'check_in' ? 'bg-green-100' : 'bg-orange-100'"
            >
              <svg class="w-4 h-4" :class="ev.event_type === 'check_in' ? 'text-green-600' : 'text-orange-500'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path v-if="ev.event_type === 'check_in'" stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div class="flex-1">
              <span class="font-medium">{{ ev.event_type === 'check_in' ? 'Checked In' : 'Checked Out' }}</span>
              <span class="text-gray-500 ml-2">{{ formatTime(ev.timestamp) }}</span>
            </div>
            <span
              v-if="ev.lat"
              class="text-xs px-2 py-0.5 rounded-full"
              :class="ev.geo_verified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'"
              :title="ev.distance_from_site_m != null ? `${Math.round(ev.distance_from_site_m)}m from site` : ''"
            >
              {{ ev.geo_verified ? '✓ On-site' : '⚠ Off-site' }}
            </span>
            <img v-if="ev.selfie_url" :src="ev.selfie_url" class="w-8 h-8 rounded-full object-cover border border-gray-200" alt="selfie" />
          </div>
        </div>
        <div v-else-if="!attendanceStore.loading" class="px-5 py-4 text-sm text-gray-400">
          No activity recorded today for this project.
        </div>

        <!-- Duration -->
        <div v-if="todayDuration" class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
          <svg class="w-4 h-4 text-moss" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Total today: <span class="font-semibold text-gray-800">{{ todayDuration }}</span>
        </div>
      </div>

      <!-- ─── Main tab switcher ──────────────────────────────────── -->
      <div v-if="attendanceStore.activeProject && step === 'idle'" class="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          :class="mainTab === 'attendance' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'"
          @click="mainTab = 'attendance'"
        >⏱ Attendance</button>
        <button
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          :class="mainTab === 'leave' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'"
          @click="mainTab = 'leave'"
        >🗓 Leave Request</button>
      </div>

      <!-- ─── Clock In / Out card ───────────────────────────────── -->
      <div v-if="attendanceStore.activeProject && step === 'idle' && mainTab === 'attendance'" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <!-- Event selector -->
        <div class="grid grid-cols-2 gap-3">
          <button
            class="h-14 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm border-2"
            :class="pendingEvent === 'check_in'
              ? 'bg-moss text-white border-moss'
              : 'bg-white text-moss border-moss/40 hover:border-moss hover:bg-moss/5'"
            :disabled="attendanceStore.loading"
            @click="pendingEvent = 'check_in'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Clock In
          </button>
          <button
            class="h-14 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm border-2"
            :class="pendingEvent === 'check_out'
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-orange-500 border-orange-300 hover:border-orange-500 hover:bg-orange-50'"
            :disabled="attendanceStore.loading"
            @click="pendingEvent = 'check_out'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Clock Out
          </button>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Note <span class="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            v-model="noteText"
            rows="2"
            placeholder="e.g. Working from site office, early departure…"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent resize-none"
          ></textarea>
        </div>

        <!-- Go button -->
        <button
          class="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
          :class="pendingEvent === 'check_in' ? 'bg-moss hover:bg-moss/90 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'"
          :disabled="attendanceStore.loading"
          @click="startFlow"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ pendingEvent === 'check_in' ? 'Start Clock In' : 'Start Clock Out' }}
        </button>
        <p class="text-xs text-gray-400 text-center -mt-1">
          This will capture your GPS location and a selfie photo for verification.
        </p>
      </div>

      <!-- ─── Leave Request form ──────────────────────────────────── -->
      <div v-if="attendanceStore.activeProject && step === 'idle' && mainTab === 'leave'" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <p class="text-sm font-semibold text-gray-800 mb-1">Submit Leave Request</p>
          <p class="text-xs text-gray-500">Your request will be sent for approval. No GPS or photo needed.</p>
        </div>

        <!-- Leave type -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Leave Type</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="(label, val) in LEAVE_TYPE_LABELS" :key="val"
              type="button"
              class="py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all"
              :class="leaveForm.leave_type === val
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'"
              @click="leaveForm.leave_type = val"
            >{{ label }}</button>
          </div>
        </div>

        <!-- Date range -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">From Date</label>
            <input v-model="leaveForm.date_from" type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">To Date</label>
            <input v-model="leaveForm.date_to" type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        <!-- Reason -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Reason</label>
          <textarea v-model="leaveForm.reason" rows="2"
            placeholder="e.g. Doctor appointment, family emergency…"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          ></textarea>
        </div>

        <!-- Attachments -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Attachments <span class="text-gray-400 font-normal">(optional — you can also add files later)</span></label>
          <div v-if="pendingFiles.length" class="flex flex-wrap gap-1.5 mb-2">
            <div
              v-for="(f, i) in pendingFiles" :key="i"
              class="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-xs text-blue-700"
            >
              <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
              </svg>
              <span class="truncate max-w-[140px]">{{ f.name }}</span>
              <button type="button" class="ml-0.5 text-blue-400 hover:text-red-500 leading-none" @click="pendingFiles.splice(i, 1)">&#10005;</button>
            </div>
          </div>
          <label class="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            <span class="text-xs text-gray-500">Choose files</span>
            <input type="file" multiple class="hidden" @change="onFileChange" />
          </label>
        </div>

        <p v-if="leaveError" class="text-xs text-red-600">{{ leaveError }}</p>

        <button
          class="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          :disabled="leaveStore.submitting || !leaveForm.date_from || !leaveForm.date_to || !leaveForm.reason.trim()"
          @click="submitLeaveRequest"
        >
          <svg v-if="leaveStore.submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ leaveStore.submitting ? 'Submitting…' : 'Submit Leave Request' }}
        </button>
      </div>

      <!-- Leave submitted success -->
      <transition enter-active-class="transition duration-300" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
        <div v-if="leaveDone" class="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="font-bold text-blue-800">Leave Request Submitted</p>
            <p class="text-sm text-blue-600 mt-0.5">Awaiting approval from your admin.</p>
          </div>
        </div>
      </transition>

      <!-- ─── Step: GPS ────────────────────────────────────────────── -->
      <div v-if="step === 'gps'" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="font-semibold text-gray-800 text-sm">Step 1 of 2 — GPS Location</span>
        </div>
        <div class="px-5 py-5 space-y-4">
          <div v-if="attendanceStore.gpsLoading" class="flex items-center gap-3 text-sm text-gray-600">
            <svg class="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Detecting your location…
          </div>
          <div v-else-if="attendanceStore.gpsError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {{ attendanceStore.gpsError }}
            <button class="ml-2 underline" @click="step = 'camera'">Skip GPS</button>
          </div>
          <div v-else-if="attendanceStore.geofenceStatus" class="space-y-3">
            <div
              class="flex items-center gap-3 p-3 rounded-xl border"
              :class="attendanceStore.geofenceStatus.withinGeofence ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'"
            >
              <svg class="w-6 h-6 flex-shrink-0" :class="attendanceStore.geofenceStatus.withinGeofence ? 'text-green-600' : 'text-amber-600'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path v-if="attendanceStore.geofenceStatus.withinGeofence" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold" :class="attendanceStore.geofenceStatus.withinGeofence ? 'text-green-800' : 'text-amber-800'">
                  {{ attendanceStore.geofenceStatus.withinGeofence ? 'On-site — within geofence' : 'Off-site — outside geofence' }}
                </p>
                <p class="text-xs mt-0.5" :class="attendanceStore.geofenceStatus.withinGeofence ? 'text-green-700' : 'text-amber-700'">
                  <template v-if="attendanceStore.activeProject?.site_lat">
                    {{ Math.round(attendanceStore.geofenceStatus.distanceM) }}m from site centre (radius {{ attendanceStore.geofenceStatus.radiusM }}m)
                  </template>
                  <template v-else>No site GPS set for this project — location recorded for reference only.</template>
                </p>
              </div>
            </div>
            <p class="text-xs text-gray-500">
              GPS accuracy: ±{{ Math.round(attendanceStore.geofenceStatus.gps.accuracy) }}m &nbsp;·&nbsp;
              {{ attendanceStore.geofenceStatus.gps.lat.toFixed(6) }}, {{ attendanceStore.geofenceStatus.gps.lng.toFixed(6) }}
            </p>
            <button
              v-if="!attendanceStore.geofenceStatus.withinGeofence"
              class="w-full py-2.5 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white"
              @click="step = 'camera'"
            >
              Proceed anyway (will be flagged as off-site)
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Step: Camera ─────────────────────────────────────────── -->
      <div v-if="step === 'camera' || step === 'preview'" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="font-semibold text-gray-800 text-sm">Step 2 of 2 — Selfie Photo</span>
          <button class="ml-auto text-xs text-gray-400 hover:text-gray-600 underline" @click="skipCamera">Skip</button>
        </div>
        <div class="px-5 py-5 flex flex-col items-center gap-4">
          <div v-if="cameraError" class="w-full bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {{ cameraError }} — <button class="underline" @click="skipCamera">Skip photo</button>
          </div>

          <!-- Live video -->
          <div v-if="step === 'camera'" class="relative w-64 h-64 rounded-2xl overflow-hidden bg-gray-900 shadow-inner">
            <video ref="videoEl" class="w-full h-full object-cover" autoplay muted playsinline></video>
            <div class="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none"></div>
            <!-- Face guide oval -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-32 h-40 border-2 border-white/50 rounded-full"></div>
            </div>
          </div>

          <!-- Preview -->
          <div v-if="step === 'preview' && snappedUrl" class="relative w-64 h-64 rounded-2xl overflow-hidden shadow-inner">
            <img :src="snappedUrl" class="w-full h-full object-cover" alt="Selfie preview" />
            <div class="absolute inset-0 border-4 border-green-400/60 rounded-2xl pointer-events-none"></div>
          </div>

          <div v-if="step === 'camera'" class="flex gap-3">
            <button class="px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow" @click="snapPhoto">
              📷 Take Photo
            </button>
          </div>

          <div v-if="step === 'preview'" class="flex gap-3">
            <button class="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50" @click="retakePhoto">
              Retake
            </button>
            <button
              class="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow"
              :class="pendingEvent === 'check_in' ? 'bg-moss hover:bg-moss/90' : 'bg-orange-500 hover:bg-orange-600'"
              :disabled="attendanceStore.submitting"
              @click="confirmSubmit"
            >
              <svg v-if="attendanceStore.submitting" class="w-4 h-4 inline animate-spin mr-1.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ attendanceStore.submitting ? 'Saving…' : (pendingEvent === 'check_in' ? 'Confirm Clock In' : 'Confirm Clock Out') }}
            </button>
          </div>

          <!-- Hidden canvas for snapshot -->
          <canvas ref="canvasEl" class="hidden"></canvas>
        </div>
      </div>

      <!-- ─── Success banner ────────────────────────────────────────── -->
      <transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div v-if="step === 'done'" class="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="font-bold text-green-800">{{ pendingEvent === 'check_in' ? 'Checked In Successfully' : 'Checked Out Successfully' }}</p>
            <p class="text-sm text-green-700 mt-0.5">{{ formatTime(attendanceStore.todayLog?.timestamp) }}</p>
          </div>
        </div>
      </transition>

      <!-- ─── History ────────────────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <!-- History tab switcher -->
        <div class="flex border-b border-gray-100">
          <button
            class="flex-1 py-3 text-xs font-semibold transition-colors"
            :class="historyTab === 'attendance' ? 'text-moss border-b-2 border-moss' : 'text-gray-400 hover:text-gray-600'"
            @click="historyTab = 'attendance'"
          >Attendance Log</button>
          <button
            class="flex-1 py-3 text-xs font-semibold transition-colors relative"
            :class="historyTab === 'leave' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'"
            @click="historyTab = 'leave'"
          >
            Leave Requests
            <span v-if="pendingCount > 0" class="absolute top-2 right-3 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">{{ pendingCount }}</span>
          </button>
        </div>

        <!-- Attendance history header -->
        <div v-if="historyTab === 'attendance'" class="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-3 flex-wrap">
          <span class="text-xs text-gray-500">{{ historyMonthLabel }}</span>
          <div class="flex items-center gap-2">
            <input
              type="month"
              v-model="historyMonth"
              class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-moss"
              @change="loadHistory"
            />
            <button
              class="text-xs px-3 py-1.5 rounded-lg bg-moss text-white font-medium hover:bg-moss/90 transition-colors disabled:opacity-50"
              :disabled="!attendanceStore.myLogs.length"
              @click="exportCsv"
            >CSV</button>
          </div>
        </div>

        <!-- ── Attendance log table ── -->
        <div v-if="historyTab === 'attendance' && attendanceStore.loading" class="px-5 py-8 flex justify-center">
          <svg class="w-6 h-6 text-moss animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>

        <div v-else-if="historyTab === 'attendance' && attendanceStore.myLogs.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th class="px-4 py-3">Date</th>
                <th class="px-4 py-3">Event</th>
                <th class="px-4 py-3">Time</th>
                <th class="px-4 py-3">Project</th>
                <th class="px-4 py-3">GPS</th>
                <th class="px-4 py-3">Note</th>
                <th class="px-4 py-3">Photo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="log in attendanceStore.myLogs" :key="log.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-700">{{ formatDate(log.timestamp) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="log.event_type === 'check_in' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                  >
                    {{ log.event_type === 'check_in' ? 'In' : 'Out' }}
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-gray-700">{{ formatTime(log.timestamp) }}</td>
                <td class="px-4 py-3 text-gray-600 text-xs">{{ log.projects?.name ?? '—' }}</td>
                <td class="px-4 py-3">
                  <span v-if="log.lat" class="text-xs" :class="log.geo_verified ? 'text-green-600' : 'text-amber-600'">
                    {{ log.geo_verified ? '✓' : '⚠' }} {{ log.distance_from_site_m != null ? Math.round(log.distance_from_site_m) + 'm' : '—' }}
                  </span>
                  <span v-else class="text-xs text-gray-400">—</span>
                </td>
                <td class="px-4 py-3 max-w-[160px]">
                  <span v-if="log.notes" class="text-xs text-gray-600 block truncate" :title="log.notes">{{ log.notes }}</span>
                  <span v-else class="text-xs text-gray-400">—</span>
                </td>
                <td class="px-4 py-3">
                  <img v-if="log.selfie_url" :src="log.selfie_url" class="w-7 h-7 rounded-full object-cover border border-gray-200 cursor-pointer" @click="lightboxUrl = log.selfie_url" alt="selfie" />
                  <span v-else class="text-xs text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="historyTab === 'attendance'" class="px-5 py-8 text-center text-sm text-gray-400">
          No records for {{ historyMonthLabel }}.
        </div>

        <!-- ── Leave requests tab ── -->
        <div v-if="historyTab === 'leave'" class="divide-y divide-gray-100">
          <div v-if="leaveStore.loading" class="px-5 py-8 flex justify-center">
            <svg class="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
          <div v-else-if="!leaveStore.myLeaves.length" class="px-5 py-8 text-center text-sm text-gray-400">
            No leave requests yet.
          </div>
          <div v-for="req in leaveStore.myLeaves" :key="req.id" class="px-4 py-3 flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-gray-800">{{ LEAVE_TYPE_LABELS[req.leave_type] }}</span>
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
              </p>
              <p v-if="req.reason" class="text-xs text-gray-600 mt-0.5 italic">{{ req.reason }}</p>
              <p v-if="req.reviewer_notes" class="text-xs text-blue-600 mt-0.5">Reviewer: {{ req.reviewer_notes }}</p>

              <!-- Attachments on existing leave -->
              <div class="mt-1.5">
                <div v-if="leaveStore.attachments[req.id]?.length" class="flex flex-wrap gap-1 mb-1.5">
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
                <label class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  <span>{{ leaveStore.attachUploading ? 'Uploading…' : 'Add file' }}</span>
                  <input type="file" multiple class="hidden" :disabled="leaveStore.attachUploading" @change="(e) => onAttachToExisting(e, req.id)" />
                </label>
              </div>
            </div>
            <button
              v-if="req.status === 'pending'"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
              @click="cancelLeave(req.id)"
            >Cancel</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ─── Lightbox ─────────────────────────────────────────────────── -->
    <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
      <div v-if="lightboxUrl" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" @click="lightboxUrl = null">
        <img :src="lightboxUrl" class="max-w-sm max-h-[80vh] rounded-2xl object-contain shadow-2xl" alt="selfie" />
      </div>
    </transition>

  </div>

</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAttendanceStore } from '@/stores/attendanceStore'
import { useLeaveStore } from '@/stores/leaveStore'
import { useAuthStore } from '@/stores/authStore'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, type LeaveType } from '@/services/leaveService'

const attendanceStore = useAttendanceStore()
const leaveStore      = useLeaveStore()
const authStore       = useAuthStore()

// ── Live clock ────────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>

const liveClock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
)
const liveDate = computed(() =>
  now.value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
)

// ── Tab state ────────────────────────────────────────────────────────────────
const mainTab    = ref<'attendance' | 'leave'>('attendance')
const historyTab = ref<'attendance' | 'leave'>('attendance')

// ── Leave form ────────────────────────────────────────────────────────────
const leaveDone = ref(false)
const leaveError = ref<string | null>(null)
const leaveForm = ref({
  leave_type: 'personal' as LeaveType,
  date_from:  new Date().toISOString().slice(0, 10),
  date_to:    new Date().toISOString().slice(0, 10),
  reason:     '',
})

const pendingCount = computed(() =>
  leaveStore.myLeaves.filter(l => l.status === 'pending').length
)

// ── Attachment helpers ────────────────────────────────────────────────────────
const pendingFiles = ref<File[]>([])

function onFileChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  pendingFiles.value.push(...files)
  ;(e.target as HTMLInputElement).value = ''
}

async function onAttachToExisting(e: Event, leaveId: string) {
  const files  = Array.from((e.target as HTMLInputElement).files ?? [])
  ;(e.target as HTMLInputElement).value = ''
  const userId = authStore.user?.id
  if (!files.length || !userId) return
  for (const file of files) {
    await leaveStore.addAttachment(leaveId, file, userId)
  }
}

const submitLeaveRequest = async () => {
  leaveError.value = null
  if (!leaveForm.value.date_from || !leaveForm.value.date_to) {
    leaveError.value = 'Please fill in both dates.'; return
  }
  if (leaveForm.value.date_to < leaveForm.value.date_from) {
    leaveError.value = '"To" date must be on or after "From" date.'; return
  }
  if (!leaveForm.value.reason.trim()) {
    leaveError.value = 'Please enter a reason.'; return
  }
  const result = await leaveStore.submitLeave({
    leave_type: leaveForm.value.leave_type,
    date_from:  leaveForm.value.date_from,
    date_to:    leaveForm.value.date_to,
    reason:     leaveForm.value.reason.trim() || null,
  })
  if (result) {
    // Upload any pending file attachments
    const userId = authStore.user?.id
    if (pendingFiles.value.length && userId) {
      for (const file of pendingFiles.value) {
        await leaveStore.addAttachment(result.id, file, userId)
      }
      pendingFiles.value = []
    }
    leaveForm.value.reason = ''
    leaveDone.value = true
    historyTab.value = 'leave'
    setTimeout(() => { leaveDone.value = false }, 4000)
  } else {
    leaveError.value = leaveStore.error ?? 'Submit failed'
  }
}

const cancelLeave = async (id: string) => {
  await leaveStore.cancelLeave(id)
}

// ── Flow state ────────────────────────────────────────────────────────────────
type Step = 'idle' | 'gps' | 'camera' | 'preview' | 'done'
const step         = ref<Step>('idle')
const pendingEvent = ref<'check_in' | 'check_out'>('check_in')
const noteText     = ref('')
const cameraError  = ref<string | null>(null)
const snappedBlob  = ref<Blob | null>(null)
const snappedUrl   = ref<string | null>(null)
const lightboxUrl  = ref<string | null>(null)

// Camera refs
const videoEl  = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let stream: MediaStream | null = null

// ── Today events ──────────────────────────────────────────────────────────────
const todayEvents = computed(() => {
  const today = new Date().toDateString()
  return attendanceStore.myLogs.filter(l => new Date(l.timestamp).toDateString() === today)
})

const todayDuration = computed(() => {
  const ins  = todayEvents.value.filter(e => e.event_type === 'check_in')
  const outs = todayEvents.value.filter(e => e.event_type === 'check_out')
  if (!ins.length || !outs.length) return null
  let totalMs = 0
  ins.forEach((inn, i) => {
    const out = outs[i]
    if (out) totalMs += new Date(out.timestamp).getTime() - new Date(inn.timestamp).getTime()
  })
  const h = Math.floor(totalMs / 3_600_000)
  const m = Math.floor((totalMs % 3_600_000) / 60_000)
  return `${h}h ${m}m`
})

// ── History ────────────────────────────────────────────────────────────────────
const historyMonth = ref(new Date().toISOString().slice(0, 7))
const historyMonthLabel = computed(() =>
  new Date(historyMonth.value + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })
)

const loadHistory = async () => {
  const [year, month] = historyMonth.value.split('-').map(Number)
  const from = new Date(year, month - 1, 1).toISOString()
  const to   = new Date(year, month, 0, 23, 59, 59).toISOString()
  await attendanceStore.loadMyLogs({ from, to })
}

// ── Flow ──────────────────────────────────────────────────────────────────────
const startFlow = async () => {
  // pendingEvent is already set by the user's button selection
  step.value = 'gps'
  const geo = await attendanceStore.loadGps()
  if (attendanceStore.gpsError) return
  if (!geo || geo.withinGeofence) step.value = 'camera'
}

watch(step, async (s) => {
  if (s === 'camera') {
    await nextTick()
    await openCamera()
  } else {
    stopCamera()
  }
})

const openCamera = async () => {
  cameraError.value = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      audio: false,
    })
    if (videoEl.value) videoEl.value.srcObject = stream
  } catch (err) {
    cameraError.value = `Camera access denied or unavailable. (${(err as Error).message})`
  }
}

const stopCamera = () => {
  stream?.getTracks().forEach(t => t.stop())
  stream = null
}

const snapPhoto = () => {
  const video  = videoEl.value
  const canvas = canvasEl.value
  if (!video || !canvas) return
  canvas.width  = video.videoWidth  || 640
  canvas.height = video.videoHeight || 640
  canvas.getContext('2d')?.drawImage(video, 0, 0)
  canvas.toBlob(blob => {
    if (!blob) return
    snappedBlob.value = blob
    snappedUrl.value  = URL.createObjectURL(blob)
    step.value = 'preview'
  }, 'image/jpeg', 0.85)
}

const retakePhoto = () => {
  snappedBlob.value = null
  snappedUrl.value  = null
  step.value = 'camera'
}

const skipCamera = () => {
  snappedBlob.value = null
  snappedUrl.value  = null
  step.value = 'preview'
}

const confirmSubmit = async () => {
  const log = await attendanceStore.submitEvent({
    eventType:  pendingEvent.value,
    selfieBlob: snappedBlob.value ?? undefined,
    notes:      noteText.value.trim() || undefined,
  })
  if (log) {
    noteText.value = ''
    step.value = 'done'
    setTimeout(() => { step.value = 'idle' }, 3000)
  }
}

// ── CSV export ─────────────────────────────────────────────────────────────────
const exportCsv = () => {
  const rows = attendanceStore.myLogs
  if (!rows.length) return
  const header = 'Date,Time,Event,Project,Geo Verified,Distance from Site (m),Notes'
  const lines = rows.map(r => [
    formatDate(r.timestamp),
    formatTime(r.timestamp),
    r.event_type,
    r.projects?.name ?? '',
    r.geo_verified ? 'Yes' : 'No',
    r.distance_from_site_m != null ? Math.round(r.distance_from_site_m) : '',
    r.notes ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `attendance_${historyMonth.value}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
const formatDate = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const formatDay = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
  await attendanceStore.loadTodayStatus()
  await loadHistory()
  await leaveStore.loadMyLeaves()
  if (leaveStore.myLeaves.length) {
    await leaveStore.loadAttachmentsForLeaves(leaveStore.myLeaves.map(l => l.id))
  }
})

onUnmounted(() => {
  clearInterval(clockTimer)
  stopCamera()
  if (snappedUrl.value) URL.revokeObjectURL(snappedUrl.value)
})
</script>

