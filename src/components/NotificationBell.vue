<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'

const notifStore = useNotificationStore()
const router     = useRouter()

const open = ref(false)
const bellRef = ref<HTMLElement | null>(null)

onMounted(() => {
  notifStore.fetchNotifications()
  notifStore.subscribe()
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  notifStore.unsubscribe()
  document.removeEventListener('click', onClickOutside)
})

const onClickOutside = (e: MouseEvent) => {
  if (bellRef.value && !bellRef.value.contains(e.target as Node)) open.value = false
}

const toggle = () => { open.value = !open.value }

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const handleClick = async (notif: typeof notifStore.items[0]) => {
  if (!notif.is_read) await notifStore.markRead(notif.id)
  if (notif.link) { open.value = false; router.push(notif.link) }
}
</script>

<template>
  <div class="relative" ref="bellRef">
    <!-- Bell button -->
    <button
      class="relative p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-gray-800"
      title="Notifications"
      @click.stop="toggle"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <!-- Badge -->
      <span
        v-if="notifStore.unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[0.6rem] font-bold flex items-center justify-center leading-none"
      >
        {{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 origin-top-right flex flex-col max-h-[420px]"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span class="text-sm font-semibold text-gray-800">Notifications</span>
          <button
            v-if="notifStore.unreadCount > 0"
            class="text-xs text-moss hover:underline"
            @click="notifStore.markAllRead()"
          >
            Mark all read
          </button>
        </div>

        <!-- List -->
        <div class="overflow-y-auto flex-1">
          <div v-if="notifStore.loading" class="flex justify-center py-8">
            <svg class="animate-spin w-5 h-5 text-moss" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>

          <div v-else-if="notifStore.items.length === 0"
            class="py-10 text-center text-sm text-gray-400">
            No notifications yet
          </div>

          <button
            v-else
            v-for="n in notifStore.items"
            :key="n.id"
            class="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
            :class="n.is_read ? 'opacity-60' : ''"
            @click="handleClick(n)"
          >
            <!-- Dot -->
            <span class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
              :class="n.is_read ? 'bg-gray-200' : 'bg-moss'"/>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-800 leading-snug">{{ n.title }}</p>
              <p v-if="n.body" class="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{{ n.body }}</p>
              <p class="text-[0.65rem] text-gray-400 mt-1">{{ timeAgo(n.created_at) }}</p>
            </div>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
