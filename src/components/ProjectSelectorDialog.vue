<template>
  <!-- Modal Overlay -->
  <div
    v-if="model"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="model = false"
  >
    <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] overflow-hidden">

      <!-- ── Main: Project selector ─────────────────────────────────── -->
      <div v-if="!showCreateForm" class="flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-siberian text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 class="font-bold text-lg">Select Project</h3>
          <div class="flex-1"></div>
          <button
            class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
            @click="model = false"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <!-- Search box -->
          <input
            v-model="search"
            type="text"
            placeholder="Search projects…"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          <!-- Loading -->
          <div v-if="projectStore.loading" class="text-center py-8">
            <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- Empty state -->
          <div v-else-if="filtered.length === 0" class="text-center py-8 text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <div>{{ search ? 'No projects match your search' : 'No projects yet' }}</div>
          </div>

          <!-- Project list -->
          <div v-else class="space-y-2">
            <div
              v-for="project in filtered"
              :key="project.id"
              class="bg-gray-50 hover:bg-moss/5 cursor-pointer transition-colors rounded-lg border border-gray-200"
              :class="{ 'ring-2 ring-moss bg-moss/5': project.id === projectStore.activeProjectId }""
              @click="select(project)"
            >
              <div class="p-3 flex items-center gap-3">
                <!-- Avatar -->
                <div class="w-10 h-10 bg-moss text-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-bold">{{ initials(project.name) }}</span>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="font-semibold truncate text-gray-900">{{ project.name }}</div>
                  <div class="flex gap-2 mt-1">
                    <span
                      v-if="project.code"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700"
                    >
                      {{ project.code }}
                    </span>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      :class="getStatusBadgeClass(project.status)"
                    >
                      {{ project.status.replace('_', ' ') }}
                    </span>
                  </div>
                </div>

                <!-- Check icon -->
                <div v-if="project.id === projectStore.activeProjectId" class="text-moss text-xl flex-shrink-0">
                  ✓
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="border-t border-gray-200 px-6 py-4 flex gap-2 justify-between bg-gray-50">
          <button
            class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-siberian font-medium flex items-center gap-2"
            @click="showCreateForm = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
          <button
            v-if="projectStore.activeProjectId"
            class="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-medium"
            @click="clearAndClose"
          >
            Clear Selection
          </button>
        </div>
      </div>

      <!-- ── Inline: New Project form ───────────────────────────────── -->
      <div v-else class="flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-siberian text-white">
          <button
            class="w-8 h-8 rounded-full hover:bg-moss/20 flex items-center justify-center"
            @click="showCreateForm = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 class="font-bold text-lg">New Project</h3>
          <div class="flex-1"></div>
          <button
            class="w-8 h-8 rounded-full hover:bg-moss/20 flex items-center justify-center"
            @click="model = false"
          >
            ✕
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="saveProject" class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Enter project name"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Code (e.g. PML-001)
              </label>
              <input
                v-model="form.code"
                type="text"
                placeholder="Optional"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                v-model="form.status"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Client / Owner
            </label>
            <input
              v-model="form.client"
              type="text"
              placeholder="Enter client name"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Site / Location
            </label>
            <input
              v-model="form.location"
              type="text"
              placeholder="Enter location"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                v-model="form.start_date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                v-model="form.end_date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </form>

        <!-- Actions -->
        <div class="border-t border-gray-200 px-6 py-4 flex gap-2 justify-between bg-gray-50">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            @click="showCreateForm = false"
          >
            Back
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-siberian font-medium disabled:opacity-50"
            :disabled="projectStore.loading"
            @click.prevent="saveProject"
          >
            <span v-if="projectStore.loading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            Create Project
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick } from 'vue'
import { useProjectStore, type Project, type ProjectStatus } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'

const model        = defineModel<boolean>({ required: true })
const projectStore = useProjectStore()
const authStore    = useAuthStore()

const search         = ref('')
const showCreateForm = ref(false)

// ── Load when dialog opens ────────────────────────────────────────────────────

watch(model, async (open) => {
  if (open && projectStore.projects.length === 0) {
    await projectStore.fetchProjects()
  }
  if (!open) {
    search.value = ''
    showCreateForm.value = false
    resetForm()
  }
})

// ── Filtered list ─────────────────────────────────────────────────────────────

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return projectStore.visibleProjects.filter(p =>
    p.status !== 'cancelled' &&
    (!q || p.name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q))
  )
})

const initials = (name: string) =>
  name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'active': 'bg-green-100 text-green-700',
    'planning': 'bg-blue-100 text-blue-700',
    'on_hold': 'bg-amber-100 text-amber-700',
    'completed': 'bg-purple-100 text-purple-700',
    'cancelled': 'bg-red-100 text-red-700',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

// ── Select / clear ────────────────────────────────────────────────────────────

const select = (project: Project) => {
  projectStore.setActiveProject(project)
  model.value = false
}

const clearAndClose = () => {
  projectStore.clearActiveProject()
  model.value = false
}

// ── Create form ───────────────────────────────────────────────────────────────

const form = reactive({
  name: '', code: '', client: '', location: '',
  status: 'active' as ProjectStatus,
  start_date: '', end_date: '',
})

const resetForm = () => Object.assign(form, {
  name: '', code: '', client: '', location: '',
  status: 'active', start_date: '', end_date: '',
})

const saveProject = async () => {
  if (!form.name.trim()) return

  const created = await projectStore.createProject({
    name:        form.name.trim(),
    code:        form.code.trim() || null,
    client:      form.client.trim() || null,
    location:    form.location.trim() || null,
    status:      form.status,
    start_date:  form.start_date || null,
    end_date:    form.end_date || null,
    created_by:  authStore.userId ?? undefined,
  })

  if (created) {
    projectStore.setActiveProject(created)
    model.value = false
    nextTick(() => { showCreateForm.value = false; resetForm() })
  }
}
</script>
