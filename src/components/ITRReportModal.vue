<template>
  <!-- Fullscreen overlay -->
  <div class="fixed inset-0 z-[70] flex flex-col bg-gray-100" @keydown.left.prevent="prev" @keydown.right.prevent="next" tabindex="0">

    <!-- ── Top bar ─────────────────────────────────────────────── -->
    <div class="flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-2.5 shadow-sm shrink-0">
      <!-- Back to builder -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        @click="$emit('back')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      <div class="h-5 w-px bg-gray-300"/>

      <!-- Title -->
      <div class="flex-1 min-w-0">
        <span class="text-sm font-semibold text-gray-800 truncate">{{ itrTitle }}</span>
        <span class="ml-2 text-xs text-gray-400">{{ pages.length }} page{{ pages.length !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Page navigation (desktop) -->
      <div class="hidden sm:flex items-center gap-1.5">
        <button
          :disabled="currentPage === 0"
          class="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          @click="prev"
        >‹ Prev</button>
        <span class="text-sm text-gray-500 px-1 tabular-nums">{{ currentPage + 1 }} / {{ pages.length }}</span>
        <button
          :disabled="currentPage === pages.length - 1"
          class="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          @click="next"
        >Next ›</button>
      </div>

      <div class="hidden sm:block h-5 w-px bg-gray-300"/>

      <!-- Auto-save indicator (shown briefly after Lock auto-save) -->
      <span
        v-if="savedIndicator"
        class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-green-100 text-green-700 border border-green-200"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        Saved
      </span>

      <!-- Print — opens page selector, handles mixed portrait/landscape correctly -->
      <button
        type="button"
        :disabled="exporting"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition"
        :class="exporting
          ? 'bg-emerald-400 text-white cursor-wait'
          : 'bg-emerald-600 text-white hover:bg-emerald-700'"
        title="Render selected pages to PDF and download — no print dialogs"
        @click="openPrintSelector"
      >
        <template v-if="exporting">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          {{ exportProgress > 0 ? Math.round(exportProgress * 100) + '%' : 'Exporting…' }}
        </template>
        <template v-else>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Print
        </template>
      </button>

    </div>

    <!-- ── Body: sidebar + viewer ─────────────────────────────── -->
    <div class="flex flex-1 min-h-0 overflow-hidden">

      <!-- Left sidebar ─ page list -->
      <div class="w-44 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col gap-1 py-2 px-2">
        <button
          v-for="(page, idx) in pages"
          :key="idx"
          type="button"
          class="w-full text-left rounded-lg px-2.5 py-2 transition text-xs leading-snug"
          :class="idx === currentPage
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 border border-transparent'"
          @click="currentPage = idx"
        >
          <span class="block text-[10px] font-mono text-gray-400 mb-0.5">{{ idx + 1 }}</span>
          {{ page.title }}
        </button>
      </div>

      <!-- Main viewer -->
      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">

        <!-- Page title bar -->
        <div class="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex items-center gap-3 shrink-0">
          <span class="text-xs font-mono text-gray-400">Page {{ currentPage + 1 }}</span>
          <span class="text-sm font-medium text-gray-700">{{ pages[currentPage]?.title }}</span>
          <div class="flex-1"/>
          <!-- Quick nav arrows (always visible) -->
          <button
            :disabled="currentPage === 0"
            class="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"
            title="Previous page"
            @click="prev"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <button
            :disabled="currentPage === pages.length - 1"
            class="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"
            title="Next page"
            @click="next"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <!-- iframe viewer — srcdoc isolates styles per page -->
        <div class="flex-1 overflow-hidden">
          <iframe
            ref="frameEl"
            :srcdoc="pages[currentPage]?.html ?? ''"
            class="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-modals"
            title="Report page"
            @load="onFrameLoad"
          />
        </div>

      </div>
    </div>

    <!-- ── Print page selector modal ──────────────────────────── -->
    <div
      v-if="showPrintSelector"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50"
      @click.self="showPrintSelector = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-80 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span class="text-sm font-semibold text-gray-800">Select Pages to Print</span>
          <button class="text-gray-400 hover:text-gray-600" @click="showPrintSelector = false">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="flex gap-2 px-4 py-2 border-b border-gray-100 items-center">
          <button class="text-xs text-emerald-600 hover:underline" @click="printSelectAll">All</button>
          <span class="text-xs text-gray-300">|</span>
          <button class="text-xs text-emerald-600 hover:underline" @click="printSelectNone">None</button>
          <span class="text-xs text-gray-400 ml-auto">{{ printPageIdxs.length }} / {{ pages.length }} selected</span>
        </div>
        <div class="overflow-y-auto flex-1">
          <label
            v-for="(page, idx) in pages"
            :key="idx"
            class="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
          >
            <input
              type="checkbox"
              :checked="printPageIdxs.includes(idx)"
              class="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
              @change="togglePrintSel(idx)"
            />
            <span class="text-xs font-mono text-gray-400 w-5 shrink-0">{{ idx + 1 }}</span>
            <span class="text-sm text-gray-700 leading-tight truncate">{{ page.title }}</span>
            <span v-if="page.pdfSourceUrl" class="text-xs text-gray-400 ml-auto shrink-0">PDF↑</span>
            <span v-else-if="(page.widthMm ?? 210) > (page.heightMm ?? 297)" class="text-xs text-blue-400 ml-auto shrink-0">⟺ L</span>
            <span v-else class="text-xs text-gray-300 ml-auto shrink-0">⟷ P</span>
          </label>
        </div>
        <div class="px-4 py-2 bg-amber-50 text-xs text-amber-700 border-t border-amber-100 leading-relaxed">
          All selected pages merged in order — HTML forms rendered via canvas, PDF pages copied at vector quality. Downloads as one PDF.
        </div>
        <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button class="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200" @click="showPrintSelector = false">Cancel</button>
          <button
            :disabled="printPageIdxs.length === 0"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded font-medium transition"
            :class="printPageIdxs.length === 0 ? 'bg-emerald-300 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'"
            @click="doPrintSelected"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print {{ printPageIdxs.length }}p
          </button>
        </div>
      </div>
    </div>

    <!-- ── Mobile bottom nav ──────────────────────────────────── -->
    <div class="sm:hidden flex items-center justify-between bg-white border-t border-gray-200 px-4 py-2 shrink-0">
      <button :disabled="currentPage === 0" class="px-4 py-2 text-sm rounded bg-gray-100 text-gray-700 disabled:opacity-40" @click="prev">‹ Prev</button>
      <span class="text-sm text-gray-500 tabular-nums">{{ currentPage + 1 }} / {{ pages.length }}</span>
      <button :disabled="currentPage === pages.length - 1" class="px-4 py-2 text-sm rounded bg-gray-100 text-gray-700 disabled:opacity-40" @click="next">Next ›</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { exportToPdfCanvas } from '@/utils/pdfExport'

export interface ReportPage {
  title: string
  html: string
  /** Page width in mm — derived from the PDF's natural size. Defaults to 210 (A4) if absent. */
  widthMm?: number
  /** Page height in mm — derived from the PDF's natural size. Defaults to 297 (A4) if absent. */
  heightMm?: number
  /**
   * For pdf_page items: source PDF URL + 1-based page number.
   * Used by exportToPdf to copy the page directly via pdf-lib (vector quality).
   */
  pdfSourceUrl?: string
  pdfSourcePage?: number
  /** For html_form pages: the DB form_data key (e.g. 'itr_cover', 'photo_report', checklist id). */
  formCode?: string
}

const props = defineProps<{
  pages: ReportPage[]
  itrTitle: string
}>()

const emit = defineEmits<{
  close: []
  back: []  // return to Build Report picker
  /** Fired when the user saves edits in an HTML form page. Parent should persist to DB. */
  save: [formCode: string, data: Record<string, unknown>]
}>()

const currentPage      = ref(0)
const frameEl          = ref<HTMLIFrameElement | null>(null)
const exporting        = ref(false)
/** Cache of latest FORM_LOCKED payloads keyed by formCode — used to re-inject data when navigating back to a page */
const formDataCache  = ref<Record<string, Record<string, unknown>>>({})
const exportProgress = ref(0)  // 0–1
const savedIndicator = ref(false)
let savedIndicatorTimer: ReturnType<typeof setTimeout> | null = null

// Reset to first page whenever pages change; also clear stale formDataCache
// so re-injection doesn't overwrite freshly seeded field values (e.g. desc-1
// typed in the Vue picker would be wiped by a cached empty value).
watch(() => props.pages, () => {
  currentPage.value = 0
  formDataCache.value = {}
})

/** Listen for FORM_LOCKED from the iframe — auto-saves all data (fields + signatures) */
function handleFormMessage(e: MessageEvent) {
  if (!e.data || e.data.type !== 'FORM_LOCKED') return
  const formCode = e.data.formCode ?? props.pages[currentPage.value]?.formCode
  if (!formCode || !e.data.payload) return
  // Cache latest payload so navigating away and back re-injects the updated data
  formDataCache.value[formCode] = e.data.payload as Record<string, unknown>
  emit('save', formCode, e.data.payload as Record<string, unknown>)
  // Show brief saved indicator
  savedIndicator.value = true
  if (savedIndicatorTimer) clearTimeout(savedIndicatorTimer)
  savedIndicatorTimer = setTimeout(() => { savedIndicator.value = false }, 2500)
}

/** Re-inject the latest cached payload after the iframe reloads (navigating back to a previously-saved page) */
function onFrameLoad() {
  const page = props.pages[currentPage.value]
  if (!page?.formCode) return
  const cached = formDataCache.value[page.formCode]
  if (!cached) return
  frameEl.value?.contentWindow?.postMessage({ type: 'INJECT_FIELDS', payload: cached }, '*')
}

onMounted(() => window.addEventListener('message', handleFormMessage))
onUnmounted(() => {
  window.removeEventListener('message', handleFormMessage)
  if (savedIndicatorTimer) clearTimeout(savedIndicatorTimer)
})

function prev() {
  if (currentPage.value > 0) currentPage.value--
}
function next() {
  if (currentPage.value < props.pages.length - 1) currentPage.value++
}

// ── Print selector state ─────────────────────────────────────────────────────
const showPrintSelector = ref(false)
const printPageIdxs     = ref<number[]>([])

function openPrintSelector() {
  if (exporting.value) return
  // Pre-select all pages — HTML forms rendered via canvas, PDF pages copied at vector quality
  printPageIdxs.value = props.pages.map((_, i) => i)
  showPrintSelector.value = true
}
function togglePrintSel(idx: number) {
  const pos = printPageIdxs.value.indexOf(idx)
  if (pos === -1) printPageIdxs.value.push(idx)
  else            printPageIdxs.value.splice(pos, 1)
}
function printSelectAll()  { printPageIdxs.value = props.pages.map((_, i) => i) }
function printSelectNone() { printPageIdxs.value = [] }

/** Print selected pages: renders each HTML form page silently via html2canvas,
 *  merges into a single PDF, and downloads it automatically — no popups, no dialogs.
 *  Reuses the same export pipeline as the Canvas Export button. */
async function doPrintSelected() {
  if (printPageIdxs.value.length === 0) return
  showPrintSelector.value = false
  const selected = props.pages.filter((_, i) => printPageIdxs.value.includes(i))
  if (!selected.length) return

  exporting.value      = true
  exportProgress.value = 0
  try {
    await exportToPdfCanvas(selected, props.itrTitle, (ratio) => {
      exportProgress.value = ratio
    })
  } catch (err) {
    console.error('[ITRReportModal] print-to-pdf error:', err)
    alert('Print failed. Check the browser console for details.')
  } finally {
    exporting.value      = false
    exportProgress.value = 0
  }
}
</script>
