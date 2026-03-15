<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">

    <!-- ─── No project guard ──────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 10l6 6 6-6" />
      </svg>
      <h2 class="text-lg font-semibold text-gray-600 mb-2">No Active Project</h2>
      <p class="text-gray-600 mb-6">Select a project to manage its area hierarchy.</p>
      <button
        class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center gap-2 font-medium"
        @click="selectorOpen = true"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select Project
      </button>
      <ProjectSelectorDialog v-model="selectorOpen" />
    </div>

    <template v-else>
      <!-- ─── Header ───────────────────────────────────────────────── -->
      <div class="flex items-center mb-5 flex-wrap gap-3">
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900">Areas</h1>
          <p class="text-sm text-gray-600 mt-1">
            {{ projectStore.activeProject.name }} — {{ areaStore.areas.length }} area(s)
          </p>
        </div>
        <div class="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            class="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded transition-all"
            @click="areaStore.expandAll()"
          >Expand All</button>
          <button
            class="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded transition-all"
            @click="areaStore.collapseAll()"
          >Collapse</button>
        </div>
        <button
          class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 font-medium"
          @click="openCreate(null)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Root Area
        </button>
      </div>

      <!-- ─── Loading ────────────────────────────────────────────── -->
      <div v-if="areaStore.loading && areaStore.areas.length === 0" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-moss"></div>
      </div>

      <!-- ─── DB Error (table likely not migrated yet) ───────────── -->
      <div v-else-if="areaStore.error" class="py-8">
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="flex-1">
              <div class="font-bold text-yellow-900 mb-1">Database Setup Required</div>
              <div class="text-sm text-yellow-800 mb-2">
                The <code class="px-1 py-0.5 bg-yellow-100 rounded text-xs">areas</code> table is not found. Please run the SQL migration in
                <strong>Supabase Dashboard → SQL Editor</strong>:
              </div>
              <div class="text-xs font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-900 mb-1">database/005_areas.sql</div>
              <div class="text-xs font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-900 mb-2">database/005b_tasks_area.sql</div>
              <div class="text-xs text-yellow-700 opacity-70 mb-3">Error: {{ areaStore.error }}</div>
              <button
                class="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                @click="loadForProject(projectStore.activeProject!.id)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Empty state ───────────────────────────────────────── -->
      <div v-else-if="!areaStore.loading && areaStore.areas.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h2 class="text-lg font-semibold text-gray-600 mb-2">No Areas Defined</h2>
        <p class="text-gray-600 mb-6">
          Define the location hierarchy (Building → Floor → Zone → Room) for
          <strong>{{ projectStore.activeProject?.name }}</strong>.
        </p>
        <button
          class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center gap-2 font-medium"
          @click="openCreate(null)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Root Area
        </button>
      </div>

      <!-- ─── Area Tree ─────────────────────────────────────────── -->
      <div v-else class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div
          v-for="area in areaStore.flatVisible"
          :key="area.id"
          class="area-row flex items-center border-b border-gray-100 last:border-b-0 min-h-[46px] py-1.5 px-3 transition-colors hover:bg-moss/5"
          :style="{ paddingLeft: `${area.level * 24 + 12}px` }"
        >
          <!-- Expand toggle -->
          <button
            v-if="areaStore.hasChildren(area.id)"
            class="w-7 h-7 mr-1 flex-shrink-0 text-gray-500 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
            @click="areaStore.toggleExpand(area.id)"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path v-if="area.expanded" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              <path v-else fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
          <div v-else class="mr-1 flex-shrink-0 w-7" />

          <!-- Level indicator dot -->
          <div
            class="level-dot flex-shrink-0 mr-2 w-2 h-2 rounded-full"
            :style="{ background: levelColor(area.level) }"
          />

          <!-- Code chip -->
          <span
            v-if="area.code"
            class="mr-2 flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-moss/10 text-moss rounded"
          >{{ area.code }}</span>

          <!-- Name + description -->
          <div class="flex-1 min-w-0">
            <span class="font-semibold text-sm text-gray-900">{{ area.name }}</span>
            <span v-if="area.description" class="ml-2 truncate text-xs text-gray-600">
              {{ area.description }}
            </span>
          </div>

          <!-- Child count badge -->
          <span
            v-if="areaStore.hasChildren(area.id)"
            class="mr-2 flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
          >
            {{ areaStore.areas.filter(a => a.parent_id === area.id).length }}
          </span>

          <!-- Row actions (visible on hover) -->
          <div class="row-actions flex gap-0 flex-shrink-0 opacity-0 transition-opacity">
            <button class="w-6 h-6 text-gray-500 hover:bg-gray-100 rounded transition-colors flex items-center justify-center" title="Add Child" @click="openCreate(area.id)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button class="w-6 h-6 text-gray-500 hover:bg-gray-100 rounded transition-colors flex items-center justify-center" title="Edit" @click="openEdit(area)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button class="w-6 h-6 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center" title="Delete" @click="confirmDelete(area)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════ Create / Edit Dialog ══════════════════════════════════════ -->
    <div v-if="dialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b">
          <svg v-if="editTarget" class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <svg v-else class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 class="text-lg font-semibold flex-1">
            {{ editTarget ? 'Edit Area' : (parentId ? 'Add Child Area' : 'Add Root Area') }}
          </h3>
          <button @click="closeDialog" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <form @submit.prevent="saveArea" class="space-y-4">
            <!-- Area Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Area Name *</label>
              <input
                v-model="form.name"
                type="text"
                required
                autofocus
                placeholder="e.g. Building A, Zone 1, Room 101"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
              />
            </div>

            <!-- Short Code & Parent Area Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Short Code -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Short Code</label>
                <input
                  v-model="form.code"
                  type="text"
                  placeholder="e.g. BLD-A, Z1, RM-101"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
                />
              </div>

              <!-- Parent Area -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Parent Area</label>
                <select
                  v-model="form.parent_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent bg-white"
                >
                  <option :value="null">(Root — no parent)</option>
                  <option v-for="opt in parentOptions" :key="opt.value" :value="opt.value">
                    {{ opt.title }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="form.description"
                rows="2"
                placeholder="Optional description..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent resize-y"
              ></textarea>
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
            @click="saveArea"
            :disabled="areaStore.loading"
            class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="areaStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ editTarget ? 'Save Changes' : 'Create Area' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ Delete Confirm ════════════════════════════════════════════ -->
    <div v-if="deleteDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div class="px-5 py-4">
          <h3 class="text-lg font-semibold mb-2">Delete Area?</h3>
          <p class="text-gray-600">
            "<strong>{{ deleteTarget?.name }}</strong>" and all its child areas will be permanently deleted.
          </p>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button
            @click="deleteDialogOpen = false"
            class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            @click="doDelete"
            :disabled="areaStore.loading"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="areaStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Snackbar ──────────────────────────────────────────────── -->
    <div v-if="snackbar.show" class="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div
        class="px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]"
        :class="{
          'bg-green-600 text-white': snackbar.color === 'success',
          'bg-red-600 text-white': snackbar.color === 'error',
          'bg-blue-600 text-white': snackbar.color === 'info'
        }"
      >
        <span class="flex-1">{{ snackbar.text }}</span>
        <button @click="snackbar.show = false" class="text-white/90 hover:text-white font-medium">
          OK
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick, watch, onUnmounted } from 'vue'
import { useAreaStore, type AreaNode } from '@/stores/areaStore'
import { useProjectStore } from '@/stores/projectStore'
import ProjectSelectorDialog from '@/components/ProjectSelectorDialog.vue'

const areaStore   = useAreaStore()
const projectStore = useProjectStore()

const selectorOpen = ref(false)
const dialogOpen   = ref(false)
const editTarget   = ref<AreaNode | null>(null)
const parentId     = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deleteTarget = ref<AreaNode | null>(null)
const formRef      = ref()

const snackbar = reactive({ show: false, text: '', color: 'success' as string })
const showSnack = (text: string, color = 'success') => Object.assign(snackbar, { show: true, text, color })

// ── Level colours (cycling palette) ──────────────────────────────────────────
const LEVEL_COLORS = ['#39ace7', '#0784b5', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']
const levelColor = (level: number) => LEVEL_COLORS[level % LEVEL_COLORS.length]

// ── Form ─────────────────────────────────────────────────────────────────────

const form = reactive({
  name:        '',
  code:        '',
  description: '',
  parent_id:   null as string | null,
})

const resetForm = () => Object.assign(form, { name: '', code: '', description: '', parent_id: null })

const parentOptions = computed(() =>
  areaStore.flatAll.map(a => ({
    title: `${'— '.repeat(a.level)}${a.name}${a.code ? ` (${a.code})` : ''}`,
    value: a.id,
  }))
)

// ── Open/close ────────────────────────────────────────────────────────────────

const openCreate = (pid: string | null) => {
  editTarget.value = null
  parentId.value = pid
  resetForm()
  form.parent_id = pid
  dialogOpen.value = true
}

const openEdit = (area: AreaNode) => {
  editTarget.value = area
  parentId.value = area.parent_id
  Object.assign(form, {
    name:        area.name,
    code:        area.code ?? '',
    description: area.description ?? '',
    parent_id:   area.parent_id,
  })
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
  nextTick(() => { editTarget.value = null; resetForm() })
}

// ── Save ──────────────────────────────────────────────────────────────────────

const saveArea = async () => {
  if (!form.name.trim()) return
  const project = projectStore.activeProject
  if (!project) return

  const payload = {
    name:        form.name.trim(),
    code:        form.code.trim() || null,
    description: form.description.trim() || null,
    parent_id:   form.parent_id || null,
  }

  if (editTarget.value) {
    const updated = await areaStore.updateArea(editTarget.value.id, payload)
    if (updated) { showSnack('Area updated'); closeDialog() }
    else showSnack(areaStore.error ?? 'Update failed', 'error')
  } else {
    const created = await areaStore.createArea({ ...payload, project_id: project.id })
    if (created) { showSnack(`"${created.name}" created`); closeDialog() }
    else showSnack(areaStore.error ?? 'Create failed', 'error')
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const confirmDelete = (area: AreaNode) => {
  deleteTarget.value = area
  deleteDialogOpen.value = true
}

const doDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await areaStore.deleteArea(deleteTarget.value.id)
  if (ok) showSnack('Area deleted')
  else showSnack(areaStore.error ?? 'Delete failed', 'error')
  deleteDialogOpen.value = false
  deleteTarget.value = null
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

const loadForProject = async (projectId: string) => {
  areaStore.clearAreas()
  await areaStore.fetchAreas(projectId)
}

onMounted(async () => {
  // Ensure projects are loaded so activeProject resolves correctly
  if (projectStore.projects.length === 0) await projectStore.fetchProjects()
  if (projectStore.activeProject) await loadForProject(projectStore.activeProject.id)
})

watch(() => projectStore.activeProjectId, async id => {
  if (id) await loadForProject(id)
  else areaStore.clearAreas()
})

onUnmounted(() => areaStore.clearAreas())
</script>

<style scoped>
.area-row {
  min-height: 46px;
  padding-top: 6px;
  padding-bottom: 6px;
  padding-right: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.12s ease;
  color: #E2E8F0;
}
.area-row:hover {
  background: rgba(57, 172, 231, 0.09);
}
.area-row:last-child {
  border-bottom: none;
}

.level-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.row-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}
.area-row:hover .row-actions {
  opacity: 1;
}
</style>
