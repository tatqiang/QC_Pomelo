<template>
  <div class="p-4 md:p-6 bg-glacial min-h-screen">

    <!-- ─── No project guard ──────────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
      <h2 class="text-xl font-semibold mb-2 text-gray-800">No Active Project</h2>
      <p class="text-gray-600 mb-6">Select a project to manage its disciplines.</p>
      <button @click="selectorOpen = true" class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors inline-flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select Project
      </button>
      <ProjectSelectorDialog v-model="selectorOpen" />
    </div>

    <template v-else>
      <!-- ─── Header ───────────────────────────────────────────────── -->
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Disciplines</h1>
          <p class="text-sm text-gray-600">
            {{ projectStore.activeProject.name }} — {{ disciplineStore.disciplines.length }} discipline(s)
          </p>
        </div>
        <button @click="openCreate" class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors inline-flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Discipline
        </button>
      </div>

      <!-- ─── Loading ───────────────────────────────────────────────── -->
      <div v-if="disciplineStore.loading && disciplineStore.disciplines.length === 0" class="text-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-moss mx-auto"></div>
      </div>

      <!-- ─── DB Error ──────────────────────────────────────────────── -->
      <div v-else-if="disciplineStore.error" class="py-6">
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div class="flex gap-3">
            <svg class="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <div class="flex-1">
              <div class="font-bold text-yellow-800 mb-1">Database Setup Required</div>
              <div class="text-sm text-yellow-700">
                Run <code class="bg-yellow-100 px-1 rounded">database/007_disciplines.sql</code> in
                <strong>Supabase Dashboard → SQL Editor</strong>, then click Retry.
              </div>
              <div class="mt-1 text-xs text-yellow-600 opacity-70">{{ disciplineStore.error }}</div>
              <button @click="loadForProject(projectStore.activeProject!.id)" class="mt-3 px-3 py-1.5 bg-yellow-200 text-yellow-800 rounded-lg hover:bg-yellow-300 transition-colors text-sm inline-flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Empty state ───────────────────────────────────────────── -->
      <div v-else-if="disciplineStore.disciplines.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <h2 class="text-xl font-semibold mb-2 text-gray-800">No Disciplines Yet</h2>
        <p class="text-gray-600 mb-6">Click Add Discipline to get started.</p>
      </div>

      <!-- ─── Table ─────────────────────────────────────────────────── -->
      <div v-else class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <!-- Header row -->
        <div class="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span class="w-20 text-xs uppercase font-bold text-gray-500">Code</span>
          <span class="flex-1 text-xs uppercase font-bold text-gray-500">Title</span>
          <span class="w-20 text-xs uppercase font-bold text-gray-500 text-center">Colour</span>
          <span class="w-16 text-xs uppercase font-bold text-gray-500 text-center">Active</span>
          <span class="w-20"></span>
        </div>

        <div
          v-for="d in sortedDisciplines"
          :key="d.id"
          class="flex items-center px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-moss/5 transition-colors group"
        >
          <!-- Code chip -->
          <div class="w-20">
            <span
              class="inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono"
              :style="{ 
                backgroundColor: d.color ? d.color + '20' : '#81938A20',
                color: d.color ?? '#81938A'
              }"
            >{{ d.code }}</span>
          </div>

          <!-- Title -->
          <div class="flex-1 text-gray-800 font-medium">{{ d.title }}</div>

          <!-- Colour swatch -->
          <div class="w-20 flex justify-center">
            <div 
              v-if="d.color" 
              class="w-5 h-5 rounded-full border border-gray-300" 
              :style="{ background: d.color }" 
              :title="d.color"
            />
            <span v-else class="text-gray-300 text-xs">—</span>
          </div>

          <!-- Active toggle -->
          <div class="w-16 flex justify-center">
            <svg v-if="d.is_active" class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <svg v-else class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
            </svg>
          </div>

          <!-- Actions -->
          <div class="w-20 flex justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="openEdit(d)" title="Edit" class="p-1 text-gray-500 hover:text-moss transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button @click="confirmDelete(d)" title="Delete" class="p-1 text-gray-500 hover:text-red-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ Create / Edit Dialog ══════════════════════════════════════════ -->
    <div v-if="dialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b">
          <svg v-if="editTarget" class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <svg v-else class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold flex-1">
            {{ editTarget ? 'Edit Discipline' : 'Add Discipline' }}
          </h3>
          <button @click="closeDialog" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <form @submit.prevent="saveDiscipline" class="space-y-4">
            <!-- Code & Title Row -->
            <div class="grid grid-cols-3 gap-4">
              <!-- Code -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  v-model="form.code"
                  type="text"
                  required
                  autofocus
                  placeholder="e.g. M"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent font-mono"
                />
              </div>

              <!-- Title -->
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  v-model="form.title"
                  type="text"
                  required
                  placeholder="e.g. HVAC / Mechanical"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
                />
              </div>
            </div>

            <!-- Colour & Order Row -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Colour -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Colour (hex)</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <input
                    v-model="form.color"
                    type="text"
                    placeholder="#39ace7"
                    class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
                  />
                </div>
              </div>

              <!-- Sort Order -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  v-model.number="form.sort_order"
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent"
                />
              </div>
            </div>

            <!-- Active Toggle -->
            <div class="flex items-center">
              <input
                v-model="form.is_active"
                type="checkbox"
                id="is_active"
                class="w-4 h-4 text-moss bg-gray-100 border-gray-300 rounded focus:ring-moss focus:ring-2"
              />
              <label for="is_active" class="ml-2 text-sm font-medium text-gray-700">Active</label>
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
            @click="saveDiscipline"
            :disabled="disciplineStore.loading"
            class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-moss/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="disciplineStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ editTarget ? 'Save Changes' : 'Add' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Delete Confirm ════════════════════════════════════════════════ -->
    <div v-if="deleteDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div class="px-5 py-4">
          <h3 class="text-lg font-semibold mb-2">Delete Discipline?</h3>
          <p class="text-gray-600">
            "<strong>{{ deleteTarget?.code }} — {{ deleteTarget?.title }}</strong>" will be removed.
            Tasks and ITRs linked to it will have their discipline cleared.
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
            :disabled="disciplineStore.loading"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="disciplineStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Delete
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
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useDisciplineStore, type Discipline } from '@/stores/disciplineStore'
import { useProjectStore } from '@/stores/projectStore'
import ProjectSelectorDialog from '@/components/ProjectSelectorDialog.vue'

const disciplineStore = useDisciplineStore()
const projectStore    = useProjectStore()

const selectorOpen    = ref(false)
const dialogOpen      = ref(false)
const editTarget      = ref<Discipline | null>(null)
const deleteDialogOpen = ref(false)
const deleteTarget    = ref<Discipline | null>(null)
const snackbar = reactive({ show: false, text: '', color: 'success' as string })
const showSnack = (text: string, color = 'success') => Object.assign(snackbar, { show: true, text, color })

const sortedDisciplines = computed(() =>
  [...disciplineStore.disciplines].sort((a, b) => a.sort_order - b.sort_order)
)

// ── Form ──────────────────────────────────────────────────────────────────────

const form = reactive({
  code: '', title: '', color: '', sort_order: 0, is_active: true,
})
const resetForm = () => Object.assign(form, { code: '', title: '', color: '', sort_order: disciplineStore.disciplines.length + 1, is_active: true })

const openCreate = () => { editTarget.value = null; resetForm(); dialogOpen.value = true }

const openEdit = (d: Discipline) => {
  editTarget.value = d
  Object.assign(form, { code: d.code, title: d.title, color: d.color ?? '', sort_order: d.sort_order, is_active: d.is_active })
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
  nextTick(() => { editTarget.value = null; resetForm() })
}

const saveDiscipline = async () => {
  // Native HTML5 validation - inputs have 'required' attribute
  if (!form.code.trim() || !form.title.trim()) return
  
  const project = projectStore.activeProject
  if (!project) return

  const payload = {
    code:       form.code.trim().toUpperCase(),
    title:      form.title.trim(),
    color:      form.color.trim() || null,
    sort_order: form.sort_order,
    is_active:  form.is_active,
  }

  if (editTarget.value) {
    const updated = await disciplineStore.updateDiscipline(editTarget.value.id, payload)
    if (updated) { showSnack('Discipline updated'); closeDialog() }
    else showSnack(disciplineStore.error ?? 'Update failed', 'error')
  } else {
    const created = await disciplineStore.createDiscipline({ ...payload, project_id: project.id })
    if (created) { showSnack(`"${created.code}" added`); closeDialog() }
    else showSnack(disciplineStore.error ?? 'Create failed', 'error')
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const confirmDelete = (d: Discipline) => { deleteTarget.value = d; deleteDialogOpen.value = true }

const doDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await disciplineStore.deleteDiscipline(deleteTarget.value.id)
  if (ok) showSnack('Discipline deleted')
  else showSnack(disciplineStore.error ?? 'Delete failed', 'error')
  deleteDialogOpen.value = false; deleteTarget.value = null
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const loadForProject = async (projectId: string) => {
  disciplineStore.clearDisciplines()
  await disciplineStore.fetchDisciplines(projectId)
}

onMounted(async () => {
  if (projectStore.projects.length === 0) await projectStore.fetchProjects()
  if (projectStore.activeProject) await loadForProject(projectStore.activeProject.id)
})

watch(() => projectStore.activeProjectId, async id => {
  if (id) await loadForProject(id)
  else disciplineStore.clearDisciplines()
})

onUnmounted(() => disciplineStore.clearDisciplines())
</script>
