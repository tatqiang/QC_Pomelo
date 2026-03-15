<template>
  <div class="p-4 space-y-4">

    <!-- 1. Let user pick a photo from camera / gallery -->
    <div>
      <label class="block text-sm font-medium mb-1">Site Photo</label>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        @change="onPhotoSelected"
      />
      <img v-if="photoPreview" :src="photoPreview" class="mt-2 max-h-48 rounded border" />
    </div>

    <!-- 2. Fill & preview button -->
    <button
      class="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      :disabled="!photoPreview || generating"
      @click="generatePdf"
    >
      {{ generating ? 'Generating…' : 'Preview PDF with photo' }}
    </button>

    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { previewFilledPdf } from '@/utils/fillPdfTemplate'

// ── Photo state ────────────────────────────────────────────────────────────

/** base64 data-URL of the chosen image (used for preview + PDF embedding) */
const photoPreview = ref<string | null>(null)

/** Called when the user selects/captures a photo */
function onPhotoSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    photoPreview.value = reader.result as string   // "data:image/jpeg;base64,..."
  }
  reader.readAsDataURL(file)
}

// ── PDF generation ─────────────────────────────────────────────────────────

const generating = ref(false)
const error      = ref('')

async function generatePdf() {
  if (!photoPreview.value) return
  generating.value = true
  error.value = ''

  // URLs to the converted template + fieldmap on R2
  // (set these in your .env as VITE_TEMPLATE_ITR and VITE_FIELDMAP_ITR)
  const templateUrl = import.meta.env.VITE_TEMPLATE_ITR   || '/itr_form.pdf'
  const fieldmapUrl = import.meta.env.VITE_FIELDMAP_ITR   || '/itr_fieldmap.json'

  try {
    await previewFilledPdf(templateUrl, fieldmapUrl, {
      // ── Text / date fields (match the {{txt:name}} tags in your Excel) ──
      projectName:   'Offshore Platform A',
      tagNumber:     'TAG-001',
      inspectionDate: '2026-03-01',

      // ── Checkbox ────────────────────────────────────────────────────────
      accepted: true,

      // ── Photo — pass the base64 data-URL from FileReader ────────────────
      // "sitePhoto1" must match the name in  {{photo:sitePhoto1}}  in Excel
      sitePhoto1: photoPreview.value,
    })
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'PDF generation failed'
  } finally {
    generating.value = false
  }
}
</script>
