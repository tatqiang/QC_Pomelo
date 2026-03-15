<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">

    <!-- ─── Page Header ───────────────────────────────────────────── -->
    <div class="flex items-center mb-6 flex-wrap gap-3">
      <div class="flex-1">
        <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
        <p class="text-sm text-gray-600 mt-1">
          {{ users.length }} user(s) · Manage PWA-level roles and status
        </p>
      </div>
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
          placeholder="Search by name or email…"
          class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent w-80"
        />
      </div>
      <select
        v-model="roleFilter"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent bg-white"
      >
        <option value="all">All Roles</option>
        <option v-for="r in ALL_PWA_ROLES" :key="r" :value="r">{{ PWA_ROLE_LABELS[r] }}</option>
      </select>
      <select
        v-model="statusFilter"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent bg-white"
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="invited">Invited</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <!-- ─── Loading ───────────────────────────────────────────────── -->
    <div v-if="loading && users.length === 0" class="text-center py-16">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-moss"></div>
      <div class="mt-4 text-gray-600">Loading users…</div>
    </div>

    <!-- ─── User Table ────────────────────────────────────────────── -->
    <div v-else class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-4 py-3 font-semibold text-gray-700">User</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Department</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-700">PWA Role</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Status</th>
            <th class="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="u in filtered"
            :key="u.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <!-- User info -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-moss/20 text-moss flex items-center justify-center font-bold text-xs">
                  {{ initials(u) }}
                </div>
                <div>
                  <div class="font-medium text-gray-900">{{ u.first_name }} {{ u.last_name }}</div>
                  <div class="text-xs text-gray-500">{{ u.email }}</div>
                </div>
              </div>
            </td>
            <!-- Department -->
            <td class="px-4 py-3 text-gray-600 hidden md:table-cell">
              {{ u.department || '—' }}
            </td>
            <!-- PWA Role -->
            <td class="px-4 py-3">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', PWA_ROLE_COLORS[u.role as PwaRole] || 'bg-gray-100 text-gray-600']">
                {{ PWA_ROLE_LABELS[u.role as PwaRole] || u.role }}
              </span>
            </td>
            <!-- Status -->
            <td class="px-4 py-3 hidden sm:table-cell">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', statusColor(u.status)]">
                {{ u.status }}
              </span>
            </td>
            <!-- Actions -->
            <td class="px-4 py-3 text-right">
              <button
                v-if="canChangeRole(u)"
                @click="openRoleDialog(u)"
                class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Change Role
              </button>
            </td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="5" class="px-4 py-12 text-center text-gray-500">
              No users match your filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ─── Role Change Dialog ────────────────────────────────────── -->
    <div v-if="editingUser" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="editingUser = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-1">Change PWA Role</h3>
        <p class="text-sm text-gray-600 mb-4">
          {{ editingUser.first_name }} {{ editingUser.last_name }}
          <span class="text-gray-400">({{ editingUser.email }})</span>
        </p>

        <div class="space-y-2 mb-6">
          <label
            v-for="r in ALL_PWA_ROLES"
            :key="r"
            class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="selectedRole === r ? 'border-moss bg-moss/5' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              type="radio"
              :value="r"
              v-model="selectedRole"
              class="accent-moss w-4 h-4"
            />
            <div>
              <div class="font-medium text-sm text-gray-900">{{ PWA_ROLE_LABELS[r] }}</div>
              <div class="text-xs text-gray-500">{{ pwaRoleDescription(r) }}</div>
            </div>
          </label>
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="editingUser = null"
            class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="saveRole"
            :disabled="saving"
            class="px-4 py-2 text-sm font-medium text-white bg-moss rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {{ saving ? 'Saving…' : 'Save Role' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
    type PwaRole,
    PWA_ROLE_LABELS,
    PWA_ROLE_COLORS,
    ALL_PWA_ROLES,
} from '@/types/authority'

const authStore = useAuthStore()

// ── State ────────────────────────────────────────────────────────────────────

interface UserRow {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
    status: string
    department: string | null
    job_title: string | null
    user_type: string | null
    [key: string]: unknown
}

const users = ref<UserRow[]>([])
const loading = ref(false)
const search = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')

const editingUser = ref<UserRow | null>(null)
const selectedRole = ref<PwaRole>('member')
const saving = ref(false)

// ── Computed ─────────────────────────────────────────────────────────────────

const filtered = computed(() => {
    return users.value.filter(u => {
        const q = search.value.toLowerCase()
        const matchSearch = !q ||
            (u.first_name ?? '').toLowerCase().includes(q) ||
            (u.last_name ?? '').toLowerCase().includes(q) ||
            (u.email ?? '').toLowerCase().includes(q)
        const matchRole = roleFilter.value === 'all' || u.role === roleFilter.value
        const matchStatus = statusFilter.value === 'all' || u.status === statusFilter.value
        return matchSearch && matchRole && matchStatus
    })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const initials = (u: UserRow) => {
    const f = u.first_name?.[0] ?? ''
    const l = u.last_name?.[0] ?? ''
    return (f + l).toUpperCase() || '?'
}

const statusColor = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-800'
    if (status === 'invited') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-600'
}

const canChangeRole = (u: UserRow) => {
    // Can't change own role, and only system_admin / admin can change roles
    if (u.id === authStore.userId) return false
    return authStore.user?.role === 'system_admin' || authStore.user?.role === 'admin'
}

const pwaRoleDescription = (r: PwaRole) => {
    const map: Record<PwaRole, string> = {
        system_admin: 'Full system control — manage everything',
        admin: 'Manage users & projects, no system config',
        member: 'Normal user, can create/join projects',
        registrant: 'Newly registered, minimal access',
    }
    return map[r]
}

// ── Actions ──────────────────────────────────────────────────────────────────

const fetchUsers = async () => {
    loading.value = true
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        users.value = (data as UserRow[]) ?? []
    } catch (err) {
        console.error('❌ fetchUsers:', err)
    } finally {
        loading.value = false
    }
}

const openRoleDialog = (u: UserRow) => {
    editingUser.value = u
    selectedRole.value = u.role as PwaRole
}

const saveRole = async () => {
    if (!editingUser.value) return
    saving.value = true
    try {
        const { error } = await supabase
            .from('users')
            .update({ role: selectedRole.value })
            .eq('id', editingUser.value.id)

        if (error) throw error

        // Update local state
        const idx = users.value.findIndex(u => u.id === editingUser.value!.id)
        if (idx !== -1) users.value[idx].role = selectedRole.value

        editingUser.value = null
    } catch (err) {
        console.error('❌ saveRole:', err)
    } finally {
        saving.value = false
    }
}

onMounted(fetchUsers)
</script>
