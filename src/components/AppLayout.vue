<template>
  <div class="h-screen w-full bg-glacial flex overflow-hidden">

    <!-- ─── Desktop: Compact Icon+Label Sidebar ──────────────────── -->
    <aside
      v-if="showSidebar"
      class="w-[76px] bg-siberian border-r border-moss/20 flex flex-col"
    >
      <!-- Logo / Brand -->
      <div class="flex flex-col items-center justify-center py-4 border-b border-moss/20">
        <img src="/QC_LOGO_light.svg" alt="QC Logo" class="w-10 h-10" />
        <div class="brand-name text-brand-gradient mt-1">QC System</div>
      </div>

      <!-- Nav items: icon above, label below -->
      <div class="flex-1 flex flex-col items-center py-3 gap-1">
        <div
          v-for="item in navItems"
          :key="item.to"
          class="nav-item flex flex-col items-center justify-center"
          :class="{
            'nav-item--active':   isActive(item.to),
            'nav-item--disabled': item.disabled,
          }"
          @click="!item.disabled && router.push(item.to)"
          :title="item.disabled ? item.label + ' (coming soon)' : item.label"
        >
          <svg 
            :class="isActive(item.to) ? 'text-white' : (item.disabled ? 'text-moss/50' : 'text-cyclone')" 
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path v-if="item.icon === 'dashboard'" stroke-linecap="round" stroke-linejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            <path v-else-if="item.icon === 'gantt'" stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 16l4-4 4 4 6-6" />
            <path v-else-if="item.icon === 'todos'" stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            <path v-else-if="item.icon === 'itrs'" stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            <path v-else-if="item.icon === 'config'" stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="nav-label" :class="isActive(item.to) ? 'text-white' : (item.disabled ? 'text-moss/50' : 'text-glacial')">
            {{ item.label }}
          </span>
          <div v-if="item.disabled" class="inline-flex items-center px-1 py-0.5 rounded text-[0.45rem] font-medium bg-moss/30 text-cyclone soon-chip">Soon</div>
        </div>
      </div>

      <!-- Bottom: user avatar only (menu is in the top nav bar) -->
      <div class="border-t border-moss/20 py-3 flex flex-col items-center">
        <div class="bg-cyclone text-siberian rounded-full w-8 h-8 flex items-center justify-center" :title="authStore.userDisplayName">
          <span class="text-xs font-bold">{{ userInitials }}</span>
        </div>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 min-w-0 flex flex-col min-h-0">
      <!-- ─── App Bar ───────────────────────────────────────────────── -->
      <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shadow-sm">

        <!-- Mobile: brand logo -->
        <div v-if="showBottomNav" class="flex items-center">
          <img src="/QC_LOGO_dark.svg" alt="QC Logo" class="w-6 h-6" />
        </div>

        <!-- Active project chip -->
        <div 
          class="inline-flex items-center px-3 py-1.5 gap-2 cursor-pointer max-w-[220px] rounded text-sm font-medium border"
          :class="projectStore.activeProject ? 'bg-moss/10 text-siberian border-moss/30' : 'bg-gray-100 text-gray-600 border-gray-300'"
          @click="selectorOpen = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span class="truncate text-sm">
            {{ projectStore.activeProject?.name ?? 'No Project' }}
          </span>
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </div>

        <div class="flex-1"></div>

        <!-- Notification bell -->
        <NotificationBell />

        <!-- User dropdown -->
        <div class="relative" ref="userMenuRef">
          <button
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer select-none"
            @click.stop="userMenuOpen = !userMenuOpen"
          >
            <div class="bg-moss text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold">{{ userInitials }}</span>
            </div>
            <span v-if="showSidebar" class="text-sm max-w-[140px] truncate">{{ authStore.userDisplayName }}</span>
            <svg class="w-3 h-3 flex-shrink-0 transition-transform duration-200" :class="userMenuOpen ? 'rotate-180' : ''" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Dropdown panel -->
          <transition
            enter-active-class="transition transform duration-100 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition transform duration-75 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="userMenuOpen" class="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 origin-top-right">
              <!-- User info header -->
              <div class="px-4 py-2.5 border-b border-gray-100">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ authStore.userDisplayName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
              </div>
              <!-- User Profile -->
              <button class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" @click="goToProfile">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                User Profile
              </button>
              <!-- Time Attendance -->
              <button class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" @click="goToAttendance">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time Attendance
              </button>
              <div class="h-px bg-gray-100 my-1"></div>
              <!-- Logout -->
              <button class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors" @click="handleSignOut">
                <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
              <!-- Version -->
              <div class="px-4 py-2 text-center text-xs text-gray-400">
                v{{ appVersion }}
              </div>
            </div>
          </transition>
        </div>
      </header>

      <!-- ─── Main content slot ─────────────────────────────────────── -->
      <main class="flex-1 overflow-y-auto bg-glacial" :class="showBottomNav ? 'pb-16' : ''">
        <router-view />
      </main>

      <!-- ─── Mobile: Bottom Navigation ────────────────────────────── -->
      <nav
        v-if="showBottomNav"
        class="fixed bottom-0 left-0 right-0 z-50 flex bg-siberian border-t border-moss/20 shadow-lg"
      >
        <button
          v-for="item in mobileNavItems"
          :key="item.to"
          :class="isActive(item.to) ? 'text-white bg-moss/20' : 'text-cyclone'"
          :disabled="item.disabled"
          @click="!item.disabled && router.push(item.to)"
          class="flex-1 flex flex-col items-center justify-center py-2 gap-1"
        >
          <svg 
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path v-if="item.icon === 'dashboard'" stroke-linecap="round" stroke-linejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            <path v-else-if="item.icon === 'gantt'" stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 16l4-4 4 4 6-6" />
            <path v-else-if="item.icon === 'todos'" stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            <path v-else-if="item.icon === 'itrs'" stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            <path v-else-if="item.icon === 'config'" stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="block text-xs">{{ item.label }}</span>
        </button>
      </nav>
    </div>

    <!-- ─── Project Selector Dialog ──────────────────────────────── -->
    <ProjectSelectorDialog v-model="selectorOpen" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import ProjectSelectorDialog from '@/components/ProjectSelectorDialog.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import pkg from '../../package.json'
const appVersion = pkg.version

const router       = useRouter()
const route        = useRoute()
const authStore    = useAuthStore()
const projectStore = useProjectStore()

// ── Responsive detection ─────────────────────────────────────────────────────
const isMobile = ref(
  typeof window !== 'undefined' ? window.innerWidth < 768 : false
)

const isPortrait = ref(
  typeof window !== 'undefined'
    ? window.innerHeight >= window.innerWidth
    : true
)

const updateScreen = () => {
  isMobile.value = window.innerWidth < 768
  isPortrait.value = window.innerHeight >= window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateScreen)
  document.addEventListener('click', closeUserMenu)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateScreen)
  document.removeEventListener('click', closeUserMenu)
})

// Sidebar: always on desktop, or on mobile when LANDSCAPE (wide, room on left)
const showSidebar   = computed(() => !isMobile.value || !isPortrait.value)
// Bottom nav: only on mobile PORTRAIT (tall, conserve vertical space)
const showBottomNav = computed(() => isMobile.value && isPortrait.value)

const selectorOpen = ref(false)

// ── User dropdown ─────────────────────────────────────────────────────────────
const userMenuOpen = ref(false)
const userMenuRef: Ref<HTMLElement | null> = ref(null)

const closeUserMenu = (e: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

const userInitials = computed(() => {
  const name = authStore.userDisplayName
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
})

// ── Nav items ─────────────────────────────────────────────────────────────────

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', to: '/dashboard', disabled: false },
  { label: 'Gantt',     icon: 'gantt',     to: '/gantt',     disabled: false },
  { label: 'ITRs',      icon: 'itrs',      to: '/itrs',      disabled: false },
  { label: 'To-Do',     icon: 'todos',     to: '/todos',     disabled: false },
  { label: 'Config',    icon: 'config',    to: '/config',    disabled: false },
]

// mobile bottom nav mirrors the same 4 items
const mobileNavItems = navItems

// Sub-paths that belong to /config
const configSubPaths = ['/projects', '/areas', '/disciplines', '/itr-types', '/itps', '/materials', '/master-forms', '/reports', '/users', '/project-team', '/attendance-admin']

// track active bottom-nav tab — map config sub-paths back to /config
const resolveNavPath = (path: string) =>
  configSubPaths.some(p => path.startsWith(p)) ? '/config' : path

const bottomNavValue = ref(resolveNavPath(route.path))
watch(() => route.path, p => { bottomNavValue.value = resolveNavPath(p) })

const isActive = (to: string) => {
  if (to === '/config') return route.path === '/config' || configSubPaths.some(p => route.path.startsWith(p))
  return route.path === to || route.path.startsWith(to + '/')
}

// ── Actions ───────────────────────────────────────────────────────────────────

const goToProfile = () => {
  userMenuOpen.value = false
  router.push('/profile')
}

const goToAttendance = () => {
  userMenuOpen.value = false
  router.push('/attendance')
}

const handleSignOut = async () => {
  userMenuOpen.value = false
  try {
    await authStore.signOut()
    router.push('/login')
  } catch (err) {
    console.error('Sign out error:', err)
  }
}
</script>

<style scoped>
/* Updated to use CSS custom properties instead of @apply */
/* ── Brand block ─── */
.brand-name {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1;
}

/* ── Nav item tile ─── */
.nav-item {
  width: 64px;
  min-height: 54px;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease;
  padding: 6px 4px 4px;
}
.nav-item:hover:not(.nav-item--disabled) {
  background-color: rgba(129, 147, 138, 0.2); /* moss with opacity */
}
.nav-item--active {
  background-color: rgba(129, 147, 138, 0.3) !important; /* moss with opacity */
}
.nav-item--disabled {
  cursor: default;
  opacity: 0.45;
}

.nav-label {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  margin-top: 3px;
  line-height: 1.1;
  text-transform: uppercase;
}
.soon-chip {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 0.45rem !important;
}
</style>
