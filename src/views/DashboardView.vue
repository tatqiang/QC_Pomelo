<template>
  <!-- AppLayout provides navigation shell; this is just the page content -->
  <div class="container mx-auto px-4 md:px-6 py-4 md:py-6">

    <!-- ─── Active project banner ─────────────────────────────────── -->
    <div
      v-if="projectStore.activeProject"
      class="bg-moss/10 border border-moss/30 text-siberian rounded-xl mb-6 px-4 py-3 flex items-center gap-3"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <div>
        <strong>Active Project:</strong> {{ projectStore.activeProject.name }}
        <span v-if="projectStore.activeProject.code" class="text-siberian/70 ml-2">
          ({{ projectStore.activeProject.code }})
        </span>
      </div>
    </div>

    <div
      v-else
      class="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl mb-6 px-4 py-3 flex items-center gap-3"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>No active project selected. Click the project chip in the top bar to select one.</div>
    </div>

    <!-- ─── Welcome header ────────────────────────────────────────── -->
    <div class="mb-6">
      <h1 class="text-3xl md:text-4xl font-bold text-dark-ink">
        Welcome, <span class="text-brand-gradient">{{ firstName }}</span>!
      </h1>
      <p class="text-gray-600 text-base md:text-lg mt-1">
        MEP QC Construction Quality Control System
      </p>
    </div>

    <!-- ─── Stats row ─────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div v-for="stat in stats" :key="stat.label" class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div class="flex items-center gap-3">
          <div 
            class="w-12 h-12 rounded-lg flex items-center justify-center"
            :class="getStatBgClass(stat.color)"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path v-if="stat.icon === 'clipboard'" stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              <path v-else-if="stat.icon === 'check'" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path v-else-if="stat.icon === 'clock'" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path v-else-if="stat.icon === 'folder'" stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ stat.value }}</div>
            <div class="text-xs text-gray-600">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Quick Actions ─────────────────────────────────────────── -->
    <h2 class="text-xl font-semibold mb-4 text-gray-900">Quick Actions</h2>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div
        v-for="action in quickActions"
        :key="action.title"
        class="bg-white rounded-lg shadow-sm p-4 border border-gray-200 transition-all duration-200"
        :class="action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-moss hover:shadow-md hover:bg-moss/5'"
        @click="!action.disabled && action.onClick()"
      >
        <div class="mb-2">
          <svg class="w-8 h-8 text-moss" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path v-if="action.icon === 'folder'" stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            <path v-else-if="action.icon === 'plus'" stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            <path v-else-if="action.icon === 'chart'" stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 16l4-4 4 4 6-6" />
            <path v-else-if="action.icon === 'search'" stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div class="font-semibold text-gray-900 text-sm">{{ action.title }}</div>
        <div class="text-xs text-gray-600">{{ action.desc }}</div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'

const router = useRouter()
const authStore = useAuthStore()
const projectStore = useProjectStore()

const firstName = computed(() => {
  const name = authStore.userDisplayName
  return name ? name.split(' ')[0] : 'there'
})

const stats = computed(() => [
  { label: 'Active ITRs',  value: 0,                                 icon: 'clipboard',  color: 'info'    },
  { label: 'Completed',    value: 0,                                 icon: 'check',      color: 'success' },
  { label: 'Pending',      value: 0,                                 icon: 'clock',      color: 'warning' },
  { label: 'Projects',     value: projectStore.visibleProjects.filter(p => p.status !== 'cancelled').length,
                                                                     icon: 'folder',     color: 'primary' },
])

const getStatBgClass = (color: string) => {
  const classes: Record<string, string> = {
    info: 'bg-siberian/10 text-siberian',
    success: 'bg-moss/20 text-moss',
    warning: 'bg-amber-100 text-amber-700',
    primary: 'bg-cyclone/30 text-siberian',
  }
  return classes[color] || 'bg-gray-100 text-gray-600'
}

const quickActions = [
  { title: 'Projects',    desc: 'Manage projects',   icon: 'folder', disabled: false, onClick: () => router.push('/projects') },
  { title: 'New ITR',     desc: 'Create inspection', icon: 'plus',   disabled: true,  onClick: () => {} },
  { title: 'Gantt Chart', desc: 'Project planning',  icon: 'chart',  disabled: true,  onClick: () => {} },
  { title: 'Search ITRs', desc: 'Find records',      icon: 'search', disabled: true,  onClick: () => {} },
]

onMounted(async () => {
  if (projectStore.projects.length === 0) {
    await projectStore.fetchProjects()
  }
})
</script>

<style scoped>
.text-brand-gradient {
  background: linear-gradient(135deg, #2563EB, #38BDF8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
