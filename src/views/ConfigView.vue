<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">

    <!-- ─── Header ─────────────────────────────────────────────────── -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Configuration</h1>
      <p class="text-sm text-gray-600 mt-1">
        Manage projects, lookup tables and reporting settings.
      </p>
    </div>

    <!-- ─── Section: Project ────────────────────────────────────────── -->
    <div class="text-xs font-bold tracking-wider uppercase opacity-45 mb-2 pl-0.5">Project</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      <div
        v-for="item in projectItems"
        :key="item.to"
        class="config-card bg-white border border-gray-200 rounded-xl p-4 cursor-pointer transition-all duration-150 hover:border-moss hover:bg-moss/5"
        @click="router.push(item.to)"
      >
        <div class="flex items-center gap-3">
          <div :class="['w-11 h-11 rounded-lg flex items-center justify-center', item.bgClass]">
            <svg class="w-5 h-5" :class="item.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-gray-900">{{ item.label }}</div>
            <div class="text-xs text-gray-600 leading-tight">{{ item.description }}</div>
          </div>
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- ─── Section: Lookup Tables ──────────────────────────────────── -->
    <div class="text-xs font-bold tracking-wider uppercase opacity-45 mb-2 pl-0.5">Lookup Tables</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      <div
        v-for="item in lookupItems"
        :key="item.to"
        :class="[
          'config-card bg-white border border-gray-200 rounded-xl p-4 transition-all duration-150',
          item.disabled ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-moss hover:bg-moss/5'
        ]"
        @click="!item.disabled && router.push(item.to)"
      >
        <div class="flex items-center gap-3">
          <div :class="['w-11 h-11 rounded-lg flex items-center justify-center', item.bgClass]">
            <svg class="w-5 h-5" :class="item.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
              {{ item.label }}
              <span v-if="item.disabled" class="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">Soon</span>
            </div>
            <div class="text-xs text-gray-600 leading-tight">{{ item.description }}</div>
          </div>
          <svg v-if="!item.disabled" class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- ─── Section: Reports ────────────────────────────────────────── -->
    <div class="text-xs font-bold tracking-wider uppercase opacity-45 mb-2 pl-0.5">Reports & Export</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      <div
        v-for="item in reportItems"
        :key="item.to"
        :class="[
          'config-card bg-white border border-gray-200 rounded-xl p-4 transition-all duration-150',
          item.disabled ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-moss hover:bg-moss/5'
        ]"
        @click="!item.disabled && router.push(item.to)"
      >
        <div class="flex items-center gap-3">
          <div :class="['w-11 h-11 rounded-lg flex items-center justify-center', item.bgClass]">
            <svg class="w-5 h-5" :class="item.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
              {{ item.label }}
              <span v-if="item.disabled" class="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">Soon</span>
            </div>
            <div class="text-xs text-gray-600 leading-tight">{{ item.description }}</div>
          </div>
          <svg v-if="!item.disabled" class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- ─── Section: Administration ─────────────────────────────────── -->
    <div class="text-xs font-bold tracking-wider uppercase opacity-45 mb-2 pl-0.5">Administration</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="item in adminItems"
        :key="item.to"
        :class="[
          'config-card bg-white border border-gray-200 rounded-xl p-4 transition-all duration-150',
          item.disabled ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-moss hover:bg-moss/5'
        ]"
        @click="!item.disabled && router.push(item.to)"
      >
        <div class="flex items-center gap-3">
          <div :class="['w-11 h-11 rounded-lg flex items-center justify-center', item.bgClass]">
            <svg class="w-5 h-5" :class="item.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
              {{ item.label }}
              <span v-if="item.badge" :class="['px-1.5 py-0.5 text-[10px] font-medium rounded', item.badge.class]">{{ item.badge.text }}</span>
            </div>
            <div class="text-xs text-gray-600 leading-tight">{{ item.description }}</div>
          </div>
          <svg v-if="!item.disabled" class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore.user?.role === 'system_admin' || authStore.user?.role === 'admin')

const projectItems = [
  {
    label: 'Projects',
    description: 'Create and switch between projects',
    iconPath: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    bgClass: 'bg-moss/10',
    iconClass: 'text-moss',
    to: '/projects',
    disabled: false,
  },
  {
    label: 'Areas',
    description: 'Define location hierarchy for ITRs',
    iconPath: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    bgClass: 'bg-cyclone/20',
    iconClass: 'text-siberian',
    to: '/areas',
    disabled: false,
  },
]

const lookupItems = [
  {
    label: 'Disciplines',
    description: 'Trade codes used on tasks & ITRs',
    iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    bgClass: 'bg-indigo-50',
    iconClass: 'text-indigo-600',
    to: '/disciplines',
    disabled: false,
  },
  {
    label: 'ITR Types',
    description: 'Inspection, Test, Survey… custom per project',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    bgClass: 'bg-blue-50',
    iconClass: 'text-blue-600',
    to: '/itr-types',
    disabled: false,
  },
  {
    label: 'ITPs',
    description: 'Inspection & Test Plans template library',
    iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    bgClass: 'bg-cyan-50',
    iconClass: 'text-cyan-600',
    to: '/itps',
    disabled: false,
  },
  {
    label: 'Materials',
    description: 'Material register linked to tasks',
    iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    bgClass: 'bg-orange-50',
    iconClass: 'text-orange-600',
    to: '/materials',
    disabled: false,
  },
]

const reportItems = [
  {
    label: 'Master Forms',
    description: 'Manage ITR Cover & Photo Report PDF templates and revisions',
    iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    bgClass: 'bg-violet-50',
    iconClass: 'text-violet-600',
    to: '/master-forms',
    disabled: false,
  },
  {
    label: 'Reports',
    description: 'Export ITR summaries and dashboards',
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    bgClass: 'bg-purple-50',
    iconClass: 'text-purple-600',
    to: '/reports',
    disabled: true,
  },
]

const adminItems = computed(() => [
  {
    label: 'Project Team',
    description: 'Manage members & assign project roles',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    bgClass: 'bg-emerald-50',
    iconClass: 'text-emerald-600',
    to: '/project-team',
    disabled: false,
    badge: null as { text: string; class: string } | null,
  },
  {
    label: 'User Management',
    description: 'Manage all users & PWA-level roles',
    iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    bgClass: 'bg-rose-50',
    iconClass: 'text-rose-600',
    to: '/users',
    disabled: !isAdmin.value,
    badge: !isAdmin.value ? { text: 'Admin Only', class: 'bg-red-100 text-red-600' } : null,
  },
  {
    label: 'Attendance Report',
    description: 'Monthly attendance summary & CSV export',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    bgClass: 'bg-teal-50',
    iconClass: 'text-teal-600',
    to: '/attendance-admin',
    disabled: !isAdmin.value,
    badge: !isAdmin.value ? { text: 'Admin Only', class: 'bg-red-100 text-red-600' } : null,
  },
])
</script>

<style scoped>
/* Styles handled by Tailwind utilities */
</style>
