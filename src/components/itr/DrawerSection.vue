<template>
  <div
    class="border-l-[3px] transition-colors"
    :class="{
      'border-l-[#81938A] bg-[#81938A]/5': isCurrent,
      'border-l-transparent': !isCurrent,
      'opacity-50': disabled
    }"
  >
    <div class="flex items-center gap-2 px-4 pt-4 pb-2">
      <!-- Step icon -->
      <svg
        class="w-4.5 h-4.5"
        :class="{
          'text-[#81938A]': isCurrent,
          'text-green-600': isPast && !isCurrent,
          'text-gray-400': !isCurrent && !isPast
        }"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <span class="text-sm font-bold" :class="isCurrent ? 'text-[#81938A]' : 'text-gray-900'">{{ title }}</span>
      <div class="flex-1" />

      <!-- Action time badge -->
      <span v-if="actionAt" class="text-xs text-gray-500">
        {{ fmtDate(actionAt) }}
      </span>

      <!-- Edit toggle -->
      <button
        v-if="canEdit && !disabled"
        type="button"
        class="p-1 rounded transition"
        :class="editing ? 'text-yellow-600 hover:bg-yellow-50' : 'text-[#81938A] hover:bg-[#81938A]/10'"
        :title="editing ? 'Cancel edit' : 'Edit'"
        @click="$emit('toggleEdit')"
      >
        <svg v-if="editing" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>
    </div>
    <div class="px-4 pb-3" :class="{ 'pointer-events-none': disabled }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  isCurrent: boolean
  isPast: boolean
  canEdit: boolean
  actionBy?: string | null
  actionAt?: string | null
  editing: boolean
  disabled?: boolean
}>()

defineEmits<{ toggleEdit: [] }>()

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : ''
</script>
