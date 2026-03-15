<template>
  <div>
    <div class="text-[0.68rem] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">{{ label }}</div>
    <div class="text-sm text-gray-900 break-words whitespace-pre-line">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string }>()
</script>
