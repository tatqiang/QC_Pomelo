<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/60 flex flex-col z-[200]"
      @click.self="$emit('update:modelValue', false)"
    >
      <!-- Panel -->
      <div class="flex flex-col bg-white w-full h-full">

        <!-- Header bar -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-gray-50">
          <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                 M9 5a2 2 0 002 2h2a2 2 0 002-2
                 M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="font-semibold text-gray-900 truncate flex-1">{{ title }}</span>
          <span v-if="fieldSchema && fieldSchema.length" class="text-xs text-gray-400 flex-shrink-0">
            {{ fieldSchema.length }} field(s)
          </span>
          <button
            class="p-1.5 hover:bg-gray-200 rounded text-gray-500 flex-shrink-0 ml-2"
            title="Close preview"
            @click="$emit('update:modelValue', false)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- iframe -->
        <iframe
          v-if="modelValue"
          ref="iframeRef"
          :srcdoc="htmlContent"
          class="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue:  boolean
  htmlContent: string
  title:       string
  fieldSchema?: string[] | null
}>()

defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const iframeRef = ref<HTMLIFrameElement | null>(null)

// Prevent body scroll while preview is open
watch(() => props.modelValue, open => {
  document.body.style.overflow = open ? 'hidden' : ''
})
</script>
