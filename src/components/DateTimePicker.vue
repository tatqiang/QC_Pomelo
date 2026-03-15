<template>
  <div class="flex gap-2">
    <!-- Date -->
    <div class="relative flex-1">
      <div
        :class="[
          readonly
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-default'
            : 'border-gray-300 bg-white text-gray-900 cursor-pointer hover:border-[#81938A]',
          'rounded border px-3 py-1.5 text-sm select-none flex items-center gap-1.5'
        ]"
        @click="!readonly && dateInputRef?.showPicker()"
      >
        <svg class="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span :class="dateVal ? '' : 'text-gray-400'">{{ dateDisplay }}</span>
      </div>
      <input
        v-if="!readonly"
        ref="dateInputRef"
        type="date"
        :value="dateVal"
        @change="onDate(($event.target as HTMLInputElement).value)"
        class="sr-only"
      />
    </div>

    <!-- Time trigger + panel -->
    <div v-if="!readonly" class="relative" ref="timeWrapRef">
      <!-- Time input row -->
      <div
        :class="[
          !dateVal ? 'opacity-40' : '',
          panelOpen ? 'border-[#81938A] ring-1 ring-[#81938A]' : 'border-gray-300',
          'w-28 flex items-center rounded border bg-white overflow-hidden'
        ]"
      >
        <input
          type="text"
          v-model="timeRaw"
          :disabled="!dateVal"
          placeholder="HH:MM"
          maxlength="5"
          @focus="onTimeFocus"
          @blur="onTimeBlur"
          @keydown.enter.prevent="onTimeBlur"
          class="flex-1 min-w-0 px-2 py-1.5 text-sm text-gray-900 outline-none bg-transparent"
          style="width:0"
        />
        <button
          type="button"
          :disabled="!dateVal"
          tabindex="-1"
          @mousedown.prevent="togglePanel"
          class="px-1.5 py-1.5 text-gray-400 hover:text-[#81938A] shrink-0 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/>
          </svg>
        </button>
      </div>

      <!-- Dropdown panel -->
      <div
        v-if="panelOpen"
        class="absolute right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg flex overflow-hidden"
        style="min-width: 7rem"
      >
        <!-- Hours column -->
        <div class="flex flex-col w-14 border-r border-gray-100">
          <div class="text-[10px] font-semibold text-center text-gray-400 uppercase tracking-wider py-1.5 border-b border-gray-100">HH</div>
          <div ref="hourListRef" class="overflow-y-auto" style="height:168px">
            <button
              v-for="h in hours"
              :key="h"
              type="button"
              :ref="(el) => { if (selectedHour === h) hourItemRef = el as HTMLElement }"
              @mousedown.prevent
              @click="selectHour(h)"
              :class="[
                selectedHour === h
                  ? 'bg-[#81938A] text-white font-semibold'
                  : 'text-gray-700 hover:bg-[#81938A]/10',
                'w-full text-center py-1.5 text-sm transition-colors'
              ]"
            >{{ pad2(h) }}</button>
          </div>
        </div>
        <!-- Minutes column -->
        <div class="flex flex-col w-14">
          <div class="text-[10px] font-semibold text-center text-gray-400 uppercase tracking-wider py-1.5 border-b border-gray-100">MM</div>
          <div ref="minListRef" class="overflow-y-auto" style="height:168px">
            <button
              v-for="m in minutes"
              :key="m"
              type="button"
              :ref="(el) => { if (selectedMin === m) minItemRef = el as HTMLElement }"
              @mousedown.prevent
              @click="selectMin(m)"
              :class="[
                selectedMin === m
                  ? 'bg-[#81938A] text-white font-semibold'
                  : 'text-gray-700 hover:bg-[#81938A]/10',
                'w-full text-center py-1.5 text-sm transition-colors'
              ]"
            >{{ pad2(m) }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Readonly display -->
    <div
      v-else
      class="w-28 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400"
    >{{ timeVal || '--:--' }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
  inputClass?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const dateInputRef = ref<HTMLInputElement | null>(null)
const timeWrapRef  = ref<HTMLElement | null>(null)
const hourListRef  = ref<HTMLElement | null>(null)
const minListRef   = ref<HTMLElement | null>(null)
const hourItemRef  = ref<HTMLElement | null>(null)
const minItemRef   = ref<HTMLElement | null>(null)
const panelOpen    = ref(false)

const dateVal = computed(() => props.modelValue ? (props.modelValue.split('T')[0] ?? '') : '')
const timeVal = computed(() => props.modelValue ? (props.modelValue.split('T')[1] ?? '') : '')

// ── Direct time typing ─────────────────────────────────────────────────────
const timeRaw = ref(timeVal.value)
watch(timeVal, val => { timeRaw.value = val })

function parseTimeInput(str: string): { h: number; m: number } | null {
  if (!str) return null
  const s = str.trim()
  // HH:MM or H:MM
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1]), m = parseInt(colonMatch[2])
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { h, m }
  }
  // Pure digits: 3 = H+MM, 4 = HH+MM, 1–2 = hours only
  const digits = s.replace(/\D/g, '')
  if (digits.length === 3) {
    const h = parseInt(digits[0]), m = parseInt(digits.slice(1))
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { h, m }
  }
  if (digits.length === 4) {
    const h = parseInt(digits.slice(0, 2)), m = parseInt(digits.slice(2))
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { h, m }
  }
  if (digits.length >= 1 && digits.length <= 2) {
    const h = parseInt(digits)
    if (h >= 0 && h <= 23) return { h, m: 0 }
  }
  return null
}

function onTimeFocus(e: FocusEvent) {
  (e.target as HTMLInputElement).select()
}

function onTimeBlur() {
  const parsed = parseTimeInput(timeRaw.value)
  if (parsed) {
    timeRaw.value = pad2(parsed.h) + ':' + pad2(parsed.m)
    emit('update:modelValue', combine(dateVal.value, parsed.h, parsed.m))
  } else {
    timeRaw.value = timeVal.value
  }
}

const selectedHour = computed(() => timeVal.value ? parseInt(timeVal.value.split(':')[0]) : -1)
const selectedMin  = computed(() => timeVal.value ? parseInt(timeVal.value.split(':')[1]) : -1)

const hours   = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 }, (_, i) => i)

const dateDisplay = computed(() => {
  if (!dateVal.value) return 'dd mmm yyyy'
  const d = new Date(dateVal.value + 'T00:00:00')
  return isNaN(d.getTime()) ? 'dd mmm yyyy'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
})

function pad2(n: number) { return String(n).padStart(2, '0') }

function combine(d: string, h: number, m: number) {
  if (!d) return ''
  return `${d}T${pad2(h)}:${pad2(m)}`
}

function onDate(newDate: string) {
  const h = selectedHour.value >= 0 ? selectedHour.value : 0
  const m = selectedMin.value  >= 0 ? selectedMin.value  : 0
  emit('update:modelValue', newDate ? combine(newDate, h, m) : '')
}

function selectHour(h: number) {
  const m = selectedMin.value >= 0 ? selectedMin.value : 0
  const val = combine(dateVal.value, h, m)
  timeRaw.value = pad2(h) + ':' + pad2(m)
  emit('update:modelValue', val)
}

function selectMin(m: number) {
  const h = selectedHour.value >= 0 ? selectedHour.value : 0
  const val = combine(dateVal.value, h, m)
  timeRaw.value = pad2(h) + ':' + pad2(m)
  emit('update:modelValue', val)
  panelOpen.value = false
}

async function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    await nextTick()
    scrollToSelected()
  }
}

function scrollToSelected() {
  if (hourItemRef.value && hourListRef.value) {
    hourListRef.value.scrollTop = hourItemRef.value.offsetTop - 56
  }
  if (minItemRef.value && minListRef.value) {
    minListRef.value.scrollTop = minItemRef.value.offsetTop - 56
  }
}

// Close on outside click
function onDocClick(e: MouseEvent) {
  if (timeWrapRef.value && !timeWrapRef.value.contains(e.target as Node)) {
    panelOpen.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>
