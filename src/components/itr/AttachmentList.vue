<template>
  <div>
    <div class="flex items-center gap-1.5 mb-1">
      <!-- Icon based on type -->
      <svg class="w-3.5 h-3.5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
      </svg>
      <span class="text-sm font-medium text-gray-700">{{ label }} ({{ attachments.length }})</span>
    </div>
    <div v-if="attachments.length === 0" class="text-xs text-gray-500 py-1">
      No files attached.
    </div>
    <div v-for="att in attachments" :key="att.id" class="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
      <!-- File type icon -->
      <svg v-if="isImage(att.file_type)" class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <svg v-else-if="isPdf(att.file_type)" class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <svg v-else class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <div class="flex-1 min-w-0">
        <a :href="att.file_url" target="_blank" rel="noopener" class="text-sm text-[#81938A] hover:underline truncate block">
          {{ att.file_name }}
        </a>
        <span class="text-xs text-gray-500">
          {{ formatFileSize(att.file_size) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ItrAttachment } from '@/stores/itrStore'

defineProps<{
  attachments: ItrAttachment[]
  label: string
  icon?: string
}>()

const isImage = (mime: string | null) => mime?.startsWith('image/')
const isPdf = (mime: string | null) => mime === 'application/pdf'

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>
