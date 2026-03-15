<template>
  <div>
    <div class="flex items-center gap-2 mb-1">
      <svg class="w-3.5 h-3.5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
      </svg>
      <span class="text-sm text-gray-700">{{ label }}</span>
    </div>

    <!-- Pending files not yet uploaded -->
    <div v-for="(f, i) in pending" :key="'p-'+i" class="flex items-center gap-2 mb-1 text-sm">
      <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <span class="text-gray-700 truncate flex-1">{{ f.name }}</span>
      <button type="button" class="text-red-500 hover:text-red-700 p-0.5" @click="pending.splice(i,1)">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#81938A]/10 text-[#81938A] rounded-md hover:bg-[#81938A]/20 transition"
        @click="fileInputRef?.click()"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Choose Files
      </button>
      <button
        v-if="pending.length > 0"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#81938A] text-white rounded-md hover:bg-[#6b7a72] transition disabled:opacity-50"
        :disabled="uploading"
        @click="uploadFiles"
      >
        <svg v-if="uploading" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        Upload ({{ pending.length }})
      </button>
    </div>

    <input ref="fileInputRef" type="file" class="hidden" :accept="accept" multiple @change="onPick" />
    <div v-if="uploading" class="mt-1 h-1 bg-gray-200 rounded overflow-hidden">
      <div class="h-full bg-[#81938A] animate-pulse"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useItrStore, ATTACHMENT_CATEGORIES, type AttachmentCategory, type ITR } from '@/stores/itrStore'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{
  label: string
  category: AttachmentCategory
  itr: ITR
  statusId: string | null
}>()

const itrStore  = useItrStore()
const authStore = useAuthStore()
const pending   = ref<File[]>([])
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const accept = computed(() => ATTACHMENT_CATEGORIES[props.category]?.accept ?? '*')

const onPick = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  for (const f of Array.from(input.files)) {
    pending.value.push(f)
  }
  input.value = ''
}

const uploadFiles = async () => {
  if (!pending.value.length) return
  uploading.value = true
  for (const file of pending.value) {
    await itrStore.addAttachment(props.itr, file, authStore.userId, props.category, props.statusId)
  }
  pending.value = []
  uploading.value = false
}

defineExpose({ uploadAll: uploadFiles, hasPending: () => pending.value.length > 0 })
</script>
