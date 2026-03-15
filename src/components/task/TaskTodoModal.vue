<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @mousedown.self="$emit('update:modelValue', false)"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">

      <!-- ── Header ──────────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div class="w-8 h-8 rounded-lg bg-[#81938A]/15 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold text-gray-900">To-Do List</h2>
          <p class="text-xs text-gray-500 truncate">{{ taskName }}</p>
        </div>
        <!-- Stats badge -->
        <div v-if="todoStore.todos.length > 0" class="flex-shrink-0 flex items-center gap-1.5">
          <span class="text-xs text-gray-500">{{ doneCount }}/{{ todoStore.todos.length }}</span>
          <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-[#81938A] rounded-full transition-all" :style="{ width: progressPct + '%' }"/>
          </div>
        </div>
        <button class="p-1 hover:bg-gray-100 rounded transition ml-1" @click="$emit('update:modelValue', false)">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ── Body ────────────────────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto">

        <!-- Loading -->
        <div v-if="todoStore.loading" class="flex items-center justify-center py-12">
          <svg class="animate-spin w-6 h-6 text-[#81938A]" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>

        <!-- Empty state -->
        <div v-else-if="todoStore.todos.length === 0 && !showAddForm" class="flex flex-col items-center justify-center py-12 text-center px-6">
          <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p class="text-sm font-medium text-gray-500">No to-dos yet</p>
          <p class="text-xs text-gray-400 mt-1">Add action items for this task</p>
        </div>

        <!-- Todo list -->
        <ul v-else class="divide-y divide-gray-50">
          <li
            v-for="todo in todoStore.todos"
            :key="todo.id"
            class="group px-5 py-3 hover:bg-gray-50/60 transition"
          >
            <div v-if="editingId !== todo.id" class="flex items-start gap-3">
              <!-- Checkbox -->
              <button
                class="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition"
                :class="todo.is_done
                  ? 'bg-[#81938A] border-[#81938A]'
                  : 'border-gray-300 hover:border-[#81938A]'"
                @click="todoStore.toggleDone(todo.id)"
              >
                <svg v-if="todo.is_done" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </button>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900 leading-snug"
                   :class="todo.is_done ? 'line-through text-gray-400' : ''">{{ todo.title }}</p>
                <!-- Meta row -->
                <div class="flex flex-wrap items-center gap-3 mt-1">
                  <!-- Assignee -->
                  <span v-if="todo.assigned_user" class="inline-flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    {{ formatUser(todo.assigned_user) }}
                  </span>
                  <!-- Due date -->
                  <span v-if="todo.due_date" class="inline-flex items-center gap-1 text-xs"
                    :class="isOverdue(todo) ? 'text-red-500' : 'text-gray-500'">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    {{ fmtDate(todo.due_date) }}
                    <span v-if="isOverdue(todo)" class="font-medium">· overdue</span>
                  </span>
                  <!-- Notes indicator -->
                  <span v-if="todo.notes" class="inline-flex items-center gap-1 text-xs text-gray-400" :title="todo.notes">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                    </svg>
                    Note
                  </span>
                  <!-- Link -->
                  <a v-if="todo.link" :href="todo.link" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline max-w-[160px] truncate"
                    :title="todo.link" @click.stop>
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {{ todo.link.replace(/^https?:\/\//, '') }}
                  </a>
                </div>

                <!-- Files / links section -->
                <div v-if="todo.task_todo_files && todo.task_todo_files.length > 0" class="mt-2 space-y-1">
                  <div
                    v-for="f in todo.task_todo_files"
                    :key="f.id"
                    class="flex items-center gap-1.5 group/file"
                  >
                    <span class="text-xs leading-none flex-shrink-0">{{ fileIcon(f.file_type) }}</span>
                    <a :href="f.file_url" target="_blank" rel="noopener"
                      class="text-xs text-blue-600 hover:underline truncate max-w-[200px]" :title="f.file_url">
                      {{ f.file_name }}
                    </a>
                    <span v-if="f.file_type !== 'folder_link'" class="text-xs text-gray-400 flex-shrink-0">{{ fmtSize(f.file_size) }}</span>
                    <span v-else class="text-xs text-gray-400 flex-shrink-0">link</span>
                    <button
                      class="opacity-0 group-hover/file:opacity-100 transition p-0.5 hover:bg-red-50 rounded ml-auto flex-shrink-0"
                      title="Remove"
                      @click.stop="todoStore.deleteFile(f.id, todo.id)"
                    >
                      <svg class="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Folder link inline form -->
                <div v-if="linkingTodoId === todo.id" class="mt-2 space-y-1.5 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <input v-model="linkForm.label" type="text" placeholder="Label (e.g. Design Folder)"
                    class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#81938A]"
                    @keydown.escape="linkingTodoId = null"/>
                  <div class="flex gap-1.5">
                    <input v-model="linkForm.url" type="url" placeholder="https:// or \\server\share…"
                      class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#81938A]"
                      @keydown.enter.prevent="saveFolderLink(todo.id)"
                      @keydown.escape="linkingTodoId = null"/>
                    <button type="button"
                      class="px-2 py-1 text-xs bg-[#81938A] text-white rounded disabled:opacity-40 hover:bg-[#6b7c73] transition"
                      :disabled="!linkForm.url.trim() || todoStore.saving"
                      @click.stop="saveFolderLink(todo.id)">
                      Add
                    </button>
                    <button type="button" class="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition" @click.stop="linkingTodoId = null">✕</button>
                  </div>
                </div>

                <!-- Attach action buttons -->
                <div class="mt-1.5 flex items-center gap-2">
                  <!-- Upload file -->
                  <button
                    class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#81938A] transition"
                    :class="uploadingTodoId === todo.id && todoStore.saving ? 'opacity-50 pointer-events-none' : ''"
                    @click.stop="triggerFileUpload(todo.id)"
                  >
                    <svg v-if="uploadingTodoId === todo.id && todoStore.saving" class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    Upload file
                  </button>
                  <span class="text-gray-200 text-xs">|</span>
                  <!-- Folder / URL link -->
                  <button
                    class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition"
                    @click.stop="openFolderLink(todo.id)"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                    </svg>
                    Folder link
                  </button>
                </div>
              </div>

              <!-- Row actions (hover) -->
              <div class="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                <button class="p-1 hover:bg-gray-100 rounded transition" title="Edit" @click="startEdit(todo)">
                  <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button class="p-1 hover:bg-red-50 rounded transition" title="Delete" @click="deleteTodo(todo.id)">
                  <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- ── Inline edit form ── -->
            <div v-else class="space-y-2">
              <input v-model="editForm.title" type="text" required autofocus placeholder="To-do title…"
                class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]"/>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-gray-500 mb-0.5">Assign to</label>
                  <select v-model="editForm.assigned_to"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                    <option :value="null">— None —</option>
                    <option v-for="m in memberOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-0.5">Due date</label>
                  <input v-model="editForm.due_date" type="date"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]"/>
                </div>
              </div>
              <textarea v-model="editForm.notes" rows="2" placeholder="Notes (optional)…"
                class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-none"/>
              <div class="relative">
                <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <input v-model="editForm.link" type="url" placeholder="Reference link (https://…)"
                  class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]"/>
              </div>
              <div class="flex justify-end gap-2">
                <button type="button" class="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition" @click="cancelEdit">Cancel</button>
                <button type="button"
                  class="px-3 py-1 text-xs bg-[#81938A] hover:bg-[#6b7c73] text-white rounded transition disabled:opacity-50"
                  :disabled="!editForm.title.trim() || todoStore.saving"
                  @click="saveEdit(todo.id)">
                  Save
                </button>
              </div>
            </div>
          </li>
        </ul>

        <!-- ── Add form ────────────────────────────────────────────── -->
        <div v-if="showAddForm" class="px-5 py-3 border-t border-gray-100">
          <div class="space-y-2">
            <input v-model="addForm.title" ref="addTitleRef" type="text" required placeholder="To-do title…"
              class="w-full px-3 py-1.5 text-sm border border-[#81938A] rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]"
              @keydown.enter.prevent="submitAdd"
              @keydown.escape="showAddForm = false"/>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-500 mb-0.5">Assign to</label>
                <select v-model="addForm.assigned_to"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                  <option :value="null">— None —</option>
                  <option v-for="m in memberOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-0.5">Due date</label>
                <input v-model="addForm.due_date" type="date"
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]"/>
              </div>
            </div>
            <textarea v-model="addForm.notes" rows="2" placeholder="Notes (optional)…"
              class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-none"/>
            <div class="relative">
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <input v-model="addForm.link" type="url" placeholder="Reference link (https://…)"
                class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81938A]"/>
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition" @click="showAddForm = false">Cancel</button>
              <button type="button"
                class="px-3 py-1 text-xs bg-[#81938A] hover:bg-[#6b7c73] text-white rounded transition disabled:opacity-50"
                :disabled="!addForm.title.trim() || todoStore.saving"
                @click="submitAdd">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Footer ──────────────────────────────────────────────────── -->
      <div class="px-5 py-3 border-t border-gray-100">
        <button
          class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-[#81938A] border border-dashed border-[#81938A]/40 rounded-lg hover:bg-[#81938A]/5 transition"
          @click="openAddForm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add to-do item
        </button>
      </div>

      <!-- Hidden file input -->
      <input
        ref="fileInputRef"
        type="file"
        multiple
        class="hidden"
        @change="onFilesSelected"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useTaskTodoStore, type TaskTodoFile } from '@/stores/taskTodoStore'
import { useAuthorityStore } from '@/stores/authorityStore'
import { useAuthStore } from '@/stores/authStore'

// ─── Props / Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: boolean
  taskId: string | null
  taskName: string
  projectId: string | null
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

// ─── Stores ───────────────────────────────────────────────────────────────────

const todoStore      = useTaskTodoStore()
const authorityStore = useAuthorityStore()
const authStore      = useAuthStore()

// ─── Member options ───────────────────────────────────────────────────────────

const memberOptions = computed(() =>
  authorityStore.projectMembers
    .filter(m => m.is_active)
    .map(m => ({
      value: m.user_id,
      label: m.first_name ? `${m.first_name} ${m.last_name ?? ''}`.trim() : m.email,
    }))
)

// ─── Load on open ─────────────────────────────────────────────────────────────

watch(() => props.modelValue, async (open) => {
  if (open && props.taskId) {
    await Promise.all([
      todoStore.fetchTodos(props.taskId),
      memberOptions.value.length === 0 ? authorityStore.fetchProjectMembers(props.projectId ?? undefined) : Promise.resolve(),
    ])
  }
  if (!open) {
    showAddForm.value  = false
    editingId.value    = null
    linkingTodoId.value = null
    uploadingTodoId.value = null
  }
})

// ─── Add form ─────────────────────────────────────────────────────────────────

const showAddForm = ref(false)
const addTitleRef = ref<HTMLInputElement | null>(null)
const addForm = ref({ title: '', assigned_to: null as string | null, due_date: '', notes: '', link: '' })

const openAddForm = () => {
  editingId.value   = null
  showAddForm.value = true
  addForm.value     = { title: '', assigned_to: null, due_date: '', notes: '', link: '' }
  nextTick(() => addTitleRef.value?.focus())
}

const submitAdd = async () => {
  if (!addForm.value.title.trim() || !props.taskId || !props.projectId) return
  // Use member list if loaded, otherwise fall back to just the creator
  const memberIds = memberOptions.value.length > 0
    ? memberOptions.value.map(m => m.value)
    : (authStore.userId ? [authStore.userId] : [])
  await todoStore.createTodoAndNotify(
    {
      task_id:     props.taskId,
      project_id:  props.projectId,
      title:       addForm.value.title.trim(),
      assigned_to: addForm.value.assigned_to || null,
      due_date:    addForm.value.due_date     || null,
      notes:       addForm.value.notes.trim() || null,
      link:        addForm.value.link.trim()  || null,
      created_by:  authStore.userId,
    },
    props.taskName,
    memberIds,
    authStore.userId,
  )
  showAddForm.value = false
}

// ─── Edit form ────────────────────────────────────────────────────────────────

const editingId = ref<string | null>(null)
const editForm  = ref({ title: '', assigned_to: null as string | null, due_date: '', notes: '', link: '' })

const startEdit = (todo: { id: string; title: string; assigned_to: string | null; due_date: string | null; notes: string | null; link: string | null }) => {
  showAddForm.value = false
  editingId.value   = todo.id
  editForm.value    = {
    title:       todo.title,
    assigned_to: todo.assigned_to,
    due_date:    todo.due_date ?? '',
    notes:       todo.notes    ?? '',
    link:        todo.link     ?? '',
  }
}

const cancelEdit = () => { editingId.value = null }

const saveEdit = async (id: string) => {
  if (!editForm.value.title.trim()) return
  await todoStore.updateTodo(id, {
    title:       editForm.value.title.trim(),
    assigned_to: editForm.value.assigned_to || null,
    due_date:    editForm.value.due_date     || null,
    notes:       editForm.value.notes.trim() || null,
    link:        editForm.value.link.trim()  || null,
  })
  editingId.value = null
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteTodo = async (id: string) => {
  if (editingId.value === id) editingId.value = null
  await todoStore.deleteTodo(id)
}

// ─── File upload ──────────────────────────────────────────────────────────────

const fileInputRef     = ref<HTMLInputElement | null>(null)
const uploadingTodoId  = ref<string | null>(null)

// ─── Folder / URL link ────────────────────────────────────────────────────────
const linkingTodoId = ref<string | null>(null)
const linkForm = ref({ label: '', url: '' })

const openFolderLink = (todoId: string) => {
  uploadingTodoId.value = null
  linkingTodoId.value = todoId
  linkForm.value = { label: '', url: '' }
}

const saveFolderLink = async (todoId: string) => {
  if (!linkForm.value.url.trim() || !props.projectId) return
  const label = linkForm.value.label.trim() || linkForm.value.url.trim()
  await todoStore.addFolderLink(todoId, props.projectId, label, linkForm.value.url.trim(), authStore.userId)
  linkingTodoId.value = null
}

const triggerFileUpload = (todoId: string) => {
  uploadingTodoId.value = todoId
  fileInputRef.value?.click()
}

const onFilesSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length || !uploadingTodoId.value || !props.projectId) return
  for (const file of files) {
    await todoStore.uploadFile(uploadingTodoId.value, props.projectId, file, authStore.userId)
  }
  uploadingTodoId.value = null
}

const fileIcon = (fileType: string | null) => {
  if (fileType === 'folder_link') return '📁'
  if (!fileType) return '📎'
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType === 'application/pdf') return '📄'
  if (fileType.includes('word')) return '📝'
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
  return '📎'
}

const fmtSize = (bytes: number | null) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const doneCount  = computed(() => todoStore.todos.filter(t => t.is_done).length)
const progressPct = computed(() =>
  todoStore.todos.length ? Math.round(doneCount.value / todoStore.todos.length * 100) : 0
)

const formatUser = (u: { first_name: string | null; last_name: string | null; email: string } | null | undefined) => {
  if (!u) return ''
  return u.first_name ? `${u.first_name} ${u.last_name ?? ''}`.trim() : u.email
}

const fmtDate = (d: string | null) => {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const isOverdue = (todo: { is_done: boolean; due_date: string | null }) => {
  if (todo.is_done || !todo.due_date) return false
  return new Date(todo.due_date + 'T00:00:00') < new Date(new Date().toDateString())
}
</script>
