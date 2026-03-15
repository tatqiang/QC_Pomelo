<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">

    <!-- ─── No Active Project ─────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <h2 class="text-lg font-semibold text-gray-600 mb-2">No project selected</h2>
      <p class="text-gray-500">Select a project from the top bar to manage its team.</p>
    </div>

    <template v-else>
      <!-- ─── Page Header ─────────────────────────────────────────── -->
      <div class="flex items-center mb-6 flex-wrap gap-3">
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900">Project Team</h1>
          <p class="text-sm text-gray-600 mt-1">
            {{ projectStore.activeProject.name }} ·
            {{ activeMembers.length }} active member(s)
          </p>
        </div>
        <button
          @click="showAddDialog = true"
          class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Member
        </button>
      </div>

      <!-- ─── Loading ─────────────────────────────────────────────── -->
      <div v-if="authorityStore.loading && authorityStore.projectMembers.length === 0" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-moss"></div>
        <div class="mt-4 text-gray-600">Loading team…</div>
      </div>

      <!-- ─── Members Grid ────────────────────────────────────────── -->
      <div v-else-if="activeMembers.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="m in activeMembers"
          :key="m.member_id"
          class="bg-white border border-gray-200 rounded-xl p-4 hover:border-moss/40 transition-colors"
        >
          <!-- Top row: avatar + name -->
          <div class="flex items-start gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-moss/20 text-moss flex items-center justify-center font-bold text-sm flex-shrink-0">
              {{ memberInitials(m) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-gray-900 truncate">
                {{ m.first_name }} {{ m.last_name }}
              </div>
              <div class="text-xs text-gray-500 truncate">{{ m.email }}</div>
              <div v-if="m.department || m.job_title" class="text-xs text-gray-400 mt-0.5 truncate">
                {{ [m.job_title, m.department].filter(Boolean).join(' · ') }}
              </div>
            </div>
            <!-- PWA role badge -->
            <span :class="['inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0', PWA_ROLE_COLORS[m.pwa_role]]">
              {{ PWA_ROLE_LABELS[m.pwa_role] }}
            </span>
          </div>

          <!-- Project roles -->
          <div class="mb-3">
            <div class="text-[10px] font-bold tracking-wider uppercase text-gray-400 mb-1">Project Roles</div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="role in m.project_roles"
                :key="role"
                :class="['inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full', PROJECT_ROLE_COLORS[role]]"
              >
                {{ PROJECT_ROLE_LABELS[role] }}
              </span>
              <span v-if="!m.project_roles || m.project_roles.length === 0" class="text-xs text-gray-400 italic">
                No roles assigned
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              @click="openEditRoles(m)"
              class="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-gray-700 text-center"
            >
              Edit Roles
            </button>
            <button
              @click="confirmRemove(m)"
              class="text-xs px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors font-medium text-red-600"
              title="Remove from project"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Empty ───────────────────────────────────────────────── -->
      <div v-else class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h2 class="text-lg font-semibold text-gray-600 mb-2">No team members yet</h2>
        <p class="text-gray-500 mb-4">Add users to this project to get started.</p>
        <button
          @click="showAddDialog = true"
          class="px-4 py-2 bg-moss text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
        >
          Add First Member
        </button>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Add Member Dialog                                              -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="showAddDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddDialog = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-900 mb-1">Add Team Member</h3>
        <p class="text-sm text-gray-600 mb-4">Select a user and assign project roles.</p>

        <!-- User search -->
        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-700 mb-1">User</label>
          <div class="relative">
            <input
              v-model="addSearch"
              type="text"
              placeholder="Search by name or email…"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent text-sm"
              @focus="showUserDropdown = true"
            />
            <!-- Dropdown -->
            <div
              v-if="showUserDropdown && availableUsers.length > 0"
              class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              <div
                v-for="u in availableUsers"
                :key="u.id"
                class="px-3 py-2 hover:bg-moss/10 cursor-pointer flex items-center gap-2 text-sm"
                @click="selectUser(u)"
              >
                <div class="w-7 h-7 rounded-full bg-moss/20 text-moss flex items-center justify-center font-bold text-[10px]">
                  {{ (u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '') }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-900 truncate">{{ u.first_name }} {{ u.last_name }}</div>
                  <div class="text-xs text-gray-500 truncate">{{ u.email }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="selectedUser" class="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-moss/10 rounded-lg text-sm font-medium text-gray-800">
            {{ selectedUser.first_name }} {{ selectedUser.last_name }}
            <button @click="selectedUser = null" class="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
        </div>

        <!-- Role selection (multi-select checkboxes) -->
        <div class="mb-6">
          <label class="block text-xs font-semibold text-gray-700 mb-2">Project Roles (select one or more)</label>
          <div class="space-y-2">
            <label
              v-for="r in ALL_PROJECT_ROLES"
              :key="r"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="addRoles.includes(r) ? 'border-moss bg-moss/5' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input
                type="checkbox"
                :value="r"
                v-model="addRoles"
                class="accent-moss w-4 h-4 mt-0.5"
              />
              <div>
                <div class="font-medium text-sm text-gray-900">{{ PROJECT_ROLE_LABELS[r] }}</div>
                <div class="text-xs text-gray-500">{{ PROJECT_ROLE_DESCRIPTIONS[r] }}</div>
              </div>
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="showAddDialog = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="addMember"
            :disabled="!selectedUser || addRoles.length === 0 || authorityStore.loading"
            class="px-4 py-2 text-sm font-medium text-white bg-moss rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {{ authorityStore.loading ? 'Adding…' : 'Add Member' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Edit Roles Dialog                                              -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="editingMember" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="editingMember = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-900 mb-1">Edit Project Roles</h3>
        <p class="text-sm text-gray-600 mb-4">
          {{ editingMember.first_name }} {{ editingMember.last_name }}
          <span class="text-gray-400">({{ editingMember.email }})</span>
        </p>

        <div class="space-y-2 mb-6">
          <label
            v-for="r in ALL_PROJECT_ROLES"
            :key="r"
            class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="editRoles.includes(r) ? 'border-moss bg-moss/5' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              type="checkbox"
              :value="r"
              v-model="editRoles"
              class="accent-moss w-4 h-4 mt-0.5"
            />
            <div>
              <div class="font-medium text-sm text-gray-900">{{ PROJECT_ROLE_LABELS[r] }}</div>
              <div class="text-xs text-gray-500">{{ PROJECT_ROLE_DESCRIPTIONS[r] }}</div>
            </div>
          </label>
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="editingMember = null"
            class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="saveRoles"
            :disabled="authorityStore.loading"
            class="px-4 py-2 text-sm font-medium text-white bg-moss rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {{ authorityStore.loading ? 'Saving…' : 'Save Roles' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Remove Confirmation Dialog                                     -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="removingMember" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="removingMember = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-2">Remove Member?</h3>
        <p class="text-sm text-gray-600 mb-6">
          Remove <strong>{{ removingMember.first_name }} {{ removingMember.last_name }}</strong> from this project?
          They will lose all project roles.
        </p>
        <div class="flex justify-end gap-3">
          <button
            @click="removingMember = null"
            class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="doRemove"
            :disabled="authorityStore.loading"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ authorityStore.loading ? 'Removing…' : 'Remove' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthorityStore } from '@/stores/authorityStore'
import type { ProjectRole, ProjectMemberWithRoles } from '@/types/authority'
import {
    PWA_ROLE_LABELS,
    PWA_ROLE_COLORS,
    PROJECT_ROLE_LABELS,
    PROJECT_ROLE_COLORS,
    PROJECT_ROLE_DESCRIPTIONS,
    ALL_PROJECT_ROLES,
} from '@/types/authority'

const projectStore = useProjectStore()
const authorityStore = useAuthorityStore()

// ── State ────────────────────────────────────────────────────────────────────

const showAddDialog = ref(false)
const addSearch = ref('')
const showUserDropdown = ref(false)
const selectedUser = ref<{ id: string; email: string; first_name: string | null; last_name: string | null } | null>(null)
const addRoles = ref<ProjectRole[]>([])

const editingMember = ref<ProjectMemberWithRoles | null>(null)
const editRoles = ref<ProjectRole[]>([])

const removingMember = ref<ProjectMemberWithRoles | null>(null)

const allUsers = ref<{ id: string; email: string; first_name: string | null; last_name: string | null }[]>([])

// ── Computed ─────────────────────────────────────────────────────────────────

const activeMembers = computed(() =>
    authorityStore.projectMembers.filter(m => m.is_active)
)

/** Users not already in the project */
const availableUsers = computed(() => {
    const memberUserIds = new Set(authorityStore.projectMembers.map(m => m.user_id))
    const q = addSearch.value.toLowerCase()
    return allUsers.value.filter(u => {
        if (memberUserIds.has(u.id)) return false
        if (!q) return true
        return (
            (u.first_name ?? '').toLowerCase().includes(q) ||
            (u.last_name ?? '').toLowerCase().includes(q) ||
            (u.email ?? '').toLowerCase().includes(q)
        )
    }).slice(0, 20)
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const memberInitials = (m: ProjectMemberWithRoles) => {
    const f = m.first_name?.[0] ?? ''
    const l = m.last_name?.[0] ?? ''
    return (f + l).toUpperCase() || '?'
}

// ── Actions ──────────────────────────────────────────────────────────────────

const fetchAllUsers = async () => {
    const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('status', 'active')
        .order('first_name')

    allUsers.value = data ?? []
}

const selectUser = (u: typeof allUsers.value[0]) => {
    selectedUser.value = u
    addSearch.value = ''
    showUserDropdown.value = false
}

const addMember = async () => {
    if (!selectedUser.value || addRoles.value.length === 0) return
    const ok = await authorityStore.addProjectMember(selectedUser.value.id, addRoles.value)
    if (ok) {
        showAddDialog.value = false
        selectedUser.value = null
        addRoles.value = []
    }
}

const openEditRoles = (m: ProjectMemberWithRoles) => {
    editingMember.value = m
    editRoles.value = [...(m.project_roles ?? [])]
}

const saveRoles = async () => {
    if (!editingMember.value) return
    const ok = await authorityStore.updateMemberRoles(editingMember.value.member_id, editRoles.value)
    if (ok) editingMember.value = null
}

const confirmRemove = (m: ProjectMemberWithRoles) => {
    removingMember.value = m
}

const doRemove = async () => {
    if (!removingMember.value) return
    const ok = await authorityStore.removeMember(removingMember.value.member_id)
    if (ok) removingMember.value = null
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
    await fetchAllUsers()
    if (projectStore.activeProjectId) {
        await authorityStore.fetchProjectMembers()
    }
})

watch(() => projectStore.activeProjectId, async (newId) => {
    if (newId) await authorityStore.fetchProjectMembers()
})
</script>
