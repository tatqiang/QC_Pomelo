<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">

    <!-- ─── Page Header ───────────────────────────────────────────── -->
    <div class="flex items-center mb-6 flex-wrap gap-3">
      <div class="flex-1">
        <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
        <p class="text-sm text-gray-600 mt-1">
          {{ projectStore.visibleProjects.filter(p => p.status !== 'cancelled').length }} project(s)
        </p>
      </div>
      <button
        class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 font-medium"
        @click="openCreate"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Project
      </button>
    </div>

    <!-- ─── Filter bar ────────────────────────────────────────────── -->
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <div class="relative max-w-xs">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search projects…"
          class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent w-80"
        />
      </div>
      <select
        v-model="statusFilter"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent bg-white"
      >
        <option v-for="item in statusFilterItems" :key="item.value" :value="item.value">
          {{ item.title }}
        </option>
      </select>
    </div>

    <!-- ─── Loading ───────────────────────────────────────────────── -->
    <div v-if="projectStore.loading && projectStore.projects.length === 0" class="text-center py-16">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-moss"></div>
      <div class="mt-4 text-gray-600">Loading projects…</div>
    </div>

    <!-- ─── Empty state ───────────────────────────────────────────── -->
    <div v-else-if="filtered.length === 0" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 10l6 6 6-6" />
      </svg>
      <h2 class="text-lg font-semibold text-gray-600 mb-2">No projects found</h2>
      <p class="text-gray-600 mb-6">
        {{ search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first project to get started.' }}
      </p>
      <button
        class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center gap-2 font-medium"
        @click="openCreate"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Project
      </button>
    </div>

    <!-- ─── Data table ────────────────────────────────────────────── -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="project in filtered"
        :key="project.id"
        class="project-card bg-white border rounded-xl p-5 cursor-pointer transition-all relative"
        :class="project.id === projectStore.activeProjectId ? 'border-moss ring-2 ring-moss ring-opacity-30' : 'border-gray-200 hover:border-moss hover:shadow-md'"
        @click="selectProject(project)"
      >
        <!-- Active badge -->
        <div
          v-if="project.id === projectStore.activeProjectId"
          class="absolute top-3 right-12 px-2 py-0.5 bg-moss text-white text-xs font-semibold rounded"
        >ACTIVE</div>

        
        <!-- Header row -->
        <div class="flex items-start gap-3 mb-3">
          <div class="w-11 h-11 rounded-lg bg-moss/10 flex items-center justify-center flex-shrink-0">
            <span class="text-sm font-bold text-moss">{{ initials(project.name) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-base text-gray-900 truncate">
              {{ project.name }}
            </div>
            <div class="text-sm text-gray-600">
              {{ project.code ?? '—' }}
            </div>
          </div>
          <!-- Actions menu -->
          <div class="relative" @click.stop>
            <button
              class="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
              @click="toggleMenu(project.id)"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
            <div
              v-if="activeMenu === project.id"
              class="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40 z-10"
            >
              <button
                class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                @click.stop="selectProject(project); activeMenu = null"
              >
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Set Active
              </button>
              <button
                class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                @click.stop="openEdit(project); activeMenu = null"
              >
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <hr class="my-1 border-gray-200" />
              <button
                class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                @click.stop="confirmArchive(project); activeMenu = null"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive
              </button>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div
          v-if="project.description"
          class="text-sm text-gray-600 mb-3 line-clamp-2"
        >
          {{ project.description }}
        </div>

        <!-- Under-test chip -->
        <div v-if="project.is_test" class="mb-1 -mt-1 flex">
          <span class="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
            Under Test
          </span>
        </div>
        <!-- Status / tags row -->
        <div class="flex flex-wrap gap-1.5 mt-1">
          <span
            :class="getStatusClass(project.status)"
            class="px-2 py-0.5 text-xs font-medium rounded capitalize"
            >{{ project.status.replace('_', ' ') }}</span>
          <span v-if="project.client" class="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {{ project.client }}
          </span>
          <span v-if="project.location" class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ project.location }}
          </span>
        </div>

        <!-- Dates -->
        <div v-if="project.start_date || project.end_date" class="mt-3 flex items-center gap-1 text-xs text-gray-600">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {{ formatDate(project.start_date) }} → {{ formatDate(project.end_date) }}
        </div>
      </div>
    </div>

    <!-- ═══════ Create / Edit Dialog ══════════════════════════════════════ -->
    <div v-if="dialogOpen" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <svg class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="editTarget" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h2 class="text-lg font-semibold text-gray-900 flex-1">{{ editTarget ? 'Edit Project' : 'New Project' }}</h2>
          <button class="w-8 h-8 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center" @click="closeDialog">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <div class="p-5 overflow-y-auto flex-1">
          <form @submit.prevent="saveProject" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                v-model="form.name"
                type="text"
                required
                autofocus
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  v-model="form.code"
                  type="text"
                  placeholder="e.g. PML-001"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
                />
              </div>
              <div class="sm:col-span-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  v-model="form.status"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent bg-white"
                >
                  <option v-for="item in statusItems" :key="item.value" :value="item.value">
                    {{ item.title }}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client / Owner</label>
              <input
                v-model="form.client"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Site / Location</label>
              <input
                v-model="form.location"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
              />
            </div>

            <!-- GPS Geofence section -->
            <div class="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-semibold text-blue-900">Site GPS Coordinates</div>
                  <div class="text-xs text-blue-600 mt-0.5">Used to verify check-in location (geofence)</div>
                </div>
                <button
                  type="button"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  :disabled="gpsCapturing"
                  @click="captureMyLocation"
                >
                  <svg v-if="gpsCapturing" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {{ gpsCapturing ? 'Detecting…' : 'Use My Location' }}
                </button>
              </div>
              <p v-if="gpsError" class="text-xs text-red-600">{{ gpsError }}</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                  <input
                    v-model="form.site_lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 13.7563"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                  <input
                    v-model="form.site_lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 100.5018"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Geofence Radius (metres)</label>
                <input
                  v-model="form.geofence_radius_m"
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
              <p v-if="form.site_lat && form.site_lng" class="text-xs text-blue-700">
                ✓ Geofence set — workers within {{ form.geofence_radius_m }}m will be marked on-site
              </p>
              <p v-else class="text-xs text-blue-600">
                No coordinates set — GPS will be recorded but not verified against geofence
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="form.description"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent resize-y"
              ></textarea>
            </div>
            <!-- Under Test — admin only -->
            <div v-if="authStore.isAdmin" class="flex items-center justify-between p-3 border border-amber-200 bg-amber-50 rounded-lg">
              <div>
                <div class="text-sm font-semibold text-amber-800">Under Test</div>
                <div class="text-xs text-amber-600 mt-0.5">Hidden from non-admin users</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.is_test" class="sr-only peer" />
                <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-500 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  v-model="form.start_date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  v-model="form.end_date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
                />
              </div>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            @click="closeDialog"
          >Cancel</button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
            :disabled="projectStore.loading"
            @click="saveProject"
          >{{ editTarget ? 'Save Changes' : 'Create Project' }}</button>
        </div>
      </div>
    </div>

    <!-- ═══════ Archive Confirm ════════════════════════════════════════════ -->
    <div v-if="archiveDialogOpen" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="archiveDialogOpen = false">
      <div class="bg-white rounded-xl max-w-sm w-full">
        <div class="px-5 py-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Archive Project?</h2>
          <p class="text-sm text-gray-600">
            "<strong>{{ archiveTarget?.name }}</strong>" will be archived and hidden from the active list.
            You can restore it by editing and changing the status.
          </p>
        </div>
        <div class="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            @click="archiveDialogOpen = false"
          >Cancel</button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            :disabled="projectStore.loading"
            @click="doArchive"
          >Archive</button>
        </div>
      </div>
    </div>

    <!-- ─── Toast notification ──────────────────────────────────────── -->
    <div
      v-if="snackbar.show"
      class="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white z-50 flex items-center gap-3 min-w-64"
      :class="snackbar.color === 'error' ? 'bg-red-600' : snackbar.color === 'info' ? 'bg-blue-600' : 'bg-green-600'"
    >
      <span class="flex-1">{{ snackbar.text }}</span>
      <button
        class="text-white/90 hover:text-white font-medium"
        @click="snackbar.show = false"
      >Dismiss</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore, type Project, type ProjectStatus } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'

const projectStore = useProjectStore()
const authStore = useAuthStore()
const route = useRoute()

// ── Local state ──────────────────────────────────────────────────────────────

const search = ref('')
const statusFilter = ref('all')

const dialogOpen = ref(false)
const editTarget = ref<Project | null>(null)

const archiveDialogOpen = ref(false)
const archiveTarget = ref<Project | null>(null)

const activeMenu = ref<string | null>(null)

const snackbar = reactive({ show: false, text: '', color: 'success' as string })

const statusItems = [
  { title: 'Planning',   value: 'planning'  },
  { title: 'Active',     value: 'active'    },
  { title: 'On Hold',    value: 'on_hold'   },
  { title: 'Completed',  value: 'completed' },
  { title: 'Cancelled',  value: 'cancelled' },
]

const statusFilterItems = [
  { title: 'All (active)', value: 'all'       },
  { title: 'Planning',     value: 'planning'  },
  { title: 'Active',       value: 'active'    },
  { title: 'On Hold',      value: 'on_hold'   },
  { title: 'Completed',    value: 'completed' },
  { title: 'Show archived',value: 'cancelled' },
]

const form = reactive({
  name: '',
  code: '',
  client: '',
  location: '',
  description: '',
  status: 'active' as ProjectStatus,
  start_date: '',
  end_date: '',
  is_test: false,
  site_lat: '' as string,
  site_lng: '' as string,
  geofence_radius_m: '200' as string,
})

const gpsCapturing = ref(false)
const gpsError    = ref<string | null>(null)

const captureMyLocation = () => {
  if (!navigator.geolocation) { gpsError.value = 'Geolocation not supported'; return }
  gpsCapturing.value = true
  gpsError.value = null
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.site_lat = pos.coords.latitude.toFixed(7)
      form.site_lng = pos.coords.longitude.toFixed(7)
      gpsCapturing.value = false
    },
    (err) => {
      gpsError.value = `GPS error: ${err.message}`
      gpsCapturing.value = false
    },
    { enableHighAccuracy: true, timeout: 15000 }
  )
}

// ── Computed ─────────────────────────────────────────────────────────────────

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return projectStore.visibleProjects.filter(p => {
    const matchStatus = statusFilter.value === 'all'
      ? p.status !== 'cancelled'
      : p.status === statusFilter.value
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || (p.code ?? '').toLowerCase().includes(q)
      || (p.client ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const showSnack = (text: string, color = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

const toggleMenu = (id: string) => {
  activeMenu.value = activeMenu.value === id ? null : id
}

const getStatusClass = (status: ProjectStatus) => {
  const classes: Record<ProjectStatus, string> = {
    planning: 'bg-yellow-50 text-yellow-700',
    active: 'bg-green-50 text-green-700',
    on_hold: 'bg-orange-50 text-orange-700',
    completed: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-600'
  }
  return classes[status] || 'bg-gray-100 text-gray-600'
}

const resetForm = () => {
  form.name = ''
  form.code = ''
  form.client = ''
  form.location = ''
  form.description = ''
  form.status = 'active'
  form.start_date = ''
  form.end_date = ''
  form.is_test = false
  form.site_lat = ''
  form.site_lng = ''
  form.geofence_radius_m = '200'
  gpsError.value = null
}

// ── CRUD handlers ─────────────────────────────────────────────────────────────

const openCreate = () => {
  editTarget.value = null
  resetForm()
  dialogOpen.value = true
}

const openEdit = (project: Project) => {
  editTarget.value = project
  form.name = project.name
  form.code = project.code ?? ''
  form.client = project.client ?? ''
  form.location = project.location ?? ''
  form.description = project.description ?? ''
  form.status = project.status
  form.start_date = project.start_date ?? ''
  form.end_date = project.end_date ?? ''
  form.is_test = project.is_test ?? false
  form.site_lat = project.site_lat != null ? String(project.site_lat) : ''
  form.site_lng = project.site_lng != null ? String(project.site_lng) : ''
  form.geofence_radius_m = String(project.geofence_radius_m ?? 200)
  gpsError.value = null
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
  nextTick(() => { editTarget.value = null; resetForm() })
}

const saveProject = async () => {
  if (!form.name.trim()) return

  const payload = {
    name: form.name.trim(),
    code: form.code.trim() || null,
    client: form.client.trim() || null,
    location: form.location.trim() || null,
    description: form.description.trim() || null,
    status: form.status,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    is_test: form.is_test,
    site_lat: form.site_lat !== '' ? parseFloat(form.site_lat) : null,
    site_lng: form.site_lng !== '' ? parseFloat(form.site_lng) : null,
    geofence_radius_m: parseInt(form.geofence_radius_m) || 200,
  }

  if (editTarget.value) {
    const updated = await projectStore.updateProject(editTarget.value.id, payload)
    if (updated) {
      showSnack('Project updated successfully')
      closeDialog()
    } else {
      showSnack(projectStore.error ?? 'Update failed', 'error')
    }
  } else {
    const created = await projectStore.createProject({
      ...payload,
      created_by: authStore.userId ?? undefined,
    })
    if (created) {
      showSnack(`"${created.name}" created!`)
      closeDialog()
      projectStore.setActiveProject(created)
    } else {
      showSnack(projectStore.error ?? 'Create failed', 'error')
    }
  }
}

const selectProject = (project: Project) => {
  projectStore.setActiveProject(project)
  showSnack(`"${project.name}" is now the active project`, 'info')
}

const confirmArchive = (project: Project) => {
  archiveTarget.value = project
  archiveDialogOpen.value = true
}

const doArchive = async () => {
  if (!archiveTarget.value) return
  const ok = await projectStore.archiveProject(archiveTarget.value.id)
  if (ok) {
    showSnack(`"${archiveTarget.value.name}" archived`)
  } else {
    showSnack(projectStore.error ?? 'Archive failed', 'error')
  }
  archiveDialogOpen.value = false
  archiveTarget.value = null
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await projectStore.fetchProjects()
  // Support ?new=1 query (from ProjectSelectorDialog)
  if (route.query.new === '1') openCreate()
  
  // Close menu on outside click
  document.addEventListener('click', () => { activeMenu.value = null })
})

// Also handle ?new=1 when already on this page (same-page navigation)
watch(() => route.query.new, (val) => {
  if (val === '1') openCreate()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
