<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h3 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Activity Log
      </h3>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition p-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex-1 flex items-center justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#81938A]" />
    </div>

    <!-- Empty -->
    <div v-else-if="store.entries.length === 0" class="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 py-10">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <p class="text-sm">No activity recorded yet</p>
    </div>

    <!-- Log list -->
    <div v-else class="flex-1 overflow-y-auto px-4 py-3 space-y-0">
      <div v-for="(entry, i) in store.entries" :key="entry.id" class="relative flex gap-3">
        <!-- Vertical connector line -->
        <div class="flex flex-col items-center">
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', iconBg(entry.action)]">
            <svg class="w-4 h-4" :class="iconColor(entry.action)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath(entry.action)"/>
            </svg>
          </div>
          <div v-if="i < store.entries.length - 1" class="w-px flex-1 bg-gray-200 my-1 min-h-[16px]" />
        </div>

        <!-- Content -->
        <div class="pb-4 flex-1 min-w-0">
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class="text-xs font-semibold text-gray-800">{{ entry.user_name }}</span>
            <span class="text-xs text-gray-400">{{ formatTime(entry.created_at) }}</span>
          </div>
          <p class="text-xs text-gray-600 mt-0.5 leading-relaxed">{{ entry.detail || actionLabel(entry.action) }}</p>
          <!-- Field-level changes (from 'updated' action) -->
          <div v-if="entry.meta?.changes?.length" class="mt-1.5 space-y-0.5">
            <div v-for="change in entry.meta.changes" :key="change.field"
              class="flex gap-1 items-start rounded bg-blue-50 border border-blue-100 px-2 py-1 text-[11px] leading-snug">
              <span class="font-semibold text-blue-700 whitespace-nowrap">{{ change.label }}:</span>
              <span class="text-gray-400 line-through truncate max-w-[90px]">{{ formatVal(change.old) }}</span>
              <svg class="w-2.5 h-2.5 flex-shrink-0 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
              </svg>
              <span class="text-gray-800 font-medium truncate max-w-[90px]">{{ formatVal(change.new) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useItrActivityStore, type ItrActivityAction } from '@/stores/itrActivityStore'

const props = defineProps<{ itrId: string }>()
defineEmits<{ close: [] }>()

const store = useItrActivityStore()

const load = () => {
  if (props.itrId) store.fetchLog(props.itrId)
}

onMounted(load)
watch(() => props.itrId, load)

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionLabel(action: ItrActivityAction): string {
  const map: Record<ItrActivityAction, string> = {
    created:        'Created ITR',
    updated:        'Updated ITR data',
    status_changed: 'Changed status',
    file_added:     'Added a file',
    file_deleted:   'Deleted a file',
    comment_added:  'Added a comment',
  }
  return map[action] ?? action
}

function iconBg(action: ItrActivityAction): string {
  const map: Record<ItrActivityAction, string> = {
    created:        'bg-green-100',
    updated:        'bg-blue-100',
    status_changed: 'bg-purple-100',
    file_added:     'bg-amber-100',
    file_deleted:   'bg-red-100',
    comment_added:  'bg-teal-100',
  }
  return map[action] ?? 'bg-gray-100'
}

function iconColor(action: ItrActivityAction): string {
  const map: Record<ItrActivityAction, string> = {
    created:        'text-green-600',
    updated:        'text-blue-600',
    status_changed: 'text-purple-600',
    file_added:     'text-amber-600',
    file_deleted:   'text-red-500',
    comment_added:  'text-teal-600',
  }
  return map[action] ?? 'text-gray-500'
}

function iconPath(action: ItrActivityAction): string {
  const map: Record<ItrActivityAction, string> = {
    created:        'M12 4v16m8-8H4',
    updated:        'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    status_changed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    file_added:     'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13',
    file_deleted:   'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    comment_added:  'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  }
  return map[action] ?? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(empty)'
  if (Array.isArray(v)) return v.length === 0 ? '(none)' : v.join(', ')
  const s = String(v)
  // Truncate ISO datetime to date portion for readability
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10)
  return s
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24)   return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7)   return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
