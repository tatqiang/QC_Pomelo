<template>
  <!-- Modal backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  >
    <!-- Modal dialog -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <!-- Dialog header -->
      <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
        <!-- Icon -->
        <svg v-if="editTarget" class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        <svg v-else class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <h2 class="text-lg font-semibold text-gray-900 flex-1">
          {{ editTarget ? 'Edit Plan ITR' : 'New Plan ITR' }}
        </h2>
        <!-- Close button -->
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 transition p-1"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Dialog body (scrollable) -->
      <div class="flex-1 overflow-y-auto px-6 py-5">
        <form ref="formRef" @submit.prevent="save">
          <div class="space-y-4">

            <!-- ─── Basic Info ──────────────────────────────── -->
            <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Basic Information
            </div>

            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Title <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.title"
                type="text"
                required
                autofocus
                placeholder="e.g. Concrete Pour Inspection"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
              />
            </div>

            <!-- ITR Number (optional for plan) + Type -->
            <div class="grid grid-cols-12 gap-3">
              <div class="col-span-12 sm:col-span-5">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ITR Number
                </label>
                <input
                  v-model="form.itr_number"
                  type="text"
                  placeholder="(optional — filled later by QC)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                />
              </div>
              <div class="col-span-12 sm:col-span-7">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Inspection Type
                </label>
                <select
                  v-model="form.itr_type_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                >
                  <option :value="null">Select type...</option>
                  <option
                    v-for="opt in itrTypeStore.options"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.title }}
                  </option>
                </select>
                <p v-if="itrTypeStore.itrTypes.length === 0" class="text-xs text-gray-500 mt-1">
                  No ITR types — go to ITR Types to set them up
                </p>
              </div>
            </div>

            <!-- Drawing Number + Revision Number -->
            <div class="grid grid-cols-12 gap-3">
              <div class="col-span-12 sm:col-span-8">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Drawing Number
                </label>
                <input
                  v-model="form.drawing_number"
                  type="text"
                  placeholder="e.g. DWG-E-001"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                />
              </div>
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Revision No.
                </label>
                <input
                  v-model="form.revision_number"
                  type="text"
                  placeholder="e.g. Rev.A"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                />
              </div>
            </div>

            <!-- Discipline -->
            <div class="grid grid-cols-12 gap-3">
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Discipline
                </label>
                <select
                  v-model="form.discipline_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                >
                  <option :value="null">Select discipline...</option>
                  <option
                    v-for="opt in disciplineStore.options"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.title }}
                  </option>
                </select>
                <p v-if="disciplineStore.disciplines.length === 0" class="text-xs text-gray-500 mt-1">
                  No disciplines — go to Disciplines to set them up
                </p>
              </div>

              <!-- Requested Inspection Date & Time -->
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Planned Inspection Date & Time
                </label>
                <DateTimePicker v-model="form.planned_inspection_date" />
                <p class="text-xs text-gray-500 mt-1">
                  Date and time you are requesting for the inspection
                </p>
              </div>
            </div>

            <!-- ─── Task & Location ─────────────────────────── -->
            <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mt-6 mb-2">
              Task & Location
            </div>

            <!-- Linked Task -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Linked Task
              </label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <select
                  v-model="form.task_id"
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                >
                  <option :value="null">Select task...</option>
                  <option
                    v-for="opt in taskItems"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.title }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Linked Areas + Location -->
            <div class="grid grid-cols-12 gap-3">
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Linked Areas
                </label>
                <div class="border border-gray-300 rounded-md max-h-36 overflow-y-auto px-2 py-1 space-y-0.5 bg-white">
                  <p v-if="areaItems.length === 0" class="text-xs text-gray-400 py-2">
                    No areas yet — go to Areas menu to set up locations
                  </p>
                  <label v-for="opt in areaItems" :key="opt.value"
                    class="flex items-center gap-2 py-0.5 px-1 text-sm rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" :value="opt.value" v-model="form.area_ids"
                      class="rounded border-gray-300 text-[#81938A] focus:ring-[#81938A]" />
                    <span class="text-gray-800">{{ opt.title }}</span>
                  </label>
                </div>
              </div>

              <!-- Location -->
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  v-model="form.location"
                  type="text"
                  placeholder="e.g. Level 3, Grid C-4"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                />
              </div>
            </div>

            <!-- ─── ITP Selection ───────────────────────────── -->
            <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mt-6 mb-2">
              Inspection & Test Plan (ITP)
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Select ITP
                <span v-if="form.discipline_id" class="ml-1 text-xs font-normal text-[#81938A]">(filtered by discipline)</span>
              </label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <input
                  v-model="itpSearch"
                  type="text"
                  :placeholder="form.itp_id ? '' : 'Search by doc no or title…'"
                  class="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
                  @focus="itpDropOpen = true"
                  @blur="closeItpDrop"
                />
                <span
                  v-if="form.itp_id && !itpSearch"
                  class="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-gray-800 pointer-events-none truncate max-w-[calc(100%-5rem)]"
                >{{ itpSelectedLabel }}</span>
                <button
                  v-if="form.itp_id"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  @mousedown.prevent
                  @click="clearItp"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
                <div
                  v-if="itpDropOpen"
                  class="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
                >
                  <div v-if="filteredItps.length === 0" class="px-3 py-2 text-sm text-gray-400">
                    No ITPs match
                  </div>
                  <button
                    v-for="itp in filteredItps"
                    :key="itp.id"
                    type="button"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-[#81938A]/10 transition"
                    :class="form.itp_id === itp.id ? 'bg-[#81938A]/15 font-medium' : ''"
                    @mousedown.prevent
                    @click="selectItp(itp)"
                  >
                    <span class="font-medium text-gray-700">{{ itp.doc_no }}</span>
                    <span class="text-gray-500 ml-1">— {{ itp.title }}</span>
                  </button>
                </div>
              </div>
              <p v-if="itpStore.itps.length === 0" class="text-xs text-gray-500 mt-1">
                No ITPs — go to ITPs menu to import
              </p>
            </div>

            <!-- ─── Material Approval Documents ─────────────────────────── -->
            <template v-if="isMatType">
              <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mt-6 mb-2">
                Material Approval Documents
              </div>
              <!-- Selected list -->
              <div v-if="selectedMaterialIds.length" class="space-y-1 mb-2">
                <div
                  v-for="mid in selectedMaterialIds" :key="mid"
                  class="flex items-center justify-between px-3 py-1.5 bg-[#81938A]/10 rounded-lg text-sm"
                >
                  <span class="font-medium text-gray-800 truncate">{{ getMaterialLabel(mid) }}</span>
                  <button
                    type="button"
                    class="ml-2 shrink-0 text-gray-400 hover:text-red-400 transition"
                    @click="removeMaterialFromList(mid)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Browse button -->
              <button type="button" @click="openMatPicker"
                class="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-[#81938A] hover:text-[#81938A] transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
                Browse all materials…
              </button>
              <p v-if="materialStore.materials.length === 0" class="text-xs text-gray-500 mt-1">
                No materials — go to Materials menu to import
              </p>
            </template>

            <!-- ─── File Attachments ────────────────────────── -->
            <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mt-6 mb-2">
              Attachments (optional)
            </div>

            <!-- Drawing files -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v13h12V6h-3a1 1 0 110-2h4a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"/>
                </svg>
                <span class="text-sm font-medium text-gray-700">Drawing Files</span>
                <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">PDF / Image</span>
              </div>

              <!-- Existing saved drawings (edit mode) -->
              <div v-for="att in existingDrawings" :key="att.id" class="flex items-center gap-2 mb-1.5 text-sm">
                <svg class="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-gray-700 truncate flex-1">{{ att.file_name }}</span>
                <span class="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">saved</span>
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700 p-0.5"
                  @click="removeExistingAttachment(att.id)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Pending new drawings -->
              <div v-for="(f, i) in pendingDrawings" :key="'dr-'+i" class="flex items-center gap-2 mb-1.5 text-sm">
                <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span class="text-gray-700 truncate flex-1">{{ f.name }}</span>
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700 p-0.5"
                  @click="pendingDrawings.splice(i,1)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[#81938A]/10 text-[#81938A] rounded-md hover:bg-[#81938A]/20 transition"
                @click="drawingInputRef?.click()"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                Add Drawing
              </button>
              <input ref="drawingInputRef" type="file" class="hidden" accept=".pdf,image/*" multiple @change="onFilePick($event, pendingDrawings)" />
            </div>

            <!-- DO files (only if MAT type) -->
            <div v-if="isMatType" class="mt-4">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
                <span class="text-sm font-medium text-gray-700">Delivery Order (DO) Files</span>
                <span class="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">Required for MAT</span>
              </div>

              <!-- Existing saved DOs -->
              <div v-for="att in existingDOs" :key="att.id" class="flex items-center gap-2 mb-1.5 text-sm">
                <svg class="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-gray-700 truncate flex-1">{{ att.file_name }}</span>
                <span class="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">saved</span>
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700 p-0.5"
                  @click="removeExistingAttachment(att.id)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Pending new DOs -->
              <div v-for="(f, i) in pendingDOs" :key="'do-'+i" class="flex items-center gap-2 mb-1.5 text-sm">
                <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span class="text-gray-700 truncate flex-1">{{ f.name }}</span>
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700 p-0.5"
                  @click="pendingDOs.splice(i,1)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[#81938A]/10 text-[#81938A] rounded-md hover:bg-[#81938A]/20 transition"
                @click="doInputRef?.click()"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                Add DO File
              </button>
              <input ref="doInputRef" type="file" class="hidden" accept=".pdf,image/*" multiple @change="onFilePick($event, pendingDOs)" />
            </div>

            <!-- Additional files -->
            <div class="mt-4">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                <span class="text-sm font-medium text-gray-700">Additional Files</span>
              </div>

              <!-- Existing saved additional files -->
              <div v-for="att in existingAdditional" :key="att.id" class="flex items-center gap-2 mb-1.5 text-sm">
                <svg class="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-gray-700 truncate flex-1">{{ att.file_name }}</span>
                <span class="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">saved</span>
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700 p-0.5"
                  @click="removeExistingAttachment(att.id)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Pending new additional files -->
              <div v-for="(f, i) in pendingAdditional" :key="'ad-'+i" class="flex items-center gap-2 mb-1.5 text-sm">
                <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span class="text-gray-700 truncate flex-1">{{ f.name }}</span>
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700 p-0.5"
                  @click="pendingAdditional.splice(i,1)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[#81938A]/10 text-[#81938A] rounded-md hover:bg-[#81938A]/20 transition"
                @click="additionalInputRef?.click()"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                Add File
              </button>
              <input ref="additionalInputRef" type="file" class="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" multiple @change="onFilePick($event, pendingAdditional)" />
            </div>

            <!-- Notes -->
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                v-model="form.notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent resize-y"
              ></textarea>
            </div>
          </div>
        </form>
      </div>

      <!-- Upload progress -->
      <div v-if="uploading" class="h-1 bg-gray-200">
        <div class="h-full bg-[#81938A] animate-pulse"></div>
      </div>

      <!-- Dialog footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
          @click="close"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#81938A] hover:bg-[#6b7a72] rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="itrStore.loading || uploading"
          @click="save"
        >
          <svg v-if="itrStore.loading || uploading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
          </svg>
          {{ editTarget ? 'Save Plan' : 'Create Plan ITR' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ── Material Picker Modal ─────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="matPickerOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="matPickerOpen = false" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style="max-height: 80vh">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <h3 class="font-semibold text-gray-900">Select Materials</h3>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-600 p-1 rounded" @click="matPickerOpen = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Discipline filter chips -->
        <div class="px-4 pt-3 pb-2 flex gap-1.5 flex-wrap border-b border-gray-50">
          <button type="button"
            class="px-2.5 py-1 text-xs font-medium rounded-full border transition"
            :class="matPickerDisc === null ? 'bg-[#81938A] text-white border-[#81938A]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#81938A]'"
            @click="matPickerDisc = null"
          >All</button>
          <button
            v-for="d in disciplineStore.options" :key="d.value"
            type="button"
            class="px-2.5 py-1 text-xs font-medium rounded-full border transition"
            :class="matPickerDisc === d.value ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'"
            :style="matPickerDisc === d.value ? { background: d.color ?? '#81938A', borderColor: d.color ?? '#81938A' } : {}"
            @click="matPickerDisc = d.value"
          >{{ d.title.split(' — ')[0] }}</button>
        </div>
        <!-- Search -->
        <div class="px-4 py-2 border-b border-gray-100">
          <input v-model="matPickerSearch" type="text" placeholder="Search doc no or title…"
            class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
        </div>
        <!-- Result count -->
        <div class="px-4 py-1 text-xs text-gray-400">{{ pickerFilteredMaterials.length }} material{{ pickerFilteredMaterials.length === 1 ? '' : 's' }}</div>
        <!-- List -->
        <div class="flex-1 overflow-y-auto px-2 pb-3">
          <div v-if="pickerFilteredMaterials.length === 0" class="text-center text-sm text-gray-400 py-10">No materials match</div>
          <button
            v-for="mat in pickerFilteredMaterials"
            :key="mat.id"
            type="button"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-[#81938A]/10 transition mb-0.5"
            :class="selectedMaterialIds.includes(mat.id) ? 'bg-[#81938A]/15 ring-1 ring-[#81938A]/40' : ''"
            @click="selectedMaterialIds.includes(mat.id) ? removeMaterialFromList(mat.id) : addMaterialToList(mat.id)"
          >
            <div class="flex items-start gap-2">
              <div class="flex-1 min-w-0">
                <span class="font-semibold text-gray-800">{{ mat.doc_no }}</span>
                <span class="text-gray-500 ml-1">— {{ mat.title }}</span>
              </div>
              <svg v-if="selectedMaterialIds.includes(mat.id)" class="w-4 h-4 text-[#81938A] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        </div>
        <!-- Footer -->
        <div class="px-4 py-3 border-t border-gray-100 flex justify-between items-center shrink-0">
          <span class="text-xs text-gray-400">{{ selectedMaterialIds.length }} selected</span>
          <button type="button" @click="matPickerOpen = false"
            class="px-4 py-1.5 bg-[#81938A] text-white rounded-lg text-sm font-medium hover:bg-[#6f8078] transition">
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useItrStore, type ITR, type AttachmentCategory } from '@/stores/itrStore'
import { useItrStatusStore } from '@/stores/itrStatusStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAreaStore } from '@/stores/areaStore'
import { useProjectStore } from '@/stores/projectStore'
import { useDisciplineStore } from '@/stores/disciplineStore'
import { useItrTypeStore } from '@/stores/itrTypeStore'
import { useItpStore } from '@/stores/itpStore'
import { useMaterialStore } from '@/stores/materialStore'
import { useAuthStore } from '@/stores/authStore'
import DateTimePicker from '@/components/DateTimePicker.vue'
// ── Datetime helpers (split/combine ISO local strings YYYY-MM-DDTHH:mm) ──────
function dtDate(val: string) { return val ? (val.split('T')[0] ?? '') : '' }
function dtTime(val: string) { return val ? (val.split('T')[1] ?? '') : '' }
function dtSet(val: string, part: 'date' | 'time', newVal: string) {
  const d = part === 'date' ? newVal : dtDate(val)
  const t = part === 'time' ? newVal : dtTime(val)
  return d ? (t ? `${d}T${t}` : d) : ''
}
const props = defineProps<{
  modelValue: boolean
  editTarget?: ITR | null
  preFill?: Record<string, any> | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': [itr: ITR]
}>()

const itrStore         = useItrStore()
const itrStatusStore   = useItrStatusStore()
const taskStore        = useTaskStore()
const areaStore        = useAreaStore()
const projectStore     = useProjectStore()
const disciplineStore  = useDisciplineStore()
const itrTypeStore     = useItrTypeStore()
const itpStore         = useItpStore()
const materialStore    = useMaterialStore()
const authStore        = useAuthStore()
const formRef          = ref()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ── Select options ─────────────────────────────────────────────────────────────

const taskItems = computed(() =>
  taskStore.flatAll.map(t => ({
    title: `${t.wbs_code ? t.wbs_code + ' — ' : ''}${t.name}`,
    value: t.id,
  }))
)

const areaItems = computed(() =>
  areaStore.flatAll.map(a => ({
    title: `${'— '.repeat(a.level)}${a.name}${a.code ? ` (${a.code})` : ''}`,
    value: a.id,
  }))
)

const itpItems = computed(() =>
  itpStore.itps.map(p => ({
    title: `${p.doc_no} — ${p.title}`,
    value: p.id,
  }))
)

const materialItems = computed(() =>
  materialStore.materials.map(m => ({
    title: `${m.doc_no} — ${m.title}`,
    value: m.id,
  }))
)

// ── Searchable ITP combobox ───────────────────────────────────────────────────

const itpSearch   = ref('')
const itpDropOpen = ref(false)
const closeItpDrop = () => { setTimeout(() => { itpDropOpen.value = false }, 150) }

const filteredItps = computed(() => {
  let list = itpStore.itps
  if (form.discipline_id) {
    list = list.filter(p => p.discipline_id === form.discipline_id)
  }
  const q = itpSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter(p =>
      p.doc_no?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q)
    )
  }
  return list
})

const itpSelectedLabel = computed(() => {
  if (!form.itp_id) return ''
  const itp = itpStore.itps.find(p => p.id === form.itp_id)
  return itp ? `${itp.doc_no} — ${itp.title}` : ''
})

const selectItp = (itp: { id: string; doc_no: string; title: string }) => {
  form.itp_id = itp.id
  itpSearch.value = ''
  itpDropOpen.value = false
}

const clearItp = () => {
  form.itp_id = null
  itpSearch.value = ''
}

// ── Multi-material list ───────────────────────────────────────────────────────

const materialSearch   = ref('')
const materialDropOpen = ref(false)
const closeMaterialDrop = () => { setTimeout(() => { materialDropOpen.value = false }, 150) }
const matPickerOpen    = ref(false)
const matPickerDisc    = ref<string | null>(null)
const matPickerSearch  = ref('')

const openMatPicker = () => {
  matPickerDisc.value   = form.discipline_id ?? null
  matPickerSearch.value = ''
  matPickerOpen.value   = true
}

const pickerFilteredMaterials = computed(() => {
  let list = materialStore.materials
  if (matPickerDisc.value) list = list.filter(m => m.discipline_id === matPickerDisc.value)
  const q = matPickerSearch.value.trim().toLowerCase()
  if (q) list = list.filter(m => m.doc_no?.toLowerCase().includes(q) || m.title?.toLowerCase().includes(q))
  return list
})

const filteredMaterials = computed(() => {
  let list = materialStore.materials
  if (form.discipline_id) {
    list = list.filter(m => m.discipline_id === form.discipline_id)
  }
  const q = materialSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter(m =>
      m.doc_no?.toLowerCase().includes(q) || m.title?.toLowerCase().includes(q)
    )
  }
  return list
})

const getMaterialLabel = (materialId: string): string => {
  const mat = materialStore.materials.find(m => m.id === materialId)
  return mat ? `${mat.doc_no} — ${mat.title}` : materialId
}

const addMaterialToList = (materialId: string) => {
  if (!selectedMaterialIds.value.includes(materialId)) {
    selectedMaterialIds.value.push(materialId)
  }
  materialSearch.value = ''
  materialDropOpen.value = false
}

const removeMaterialFromList = (materialId: string) => {
  selectedMaterialIds.value = selectedMaterialIds.value.filter(id => id !== materialId)
}

/** Check if selected ITR type has code "MAT" */
const isMatType = computed(() => {
  if (!form.itr_type_id) return false
  const t = itrTypeStore.itrTypes.find(x => x.id === form.itr_type_id)
  return t?.code?.toUpperCase() === 'MAT'
})

// ── Pending files (not yet uploaded — stored locally until save) ──────────────

const pendingDrawings   = ref<File[]>([])
const pendingDOs        = ref<File[]>([])
const pendingAdditional = ref<File[]>([])
const uploading         = ref(false)

const drawingInputRef    = ref<HTMLInputElement | null>(null)
const doInputRef         = ref<HTMLInputElement | null>(null)
const additionalInputRef = ref<HTMLInputElement | null>(null)

const onFilePick = (e: Event, fileList: { value: File[] } | File[]) => {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const target = Array.isArray(fileList) ? fileList : (fileList as any)
  for (const f of Array.from(input.files)) {
    target.push(f)
  }
  input.value = ''
}

// ── Existing attachments (edit mode) ──────────────────────────────────────────

const liveEditTarget = computed(() => {
  if (!props.editTarget) return null
  return itrStore.itrs.find(i => i.id === props.editTarget!.id) ?? props.editTarget
})

const draftStatusId = computed(() => itrStatusStore.getByCode('plan')?.id ?? null)

const existingDrawings = computed(() =>
  liveEditTarget.value?.itr_attachments.filter(a => a.category === 'drawing' && a.status_id === draftStatusId.value) ?? []
)
const existingDOs = computed(() =>
  liveEditTarget.value?.itr_attachments.filter(a => a.category === 'do' && a.status_id === draftStatusId.value) ?? []
)
const existingAdditional = computed(() =>
  liveEditTarget.value?.itr_attachments.filter(a => a.category === 'additional' && a.status_id === draftStatusId.value) ?? []
)

const removeExistingAttachment = async (attachmentId: string) => {
  if (!liveEditTarget.value) return
  await itrStore.deleteAttachment(liveEditTarget.value.id, attachmentId)
}

// ── Form ──────────────────────────────────────────────────────────────────────

const form = reactive({
  title:           '',
  itr_number:      '',
  itr_type_id:     null as string | null,
  discipline_id:   null as string | null,
  task_id:         null as string | null,
  area_ids:        [] as string[],
  itp_id:          null as string | null,
  location:                '',
  notes:                   '',
  planned_inspection_date: '',
  drawing_number:          '',
  revision_number:         '',
})

const selectedMaterialIds = ref<string[]>([])

const resetForm = () => {
  Object.assign(form, {
    title: '', itr_number: '', itr_type_id: null, discipline_id: null,
    task_id: null, area_ids: [], itp_id: null,
    location: '', notes: '', planned_inspection_date: '',
    drawing_number: '', revision_number: '',
  })
  selectedMaterialIds.value = []
  pendingDrawings.value = []
  pendingDOs.value = []
  pendingAdditional.value = []
  itpSearch.value = ''
  itpDropOpen.value = false
  materialSearch.value = ''
  materialDropOpen.value = false
}

watch(isOpen, async (open) => {
  if (!open) return

  // Ensure dependent data are loaded
  const pid = projectStore.activeProject?.id
  if (pid) {
    await Promise.all([
      itrTypeStore.itrTypes.length === 0    ? itrTypeStore.fetchItrTypes(pid)      : Promise.resolve(),
      itpStore.itps.length === 0            ? itpStore.fetchItps(pid)              : Promise.resolve(),
      materialStore.materials.length === 0  ? materialStore.fetchMaterials(pid)    : Promise.resolve(),
      itrStatusStore.statuses.length === 0  ? itrStatusStore.fetchStatuses(pid)   : Promise.resolve(),
    ])
  }

  if (props.editTarget) {
    const t = props.editTarget
    Object.assign(form, {
      title: t.title,
      itr_number: t.itr_number ?? '',
      itr_type_id: t.itr_type_id ?? null,
      discipline_id: t.discipline_id ?? null,
      task_id: t.task_id,
      area_ids: t.area_ids ?? (t.area_id ? [t.area_id] : []),
      itp_id: t.itp_id ?? null,
      location: t.location ?? '',
      notes: t.notes ?? '',
      planned_inspection_date: t.planned_inspection_date ?? '',
      drawing_number: t.drawing_number ?? '',
      revision_number: t.revision_number ?? '',
    })
    selectedMaterialIds.value = (t.itr_materials ?? []).map(im => im.material_id)
  } else if (props.preFill) {
    resetForm()
    Object.assign(form, props.preFill)
  } else {
    resetForm()
  }
})

// Auto-check areas from linked task when creating a new ITR
watch(() => form.task_id, (taskId) => {
  if (props.editTarget) return // don't override when editing existing
  if (!taskId) { form.area_ids = []; return }
  const task = taskStore.flatAll.find(t => t.id === taskId)
  if (task?.area_ids?.length) form.area_ids = [...task.area_ids]
})

const close = () => {
  isOpen.value = false
  nextTick(() => resetForm())
}

const save = async () => {
  if (!form.title.trim()) return
  const project = projectStore.activeProject
  if (!project) return

  // Get plan status id
  const draftStatus = itrStatusStore.getByCode('plan')

  const payload = {
    title:           form.title.trim(),
    itr_number:      form.itr_number.trim() || null,
    itr_type_id:     form.itr_type_id || null,
    discipline_id:   form.discipline_id || null,
    task_id:         form.task_id || null,
    area_id:         form.area_ids[0] || null,
    area_ids:        form.area_ids,
    itp_id:          form.itp_id || null,
    location:                form.location.trim() || null,
    notes:                   form.notes.trim() || null,
    planned_inspection_date: form.planned_inspection_date || null,
    drawing_number:          form.drawing_number.trim() || null,
    revision_number:         form.revision_number.trim() || null,
    status_id:       draftStatus?.id ?? null,
    draft_by:        authStore.userId,
    draft_at:        new Date().toISOString(),
  }

  let result: ITR | null = null
  if (props.editTarget) {
    result = await itrStore.updateITR(props.editTarget.id, payload)
  } else {
    result = await itrStore.createITR({ ...payload, project_id: project.id })
  }

  if (!result) return

  // Sync material links (junction table)
  const existingMaterials = props.editTarget
    ? (itrStore.itrs.find(i => i.id === props.editTarget!.id)?.itr_materials ?? [])
    : []
  const existingMids = existingMaterials.map(im => im.material_id)
  const matsToAdd    = selectedMaterialIds.value.filter(id => !existingMids.includes(id))
  const matsToRemove = existingMaterials.filter(im => !selectedMaterialIds.value.includes(im.material_id))
  await Promise.all([
    ...matsToAdd.map(mid => itrStore.addItrMaterial(result!.id, mid)),
    ...matsToRemove.map(im => itrStore.removeItrMaterial(result!.id, im.id)),
  ])

  // Upload pending files
  const totalFiles = pendingDrawings.value.length + pendingDOs.value.length + pendingAdditional.value.length
  if (totalFiles > 0) {
    uploading.value = true
    const userId = authStore.userId

    const uploadBatch = async (files: File[], category: AttachmentCategory) => {
      for (const file of files) {
        await itrStore.addAttachment(result!, file, userId, category, draftStatus?.id ?? null)
      }
    }

    await Promise.all([
      uploadBatch(pendingDrawings.value, 'drawing'),
      uploadBatch(pendingDOs.value, 'do'),
      uploadBatch(pendingAdditional.value, 'additional'),
    ])
    uploading.value = false
  }

  emit('saved', result)
  close()
}
</script>
