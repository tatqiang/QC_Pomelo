<template>
  <!-- ── Full-screen Report Builder Overlay ──────────────────────────────── -->
  <div class="fixed inset-0 z-[65] flex flex-col bg-gray-50">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="h-12 flex items-center gap-3 px-4 bg-white border-b shadow-sm shrink-0">
      <button
        class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        @click="$emit('close')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      <div class="w-px h-5 bg-gray-200 shrink-0"/>

      <span class="text-sm font-semibold text-gray-800">Build Report</span>
      <span class="text-xs text-gray-400 truncate hidden sm:block">{{ itr.title }}</span>

      <div class="flex-1"/>

      <!-- View Report — only shown when a report has already been generated this session -->
      <button
        v-if="hasGeneratedPages"
        @click="emit('viewReport')"
        class="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-emerald-700 border border-emerald-400
               hover:bg-emerald-50 transition-colors"
      >
        View Report
      </button>

      <button
        @click="doGenerate"
        :disabled="selection.length === 0 || generating"
        class="px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white
               hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
               transition-colors flex items-center gap-2"
      >
        <svg v-if="generating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
        </svg>
        {{ generating ? 'Generating…' : `Generate Report (${selection.length})` }}
      </button>
    </div>

    <!-- ── Save toast — shown when FORM_LOCKED message is received from form tab ── -->
    <Transition name="toast-slide">
      <div
        v-if="savedToast"
        class="absolute top-14 right-4 z-[100] px-4 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none"
        :class="savedToast.startsWith('✓') ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
      >
        {{ savedToast }}
      </div>
    </Transition>

    <!-- ── Main Body ──────────────────────────────────────────────────── -->
    <div class="flex flex-1 min-h-0 overflow-hidden">

      <!-- ── LEFT: Source Browser ──────────────────────────────────────── -->
      <div :style="{ width: panelLeftW + 'px', minWidth: '160px', flexShrink: 0 }" class="bg-white border-r flex flex-col overflow-hidden">

        <!-- Source tab bar -->
        <div class="flex border-b text-xs shrink-0 overflow-x-auto">
          <button
            v-for="tab in sourceTabs"
            :key="tab.key"
            :class="[
              'px-3 py-2 font-medium whitespace-nowrap transition-colors shrink-0',
              activeTab === tab.key
                ? 'text-[#81938A] border-b-2 border-[#81938A] bg-[#81938A]/10'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ]"
            @click="activeTab = tab.key"
          >{{ tab.label }}</button>
        </div>

        <!-- ── Forms tab ── -->
        <div v-if="activeTab === 'forms'" class="flex-1 overflow-y-auto p-3 space-y-2">
          <p class="text-xs text-gray-400 font-medium uppercase tracking-wider px-1">HTML Templates</p>

          <div v-if="!coverRev?.html_content && !photoRev?.html_content && availableChecklists.length === 0"
               class="text-sm text-gray-400 text-center py-10 px-4">
            No HTML templates found.<br/>Upload HTML in Master Forms.
          </div>

          <!-- ITR Cover -->
          <div v-if="coverRev?.html_content"
               :class="['flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors', activeSourceCode === 'itr_cover' ? 'border-[#81938A] bg-[#81938A]/5' : 'border-gray-200 hover:bg-gray-50']"
               @click="activeSourceCode = activeSourceCode === 'itr_cover' ? null : 'itr_cover'">
            <div class="flex items-center gap-2">
              <span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">CVR</span>
              <span class="text-sm font-medium text-gray-800">ITR Cover</span>
            </div>
            <button
              :class="[
                'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                selection.some(i => i.formCode === 'itr_cover')
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-[#81938A] text-white hover:bg-[#6f8078]'
              ]"
              @click="addHtmlForm('itr_cover', 'ITR Cover')"
            >{{ selection.some(i => i.formCode === 'itr_cover') ? '✓ Added' : '+ Add' }}</button>
          </div>

          <!-- Material Receive (MAT type only) -->
          <div v-if="isMat && matReceiveRev?.html_content"
               :class="['flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors', activeSourceCode === 'mat_receive' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50']"
               @click="activeSourceCode = activeSourceCode === 'mat_receive' ? null : 'mat_receive'">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold shrink-0">MAT</span>
              <span class="text-sm font-medium text-gray-800">Mat. Receive</span>
              <span v-if="matReceiveCount > 0"
                    class="text-[10px] bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                ×{{ matReceiveCount }}
              </span>
            </div>
            <button
              class="px-2.5 py-1 text-xs rounded font-medium transition-colors bg-[#81938A] text-white hover:bg-[#6f8078] shrink-0"
              @click="addHtmlForm('mat_receive', `Mat. Receive — page ${matReceiveCount + 1}`)"
            >+ Add Page</button>
          </div>

          <!-- Photo Report -->
          <div v-if="photoRev?.html_content"
               :class="['flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors', activeSourceCode === 'photo_report' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50']"
               @click="activeSourceCode = activeSourceCode === 'photo_report' ? null : 'photo_report'">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold shrink-0">PHO</span>
              <span class="text-sm font-medium text-gray-800">Photo Report</span>
              <span v-if="photoReportCount > 0"
                    class="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                ×{{ photoReportCount }}
              </span>
            </div>
            <button
              class="px-2.5 py-1 text-xs rounded font-medium transition-colors bg-[#81938A] text-white hover:bg-[#6f8078] shrink-0"
              @click="addHtmlForm('photo_report', `Photo Report — page ${photoReportCount + 1}`)"
            >+ Add Page</button>
          </div>

          <!-- Checklists -->
          <template v-if="availableChecklists.length > 0">
            <p class="text-xs text-gray-400 font-medium uppercase tracking-wider px-1 pt-1">Checklists</p>
            <div v-for="cl in availableChecklists" :key="cl.id"
                 :class="['flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors', activeSourceCode === cl.id ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:bg-gray-50']"
                 @click="activeSourceCode = activeSourceCode === cl.id ? null : cl.id">
              <div class="flex-1 min-w-0 pr-2">
                <span class="text-xs font-mono text-gray-400">{{ cl.code }}</span>
                <p class="text-sm font-medium text-gray-800 truncate">{{ cl.title }}</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span v-if="checklistPageCount(cl.id) > 0"
                      class="text-[10px] bg-[#81938A]/10 text-[#81938A] border border-[#81938A]/20 px-1.5 py-0.5 rounded-full font-semibold">
                  ×{{ checklistPageCount(cl.id) }}
                </span>
                <button
                  class="px-2.5 py-1 text-xs rounded font-medium transition-colors bg-[#81938A] text-white hover:bg-[#6f8078] shrink-0"
                  @click="addHtmlForm(cl.id, `${cl.code} — page ${checklistPageCount(cl.id) + 1}`)"
                >+ Add Page</button>
              </div>
            </div>
          </template>
        </div>

        <!-- ── ITP Docs tab ── -->
        <div v-else-if="activeTab === 'itp'" class="flex-1 overflow-y-auto p-3 space-y-2">
          <div v-if="itpFiles.length === 0"
               class="text-sm text-gray-400 text-center py-10 px-4">
            No ITP documents linked to this ITR.
          </div>
          <template v-else>
            <!-- Inline PDF File Card -->
            <div v-for="file in itpFiles" :key="file.id"
                 :class="['rounded-lg border bg-white overflow-hidden transition-colors', activeSourceCode === file.file_url ? 'border-[#81938A]' : 'border-gray-200']">
              <div class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                   @click="togglePdfFile(file.id, file.file_url); activeSourceCode = activeSourceCode === file.file_url ? null : file.file_url">
                <div class="w-7 h-8 bg-red-50 rounded flex items-center justify-center shrink-0">
                  <span class="text-red-600 text-[10px] font-bold">PDF</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-800 truncate">{{ file.file_name }}</p>
                  <p class="text-xs text-gray-400">
                    <span v-if="loadingFiles[file.id]">Loading…</span>
                    <span v-else-if="pageCounts[file.file_url] !== undefined">{{ pageCounts[file.file_url] }} pages</span>
                    <span v-else>PDF — click to expand</span>
                  </p>
                </div>
                <svg :class="['w-4 h-4 text-gray-400 shrink-0 transition-transform', expandedFiles[file.id] ? 'rotate-180' : '']"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              <!-- Pages -->
              <div v-if="expandedFiles[file.id]" class="border-t p-2">
                <div class="flex justify-end pb-1.5" v-if="pageCounts[file.file_url]">
                  <button @click.stop="addAllPdfPages(file.file_url, pageCounts[file.file_url]!, file.file_name)"
                          class="text-xs text-[#81938A] hover:text-[#5f7068]">
                    + All {{ pageCounts[file.file_url] }} pages
                  </button>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                  <template v-if="loadingFiles[file.id]">
                    <div v-for="n in 8" :key="n" class="aspect-[210/297] bg-gray-100 animate-pulse rounded"/>
                  </template>
                  <div v-else
                       v-for="n in (pageCounts[file.file_url] ?? 0)" :key="n"
                       v-thumb-observe="() => enqueueThumb(file.file_url, n)"
                       class="relative group cursor-pointer"
                       @click.stop="togglePdfPageSelection(file.file_url, n, `${file.file_name} — p.${n}`)">
                    <!-- selected state border -->
                    <div :class="['aspect-[210/297] rounded overflow-hidden bg-gray-100 transition-all',
                                  isPageSelected(file.file_url, n)
                                    ? 'border-2 border-teal-500 ring-1 ring-teal-400'
                                    : 'border border-gray-200']">
                      <img v-if="thumbs[`${file.file_url}:${n}`]"
                           :src="thumbs[`${file.file_url}:${n}`]"
                           class="w-full h-full object-contain"/>
                      <div v-else class="w-full h-full flex items-center justify-center text-gray-300 text-xs">{{ n }}</div>
                      <!-- selected checkmark badge -->
                      <div v-if="isPageSelected(file.file_url, n)"
                           class="absolute top-1 left-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shadow">
                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    </div>
                    <!-- Always-visible full-view icon -->
                    <button type="button"
                            class="absolute top-1 right-1 z-10 w-5 h-5 bg-black/50 rounded flex items-center justify-center text-white"
                            title="Full view"
                            @click.stop="openPageViewer(file.file_url, n, thumbs[`${file.file_url}:${n}`] ?? null, pageCounts[file.file_url] ?? 1, file.file_name)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <div class="text-center text-[10px] mt-0.5 leading-tight"
                         :class="isPageSelected(file.file_url, n) ? 'text-teal-600 font-semibold' : 'text-gray-400'">p.{{ n }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ── Materials tab ── -->
        <div v-else-if="activeTab === 'materials'" class="flex-1 overflow-y-auto p-3 space-y-3">
          <div v-if="linkedMaterials.length === 0" class="text-sm text-gray-400 text-center py-10 px-4">
            No material documents linked.
          </div>
          <template v-else>
            <div v-for="mat in linkedMaterials" :key="mat.id">
              <!-- Material document header -->
              <div class="flex items-center gap-2 px-1 pb-1.5">
                <span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold shrink-0">{{ mat.doc_no }}</span>
                <span class="text-xs font-medium text-gray-600 truncate">{{ mat.title }}</span>
              </div>
              <div v-if="!mat.material_files?.length" class="text-xs text-gray-400 px-2 pb-2">No files uploaded.</div>
              <!-- Files for this material -->
              <div v-for="file in mat.material_files" :key="file.id"
                   :class="['rounded-lg border bg-white overflow-hidden transition-colors mb-2', activeSourceCode === file.file_url ? 'border-[#81938A]' : 'border-gray-200']">
              <div class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                   @click="togglePdfFile(file.id, file.file_url); activeSourceCode = activeSourceCode === file.file_url ? null : file.file_url">
                <div class="w-7 h-8 bg-red-50 rounded flex items-center justify-center shrink-0">
                  <span class="text-red-600 text-[10px] font-bold">PDF</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-800 truncate">{{ file.file_name }}</p>
                  <p class="text-xs text-gray-400">
                    <span v-if="loadingFiles[file.id]">Loading…</span>
                    <span v-else-if="pageCounts[file.file_url] !== undefined">{{ pageCounts[file.file_url] }} pages</span>
                    <span v-else>PDF — click to expand</span>
                  </p>
                </div>
                <svg :class="['w-4 h-4 text-gray-400 shrink-0 transition-transform', expandedFiles[file.id] ? 'rotate-180' : '']"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              <div v-if="expandedFiles[file.id]" class="border-t p-2">
                <div class="flex justify-end pb-1.5" v-if="pageCounts[file.file_url]">
                  <button @click.stop="addAllPdfPages(file.file_url, pageCounts[file.file_url]!, file.file_name, mat.doc_no)"
                          class="text-xs text-[#81938A] hover:text-[#5f7068]">
                    + All {{ pageCounts[file.file_url] }} pages
                  </button>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                  <template v-if="loadingFiles[file.id]">
                    <div v-for="n in 8" :key="n" class="aspect-[210/297] bg-gray-100 animate-pulse rounded"/>
                  </template>
                  <div v-else
                       v-for="n in (pageCounts[file.file_url] ?? 0)" :key="n"
                       v-thumb-observe="() => enqueueThumb(file.file_url, n)"
                       class="relative group cursor-pointer"
                       @click.stop="togglePdfPageSelection(file.file_url, n, `${file.file_name} — p.${n}`, mat.doc_no)">
                    <div :class="['aspect-[210/297] rounded overflow-hidden bg-gray-100 transition-all',
                                  isPageSelected(file.file_url, n)
                                    ? 'border-2 border-teal-500 ring-1 ring-teal-400'
                                    : 'border border-gray-200']">
                      <img v-if="thumbs[`${file.file_url}:${n}`]"
                           :src="thumbs[`${file.file_url}:${n}`]"
                           class="w-full h-full object-contain"/>
                      <div v-else class="w-full h-full flex items-center justify-center text-gray-300 text-xs">{{ n }}</div>
                      <div v-if="isPageSelected(file.file_url, n)"
                           class="absolute top-1 left-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shadow">
                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    </div>
                    <!-- Always-visible full-view icon -->
                    <button type="button"
                            class="absolute top-1 right-1 z-10 w-5 h-5 bg-black/50 rounded flex items-center justify-center text-white"
                            title="Full view"
                            @click.stop="openPageViewer(file.file_url, n, thumbs[`${file.file_url}:${n}`] ?? null, pageCounts[file.file_url] ?? 1, file.file_name)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <div class="text-center text-[10px] mt-0.5"
                         :class="isPageSelected(file.file_url, n) ? 'text-teal-600 font-semibold' : 'text-gray-400'">p.{{ n }}</div>
                  </div>
                </div>
              </div>
              </div><!-- /file card -->
            </div><!-- /material group -->
          </template>
        </div>

        <!-- ── Attachments tab ── -->
        <div v-else-if="activeTab === 'attachments'" class="flex-1 flex flex-col overflow-hidden">
          <!-- Sub-tab bar -->
          <div class="flex border-b text-xs shrink-0">
            <button v-for="t in attachTabs" :key="t.key"
                    :class="[
                      'flex-1 py-1.5 font-medium transition-colors',
                      activeAttachTab === t.key
                        ? 'text-[#81938A] border-b-2 border-[#81938A]'
                        : 'text-gray-500 hover:text-gray-700'
                    ]"
                    @click="activeAttachTab = t.key">
              {{ t.label }}
              <span class="text-gray-400">({{ (attachmentsByCategory[t.key] ?? []).length }})</span>
            </button>
          </div>

          <!-- Image grid -->
          <div v-if="activeAttachTab === 'image'" class="flex-1 overflow-y-auto p-3">
            <div v-if="imageAttachments.length === 0" class="text-sm text-gray-400 text-center py-10">
              No image attachments.
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="att in imageAttachments" :key="att.id"
                   class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <img :src="att.file_url" :alt="att.file_name"
                     class="w-full h-20 object-cover bg-gray-100"/>
                <div class="px-2 py-1.5 flex items-center gap-1">
                  <span class="flex-1 text-xs text-gray-600 truncate">{{ att.file_name }}</span>
                  <button
                    class="px-1.5 py-0.5 text-[10px] bg-[#81938A] text-white rounded hover:bg-[#6f8078] shrink-0"
                    title="Add as full-page image"
                    @click="addImagePage(att)"
                  >+ Page</button>
                </div>
              </div>
            </div>
          </div>

          <!-- PDF attachment lists (drawing, do, additional) -->
          <div v-else class="flex-1 overflow-y-auto p-3 space-y-2">
            <div v-if="(attachmentsByCategory[activeAttachTab] ?? []).length === 0"
                 class="text-sm text-gray-400 text-center py-10">
              No {{ activeAttachTab }} files.
            </div>
            <template v-else>
              <template v-for="att in attachmentsByCategory[activeAttachTab] ?? []">
                <!-- ── Image file uploaded in a non-image category (e.g. DO as .jpg) ── -->
                <div v-if="isImageUrl(att.file_url)" :key="`img-${att.id}`"
                     class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <img :src="att.file_url" :alt="att.file_name"
                       class="w-full h-20 object-cover bg-gray-100"/>
                  <div class="px-2 py-1.5 flex items-center gap-1">
                    <span class="flex-1 text-xs text-gray-600 truncate">{{ att.file_name }}</span>
                    <button
                      class="px-1.5 py-0.5 text-[10px] bg-[#81938A] text-white rounded hover:bg-[#6f8078] shrink-0"
                      title="Add as full-page image"
                      @click="addImagePage(att)"
                    >+ Page</button>
                  </div>
                </div>

                <!-- ── PDF file ── -->
                <div v-else :key="`pdf-${att.id}`"
                     :class="['rounded-lg border bg-white overflow-hidden transition-colors', activeSourceCode === att.file_url ? 'border-[#81938A]' : 'border-gray-200']">
                  <div class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                       @click="togglePdfFile(att.id, att.file_url); activeSourceCode = activeSourceCode === att.file_url ? null : att.file_url">
                    <div class="w-7 h-8 bg-red-50 rounded flex items-center justify-center shrink-0">
                      <span class="text-red-600 text-[10px] font-bold">PDF</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium text-gray-800 truncate">{{ att.file_name }}</p>
                      <p class="text-xs text-gray-400">
                        <span v-if="loadingFiles[att.id]">Loading…</span>
                        <span v-else-if="pageCounts[att.file_url] !== undefined">{{ pageCounts[att.file_url] }} pages</span>
                        <span v-else>PDF — click to expand</span>
                      </p>
                    </div>
                    <svg :class="['w-4 h-4 text-gray-400 shrink-0 transition-transform', expandedFiles[att.id] ? 'rotate-180' : '']"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                  <div v-if="expandedFiles[att.id]" class="border-t p-2">
                    <div class="flex justify-end pb-1.5" v-if="pageCounts[att.file_url]">
                      <button @click.stop="addAllAttachmentPages(att.file_url, att.file_name, pageCounts[att.file_url]!)"
                              class="text-xs text-[#81938A] hover:text-[#5f7068]">
                        + All {{ pageCounts[att.file_url] }} pages
                      </button>
                    </div>
                    <div class="grid grid-cols-4 gap-1.5">
                      <template v-if="loadingFiles[att.id]">
                        <div v-for="n in 8" :key="n" class="aspect-[210/297] bg-gray-100 animate-pulse rounded"/>
                      </template>
                      <div v-else
                           v-for="n in (pageCounts[att.file_url] ?? 0)" :key="n"
                           v-thumb-observe="() => enqueueThumb(att.file_url, n)"
                           class="relative group cursor-pointer"
                           @click.stop="togglePdfPageSelection(att.file_url, n, `${att.file_name} — p.${n}`)">
                        <div :class="['aspect-[210/297] rounded overflow-hidden bg-gray-100 transition-all',
                                      isPageSelected(att.file_url, n)
                                        ? 'border-2 border-teal-500 ring-1 ring-teal-400'
                                        : 'border border-gray-200']">
                          <img v-if="thumbs[`${att.file_url}:${n}`]"
                               :src="thumbs[`${att.file_url}:${n}`]"
                               class="w-full h-full object-contain"/>
                          <div v-else class="w-full h-full flex items-center justify-center text-gray-300 text-xs">{{ n }}</div>
                          <div v-if="isPageSelected(att.file_url, n)"
                               class="absolute top-1 left-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shadow">
                            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                            </svg>
                          </div>
                        </div>
                        <!-- Always-visible full-view icon -->
                        <button type="button"
                                class="absolute top-1 right-1 z-10 w-5 h-5 bg-black/50 rounded flex items-center justify-center text-white"
                                title="Full view"
                                @click.stop="openPageViewer(att.file_url, n, thumbs[`${att.file_url}:${n}`] ?? null, pageCounts[att.file_url] ?? 1, att.file_name)">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                        <div class="text-center text-[10px] mt-0.5"
                             :class="isPageSelected(att.file_url, n) ? 'text-teal-600 font-semibold' : 'text-gray-400'">p.{{ n }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>
      </div><!-- /left panel -->

      <!-- Resize handle: Left ↔ Mid -->
      <div class="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-[#81938A] transition-colors select-none"
           @mousedown.prevent="startResize('left', $event)"></div>

      <!-- ── RIGHT: Selection List + Photo Slots ───────────────────────── -->
      <div class="flex flex-1 min-h-0 overflow-hidden">

        <!-- ── Selection list ────────────────────────────────────────── -->
        <div :style="{ width: panelMidW + 'px', minWidth: '160px', flexShrink: 0 }" class="bg-white border-r flex flex-col overflow-hidden">
          <div class="h-10 px-3 flex items-center border-b bg-gray-50 shrink-0">
            <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Report Pages ({{ selection.length }})
            </span>
          </div>

          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            <div v-if="selection.length === 0"
                 class="text-sm text-gray-400 text-center py-10 px-4 leading-relaxed">
              Add pages from the left panel to build the report
            </div>

            <div v-for="(item, idx) in selection" :key="item.id"
                 :class="[
                   'flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors',
                   dragSrcIdx === idx
                     ? 'opacity-40'
                     : dragOverIdx === idx
                         ? 'ring-2 ring-blue-400 bg-blue-50'
                         : !!photoSlotsMap[item.id]
                             ? activePhotoItemId === item.id
                                 ? 'bg-amber-100 ring-1 ring-amber-400 cursor-pointer'
                                 : item.formCode === 'photo_report' && activeSourceCode === 'photo_report'
                                     ? 'bg-amber-50 ring-1 ring-amber-200 cursor-pointer'
                                     : 'bg-gray-50 hover:bg-amber-50 cursor-pointer'
                             : activeSourceCode && item.formCode === activeSourceCode
                                 ? item.formCode === 'itr_cover'
                                     ? 'bg-[#81938A]/10 ring-1 ring-[#81938A]/40'
                                     : item.formCode === 'mat_receive'
                                         ? 'bg-orange-50 ring-1 ring-orange-300'
                                         : 'bg-violet-50 ring-1 ring-violet-300'
                                 : activeSourceCode && item.type === 'pdf_page' && item.fileUrl === activeSourceCode
                                     ? 'bg-[#81938A]/10 ring-1 ring-[#81938A]/40'
                                 : 'bg-gray-50 hover:bg-gray-100'
                 ]"
                 draggable="true"
                 @dragstart="onDragStart(idx, $event)"
                 @dragover="onDragOver($event, idx)"
                 @drop="onDrop($event, idx)"
                 @dragend="onDragEnd"
                 @click="photoSlotsMap[item.id] != null ? activatePhotoItem(item.id) : undefined">
              <!-- Drag handle -->
              <span class="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 select-none"
                    title="Drag to reorder">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9"  cy="5"  r="1.5"/><circle cx="15" cy="5"  r="1.5"/>
                  <circle cx="9"  cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9"  cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                </svg>
              </span>
              <!-- Index number -->
              <span class="text-xs text-gray-400 w-5 text-right shrink-0 font-mono">{{ idx + 1 }}</span>

              <!-- Thumbnail preview -->
              <div class="shrink-0 w-8 h-11 rounded overflow-hidden bg-gray-200
                          flex items-center justify-center border border-gray-200">
                <img v-if="getThumb(item)" :src="getThumb(item)!" class="w-full h-full object-cover"/>
                <span v-else class="text-gray-400 text-[9px] font-mono leading-none text-center">
                  {{ item.type === 'html_form' ? 'HTML' : item.type === 'pdf_page' ? 'PDF' : 'IMG' }}
                </span>
              </div>

              <!-- Label -->
              <span class="flex-1 text-xs text-gray-700 leading-tight line-clamp-2">{{ item.label }}</span>

              <!-- Full-view button -->
              <button
                type="button"
                title="Open full view"
                class="text-gray-400 hover:text-[#81938A] shrink-0 p-1 transition-colors"
                @click.stop="item.type === 'html_form'
                  ? openFormPreview(item)
                  : item.type === 'pdf_page' && item.fileUrl && item.pageNum
                    ? openPageViewer(item.fileUrl, item.pageNum, thumbs[`${item.fileUrl}:${item.pageNum}`] ?? null, pageCounts[item.fileUrl] ?? 1, item.label.replace(/ — p\.\d+$/, ''))
                    : item.attachmentUrl
                      ? openImageViewer(item.attachmentUrl, item.label)
                      : undefined"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
                </svg>
              </button>

              <!-- Up / Down arrows -->
              <div class="flex flex-col shrink-0">
                <button
                  :disabled="idx === 0"
                  @click="moveUp(idx)"
                  class="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-[10px] leading-none p-0.5"
                >▲</button>
                <button
                  :disabled="idx === selection.length - 1"
                  @click="moveDown(idx)"
                  class="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-[10px] leading-none p-0.5"
                >▼</button>
              </div>

              <!-- Remove -->
              <button
                @click.stop="confirmDeleteIdx = idx"
                class="text-red-300 hover:text-red-500 shrink-0 text-sm leading-none p-0.5"
                title="Remove page"
              >✕</button>
            </div>
          </div>
        </div>

        <!-- Resize handle: Mid ↔ Right -->
        <div class="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-[#81938A] transition-colors select-none"
             @mousedown.prevent="startResize('mid', $event)"></div>

        <!-- ── Photo Slots panel (flex-1) ──────────────────────────────── -->
        <div v-if="hasPhotoSlots" class="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-50">
          <div class="h-10 px-4 flex items-center gap-2 border-b bg-white shrink-0">
            <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ activePhotoCellCount === 8 ? 'Photo Report Slots' : 'Sketch Photo Slot' }}
            </span>
            <span class="text-xs text-gray-400">
              {{ activePhotoCellCount === 8 ? 'Click slot to assign · 4 blocks × 2 cells' : 'Click slot to assign image' }}
            </span>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <!-- No images notice (non-blocking — blocks are still shown) -->
            <div v-if="allPickerImages.length === 0"
                 class="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-center justify-between gap-3 flex-wrap">
              <span>No images yet — use <strong>Att. → Images</strong> tab or upload from device</span>
              <button type="button"
                      class="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1"
                      @click.stop="pickFromDevice()">
                📷 Add from device
              </button>
            </div>

            <!-- 4 photo blocks layout (photo_report — 8 slots) -->
            <div v-if="activePhotoCellCount === 8">
              <div v-for="block in 4" :key="block" class="mb-6">
                <p class="text-xs font-semibold text-gray-500 mb-1">
                  Block {{ block }}
                  <span class="text-gray-300 font-normal ml-1">
                    (cell {{ (block-1)*2+1 }} &amp; {{ (block-1)*2+2 }})
                  </span>
                </p>

                <!-- Description input (above photos, matching HTML form layout) -->
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="text-[10px] text-gray-400 shrink-0">Desc:</span>
                  <input
                    type="text"
                    :value="(photoDescsMap[activePhotoItemId ?? ''] ?? [])[block - 1] ?? ''"
                    @input="setPhotoDesc(block - 1, ($event.target as HTMLInputElement).value)"
                    placeholder="Block description…"
                    class="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#81938A] bg-white"
                  />
                </div>

                <!-- Image slot buttons -->
                <div class="grid grid-cols-2 gap-3">
                  <button
                    v-for="slot in 2"
                    :key="slot"
                    :class="[
                      'relative rounded-xl border-2 overflow-hidden text-left transition-all cursor-grab active:cursor-grabbing',
                      photoDragOver === (block - 1) * 2 + (slot - 1)
                        ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50 scale-[1.03]'
                        : photoDragSrc === (block - 1) * 2 + (slot - 1)
                          ? 'opacity-40 border-dashed border-gray-400'
                          : currentSlots[(block - 1) * 2 + (slot - 1)]
                            ? 'border-[#81938A] shadow-sm'
                            : 'border-dashed border-gray-300 hover:border-[#81938A]/50 bg-white'
                    ]"
                    style="aspect-ratio: 4/3"
                    draggable="true"
                    @dragstart="onPhotoDragStart((block - 1) * 2 + (slot - 1), $event)"
                    @dragover="onPhotoDragOver((block - 1) * 2 + (slot - 1), $event)"
                    @drop="onPhotoDrop((block - 1) * 2 + (slot - 1), $event)"
                    @dragend="onPhotoDragEnd()"
                    @click="openSlotPicker((block - 1) * 2 + (slot - 1))"
                  >
                    <img v-if="currentSlots[(block - 1) * 2 + (slot - 1)]"
                         :src="currentSlots[(block - 1) * 2 + (slot - 1)]!"
                         class="w-full h-full object-cover"/>
                    <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/>
                      </svg>
                      <span class="text-xs">Slot {{ (block - 1) * 2 + (slot - 1) + 1 }}</span>
                    </div>
                    <!-- Clear overlay button -->
                    <button v-if="currentSlots[(block - 1) * 2 + (slot - 1)]"
                            class="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                                   text-xs flex items-center justify-center hover:bg-red-600 shadow"
                            @click.stop="assignSlot((block - 1) * 2 + (slot - 1), null)">
                      ✕
                    </button>
                  </button>
                </div>


              </div>
            </div>

            <!-- Simple slot layout (checklist sketch cells) -->
            <div v-else-if="activePhotoCellCount > 0"
                 class="grid gap-3"
                 :style="{ gridTemplateColumns: activePhotoCellCount === 1 ? '1fr' : '1fr 1fr' }">
              <button
                v-for="slotIdx in activePhotoCellCount"
                :key="slotIdx"
                :class="[
                  'relative rounded-xl border-2 overflow-hidden text-left transition-all cursor-grab active:cursor-grabbing',
                  photoDragOver === slotIdx - 1
                    ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50 scale-[1.03]'
                    : photoDragSrc === slotIdx - 1
                      ? 'opacity-40 border-dashed border-gray-400'
                      : currentSlots[slotIdx - 1]
                        ? 'border-[#81938A] shadow-sm'
                        : 'border-dashed border-gray-300 hover:border-[#81938A]/50 bg-white'
                ]"
                style="aspect-ratio: 4/3"
                draggable="true"
                @dragstart="onPhotoDragStart(slotIdx - 1, $event)"
                @dragover="onPhotoDragOver(slotIdx - 1, $event)"
                @drop="onPhotoDrop(slotIdx - 1, $event)"
                @dragend="onPhotoDragEnd()"
                @click="openSlotPicker(slotIdx - 1)"
              >
                <img v-if="currentSlots[slotIdx - 1]"
                     :src="currentSlots[slotIdx - 1]!"
                     class="w-full h-full object-cover"/>
                <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/>
                  </svg>
                  <span class="text-xs">Slot {{ slotIdx }}</span>
                </div>
                <!-- Clear overlay button -->
                <button v-if="currentSlots[slotIdx - 1]"
                        class="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                               text-xs flex items-center justify-center hover:bg-red-600 shadow"
                        @click.stop="assignSlot(slotIdx - 1, null)">
                  ✕
                </button>
              </button>
            </div>

            <div v-else class="text-sm text-gray-400 text-center py-8 px-4">
              Click a form page in the list to configure its photo slots.
            </div>
          </div>
        </div>

        <!-- Placeholder when no photo slots in selection -->
        <div v-else class="flex-1 flex items-center justify-center bg-gray-50">
          <div class="text-center text-gray-300 max-w-xs">
            <svg class="w-14 h-14 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p class="text-sm">
              Add <strong class="font-semibold">Photo Report</strong> to the selection<br/>
              to assign images to photo cells
            </p>
          </div>
        </div>

      </div><!-- /right panel -->
    </div><!-- /main body -->

    <!-- Hidden file input for device uploads -->
    <input ref="deviceFileInput" type="file" accept="image/*" multiple class="hidden" @change="handleDeviceFiles" />

    <!-- ── Confirm Delete Modal ─────────────────────────────────────────── -->
    <Transition name="picker-fade">
      <div v-if="confirmDeleteIdx !== null"
           class="fixed inset-0 z-[75] bg-black/40 flex items-center justify-center p-4"
           @click.self="confirmDeleteIdx = null">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-gray-800">Remove this page?</p>
              <p class="text-sm text-gray-500 mt-0.5 line-clamp-2">{{ confirmDeleteIdx !== null ? selection[confirmDeleteIdx]?.label : '' }}</p>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              @click="confirmDeleteIdx = null"
              class="px-4 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >Cancel</button>
            <button
              @click="removeItem(confirmDeleteIdx!); confirmDeleteIdx = null"
              class="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >Remove</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Slot Picker Modal ──────────────────────────────────────────── -->
    <Transition name="picker-fade">
      <div v-if="slotPickerIdx !== null"
           class="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
           @click.self="slotPickerIdx = null">
        <div class="bg-white rounded-2xl shadow-2xl p-5 w-96 max-h-[72vh] flex flex-col">
          <div class="flex items-center justify-between mb-4 shrink-0">
            <h3 class="font-semibold text-gray-800">
              Photo Slot {{ (slotPickerIdx ?? 0) + 1 }}
            </h3>
            <button @click="slotPickerIdx = null"
                    class="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>

          <div class="overflow-y-auto flex-1">
            <!-- None option -->
            <div class="mb-3 rounded-xl border-2 border-dashed border-gray-200 p-3 cursor-pointer
                        hover:bg-gray-50 flex items-center gap-3 transition-colors"
                 @click="assignSlot(slotPickerIdx!, null)">
              <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 shrink-0">
                <span class="text-lg">—</span>
              </div>
              <span class="text-sm text-gray-500">Leave slot empty</span>
            </div>

            <!-- Add from device button -->
            <button type="button"
                    class="w-full mb-3 py-2 rounded-xl border-2 border-[#2176ae] bg-[#f0f7ff] text-[#2176ae]
                           text-sm font-semibold hover:bg-[#2176ae] hover:text-white transition-colors
                           flex items-center justify-center gap-2"
                    @click="pickFromDevice()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Add from device
            </button>

            <div v-if="allPickerImages.length === 0"
                 class="text-center py-4 text-xs text-gray-400">
              No images yet — tap "Add from device" above
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div v-for="att in allPickerImages" :key="att.id"
                   :class="[
                     'relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all',
                     currentSlots[slotPickerIdx!] === att.file_url
                       ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                       : usedSlotMap[att.file_url]
                           ? 'border-green-400'
                           : 'border-transparent hover:border-blue-300'
                   ]"
                   @click="assignSlot(slotPickerIdx!, att.file_url)">
                <!-- Used-slot badge -->
                <div v-if="usedSlotMap[att.file_url]"
                     class="absolute top-1.5 left-1.5 z-10 bg-green-500 text-white
                            text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                  Slot {{ usedSlotMap[att.file_url] }}
                </div>
                <img :src="att.file_url" :alt="att.file_name"
                     class="w-full h-28 object-cover bg-gray-100"/>
                <div class="p-2 bg-gray-50">
                  <p class="text-xs text-gray-600 truncate">{{ att.file_name }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Image lightbox ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="imageViewerOpen"
           class="fixed inset-0 z-[400] flex items-center justify-center"
           @click.self="imageViewerOpen = false">
        <div class="absolute inset-0 bg-black/85" @click="imageViewerOpen = false" />
        <div class="relative z-10 flex flex-col items-center px-6" style="max-width: 96vw; max-height: 96vh">
          <!-- toolbar -->
          <div class="flex items-center gap-2 mb-2 bg-black/70 rounded-xl px-3 py-1.5">
            <span class="text-gray-300 text-xs truncate max-w-[260px]">{{ imageViewerLabel }}</span>
            <button type="button" class="text-gray-300 hover:text-white p-1 ml-1" @click.stop="imageViewerOpen = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- image -->
          <img v-if="imageViewerUrl"
               :src="imageViewerUrl"
               :alt="imageViewerLabel"
               class="rounded-lg shadow-2xl object-contain bg-white"
               style="max-width: 88vw; max-height: 88vh" />
        </div>
      </div>
    </Teleport>

    <!-- ── Full-page viewer ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="pageViewerOpen" class="fixed inset-0 z-[400] flex items-center justify-center" @click.self="pageViewerOpen = false">
        <div class="absolute inset-0 bg-black/85" @click="pageViewerOpen = false" />

        <!-- prev arrow -->
        <button type="button"
                class="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition disabled:opacity-20"
                :disabled="(pageViewerPageNum ?? 1) <= 1"
                @click.stop="navigatePage(-1)">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>

        <!-- next arrow -->
        <button type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition disabled:opacity-20"
                :disabled="(pageViewerPageNum ?? 1) >= pageViewerTotal"
                @click.stop="navigatePage(1)">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>

        <!-- content -->
        <div class="relative z-10 flex flex-col items-center px-14" style="max-width: 96vw; max-height: 96vh">
          <!-- toolbar -->
          <div class="flex items-center gap-2 mb-2 bg-black/70 rounded-xl px-3 py-1.5 flex-wrap justify-center">
            <!-- page counter -->
            <span class="text-gray-300 text-xs">p.{{ pageViewerPageNum }} / {{ pageViewerTotal }}</span>
            <span class="text-gray-500 text-xs truncate max-w-[200px]">{{ pageViewerBaseName }}</span>
            <!-- add/remove -->
            <button
              type="button"
              class="px-3 py-1 rounded text-xs font-semibold transition"
              :class="isPageSelected(pageViewerFileUrl!, pageViewerPageNum!) ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-teal-500 text-white hover:bg-teal-600'"
              @click.stop="pageViewerFileUrl && pageViewerPageNum && togglePdfPageSelection(pageViewerFileUrl, pageViewerPageNum, pageViewerLabel)"
            >
              {{ isPageSelected(pageViewerFileUrl!, pageViewerPageNum!) ? '✕ Remove' : '+ Add to report' }}
            </button>
            <!-- close -->
            <button type="button" class="text-gray-300 hover:text-white p-1 ml-1" @click.stop="pageViewerOpen = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- image -->
          <div class="relative">
            <!-- hi-res fully rendered -->
            <img v-if="pageViewerHiRes"
                 :key="`hires:${pageViewerFileUrl}:${pageViewerPageNum}`"
                 :src="pageViewerHiRes"
                 class="rounded-lg shadow-2xl object-contain bg-white"
                 style="max-width: 82vw; max-height: 86vh" />
            <!-- low-res thumb shown while hi-res loads -->
            <img v-else-if="pageViewerThumb"
                 :key="`thumb:${pageViewerFileUrl}:${pageViewerPageNum}`"
                 :src="pageViewerThumb"
                 class="rounded-lg shadow-2xl object-contain bg-white"
                 style="max-width: 82vw; max-height: 86vh" />
            <!-- no thumb at all -->
            <div v-else class="bg-white rounded-lg shadow-2xl flex items-center justify-center text-gray-400 text-sm"
                 style="width: 420px; height: 594px">
              <div class="text-center">
                <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                <p>p.{{ pageViewerPageNum }}</p>
              </div>
            </div>
            <!-- loading spinner overlay (while hi-res renders) -->
            <div v-if="pageViewerLoading"
                 class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
              <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            </div>
            <!-- selected badge overlay -->
            <div v-if="isPageSelected(pageViewerFileUrl!, pageViewerPageNum!)"
                 class="absolute top-2 right-2 bg-teal-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              In report
            </div>
          </div>
          <!-- keyboard hint -->
          <p class="text-gray-500 text-[10px] mt-1.5">← → arrow keys to navigate &nbsp;·&nbsp; Esc to close</p>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMasterFormStore, type ItrFormSnapshot } from '@/stores/masterFormStore'
import { useItpStore }          from '@/stores/itpStore'
import { useItrTypeStore }      from '@/stores/itrTypeStore'
import { useItpChecklistStore } from '@/stores/itpChecklistStore'
import { useItrReportPagesStore, type SavedPickerItem, type ReportPageConfig } from '@/stores/itrReportPagesStore'
import { getPageCount, renderPageToDataUrl, renderPageToHtml } from '@/utils/pdfRenderer'
import type { ReportPage }      from '@/components/ITRReportModal.vue'
import { useItrStore, type ITR, type ItrAttachment } from '@/stores/itrStore'

// ─── Lazy thumbnail IntersectionObserver directive ────────────────────────────
// Serial render queue: processes one pdf.js render at a time to prevent
// the worker from being overloaded (which causes silent blank outputs).
const _thumbQueue: Array<{ key: string; fileUrl: string; pageNum: number }> = []
let   _thumbDraining = false

async function _drainThumbQueue() {
  if (_thumbDraining) return
  _thumbDraining = true
  while (_thumbQueue.length > 0) {
    const task = _thumbQueue.shift()!
    if (thumbs.value[task.key]) continue   // already loaded by the time we get here
    try {
      const dataUrl = await renderPageToDataUrl(task.fileUrl, task.pageNum, 0.4)
      thumbs.value[task.key] = dataUrl
    } catch (_) { /* leave grey */ }
  }
  _thumbDraining = false
}

function enqueueThumb(fileUrl: string, pageNum: number) {
  const key = `${fileUrl}:${pageNum}`
  if (thumbs.value[key]) return                              // already rendered
  if (_thumbQueue.some(t => t.key === key)) return           // already queued
  _thumbQueue.push({ key, fileUrl, pageNum })
  _drainThumbQueue()
}

// Custom directive — attaches an IntersectionObserver to each tile.
// When the tile enters the viewport (+ 300 px buffer), its thumb is queued.
const vThumbObserve = {
  mounted(el: HTMLElement, { value: cb }: { value: () => void }) {
    const obs = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) { cb(); obs.disconnect() } },
      { rootMargin: '300px' }
    )
    obs.observe(el)
    ;(el as any)._tobs = obs
  },
  unmounted(el: HTMLElement) { (el as any)._tobs?.disconnect() },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickerItem {
  id:             string
  type:           'html_form' | 'pdf_page' | 'image'
  label:          string
  formCode?:      string   // 'itr_cover' | 'photo_report' | checklist id
  fileUrl?:       string
  pageNum?:       number
  attachmentUrl?: string
  materialDocNo?: string   // set when page comes from a linked material PDF
}

type SourceTab  = 'forms' | 'itp' | 'materials' | 'attachments'
type AttachSubTab = 'drawing' | 'do' | 'image' | 'additional'

// ─── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  itr:          ITR
  dataMap:      Record<string, string>
  checklistIds: string[]
  itrSnapshots: Record<string, ItrFormSnapshot>
}>()

const emit = defineEmits<{
  close:       []
  generate:    [pages: ReportPage[]]
  viewReport:  []   // return to already-generated draft without rebuilding
}>()

// ─── Stores ───────────────────────────────────────────────────────────────────

const masterFormStore    = useMasterFormStore()
const itpStore           = useItpStore()
const itrTypeStore       = useItrTypeStore()
const checklistStore     = useItpChecklistStore()
const reportPagesStore   = useItrReportPagesStore()
const itrStore           = useItrStore()

// ─── State ────────────────────────────────────────────────────────────────────

const activeTab       = ref<SourceTab>('forms')
const activeAttachTab = ref<AttachSubTab>('drawing')
const selection       = ref<PickerItem[]>([])
const generating        = ref(false)
const hasGeneratedPages = ref(false)

// PDF expansion / loading
const expandedFiles = ref<Record<string, boolean>>({})
const loadingFiles  = ref<Record<string, boolean>>({})
const pageCounts    = ref<Record<string, number>>({})      // file_url → page count
const thumbs        = ref<Record<string, string>>({})      // `${url}:${n}` → data URL

// Photo slots: per-item map — each photo_report page gets its own 8 slots and 4 captions
const photoSlotsMap  = ref<Record<string, Array<string | null>>>({})

const activePhotoItemId = ref<string | null>(null)
const slotPickerIdx     = ref<number | null>(null)
const activeSourceCode  = ref<string | null>(null)
const localDeviceImages = ref<Array<{id: string, file_name: string, file_url: string}>>([])
const deviceFileInput   = ref<HTMLInputElement | null>(null)
const photoDragSrc  = ref<number | null>(null)
const photoDragOver = ref<number | null>(null)
const photoDescsMap = ref<Record<string, string[]>>({})
const confirmDeleteIdx  = ref<number | null>(null)

// ─── Resizable panels ─────────────────────────────────────────────────────────
const panelLeftW = ref(380)
const panelMidW  = ref(320)

function startResize(which: 'left' | 'mid', e: MouseEvent) {
  const startX    = e.clientX
  const startLeft = panelLeftW.value
  const startMid  = panelMidW.value
  function onMove(ev: MouseEvent) {
    const delta = ev.clientX - startX
    if (which === 'left') {
      panelLeftW.value = Math.max(160, Math.min(700, startLeft + delta))
    } else {
      panelMidW.value = Math.max(160, Math.min(700, startMid + delta))
    }
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// ─── Auto-save config on selection change ─────────────────────────────────────
// Saves page selection to Supabase whenever the list changes,
// so navigating away without clicking Generate doesn't lose the selection.
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutoSave() {
  if (_autoSaveTimer !== null) clearTimeout(_autoSaveTimer)
  _autoSaveTimer = setTimeout(async () => {
    _autoSaveTimer = null
    if (selection.value.length > 0) {
      await reportPagesStore.saveConfig(props.itr.id, buildConfig())
    }
  }, 800)
}
watch(selection,     scheduleAutoSave, { deep: true })
watch(photoSlotsMap, scheduleAutoSave, { deep: true })
watch(photoDescsMap, scheduleAutoSave, { deep: true })

// Drag-to-reorder state
const dragSrcIdx  = ref<number | null>(null)
const dragOverIdx = ref<number | null>(null)

// ─── Computed ─────────────────────────────────────────────────────────────────

function getRevisionForReport(code: string) {
  return props.itrSnapshots[code]?.master_form_revisions
    ?? masterFormStore.getLatestRevision(code)
}

const coverRev      = computed(() => getRevisionForReport('itr_cover'))
const photoRev      = computed(() => getRevisionForReport('photo_report'))
const matReceiveRev = computed(() => getRevisionForReport('mat_receive'))

const availableChecklists = computed(() =>
  props.checklistIds
    .map(id => checklistStore.checklists.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
)

const itpFiles = computed(() =>
  itpStore.itps.find(p => p.id === props.itr.itp_id)?.itp_files ?? []
)

const linkedMaterials = computed(() =>
  (props.itr.itr_materials ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(im => im.material)
    .filter((m): m is NonNullable<typeof m> => !!m)
)

const isMat = computed(() =>
  itrTypeStore.getById(props.itr.itr_type_id)?.code === 'MAT'
)

const attachmentsByCategory = computed<Record<string, ItrAttachment[]>>(() => {
  const map: Record<string, ItrAttachment[]> = {
    drawing: [], do: [], image: [], additional: [],
  }
  for (const att of props.itr.itr_attachments ?? []) {
    if (att.category in map) map[att.category].push(att)
  }
  return map
})

const imageAttachments = computed(() => attachmentsByCategory.value['image'] ?? [])

const allPickerImages = computed(() => [
  ...imageAttachments.value,
  ...localDeviceImages.value,
])

function compressImageDataUrl(dataUrl: string, maxW: number, maxH: number, q: number): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
      const cv = document.createElement('canvas')
      cv.width = w; cv.height = h
      cv.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(cv.toDataURL('image/jpeg', q))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function pickFromDevice() {
  deviceFileInput.value?.click()
}

async function handleDeviceFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  const newImgs: Array<{id: string, file_name: string, file_url: string}> = []
  await Promise.all(files.map(async file => {
    const reader = new FileReader()
    const dataUrl = await new Promise<string>(res => {
      reader.onload = ev => res(ev.target!.result as string)
      reader.readAsDataURL(file)
    })
    const compressed = await compressImageDataUrl(dataUrl, 1400, 1200, 0.82)
    newImgs.push({
      id: `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file_name: file.name,
      file_url: compressed,
    })
  }))
  localDeviceImages.value.push(...newImgs)
  // auto-assign when only one file uploaded and a picker is open
  if (newImgs.length === 1 && slotPickerIdx.value !== null) {
    assignSlot(slotPickerIdx.value, newImgs[0].file_url)
  }
}

const hasPhotoReport = computed(() =>
  selection.value.some(i => i.type === 'html_form' && i.formCode === 'photo_report')
)

// True when any selection item has photo slots (photo_report OR checklist with .photo-cell divs)
const hasPhotoSlots = computed(() =>
  selection.value.some(i => i.type === 'html_form' && photoSlotsMap.value[i.id] !== undefined)
)

// Number of photo cells in the currently active photo-slot item (0 if none active)
const activePhotoCellCount = computed(() => {
  const id = activePhotoItemId.value
  return id ? (photoSlotsMap.value[id]?.length ?? 0) : 0
})

// Current active photo page's slots and descs
const currentSlots = computed<Array<string | null>>(() => {
  const id = activePhotoItemId.value
  return id ? (photoSlotsMap.value[id] ?? Array(8).fill(null)) : Array(8).fill(null)
})

// How many photo report pages are in the selection
const photoReportItems = computed(() =>
  selection.value.filter(i => i.type === 'html_form' && i.formCode === 'photo_report')
)
const photoReportCount = computed(() => photoReportItems.value.length)

const matReceiveItems = computed(() =>
  selection.value.filter(i => i.type === 'html_form' && i.formCode === 'mat_receive')
)
const matReceiveCount = computed(() => matReceiveItems.value.length)

// Per-checklist page count
function checklistPageCount(id: string) {
  return selection.value.filter(i => i.type === 'html_form' && i.formCode === id).length
}

// Map of image URL → slot index (1-based label) for the active photo page
const usedSlotMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  currentSlots.value.forEach((url, i) => { if (url) map[url] = i + 1 })
  return map
})

const sourceTabs = computed(() => {
  const tabs: Array<{ key: SourceTab; label: string }> = [
    { key: 'forms',       label: 'Forms' },
    { key: 'itp',         label: `ITP (${itpFiles.value.length})` },
  ]
  const matFileCount = linkedMaterials.value.reduce((sum, m) => sum + (m.material_files?.length ?? 0), 0)
  if (linkedMaterials.value.length > 0) {
    tabs.push({ key: 'materials', label: `Mat (${matFileCount})` })
  }
  tabs.push({ key: 'attachments', label: 'Att.' })
  return tabs
})

const attachTabs: Array<{ key: AttachSubTab; label: string }> = [
  { key: 'drawing',    label: 'Drawings'   },
  { key: 'do',         label: 'DO'         },
  { key: 'image',      label: 'Images'     },
  { key: 'additional', label: 'Other'      },
]

// ─── Selection handlers ───────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2)
}

/** Read desc-1..desc-4 already saved in form_data for a photo_report page instance.
 *  Falls back to the non-namespaced 'photo_report' key for older records. */
function descsFromFormData(itemId: string): string[] {
  const fd = (
    (props.itr.form_data?.[`photo_report__${itemId}`] as Record<string, unknown> | undefined) ??
    (props.itr.form_data?.['photo_report']            as Record<string, unknown> | undefined) ??
    {}
  )
  return [1, 2, 3, 4].map(n => String(fd[`desc-${n}`] ?? ''))
}

function addHtmlForm(formCode: string, label: string) {
  // itr_cover is single-page only; photo_report, mat_receive, and checklists support multiple pages
  if (formCode === 'itr_cover') {
    if (selection.value.some(i => i.type === 'html_form' && i.formCode === formCode)) return
  }
  const id = uid()
  selection.value.push({ id, type: 'html_form', label, formCode })
  if (formCode === 'photo_report') {
    photoSlotsMap.value[id] = Array(8).fill(null)
    photoDescsMap.value[id] = descsFromFormData(id)
    activePhotoItemId.value = id
  } else if (formCode !== 'itr_cover' && formCode !== 'mat_receive') {
    // Checklist — detect embedded .photo-cell elements and initialise slots if any
    const checklistHtml = availableChecklists.value.find(c => c.id === formCode)?.html_content
    if (checklistHtml) {
      const tmpDoc = new DOMParser().parseFromString(checklistHtml, 'text/html')
      const cellCount = tmpDoc.querySelectorAll('.photo-cell').length
      if (cellCount > 0) {
        photoSlotsMap.value[id] = Array(cellCount).fill(null)
        activePhotoItemId.value = id
      }
    }
  }
}

// ── Page selection helpers ───────────────────────────────────────────────────

/** True if (fileUrl, pageNum) is already in the selection list */
function isPageSelected(fileUrl: string, pageNum: number): boolean {
  return selection.value.some(s => s.type === 'pdf_page' && s.fileUrl === fileUrl && s.pageNum === pageNum)
}

/** Toggle a pdf page in/out of selection */
function togglePdfPageSelection(fileUrl: string, pageNum: number, label: string, materialDocNo?: string) {
  const idx = selection.value.findIndex(
    s => s.type === 'pdf_page' && s.fileUrl === fileUrl && s.pageNum === pageNum
  )
  if (idx === -1) {
    selection.value.push({ id: uid(), type: 'pdf_page', label, fileUrl, pageNum, ...(materialDocNo ? { materialDocNo } : {}) })
  } else {
    const item = selection.value[idx]
    if (item?.formCode === 'photo_report') {
      delete photoSlotsMap.value[item.id]
    }
    selection.value.splice(idx, 1)
  }
}

// ── Image lightbox ──────────────────────────────────────────────────────────
const imageViewerOpen  = ref(false)
const imageViewerUrl   = ref<string | null>(null)
const imageViewerLabel = ref('')

function openImageViewer(url: string, label: string) {
  imageViewerUrl.value   = url
  imageViewerLabel.value = label
  imageViewerOpen.value  = true
}

// ── Full-page viewer ──────────────────────────────────────────────────────────
const pageViewerOpen     = ref(false)
const pageViewerThumb    = ref<string | null>(null)
const pageViewerHiRes    = ref<string | null>(null)   // high-res render (scale 2.0)
const pageViewerLoading  = ref(false)
const pageViewerHiResCache = new Map<string, string>() // fileUrl:pageNum → dataUrl
const pageViewerLabel    = ref('')
const pageViewerFileUrl  = ref<string | null>(null)
const pageViewerPageNum  = ref<number | null>(null)
const pageViewerTotal    = ref<number>(1)
const pageViewerBaseName = ref<string>('')

async function loadHiRes(fileUrl: string, pageNum: number) {
  const key = `${fileUrl}:${pageNum}`
  if (pageViewerHiResCache.has(key)) {
    pageViewerHiRes.value   = pageViewerHiResCache.get(key)!
    pageViewerLoading.value = false
    return
  }
  pageViewerLoading.value = true
  pageViewerHiRes.value   = null
  try {
    const dataUrl = await renderPageToDataUrl(fileUrl, pageNum, 2.0)
    pageViewerHiResCache.set(key, dataUrl)
    // Only apply if the viewer is still on this page
    if (pageViewerFileUrl.value === fileUrl && pageViewerPageNum.value === pageNum) {
      pageViewerHiRes.value = dataUrl
    }
  } finally {
    if (pageViewerFileUrl.value === fileUrl && pageViewerPageNum.value === pageNum) {
      pageViewerLoading.value = false
    }
  }
}

function openPageViewer(fileUrl: string, pageNum: number, thumb: string | null, total: number, baseName: string) {
  pageViewerFileUrl.value  = fileUrl
  pageViewerPageNum.value  = pageNum
  pageViewerThumb.value    = thumb
  pageViewerHiRes.value    = null
  pageViewerLabel.value    = `${baseName} — p.${pageNum}`
  pageViewerTotal.value    = total
  pageViewerBaseName.value = baseName
  pageViewerOpen.value     = true
  loadHiRes(fileUrl, pageNum)
}

function navigatePage(delta: number) {
  if (!pageViewerFileUrl.value || !pageViewerPageNum.value) return
  const next = pageViewerPageNum.value + delta
  if (next < 1 || next > pageViewerTotal.value) return
  pageViewerPageNum.value = next
  pageViewerLabel.value   = `${pageViewerBaseName.value} — p.${next}`
  pageViewerThumb.value   = thumbs.value[`${pageViewerFileUrl.value}:${next}`] ?? null
  pageViewerHiRes.value   = null
  loadHiRes(pageViewerFileUrl.value, next)
}

function onViewerKey(e: KeyboardEvent) {
  if (imageViewerOpen.value) {
    if (e.key === 'Escape') imageViewerOpen.value = false
    return
  }
  if (!pageViewerOpen.value) return
  if (e.key === 'ArrowLeft')  navigatePage(-1)
  if (e.key === 'ArrowRight') navigatePage(1)
  if (e.key === 'Escape')     pageViewerOpen.value = false
}

// ─── Handle FORM_LOCKED messages from full-page preview tabs ─────────────────
const savedToast = ref<string | null>(null)
let _savedToastTimer: ReturnType<typeof setTimeout> | null = null

async function handlePreviewMessage(e: MessageEvent) {
  if (!e.data || e.data.type !== 'FORM_LOCKED') return
  const formCode = e.data.formCode
  const payload  = e.data.payload
  if (!formCode || !payload) return
  const newFormData = { ...(props.itr.form_data ?? {}), [formCode]: payload }
  const ok = await itrStore.updateITR(props.itr.id, { form_data: newFormData })
  // Show brief confirmation so user knows the lock/save reached the picker
  const keyCount = Object.keys(payload).length
  savedToast.value = ok ? `✓ Form data saved (${keyCount} fields)` : '✗ Save failed — retry'
  if (_savedToastTimer) clearTimeout(_savedToastTimer)
  _savedToastTimer = setTimeout(() => { savedToast.value = null }, 4000)
}

onMounted(()  => {
  window.addEventListener('keydown', onViewerKey)
  window.addEventListener('message', handlePreviewMessage)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onViewerKey)
  window.removeEventListener('message', handlePreviewMessage)
  // Flush any pending auto-save so page selections survive navigation without clicking Generate
  if (_autoSaveTimer !== null) {
    clearTimeout(_autoSaveTimer)
    if (selection.value.length > 0) {
      reportPagesStore.saveConfig(props.itr.id, buildConfig())
    }
  }
})

function addPdfPage(fileUrl: string, pageNum: number, label: string, materialDocNo?: string) {
  selection.value.push({ id: uid(), type: 'pdf_page', label, fileUrl, pageNum, ...(materialDocNo ? { materialDocNo } : {}) })
}

function addAllPdfPages(fileUrl: string, count: number, baseName: string, materialDocNo?: string) {
  for (let p = 1; p <= count; p++) {
    selection.value.push({ id: uid(), type: 'pdf_page', label: `${baseName} — p.${p}`, fileUrl, pageNum: p, ...(materialDocNo ? { materialDocNo } : {}) })
  }
}

function addImagePage(att: ItrAttachment) {
  selection.value.push({
    id: uid(), type: 'image', label: att.file_name,
    attachmentUrl: att.file_url,
  })
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|tiff?)(\?.*)?$/i.test(url)
}

function addAttachmentPage(fileUrl: string, fileName: string, pageNum: number) {
  selection.value.push({ id: uid(), type: 'pdf_page', label: `${fileName} — p.${pageNum}`, fileUrl, pageNum })
}

function addAllAttachmentPages(fileUrl: string, fileName: string, count: number) {
  for (let p = 1; p <= count; p++) {
    selection.value.push({ id: uid(), type: 'pdf_page', label: `${fileName} — p.${p}`, fileUrl, pageNum: p })
  }
}

function moveUp(idx: number) {
  if (idx === 0) return
  const arr = selection.value
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]!]
}

function moveDown(idx: number) {
  if (idx >= selection.value.length - 1) return
  const arr = selection.value
  ;[arr[idx], arr[idx + 1]] = [arr[idx + 1]!, arr[idx]!]
}

// ─── Drag-to-reorder ──────────────────────────────────────────────────────────

function onDragStart(idx: number, e: DragEvent) {
  dragSrcIdx.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
}

function onDragOver(e: DragEvent, idx: number) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverIdx.value = idx
}

function onDrop(e: DragEvent, idx: number) {
  e.preventDefault()
  const src = dragSrcIdx.value
  if (src === null || src === idx) {
    dragSrcIdx.value  = null
    dragOverIdx.value = null
    return
  }
  const arr  = selection.value
  const item = arr.splice(src, 1)[0]!
  arr.splice(idx, 0, item)
  dragSrcIdx.value  = null
  dragOverIdx.value = null
}

function onDragEnd() {
  dragSrcIdx.value  = null
  dragOverIdx.value = null
}

function removeItem(idx: number) {
  const item = selection.value[idx]
  if (item && photoSlotsMap.value[item.id] !== undefined) {
    delete photoSlotsMap.value[item.id]
    // Re-assign active to the nearest remaining item that has photo slots
    const remaining = selection.value.filter((i, j) => j !== idx && photoSlotsMap.value[i.id] !== undefined)
    activePhotoItemId.value = remaining.at(-1)?.id ?? null
  }
  selection.value.splice(idx, 1)
}

async function openFormPreview(item: PickerItem) {
  // Refresh form_data from DB so all users always see the latest saved data,
  // not just the data loaded when the ITR list was last fetched.
  await itrStore.refreshFormData(props.itr.id)
  let html: string | null | undefined = null
  if (item.formCode === 'itr_cover')         html = coverRev.value?.html_content
  else if (item.formCode === 'photo_report') html = photoRev.value?.html_content
  else if (item.formCode === 'mat_receive')  html = matReceiveRev.value?.html_content
  else html = availableChecklists.value.find(c => c.id === item.formCode)?.html_content
  if (!html) return
  // itr_cover is single-page (no instance namespace); all others (photo_report, mat_receive, checklists) are per-instance
  const instanceId = item.formCode === 'itr_cover' ? '' : item.id
  const fdKey      = instanceId ? `${item.formCode}__${instanceId}` : (item.formCode ?? '')
  // Fall back to the plain formCode key for data saved before the per-instance fix
  const savedDb = (props.itr.form_data?.[fdKey] ?? props.itr.form_data?.[item.formCode ?? ''] ?? {}) as Record<string, unknown>
  // Inject photo cells before processing form fields, same as doGenerate does
  if (item.formCode === 'photo_report') {
    const slots = photoSlotsMap.value[item.id] ?? Array(8).fill(null)
    html = injectPhotoCells(html, slots)
  }
  const processed = processHtmlForm(html, {}, savedDb, item.formCode ?? '', instanceId)
  // When the form is opened as a new tab, window.parent === window (not the Vue app).
  // Primary: override window.parent → window.opener so parent.postMessage() reaches the picker.
  // Fallback: if Object.defineProperty on window.parent fails (non-configurable in some
  //   Chromium builds), add a self-message relay that catches messages sent to window and
  //   forwards them to window.opener — so FORM_LOCKED always reaches handlePreviewMessage.
  const parentRedirect = `<script>
  (function(){
    var _opener = window.opener;
    if (!_opener) return;
    var _defined = false;
    try {
      Object.defineProperty(window, 'parent', {
        configurable: true,
        get: function() { return _opener; }
      });
      _defined = true;
    } catch(e) {}
    if (!_defined) {
      // Relay: messages sent via parent.postMessage (which becomes window.postMessage
      // when parent===window) are dispatched to self first — intercept and forward.
      window.addEventListener('message', function(ev) {
        if (ev.source === window && ev.data && typeof ev.data === 'object') {
          _opener.postMessage(ev.data, '*');
        }
      });
    }
  })();
<\/script>`
  const w = window.open('', '_blank')
  if (w) {
    w.document.open()
    // inject redirect before any other scripts
    w.document.write(processed.replace('<head>', '<head>' + parentRedirect))
    w.document.close()
  }
}

// ─── PDF loading ──────────────────────────────────────────────────────────────

async function togglePdfFile(fileId: string, fileUrl: string) {
  if (loadingFiles.value[fileId]) return   // ignore while already loading

  if (expandedFiles.value[fileId]) {
    delete expandedFiles.value[fileId]
    return
  }
  expandedFiles.value[fileId] = true

  if (pageCounts.value[fileUrl] !== undefined) return   // already loaded

  loadingFiles.value[fileId] = true
  let count = 0
  try {
    count = await getPageCount(fileUrl)
    pageCounts.value[fileUrl] = count
  } catch (err) {
    console.error('[ITRReportPicker] PDF load error:', err)
    pageCounts.value[fileUrl] = 0
    delete loadingFiles.value[fileId]
    return
  }

  // Page count fetched — tiles render lazily via IntersectionObserver as they scroll into view.
  delete loadingFiles.value[fileId]
}


function getThumb(item: PickerItem): string | null {
  if (item.type === 'pdf_page' && item.fileUrl && item.pageNum !== undefined) {
    return thumbs.value[`${item.fileUrl}:${item.pageNum}`] ?? null
  }
  if (item.type === 'image' && item.attachmentUrl) {
    return item.attachmentUrl
  }
  return null
}

function openSlotPicker(idx: number) {
  slotPickerIdx.value = idx
}

function onPhotoDragStart(idx: number, e: DragEvent) {
  photoDragSrc.value = idx
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)) }
}

function onPhotoDragOver(idx: number, e: DragEvent) {
  if (photoDragSrc.value === null || photoDragSrc.value === idx) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  photoDragOver.value = idx
}

function onPhotoDrop(idx: number, e: DragEvent) {
  e.preventDefault()
  const src = photoDragSrc.value
  photoDragSrc.value = null
  photoDragOver.value = null
  if (src === null || src === idx) return
  const id = activePhotoItemId.value
  if (!id) return
  const slots = photoSlotsMap.value[id]
  if (!slots) return
  const tmp = slots[src]
  slots[src] = slots[idx]
  slots[idx] = tmp
}

function onPhotoDragEnd() {
  photoDragSrc.value = null
  photoDragOver.value = null
}

// Debounce timer for desc → itr.form_data writes
let _descSaveTimer: ReturnType<typeof setTimeout> | null = null

function setPhotoDesc(blockIdx: number, val: string) {
  const id = activePhotoItemId.value
  if (!id) return
  if (!photoDescsMap.value[id]) photoDescsMap.value[id] = ['', '', '', '']
  photoDescsMap.value[id][blockIdx] = val

  // Write desc-N directly into itr.form_data so the HTML form and Vue panel share the same data.
  // Debounced to avoid a DB call on every keystroke.
  if (_descSaveTimer) clearTimeout(_descSaveTimer)
  _descSaveTimer = setTimeout(async () => {
    _descSaveTimer = null
    const fdKey = `photo_report__${id}`
    const existing = (
      (props.itr.form_data?.[fdKey] as Record<string, unknown> | undefined) ??
      (props.itr.form_data?.['photo_report'] as Record<string, unknown> | undefined) ??
      {}
    )
    const updated: Record<string, unknown> = { ...existing }
    const descs = photoDescsMap.value[id] ?? []
    for (let d = 0; d < 4; d++) updated[`desc-${d + 1}`] = descs[d] ?? ''
    const newFormData = { ...(props.itr.form_data ?? {}), [fdKey]: updated }
    await itrStore.updateITR(props.itr.id, { form_data: newFormData })
  }, 600)
}

function assignSlot(idx: number, url: string | null) {
  const id = activePhotoItemId.value
  if (!id) return
  const slots = photoSlotsMap.value[id]
  if (slots) slots[idx] = url
  slotPickerIdx.value = null
}

function activatePhotoItem(id: string) {
  if (photoSlotsMap.value[id]) activePhotoItemId.value = id
}

// ─── HTML processing ──────────────────────────────────────────────────────────

/** Inject ITR field values into a standalone HTML form string.
 *  @param overrides  Extra key/value pairs that take precedence over `props.dataMap`.
 *  @param savedRaw   Full DB form_data blob for this formCode (includes sig-boxes, images, user edits).
 *  @param formCode   The form_data key — injected as __FORM_CODE__ for Lock auto-save. */

/** Parse `@page { size: ... }` from an HTML string to determine widthMm/heightMm.
 *  Returns undefined if no @page size rule is found. */
function parsePageSizeMm(html: string): { widthMm: number; heightMm: number } | undefined {
  const m = html.match(/@page\s*\{[^}]*size:\s*([^;]+);/)
  if (!m) return undefined
  const size = m[1].trim().toLowerCase()
  if (/a4\s+landscape|landscape\s+a4/.test(size)) return { widthMm: 297, heightMm: 210 }
  if (/a3\s+landscape|landscape\s+a3/.test(size)) return { widthMm: 420, heightMm: 297 }
  if (/a3\s+portrait|portrait\s+a3|^a3$/.test(size)) return { widthMm: 297, heightMm: 420 }
  // Explicit mm values e.g. "297mm 210mm"
  const numM = size.match(/([\d.]+)mm\s+([\d.]+)mm/)
  if (numM) return { widthMm: parseFloat(numM[1]), heightMm: parseFloat(numM[2]) }
  return undefined  // default A4 portrait (210×297) is already the fallback in ITRReportModal
}

function processHtmlForm(htmlContent: string, overrides: Record<string, string> = {}, savedRaw: Record<string, unknown> = {}, formCode = '', instanceId = ''): string {
  const merged = { ...props.dataMap, ...overrides }

  // Extract the form's localStorage STORE_KEY to pre-seed it
  const storeKeyMatch = htmlContent.match(/(?:const|var|let)\s+STORE_KEY\s*=\s*['"]([^'"]+)['"]/)
  const storeKey = storeKeyMatch?.[1] ?? null

  // For multi-instance forms, namespace STORE_KEY and __FORM_CODE__ per item.id so each page
  // has isolated localStorage and Supabase form_data (page 2 never overwrites page 1).
  const effectiveStoreKey = storeKey && instanceId ? `${storeKey}__${instanceId}` : storeKey
  const effectiveFormCode = formCode && instanceId ? `${formCode}__${instanceId}` : formCode

  // Rewrite the STORE_KEY constant in the raw HTML source so saveData/loadData
  // in the form itself also use the per-instance key.
  let source = htmlContent
  if (storeKey && instanceId) {
    const escaped = storeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    source = htmlContent.replace(new RegExp(`(['"])${escaped}\\1`), `'${storeKey}__${instanceId}'`)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(source, 'text/html')

  // Priority: savedRaw (last user edit in HTML form) wins over merged (ITR record).
  // When ITR modal fields are saved, ITRModal strips data-key keys from form_data so the
  // ITR record wins again on next open — giving correct "last write wins" behaviour.
  const seedData: Record<string, unknown> = { ...merged, ...savedRaw }

  // Inject into <head>: (1) __FORM_CODE__ var for Lock postMessage,
  //                     (2) localStorage seed + __INJECT_DATA__ (used by Puppeteer).
  // Structure: var _d = JSON.stringify({...}); window.__INJECT_DATA__ = JSON.parse(_d);
  // Using a shared variable means rebuildPageHtmlSeed() (in ITRModal) only needs to
  // replace one JSON literal and BOTH localStorage and __INJECT_DATA__ stay in sync.
  // Runs synchronously before DOMContentLoaded — loadData() reads the seeded values automatically.
  const headScript = doc.createElement('script')
  headScript.textContent = `;(function(){
  window.__FORM_CODE__ = ${JSON.stringify(effectiveFormCode)};
  try {
    var _d = JSON.stringify(${JSON.stringify(seedData)});
    window.__INJECT_DATA__ = JSON.parse(_d);${effectiveStoreKey ? `
    localStorage.setItem(${JSON.stringify(effectiveStoreKey)}, _d);` : ''}
  } catch(e) {}
})();`
  doc.head.appendChild(headScript)

  // Set HTML attributes for initial render / PDF capture (before JS runs)
  doc.querySelectorAll<HTMLElement>('[data-key]').forEach(el => {
    const key = el.dataset.key ?? ''
    const val = (key in savedRaw ? savedRaw[key] : merged[key]) as string | undefined
    if (val === undefined) return
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') {
      const isChecked = String(val) === 'true' || val === '1' || val === 'yes' || val === 'on'
      if (isChecked) el.setAttribute('checked', '')
      else           el.removeAttribute('checked')
    } else {
      el.setAttribute('value', String(val))
    }
  })

  // ── Bake fixed sig-line-cell images directly into src attributes ─────────────
  // The form's loadData() only handles [data-key] inputs; [data-sigkey] elements
  // (Requested by / Inspected by / Witness / Acknowledged) have no restore code.
  // Inlining the base64 src here means Puppeteer renders them with zero JS dependency.
  doc.querySelectorAll<HTMLElement>('[data-sigkey]').forEach(el => {
    const sigKey = el.dataset.sigkey ?? ''
    const sigData = (sigKey in savedRaw ? savedRaw[sigKey] : merged[sigKey]) as string | undefined
    if (!sigData || typeof sigData !== 'string' || !sigData.startsWith('data:')) return
    const img = el.querySelector<HTMLImageElement>('img.sig-preview')
    if (!img) return
    img.setAttribute('src', sigData)
    img.classList.add('has-sig')
    img.style.display = 'block'
  })

  // ── Inject free-placed sig boxes as static absolutely-positioned elements ──
  // These are created by the "Add Signature" feature (Acrobat-style drag placement).
  // They live only in the live DOM (restored from localStorage), so we must bake
  // them into the HTML string here for both Puppeteer and html2canvas export.
  const allMerged = { ...merged, ...savedRaw }
  const rawSigBoxes = (allMerged['sig-boxes']) as unknown
  if (Array.isArray(rawSigBoxes)) {
    const container = doc.querySelector<HTMLElement>('.a4-container')
    if (container) {
      rawSigBoxes.forEach((rec: unknown) => {
        if (!rec || typeof rec !== 'object') return
        const r = rec as { key?: string; x?: number; y?: number; w?: number; h?: number; date?: string }
        const sigKey = r.key ?? ''
        const sigData = (allMerged[sigKey] ?? '') as string
        const boxEl = doc.createElement('div')
        boxEl.style.cssText = [
          'position:absolute',
          `left:${r.x ?? 0}px`,
          `top:${r.y ?? 0}px`,
          `width:${r.w ?? 140}px`,
          `height:${r.h ?? 55}px`,
          'border:none', 'background:none',
          'z-index:20', 'pointer-events:none',
        ].join(';')
        if (sigData && typeof sigData === 'string' && sigData.startsWith('data:')) {
          const imgEl = doc.createElement('img')
          imgEl.src = sigData
          imgEl.style.cssText = 'width:100%;height:100%;object-fit:contain;object-position:bottom center;display:block;'
          boxEl.appendChild(imgEl)
        }
        if (r.date) {
          const dateEl = doc.createElement('div')
          dateEl.style.cssText = 'position:absolute;top:100%;left:50%;transform:translateX(-50%);text-align:center;font-size:11px;white-space:nowrap;'
          dateEl.textContent = r.date
          boxEl.appendChild(dateEl)
        }
        container.appendChild(boxEl)
      })
    }
  }

  // ── Fallback inject() for text fields + dynamic-key checkboxes ────────────
  // Checkboxes in this form get data-key assigned dynamically via DOMContentLoaded,
  // so they are invisible to the querySelectorAll('[data-key]') pass above.
  // This script runs after DOMContentLoaded (when dynamic keys are already set)
  // and applies both text values and checkbox states from the full seedData map.
  const allKeys: Record<string, unknown> = { ...merged, ...savedRaw }
  const filteredMap: Record<string, string> = {}
  // Include statically-keyed elements (same as before)
  doc.querySelectorAll<HTMLElement>('[data-key]').forEach(el => {
    const key = el.dataset.key ?? ''
    const val = (key in savedRaw ? savedRaw[key] : merged[key]) as string | undefined
    if (val !== undefined) filteredMap[key] = String(val)
  })
  // Also include all savedRaw keys so dynamically-assigned checkbox keys are covered
  Object.keys(allKeys).forEach(k => {
    if (!(k in filteredMap)) filteredMap[k] = String((allKeys as Record<string, unknown>)[k])
  })

  const script = doc.createElement('script')
  script.textContent = [
    ';(function(){',
    // Read DATA from window.__INJECT_DATA__ (set by the headScript above).
    // This means rebuildPageHtmlSeed() automatically keeps DATA fresh whenever
    // the user saves from the report modal — no separate DATA literal to update.
    '  var DATA=window.__INJECT_DATA__||{};',
    '  function inject(){',
    '    // 1. Restore [data-key] inputs and checkboxes',
    '    Object.keys(DATA).forEach(function(k){',
    '      var el=document.querySelector(\'[data-key="\'+k+\'"]\');',
    '      if(!el) return;',
    '      if(el.type==="checkbox"){',
    '        var v=DATA[k]; el.checked=(v===true||v==="true"||v==="1"||v==="yes"||v==="on");',
    '      } else {',
    '        el.value=DATA[k];',
    '        // Sync textarea textContent so Puppeteer PDF renders the value',
    '        if(el.tagName==="TEXTAREA") el.textContent=DATA[k];',
    '      }',
    '    });',
    '    // 2. Restore sig-line-cell images (data-sigkey) from data: URI values.',
    '    // The processHtmlForm sigkey pass already handles this statically, but',
    '    // this provides a runtime fallback in case the static pass was skipped.',
    '    Object.keys(DATA).forEach(function(k){',
    '      var v=String(DATA[k]||\'\');',
    '      if(!v.startsWith(\'data:\')) return;',
    '      var sigEl=document.querySelector(\'[data-sigkey="\'+k+\'"]\');',
    '      if(!sigEl) return;',
    '      var img=sigEl.querySelector(\'img.sig-preview\');',
    '      if(!img||img.src===v) return;',
    '      img.src=v; img.classList.add(\'has-sig\'); img.style.display=\'block\';',
    '    });',
    '    // 3. Populate _savedData for forms with dynamic row rendering.',
    '    // localStorage may throw in Puppeteer null-origin; this bypasses it.',
    '    if(typeof window._savedData!=="undefined"){',
    '      Object.assign(window._savedData,DATA);',
    '      try{ if(typeof STORE_KEY!=="undefined") localStorage.setItem(STORE_KEY,JSON.stringify(window._savedData)); }catch(e){}',
    '    }',
    '    // 4. Re-trigger row building for forms that build rows from _savedData.',
    '    if(typeof window.scheduleRepaginate==="function"){ window.scheduleRepaginate(); }',
    '    else if(typeof window.repaginate==="function"){ window.repaginate(); }',
    '  }',
    '  document.addEventListener("DOMContentLoaded",inject);',
    '  if(document.readyState!=="loading") inject();',
    '})();',
  ].join('\n')
  doc.body.appendChild(script)

  return '<!DOCTYPE html>' + doc.documentElement.outerHTML
}

/** Inject assigned images into .photo-cell divs of the Photo Report HTML */
function injectPhotoCells(htmlContent: string, imageUrls: Array<string | null>): string {
  const nonEmpty = imageUrls.filter((u): u is string => !!u)
  if (nonEmpty.length === 0) return htmlContent

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const cells = doc.querySelectorAll('.photo-cell')

  imageUrls.forEach((url, i) => {
    if (i >= cells.length || !url) return
    const img = doc.createElement('img')
    img.src = url
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
    cells[i]!.appendChild(img)
    // Per-photo fit toggle button
    const btn = doc.createElement('button')
    btn.className = 'photo-fit-btn'
    btn.dataset.fitIdx = '0'
    btn.textContent = '\u2B1B Fill'
    cells[i]!.appendChild(btn)
  })

  // Inject CSS for the fit button (hidden by default, shown on hover, hidden in print)
  // Done here so it works regardless of which version of the HTML is uploaded as master form
  const style = doc.createElement('style')
  style.textContent = `
    .photo-cell { position: relative; }
    .photo-fit-btn {
      position: absolute; top: 4px; right: 4px;
      background: rgba(0,0,0,0.55); color: #fff;
      border: none; border-radius: 4px;
      font-size: 10px; font-family: inherit;
      padding: 2px 7px; cursor: pointer;
      z-index: 10; line-height: 1.6;
      opacity: 0; transition: opacity 0.15s;
      pointer-events: none;
    }
    .photo-cell:hover .photo-fit-btn { opacity: 1; pointer-events: auto; }
    .photo-fit-btn:hover { background: rgba(0,0,0,0.80); }
    @media print { .photo-fit-btn { display: none !important; } }
  `
  doc.head.appendChild(style)

  // Inject a self-contained script to wire each button directly (delegation is unreliable for injected elements)
  const script = doc.createElement('script')
  script.textContent = `;(function(){
  var M=[
    {l:'\u2B1B Fill',      s:'width:100%;height:100%;object-fit:cover;display:block;'},
    {l:'\u2194 Fit Width',  s:'width:100%;height:auto;object-fit:contain;display:block;'},
    {l:'\u2195 Fit Height', s:'height:100%;width:auto;object-fit:contain;display:block;'}
  ];
  function wire(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var i=((+(btn.dataset.fitIdx)||0)+1)%3;
      btn.dataset.fitIdx=String(i);
      btn.textContent=M[i].l;
      var img=btn.parentElement&&btn.parentElement.querySelector('img');
      if(img) img.style.cssText=M[i].s;
    });
  }
  function init(){document.querySelectorAll('.photo-fit-btn').forEach(wire);}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();`
  doc.body.appendChild(script)

  return '<!DOCTYPE html>' + doc.documentElement.outerHTML
}

/** Wrap a single image URL in a self-contained A4 HTML page */
function wrapImageInA4(url: string, title: string): string {
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${safe(title)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    @page{size:A4 portrait;margin:0;}
    html,body{width:210mm;height:297mm;overflow:hidden;background:#fff;}
    .a4{width:210mm;height:297mm;display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:4mm;padding:10mm;}
    img{max-width:100%;max-height:calc(297mm - 32mm);object-fit:contain;display:block;}
    .caption{font-size:9pt;color:#555;text-align:center;}
  </style>
</head>
<body>
  <div class="a4">
    <img src="${url}" alt="${safe(title)}"/>
    <div class="caption">${safe(title)}</div>
  </div>
</body>
</html>`
}

// ─── Generate ─────────────────────────────────────────────────────────────────

async function doGenerate() {
  if (selection.value.length === 0 || generating.value) return
  generating.value = true

  try {
    // Always fetch the latest form_data from DB before building pages so that
    // checklist / mat_receive / photo data saved in the preview is included.
    await itrStore.refreshFormData(props.itr.id)
    // Read from the store after refresh — props.itr is a snapshot and may still
    // hold the stale form_data object even after the store has been updated.
    const liveItr = itrStore.itrs.find(i => i.id === props.itr.id) ?? props.itr

    const pages: ReportPage[] = []

    for (const item of selection.value) {
      if (item.type === 'html_form' && item.formCode) {
        let html: string | null = null

        if (item.formCode === 'itr_cover') {
          html = coverRev.value?.html_content ?? null
        } else if (item.formCode === 'photo_report') {
          html = photoRev.value?.html_content ?? null
        } else if (item.formCode === 'mat_receive') {
          html = matReceiveRev.value?.html_content ?? null
        } else {
          html = availableChecklists.value.find(c => c.id === item.formCode)?.html_content ?? null
        }

        if (!html) continue

        if (item.formCode === 'photo_report') {
          // 1. Inject assigned images into .photo-cell divs (per-page slots)
          const slots = photoSlotsMap.value[item.id] ?? Array(8).fill(null)
          html = injectPhotoCells(html, slots)
          // 2. desc-1…desc-4 are written to itr.form_data by setPhotoDesc, so they
          //    will already be present in savedRaw2 after the refresh above.
          //    As a safety fallback, also merge from photoDescsMap (in case the user
          //    typed and clicked Generate before the 600ms debounce fired).
          const fdKey2   = `photo_report__${item.id}`
          const savedRaw2Base = (liveItr.form_data?.[fdKey2] ?? liveItr.form_data?.['photo_report'] ?? {}) as Record<string, unknown>
          const descs = photoDescsMap.value[item.id] ?? []
          const descFallback: Record<string, string> = {}
          for (let d = 0; d < 4; d++) {
            if (descs[d] && !savedRaw2Base[`desc-${d + 1}`]) descFallback[`desc-${d + 1}`] = descs[d]
          }
          const savedRaw2 = { ...savedRaw2Base, ...descFallback }
          const pageSize2 = parsePageSizeMm(html)
          pages.push({ title: item.label, html: processHtmlForm(html, {}, savedRaw2, item.formCode, item.id), formCode: fdKey2, ...pageSize2 })
        } else if (item.formCode === 'mat_receive') {
          const fdKeyM   = `mat_receive__${item.id}`
          const savedRawM = (liveItr.form_data?.[fdKeyM] ?? liveItr.form_data?.['mat_receive'] ?? {}) as Record<string, unknown>
          const pageSizeM = parsePageSizeMm(html)
          pages.push({ title: item.label, html: processHtmlForm(html, {}, savedRawM, item.formCode, item.id), formCode: fdKeyM, ...pageSizeM })
        } else {
          // Checklist — inject photo-cell images if this checklist page has slots assigned
          const checklistSlots = photoSlotsMap.value[item.id]
          if (checklistSlots) {
            html = injectPhotoCells(html, checklistSlots)
          }
          // Per-instance key so page 2 never overwrites page 1
          const fdKeyC   = `${item.formCode}__${item.id}`
          const savedRaw = (liveItr.form_data?.[fdKeyC] ?? liveItr.form_data?.[item.formCode] ?? {}) as Record<string, unknown>
          const pageSizeC = parsePageSizeMm(html)
          pages.push({ title: item.label, html: processHtmlForm(html, {}, savedRaw, item.formCode, item.id), formCode: fdKeyC, ...pageSizeC })
        }

      } else if (item.type === 'pdf_page' && item.fileUrl && item.pageNum !== undefined) {
        const { html, widthMm, heightMm, pdfSourceUrl, pdfSourcePage } = await renderPageToHtml(item.fileUrl, item.pageNum, item.label)
        pages.push({ title: item.label, html, widthMm, heightMm, pdfSourceUrl, pdfSourcePage })

      } else if (item.type === 'image' && item.attachmentUrl) {
        pages.push({ title: item.label, html: wrapImageInA4(item.attachmentUrl, item.label) })
      }
    }

    // Save config before emitting so the selection is persisted even if the modal closes
    await reportPagesStore.saveConfig(props.itr.id, buildConfig())
    hasGeneratedPages.value = true
    emit('generate', pages)
  } catch (err) {
    console.error('[ITRReportPicker] generate error:', err)
  } finally {
    generating.value = false
  }
}

// ─── Save / restore config ───────────────────────────────────────────────────

/** Serialise current selection (with photo extras embedded) into a storable config. */
function buildConfig(): ReportPageConfig {
  return {
    version: 1,
    selection: selection.value.map(item => {
      const saved: SavedPickerItem = {
        id:            item.id,
        type:          item.type,
        label:         item.label,
        formCode:      item.formCode,
        fileUrl:       item.fileUrl,
        pageNum:       item.pageNum,
        attachmentUrl: item.attachmentUrl,
        materialDocNo: item.materialDocNo,
      }
      // Persist photo slots for photo_report AND checklists that have photo cells
      if (photoSlotsMap.value[item.id] !== undefined) {
        saved.photoSlots = photoSlotsMap.value[item.id] ?? []
      }
      // Persist block descriptions for photo_report pages
      if (photoDescsMap.value[item.id] !== undefined) {
        saved.photoDescs = photoDescsMap.value[item.id]
      }
      return saved
    }),
  }
}

/** Restore a saved config, replacing the current selection entirely. */
function restoreConfig(config: ReportPageConfig) {
  selection.value    = []
  photoSlotsMap.value = {}
  photoDescsMap.value = {}
  activePhotoItemId.value = null

  for (const item of config.selection) {
    selection.value.push({
      id:            item.id,
      type:          item.type,
      label:         item.label,
      formCode:      item.formCode,
      fileUrl:       item.fileUrl,
      pageNum:       item.pageNum,
      attachmentUrl: item.attachmentUrl,
      materialDocNo: item.materialDocNo,
    })
    if (item.formCode === 'photo_report') {
      photoSlotsMap.value[item.id]  = item.photoSlots ?? Array(8).fill(null)
      // Always read desc values from itr.form_data — canonical source shared with the HTML form.
      photoDescsMap.value[item.id] = descsFromFormData(item.id)
      activePhotoItemId.value = item.id   // activate last photo page found
    } else if (item.type === 'html_form' && item.formCode &&
               item.formCode !== 'itr_cover' && item.formCode !== 'mat_receive') {
      // Checklist — restore saved slots if any, OR detect photo cells live from HTML
      if (item.photoSlots && item.photoSlots.length > 0) {
        photoSlotsMap.value[item.id] = item.photoSlots
        activePhotoItemId.value = item.id
      } else {
        const checklistHtml = availableChecklists.value.find(c => c.id === item.formCode)?.html_content
        if (checklistHtml) {
          const tmpDoc = new DOMParser().parseFromString(checklistHtml, 'text/html')
          const cellCount = tmpDoc.querySelectorAll('.photo-cell').length
          if (cellCount > 0) {
            photoSlotsMap.value[item.id] = Array(cellCount).fill(null)
            activePhotoItemId.value = item.id
          }
        }
      }
    }
  }
}

// ─── Initialise default selection ────────────────────────────────────────────

onMounted(async () => {
  // Try to restore a previously saved config first
  const saved = await reportPagesStore.loadConfig(props.itr.id)
  if (saved) {
    restoreConfig(saved)
    return
  }

  // No saved config — pre-populate with sensible defaults
  if (coverRev.value?.html_content) {
    selection.value.push({ id: uid(), type: 'html_form', label: 'ITR Cover', formCode: 'itr_cover' })
  }
  if (isMat.value && matReceiveRev.value?.html_content) {
    selection.value.push({ id: uid(), type: 'html_form', label: 'Mat. Receive — page 1', formCode: 'mat_receive' })
  }
  if (photoRev.value?.html_content) {
    const id = uid()
    selection.value.push({ id, type: 'html_form', label: 'Photo Report — page 1', formCode: 'photo_report' })
    photoSlotsMap.value[id] = Array(8).fill(null)
    photoDescsMap.value[id] = descsFromFormData(id)
    activePhotoItemId.value = id
  }
  for (const cl of availableChecklists.value) {
    selection.value.push({ id: uid(), type: 'html_form', label: cl.title, formCode: cl.id })
  }
})
</script>

<style scoped>
.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: opacity 0.15s ease;
}
.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
