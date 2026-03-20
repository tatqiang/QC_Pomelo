<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskTodoStore } from '@/stores/taskTodoStore'
import type { TaskTodo } from '@/stores/taskTodoStore'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthorityStore } from '@/stores/authorityStore'
import { useAuthStore } from '@/stores/authStore'

const router         = useRouter()
const todoStore      = useTaskTodoStore()
const projectStore   = useProjectStore()
const authorityStore = useAuthorityStore()
const authStore      = useAuthStore()

// ── Filters ──────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'overdue' | 'done'
const activeTab    = ref<FilterTab>('all')
const assigneeFilter = ref<string>('')
const search       = ref('')

const today = new Date(new Date().toDateString())

const isOverdue = (t: { is_done: boolean; due_date: string | null }) =>
  !t.is_done && !!t.due_date && new Date(t.due_date + 'T00:00:00') < today

// ── Filtered + grouped list ───────────────────────────────────────────────────

const filtered = computed(() => {
  let list = todoStore.projectTodos
  if (activeTab.value === 'pending')  list = list.filter(t => !t.is_done && !isOverdue(t))
  if (activeTab.value === 'overdue')  list = list.filter(t => isOverdue(t))
  if (activeTab.value === 'done')     list = list.filter(t => t.is_done)
  if (assigneeFilter.value)           list = list.filter(t => t.assigned_to === assigneeFilter.value)
  if (search.value.trim())            list = list.filter(t => t.title.toLowerCase().includes(search.value.toLowerCase()))
  return list
})

interface TodoGroup { taskId: string; taskName: string; items: typeof filtered.value }

const grouped = computed<TodoGroup[]>(() => {
  const map = new Map<string, TodoGroup>()
  for (const t of filtered.value) {
    const tid  = t.task_id
    const name = (t.task as { name?: string } | null)?.name ?? 'Unnamed Task'
    if (!map.has(tid)) map.set(tid, { taskId: tid, taskName: name, items: [] })
    map.get(tid)!.items.push(t)
  }
  return [...map.values()]
})

// ── Counts ────────────────────────────────────────────────────────────────────

const counts = computed(() => {
  const all     = todoStore.projectTodos.length
  const done    = todoStore.projectTodos.filter(t => t.is_done).length
  const overdue = todoStore.projectTodos.filter(t => isOverdue(t)).length
  const pending = all - done - overdue
  return { all, pending, overdue, done }
})

// ── Members for assignee filter ───────────────────────────────────────────────

const memberOptions = computed(() =>
  authorityStore.projectMembers
    .filter(m => m.is_active)
    .map(m => ({
      value: m.user_id,
      label: m.first_name ? `${m.first_name} ${m.last_name ?? ''}`.trim() : m.email,
    }))
)

// ── Load ──────────────────────────────────────────────────────────────────────

const load = async () => {
  const pid = projectStore.activeProjectId
  if (!pid) return
  await Promise.all([
    todoStore.fetchProjectTodos(pid),
    memberOptions.value.length === 0 ? authorityStore.fetchProjectMembers(pid) : Promise.resolve(),
  ])
}

onMounted(load)
watch(() => projectStore.activeProjectId, load)

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatUser = (u: { first_name: string | null; last_name: string | null; email: string } | null | undefined) => {
  if (!u) return ''
  return u.first_name ? `${u.first_name} ${u.last_name ?? ''}`.trim() : u.email
}

const userInitials = (u: { first_name: string | null; last_name: string | null; email: string } | null | undefined) => {
  if (!u) return '?'
  const name = u.first_name ? `${u.first_name} ${u.last_name ?? ''}`.trim() : u.email
  return name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
}

const fmtDate = (d: string | null) => {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const goToGantt = (taskId: string) => {
  router.push({ path: '/gantt', query: { task: taskId } })
}

// ── Edit state ────────────────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editForm  = ref({ title: '', notes: '', due_date: '', assigned_to: '', link: '' })

function startEdit(todo: TaskTodo) {
  addingToTask.value = null
  editingId.value    = todo.id
  editForm.value = {
    title:       todo.title,
    notes:       todo.notes ?? '',
    due_date:    todo.due_date ?? '',
    assigned_to: todo.assigned_to ?? '',
    link:        todo.link ?? '',
  }
}

async function saveEdit() {
  if (!editingId.value || !editForm.value.title.trim()) return
  const ok = await todoStore.updateTodo(editingId.value, {
    title:       editForm.value.title.trim(),
    notes:       editForm.value.notes.trim() || null,
    due_date:    editForm.value.due_date || null,
    assigned_to: editForm.value.assigned_to || null,
    link:        editForm.value.link.trim() || null,
  })
  if (ok) editingId.value = null
}

function cancelEdit() { editingId.value = null }

// ── Add state ─────────────────────────────────────────────────────────────────
const addingToTask = ref<string | null>(null)
const addForm      = ref({ title: '', notes: '', due_date: '', assigned_to: '', link: '' })

function startAdd(taskId: string) {
  editingId.value    = null
  addingToTask.value = taskId
  addForm.value      = { title: '', notes: '', due_date: '', assigned_to: '', link: '' }
}

async function saveAdd(taskId: string) {
  const pid = projectStore.activeProjectId
  if (!pid || !addForm.value.title.trim()) return
  await todoStore.createTodo({
    project_id:  pid,
    task_id:     taskId,
    title:       addForm.value.title.trim(),
    notes:       addForm.value.notes.trim() || null,
    due_date:    addForm.value.due_date || null,
    assigned_to: addForm.value.assigned_to || null,
    link:        addForm.value.link.trim() || null,
    created_by:  authStore.userId,
  })
  await load()
  addingToTask.value = null
}

function cancelAdd() { addingToTask.value = null }

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDeleteTodo(id: string) {
  if (!confirm('Delete this to-do item?')) return
  await todoStore.deleteTodo(id)
  if (editingId.value === id) editingId.value = null
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6 space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-siberian flex items-center gap-2">
          <svg class="w-6 h-6 text-moss" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          To-Do List
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ projectStore.activeProject?.name ?? 'No project selected' }}
        </p>
      </div>
      <button v-if="!todoStore.loading" @click="load"
        class="p-1.5 hover:bg-gray-100 rounded transition text-gray-400 hover:text-moss" title="Refresh">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- No project -->
    <div v-if="!projectStore.activeProjectId"
      class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-sm text-yellow-700">
      Please select a project first.
    </div>

    <template v-else>
      <!-- Filter bar -->
      <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <!-- Tabs -->
        <div class="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5 flex-shrink-0">
          <button v-for="tab in (['all','pending','overdue','done'] as const)" :key="tab"
            class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize"
            :class="activeTab === tab
              ? (tab === 'overdue' ? 'bg-red-500 text-white' : 'bg-moss text-white')
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'"
            @click="activeTab = tab">
            {{ tab }}
            <span class="ml-1 opacity-75">
              {{ tab === 'all' ? counts.all : tab === 'pending' ? counts.pending : tab === 'overdue' ? counts.overdue : counts.done }}
            </span>
          </button>
        </div>

        <!-- Search -->
        <div class="relative flex-1 min-w-0">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input v-model="search" type="text" placeholder="Search…"
            class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white"/>
        </div>

        <!-- Assignee filter -->
        <select v-model="assigneeFilter"
          class="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#81938A] max-w-[180px]">
          <option value="">All members</option>
          <option v-for="m in memberOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="todoStore.loading" class="flex justify-center py-12">
        <svg class="animate-spin w-8 h-8 text-moss" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0"
        class="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
        <svg class="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p class="text-sm text-gray-400">No to-do items found</p>
      </div>

      <!-- Groups -->
      <div v-else class="space-y-4">
        <div v-for="group in grouped" :key="group.taskId"
          class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <!-- Task header -->
          <div class="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-glacial/60">
            <svg class="w-4 h-4 text-moss flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 16l4-4 4 4 6-6" />
            </svg>
            <span class="text-sm font-semibold text-siberian truncate flex-1">{{ group.taskName }}</span>
            <button
              class="text-xs text-moss hover:underline flex-shrink-0 flex items-center gap-1"
              @click="goToGantt(group.taskId)">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Gantt
            </button>
            <span class="text-xs text-gray-400 flex-shrink-0">
              {{ group.items.filter(i => i.is_done).length }}/{{ group.items.length }}
            </span>
          </div>

          <!-- Todo items -->
          <ul class="divide-y divide-gray-50">
            <li v-for="todo in group.items" :key="todo.id">

              <!-- Display row -->
              <div class="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                   :class="editingId === todo.id ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'"
                   @click="editingId !== todo.id && startEdit(todo)">

                <!-- Checkbox -->
                <button
                  class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center"
                  :class="todo.is_done ? 'bg-moss border-moss' : 'border-gray-300 hover:border-moss'"
                  @click.stop="todoStore.toggleDone(todo.id)">
                  <svg v-if="todo.is_done" class="w-3 h-3 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm leading-snug"
                    :class="todo.is_done ? 'line-through text-gray-400' : 'text-gray-800'">
                    {{ todo.title }}
                  </p>
                  <p v-if="todo.notes && editingId !== todo.id" class="text-xs text-gray-400 mt-0.5 truncate">{{ todo.notes }}</p>

                  <!-- Meta row (hidden while editing) -->
                  <div v-if="editingId !== todo.id" class="flex items-center gap-3 mt-1.5 flex-wrap">
                    <!-- Assignee -->
                    <span v-if="todo.assigned_user" class="inline-flex items-center gap-1 text-xs text-gray-500">
                      <span class="w-4 h-4 rounded-full bg-cyclone text-siberian flex items-center justify-center text-[0.55rem] font-bold flex-shrink-0">
                        {{ userInitials(todo.assigned_user) }}
                      </span>
                      {{ formatUser(todo.assigned_user) }}
                    </span>

                    <!-- Due date -->
                    <span v-if="todo.due_date" class="inline-flex items-center gap-0.5 text-xs font-medium"
                      :class="isOverdue(todo) ? 'text-red-500' : todo.is_done ? 'text-gray-400' : 'text-gray-500'">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {{ fmtDate(todo.due_date) }}
                      <span v-if="isOverdue(todo)" class="ml-0.5">(overdue)</span>
                    </span>

                    <!-- Notes indicator -->
                    <span v-if="todo.notes" class="inline-flex items-center gap-0.5 text-xs text-gray-400" :title="todo.notes">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                      </svg>
                      Note
                    </span>

                    <!-- Link -->
                    <a v-if="todo.link" :href="todo.link" target="_blank" rel="noopener"
                      class="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:underline max-w-[140px] truncate"
                      :title="todo.link" @click.stop>
                      <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {{ todo.link.replace(/^https?:\/\//, '') }}
                    </a>

                    <!-- Attachments -->
                    <span v-if="todo.task_todo_files && todo.task_todo_files.length > 0"
                      class="inline-flex items-center gap-0.5 text-xs text-gray-400">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {{ todo.task_todo_files.length }}
                    </span>
                  </div>
                </div>

                <!-- Edit button / Close button (while editing) -->
                <button v-if="editingId !== todo.id"
                  class="flex-shrink-0 self-center p-1.5 rounded text-gray-400 hover:text-moss hover:bg-gray-100 transition-all"
                  title="Edit"
                  @click.stop="startEdit(todo)">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button v-else
                  class="flex-shrink-0 self-center p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-100 transition-all"
                  title="Close"
                  @click.stop="cancelEdit">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Inline edit form -->
              <div v-if="editingId === todo.id" class="px-4 pb-3 pt-2 bg-blue-50/30 border-t border-blue-100">
                <div class="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div class="col-span-2">
                    <label class="block text-xs text-gray-500 mb-0.5">Title <span class="text-red-400">*</span></label>
                    <input v-model="editForm.title" type="text" placeholder="To-do title"
                      class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white"
                      @keydown.enter.prevent="saveEdit" @keydown.esc="cancelEdit"/>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs text-gray-500 mb-0.5">Notes</label>
                    <textarea v-model="editForm.notes" rows="2" placeholder="Add notes…"
                      class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white resize-none"/>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-0.5">Due date</label>
                    <input v-model="editForm.due_date" type="date"
                      class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white"/>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-0.5">Assigned to</label>
                    <select v-model="editForm.assigned_to"
                      class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white">
                      <option value="">Unassigned</option>
                      <option v-for="m in memberOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs text-gray-500 mb-0.5">Link</label>
                    <input v-model="editForm.link" type="url" placeholder="https://…"
                      class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white"/>
                  </div>
                </div>
                <div class="flex items-center justify-between mt-2.5">
                  <div class="flex gap-2 items-center">
                    <button @click="saveEdit"
                      :disabled="!editForm.title.trim() || todoStore.saving"
                      class="px-3 py-1.5 text-xs font-semibold bg-moss text-white rounded-lg hover:bg-[#6a7a72] disabled:opacity-50 disabled:cursor-not-allowed transition">
                      {{ todoStore.saving ? 'Saving…' : 'Save' }}
                    </button>
                    <button @click="cancelEdit"
                      class="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <span v-if="todoStore.error" class="text-xs text-red-500 truncate max-w-[200px]" :title="todoStore.error">
                      {{ todoStore.error }}
                    </span>
                  </div>
                  <button @click="handleDeleteTodo(todo.id)"
                    class="px-3 py-1.5 text-xs font-medium text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition">
                    Delete
                  </button>
                </div>
              </div>

            </li>
          </ul>

          <!-- Add to-do -->
          <div class="border-t border-gray-50 px-4"
               :class="addingToTask === group.taskId ? 'py-3 bg-gray-50/50' : 'py-2'">
            <template v-if="addingToTask !== group.taskId">
              <button @click="startAdd(group.taskId)"
                class="text-xs text-gray-400 hover:text-moss font-medium flex items-center gap-1 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Add to-do
              </button>
            </template>
            <div v-else class="space-y-2">
              <div class="grid grid-cols-2 gap-x-3 gap-y-2">
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 mb-0.5">Title <span class="text-red-400">*</span></label>
                  <input v-model="addForm.title" type="text" placeholder="New to-do item"
                    class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white"
                    @keydown.enter.prevent="saveAdd(group.taskId)" @keydown.esc="cancelAdd"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 mb-0.5">Notes</label>
                  <textarea v-model="addForm.notes" rows="2" placeholder="Add notes…"
                    class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white resize-none"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-0.5">Due date</label>
                  <input v-model="addForm.due_date" type="date"
                    class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-0.5">Assigned to</label>
                  <select v-model="addForm.assigned_to"
                    class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white">
                    <option value="">Unassigned</option>
                    <option v-for="m in memberOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </select>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 mb-0.5">Link</label>
                  <input v-model="addForm.link" type="url" placeholder="https://…"
                    class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#81938A] bg-white"/>
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="saveAdd(group.taskId)"
                  :disabled="!addForm.title.trim() || todoStore.saving"
                  class="px-3 py-1.5 text-xs font-semibold bg-moss text-white rounded-lg hover:bg-[#6a7a72] disabled:opacity-50 disabled:cursor-not-allowed transition">
                  {{ todoStore.saving ? 'Adding…' : 'Add' }}
                </button>
                <button @click="cancelAdd"
                  class="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>
  </div>
</template>
