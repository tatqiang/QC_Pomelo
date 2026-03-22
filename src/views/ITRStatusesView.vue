<template>
  <div class="p-4 md:p-6 bg-glacial min-h-screen">

    <!-- ─── No project guard ───────────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h2 class="text-xl font-semibold mb-2 text-gray-800">No Active Project</h2>
      <p class="text-gray-600 mb-6">Select a project to manage its ITR statuses.</p>
      <button @click="selectorOpen = true" class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors inline-flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select Project
      </button>
      <ProjectSelectorDialog v-model="selectorOpen" />
    </div>

    <template v-else>
      <!-- ─── Header ────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">ITR Statuses</h1>
          <p class="text-sm text-gray-600">
            {{ projectStore.activeProject.name }} — {{ itrStatusStore.statuses.length }} status(es)
          </p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status codes are fixed after creation.
          </div>
          <button @click="openCreate" class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors inline-flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Status
          </button>
        </div>
      </div>

      <!-- ─── Loading ────────────────────────────────────────────────── -->
      <div v-if="itrStatusStore.loading && itrStatusStore.statuses.length === 0" class="text-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-moss mx-auto"></div>
      </div>

      <!-- ─── Empty state ────────────────────────────────────────────── -->
      <div v-else-if="itrStatusStore.statuses.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 class="text-xl font-semibold mb-2 text-gray-800">No ITR Statuses</h2>
        <p class="text-gray-600">Statuses are seeded automatically when the project is loaded.</p>
      </div>

      <!-- ─── Table ──────────────────────────────────────────────────── -->
      <div v-else class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <!-- Header row -->
        <div class="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span class="w-8 text-xs uppercase font-bold text-gray-500 text-center">#</span>
          <span class="w-52 text-xs uppercase font-bold text-gray-500 ml-2">Code</span>
          <span class="flex-1 text-xs uppercase font-bold text-gray-500">Label</span>
          <span class="w-20 text-xs uppercase font-bold text-gray-500 text-center">Colour</span>
          <span class="w-44 text-xs uppercase font-bold text-gray-500">Icon</span>
          <span class="w-16 text-xs uppercase font-bold text-gray-500 text-center">Active</span>
          <span class="w-20"></span>
        </div>

        <div
          v-for="s in sortedStatuses"
          :key="s.id"
          class="flex items-center px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-moss/5 transition-colors group"
        >
          <!-- Sort order -->
          <div class="w-8 text-center text-xs text-gray-400 font-mono">{{ s.sort_order }}</div>

          <!-- Code chip -->
          <div class="w-52 ml-2">
            <span
              class="inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono"
              :style="{
                backgroundColor: (s.color ?? '#64748B') + '25',
                color: s.color ?? '#64748B'
              }"
            >{{ s.code }}</span>
          </div>

          <!-- Title -->
          <div class="flex-1 text-gray-800 font-medium">{{ s.title }}</div>

          <!-- Colour swatch -->
          <div class="w-20 flex justify-center items-center gap-1.5">
            <div
              v-if="s.color"
              class="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
              :style="{ background: s.color }"
              :title="s.color"
            />
            <span class="text-xs text-gray-500 font-mono">{{ s.color ?? '—' }}</span>
          </div>

          <!-- Icon -->
          <div class="w-44 text-xs text-gray-500 font-mono truncate">{{ s.icon ?? '—' }}</div>

          <!-- Active toggle -->
          <div class="w-16 flex justify-center">
            <svg v-if="s.is_active" class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <svg v-else class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
            </svg>
          </div>

          <!-- Edit action -->
          <div class="w-20 flex justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="openEdit(s)" title="Edit" class="p-1 text-gray-500 hover:text-moss transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button @click="confirmDelete(s)" title="Delete" class="p-1 text-gray-500 hover:text-red-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ Create Dialog ═══════════════════════════════════════════════════ -->
    <div v-if="createDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center gap-2 px-5 py-4 border-b">
          <svg class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold flex-1">Add Status</h3>
          <button @click="createDialogOpen = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <form @submit.prevent="createStatus" class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input v-model="createForm.code" type="text" required autofocus placeholder="e.g. qc_hold"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss font-mono text-sm" />
                <p class="text-xs text-gray-400 mt-1">Lowercase, underscores only. Cannot be changed.</p>
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                <input v-model="createForm.title" type="text" required placeholder="e.g. QC Hold"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss" />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div class="w-4 h-4 rounded-full border border-gray-300"
                    :style="{ background: isValidHex(createForm.color) ? createForm.color : '#e5e7eb' }" />
                </div>
                <input v-model="createForm.color" type="text" placeholder="#2563EB"
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss font-mono text-sm" />
              </div>
              <input type="color" :value="isValidHex(createForm.color) ? createForm.color : '#2563EB'"
                @input="(e) => createForm.color = (e.target as HTMLInputElement).value"
                class="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Icon <span class="text-gray-400 font-normal">(MDI name)</span></label>
              <input v-model="createForm.icon" type="text" placeholder="mdi-clock-outline"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss font-mono text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input v-model.number="createForm.sort_order" type="number" min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss" />
              </div>
              <div class="flex items-end pb-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="createForm.is_active" type="checkbox"
                    class="w-4 h-4 text-moss bg-gray-100 border-gray-300 rounded focus:ring-moss" />
                  <span class="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </form>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button @click="createDialogOpen = false" type="button"
            class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
          <button @click="createStatus" :disabled="itrStatusStore.loading"
            class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <svg v-if="itrStatusStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Delete Confirm ═══════════════════════════════════════════════════ -->
    <div v-if="deleteDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div class="px-5 py-4">
          <h3 class="text-lg font-semibold mb-2">Delete Status?</h3>
          <p class="text-gray-600">
            "<strong>{{ deleteTarget?.code }} — {{ deleteTarget?.title }}</strong>" will be removed.
            Any ITRs using this status will have their status cleared.
          </p>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button @click="deleteDialogOpen = false"
            class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
          <button @click="doDelete" :disabled="itrStatusStore.loading"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            <svg v-if="itrStatusStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Edit Dialog ═══════════════════════════════════════════════════ -->
    <div v-if="dialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b">
          <svg class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <h3 class="text-lg font-semibold flex-1">Edit Status</h3>
          <!-- Code badge (read-only) -->
          <span
            class="px-2 py-0.5 rounded text-xs font-bold font-mono"
            :style="{
              backgroundColor: (form.color || '#64748B') + '25',
              color: form.color || '#64748B'
            }"
          >{{ editTarget?.code }}</span>
          <button @click="closeDialog" class="text-gray-400 hover:text-gray-600 transition-colors ml-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <form @submit.prevent="saveStatus" class="space-y-4">

            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Label *</label>
              <input
                v-model="form.title"
                type="text"
                required
                autofocus
                placeholder="e.g. Pending Internal Inspection"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
              />
            </div>

            <!-- Colour + preview -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Colour (hex)</label>
              <div class="flex items-center gap-3">
                <div class="relative flex-1">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <div
                      class="w-4 h-4 rounded-full border border-gray-300"
                      :style="{ background: isValidHex(form.color) ? form.color : '#e5e7eb' }"
                    />
                  </div>
                  <input
                    v-model="form.color"
                    type="text"
                    placeholder="#2563EB"
                    class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent font-mono text-sm"
                  />
                </div>
                <input
                  type="color"
                  :value="isValidHex(form.color) ? form.color : '#2563EB'"
                  @input="(e) => form.color = (e.target as HTMLInputElement).value"
                  title="Pick colour"
                  class="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
              </div>
            </div>

            <!-- Icon (MDI string) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Icon <span class="text-gray-400 font-normal">(MDI name)</span></label>
              <input
                v-model="form.icon"
                type="text"
                placeholder="mdi-clipboard-list-outline"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent font-mono text-sm"
              />
              <p class="text-xs text-gray-500 mt-1">
                Browse icons at
                <a href="https://pictogrammers.com/library/mdi/" target="_blank" rel="noopener" class="text-moss hover:underline">pictogrammers.com/library/mdi</a>
              </p>
            </div>

            <!-- Sort Order -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                v-model.number="form.sort_order"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
              />
            </div>

            <!-- Active Toggle -->
            <div class="flex items-center">
              <input
                v-model="form.is_active"
                type="checkbox"
                id="edit_is_active"
                class="w-4 h-4 text-moss bg-gray-100 border-gray-300 rounded focus:ring-moss focus:ring-2"
              />
              <label for="edit_is_active" class="ml-2 text-sm font-medium text-gray-700">Active</label>
            </div>
          </form>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button
            @click="closeDialog"
            type="button"
            class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            @click="saveStatus"
            :disabled="itrStatusStore.loading"
            class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="itrStatusStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <div v-if="snackbar.show" class="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div
        class="px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]"
        :class="{
          'bg-green-600 text-white': snackbar.color === 'success',
          'bg-red-600 text-white': snackbar.color === 'error',
        }"
      >
        <span class="flex-1">{{ snackbar.text }}</span>
        <button @click="snackbar.show = false" class="text-white/90 hover:text-white font-medium">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useItrStatusStore, type ItrStatus } from '@/stores/itrStatusStore'
import { useProjectStore } from '@/stores/projectStore'
import ProjectSelectorDialog from '@/components/ProjectSelectorDialog.vue'

const itrStatusStore = useItrStatusStore()
const projectStore   = useProjectStore()

const selectorOpen      = ref(false)
const dialogOpen        = ref(false)
const createDialogOpen  = ref(false)
const deleteDialogOpen  = ref(false)
const editTarget        = ref<ItrStatus | null>(null)
const deleteTarget      = ref<ItrStatus | null>(null)
const snackbar          = reactive({ show: false, text: '', color: 'success' as string })
const showSnack = (text: string, color = 'success') => Object.assign(snackbar, { show: true, text, color })

const sortedStatuses = computed(() =>
  [...itrStatusStore.statuses].sort((a, b) => a.sort_order - b.sort_order)
)

const isValidHex = (val: string) => /^#[0-9A-Fa-f]{6}$/.test(val)

// ── Create Form ────────────────────────────────────────────────────────────────

const createForm = reactive({
  code: '', title: '', color: '', icon: '', sort_order: 1, is_active: true,
})

const openCreate = () => {
  Object.assign(createForm, {
    code: '', title: '', color: '', icon: '',
    sort_order: itrStatusStore.statuses.length + 1,
    is_active: true,
  })
  createDialogOpen.value = true
}

const createStatus = async () => {
  if (!createForm.code.trim() || !createForm.title.trim()) return
  const project = projectStore.activeProject
  if (!project) return
  const created = await itrStatusStore.createStatus({
    project_id: project.id,
    code:       createForm.code.trim().toLowerCase().replace(/\s+/g, '_'),
    title:      createForm.title.trim(),
    color:      createForm.color.trim() || null,
    icon:       createForm.icon.trim() || null,
    sort_order: createForm.sort_order,
    is_active:  createForm.is_active,
  })
  if (created) { showSnack(`"${created.title}" added`); createDialogOpen.value = false }
  else showSnack(itrStatusStore.error ?? 'Create failed', 'error')
}

// ── Delete ─────────────────────────────────────────────────────────────────────

const confirmDelete = (s: ItrStatus) => { deleteTarget.value = s; deleteDialogOpen.value = true }

const doDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await itrStatusStore.deleteStatus(deleteTarget.value.id)
  if (ok) showSnack('Status deleted')
  else showSnack(itrStatusStore.error ?? 'Delete failed', 'error')
  deleteDialogOpen.value = false
  deleteTarget.value = null
}

// ── Edit Form ──────────────────────────────────────────────────────────────────

const form = reactive({
  title: '', color: '', icon: '', sort_order: 1, is_active: true,
})

const openEdit = (s: ItrStatus) => {
  editTarget.value = s
  Object.assign(form, {
    title:      s.title,
    color:      s.color ?? '',
    icon:       s.icon ?? '',
    sort_order: s.sort_order,
    is_active:  s.is_active,
  })
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
  nextTick(() => { editTarget.value = null })
}

const saveStatus = async () => {
  if (!form.title.trim()) return
  if (!editTarget.value) return

  const updated = await itrStatusStore.updateStatus(editTarget.value.id, {
    title:      form.title.trim(),
    color:      form.color.trim() || null,
    icon:       form.icon.trim() || null,
    sort_order: form.sort_order,
    is_active:  form.is_active,
  })

  if (updated) {
    showSnack('Status updated')
    closeDialog()
  } else {
    showSnack(itrStatusStore.error ?? 'Update failed', 'error')
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

const loadForProject = async (projectId: string) => {
  itrStatusStore.clearStatuses()
  await itrStatusStore.fetchStatuses(projectId)
}

onMounted(async () => {
  if (projectStore.projects.length === 0) await projectStore.fetchProjects()
  if (projectStore.activeProject) await loadForProject(projectStore.activeProject.id)
})

watch(() => projectStore.activeProjectId, async id => {
  if (id) await loadForProject(id)
  else itrStatusStore.clearStatuses()
})

onUnmounted(() => itrStatusStore.clearStatuses())
</script>
