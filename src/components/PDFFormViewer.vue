<template>
  <!-- Loading -->
  <div v-if="loading" class="flex items-center justify-center py-10">
    <svg class="w-5 h-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
    <span class="ml-2 text-sm text-gray-500">Loading form…</span>
  </div>

  <!-- Error -->
  <div v-else-if="loadError" class="p-4 text-sm text-red-600">{{ loadError }}</div>

  <!-- PDF pages with overlaid inputs -->
  <div v-else class="overflow-y-auto bg-gray-100 py-3 space-y-3" style="max-height: calc(100vh - 200px)">
    <div
      v-for="pg in pages"
      :key="pg.pageNum"
      class="relative mx-auto shadow-lg bg-white"
      :style="{ width: pg.w + 'px', height: pg.h + 'px' }"
    >
      <!-- Canvas with rendered PDF content -->
      <canvas
        :ref="(el) => assignCanvas(el as HTMLCanvasElement | null, pg.pageNum)"
        :width="pg.w"
        :height="pg.h"
        class="absolute inset-0"
        style="display:block"
      />

      <!-- Overlay form inputs -->
      <template v-for="f in pg.fields" :key="f.id">
        <!-- Multi-line text -->
        <textarea
          v-if="f.multiline"
          v-model="fieldValues[f.fieldName]"
          class="absolute border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:bg-blue-50/40 resize-none leading-tight overflow-hidden"
          :style="inputStyle(f)"
        />
        <!-- Checkbox -->
        <input
          v-else-if="f.fieldType === 'checkbox'"
          type="checkbox"
          :checked="fieldValues[f.fieldName] === 'true' || fieldValues[f.fieldName] === f.exportValue"
          class="absolute cursor-pointer"
          :style="checkboxStyle(f)"
          @change="(e) => { fieldValues[f.fieldName] = (e.target as HTMLInputElement).checked ? (f.exportValue || 'true') : 'false' }"
        />
        <!-- Single-line text (default) -->
        <input
          v-else
          type="text"
          v-model="fieldValues[f.fieldName]"
          class="absolute border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:bg-blue-50/40 px-0.5"
          :style="inputStyle(f)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker once
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl
}

// ── Props / Emits ──────────────────────────────────────────────────────────────
const props = defineProps<{
  /** URL of the (non-flattened) PDF template */
  pdfUrl: string
  /** Pre-filled values: { fieldName: value } — typically from form_data in DB */
  initialValues?: Record<string, string>
  /** Render scale (default: 1.5) */
  scale?: number
}>()

// Expose extractValues() so parent can call it on "Save" button click
defineExpose({ extractValues })

// ── State ──────────────────────────────────────────────────────────────────────
const loading  = ref(true)
const loadError = ref('')

interface PageField {
  id:         string
  fieldName:  string
  fieldType:  string   // 'text' | 'checkbox' | 'radio' | ...
  multiline:  boolean
  exportValue: string  // for checkboxes
  left: number         // px from left of canvas
  top:  number         // px from top of canvas
  width:  number       // px
  height: number       // px
  fontSize: number     // px
  textAlign: 'left' | 'center' | 'right'
}
interface PageData {
  pageNum: number
  w: number
  h: number
  fields: PageField[]
}

const pages = ref<PageData[]>([])
/** Flat map fieldName → current string value */
const fieldValues = reactive<Record<string, string>>({})

// Canvas element refs keyed by page number
const canvasMap = new Map<number, HTMLCanvasElement>()
const assignCanvas = (el: HTMLCanvasElement | null, pageNum: number) => {
  if (el) canvasMap.set(pageNum, el)
}

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await loadPDF()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load PDF'
    loading.value = false
  }
})

onBeforeUnmount(() => {
  pdfDoc?.destroy()
  pdfDoc = null
})

// ── Load + parse ───────────────────────────────────────────────────────────────
async function loadPDF() {
  loading.value = true
  loadError.value = ''

  const bytes = await fetch(props.pdfUrl).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.url}`)
    return r.arrayBuffer()
  })

  pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise
  const scale = props.scale ?? 1.5

  const newPages: PageData[] = []

  for (let pn = 1; pn <= pdfDoc.numPages; pn++) {
    const page = await pdfDoc.getPage(pn)
    const viewport = page.getViewport({ scale })

    // Collect form field annotations for this page
    const annotations = await page.getAnnotations({ intent: 'display' })
    const fields: PageField[] = []

    for (const ann of annotations) {
      if (ann.subtype !== 'Widget' || !ann.fieldName) continue

      // Convert PDF rect [x1,y1,x2,y2] (bottom-left origin) → viewport px (top-left origin)
      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(ann.rect as [number, number, number, number])
      const left   = Math.min(vx1, vx2)
      const top    = Math.min(vy1, vy2)
      const width  = Math.abs(vx2 - vx1)
      const height = Math.abs(vy2 - vy1)

      // Font size: pdfjs provides it in PDF units, scale up
      const rawFontSize = (ann as any).fontSize ?? 0
      const fontSize = rawFontSize > 0 ? Math.round(rawFontSize * scale) : Math.max(8, Math.round(height * 0.55))

      // Text alignment: 0=left, 1=center, 2=right
      const alignMap: Record<number, 'left' | 'center' | 'right'> = { 0: 'left', 1: 'center', 2: 'right' }
      const textAlign = alignMap[(ann as any).textAlignment ?? 0] ?? 'left'

      const fieldType   = ann.fieldType === 'Btn' ? 'checkbox' : 'text'
      const multiline   = (ann as any).multiLine === true

      fields.push({
        id:          ann.id,
        fieldName:   ann.fieldName,
        fieldType,
        multiline,
        exportValue: String((ann as any).exportValue ?? 'true'),
        left, top, width, height, fontSize, textAlign,
      })

      // Pre-fill: initialValues > annotationStorage default (fieldValue from PDF)
      const savedVal = props.initialValues?.[ann.fieldName]
      if (savedVal !== undefined) {
        fieldValues[ann.fieldName] = savedVal
      } else if (fieldValues[ann.fieldName] === undefined) {
        fieldValues[ann.fieldName] = String(ann.fieldValue ?? '')
      }
    }

    newPages.push({ pageNum: pn, w: Math.round(viewport.width), h: Math.round(viewport.height), fields })
    page.cleanup()
  }

  pages.value = newPages
  loading.value = false

  // Render all canvases after DOM updates
  await Promise.all(newPages.map(pg => renderPage(pg.pageNum, scale)))
}

async function renderPage(pageNum: number, scale: number) {
  if (!pdfDoc) return
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  // Wait for the canvas to appear in the DOM (nextTick-like)
  let canvas = canvasMap.get(pageNum)
  if (!canvas) {
    await new Promise<void>(resolve => {
      const id = setInterval(() => {
        canvas = canvasMap.get(pageNum)
        if (canvas) { clearInterval(id); resolve() }
      }, 30)
      setTimeout(() => { clearInterval(id); resolve() }, 2000)
    })
  }
  if (!canvas) return

  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  page.cleanup()
}

// ── Style helpers ─────────────────────────────────────────────────────────────
function inputStyle(f: PageField) {
  return {
    left:      `${f.left}px`,
    top:       `${f.top}px`,
    width:     `${f.width}px`,
    height:    `${f.height}px`,
    fontSize:  `${f.fontSize}px`,
    textAlign: f.textAlign,
    fontFamily: 'inherit',
    lineHeight: `${f.height}px`,
    padding:   '0 1px',
    boxSizing:  'border-box',
  }
}
function checkboxStyle(f: PageField) {
  const size = Math.min(f.width, f.height)
  return {
    left:   `${f.left + (f.width  - size) / 2}px`,
    top:    `${f.top  + (f.height - size) / 2}px`,
    width:  `${size}px`,
    height: `${size}px`,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Called by parent on "Save" — returns a shallow copy of all field values.
 * Values are keyed by the PDF AcroForm field name.
 */
function extractValues(): Record<string, string> {
  return { ...fieldValues }
}
</script>
