<template>
  <div class="p-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">User Profile</h1>
      <p class="text-sm text-gray-500 mt-1">Your account information</p>
    </div>

    <!-- Profile card -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <!-- Avatar banner -->
      <div class="h-24 bg-gradient-to-r from-moss to-cyclone relative">
        <div class="absolute -bottom-8 left-6">
          <div class="w-16 h-16 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center">
            <span class="text-2xl font-bold text-moss">{{ userInitials }}</span>
          </div>
        </div>
      </div>

      <!-- Info section -->
      <div class="pt-12 px-6 pb-6">
        <h2 class="text-xl font-bold text-gray-800">{{ authStore.userDisplayName }}</h2>
        <p class="text-sm text-moss font-medium capitalize mt-0.5">{{ authStore.user?.role?.replace('_', ' ') ?? 'User' }}</p>

        <div class="mt-6 grid grid-cols-1 gap-4">
          <div class="flex items-center gap-3 py-3 border-b border-gray-100">
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p class="text-xs text-gray-500">Email</p>
              <p class="text-sm font-medium text-gray-800">{{ authStore.user?.email ?? '—' }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3 py-3 border-b border-gray-100">
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <p class="text-xs text-gray-500">Full Name</p>
              <p class="text-sm font-medium text-gray-800">
                {{ [authStore.user?.first_name, authStore.user?.last_name].filter(Boolean).join(' ') || '—' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3 py-3 border-b border-gray-100">
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              <p class="text-xs text-gray-500">Department</p>
              <p class="text-sm font-medium text-gray-800">{{ authStore.user?.department ?? '—' }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3 py-3">
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p class="text-xs text-gray-500">Job Title</p>
              <p class="text-sm font-medium text-gray-800">{{ authStore.user?.job_title ?? '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Role badge -->
    <div class="mt-4 bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
      <div class="w-8 h-8 rounded-full flex items-center justify-center"
           :class="authStore.isSystemAdmin ? 'bg-red-100' : authStore.isAdmin ? 'bg-amber-100' : 'bg-blue-100'">
        <svg class="w-4 h-4" :class="authStore.isSystemAdmin ? 'text-red-500' : authStore.isAdmin ? 'text-amber-500' : 'text-blue-500'"
             fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">System Role</p>
        <p class="text-sm font-semibold capitalize"
           :class="authStore.isSystemAdmin ? 'text-red-600' : authStore.isAdmin ? 'text-amber-600' : 'text-blue-600'">
          {{ authStore.user?.role?.replace(/_/g, ' ') ?? 'User' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const userInitials = computed(() => {
  const name = authStore.userDisplayName
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
})
</script>
