<template>
  <!-- Modal backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4 pt-4 pb-20 sm:p-4"
  >
    <!-- Modal dialog -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[calc(100vh-6rem)] sm:max-h-[90vh] flex flex-col" style="min-height: 560px;">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="flex items-center gap-2 px-6 py-4 border-b border-gray-200 flex-wrap">
        <svg class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <span class="text-lg font-semibold text-gray-900 truncate" style="max-width: 380px;">
          {{ isNew ? 'New Plan ITR' : (liveItr?.item_no ? liveItr.item_no + ' — ' : (liveItr?.itr_number ? liveItr.itr_number + ' — ' : '')) + (liveItr?.title ?? 'ITR') }}
        </span>
        <div class="flex-1" />
        <span
          v-if="!isNew && liveItr"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mr-2"
          :style="`background: ${itrStatusStore.getColor(liveItr.status_id)}20; color: ${itrStatusStore.getColor(liveItr.status_id)}`"
        >
          {{ itrStatusStore.getLabel(liveItr.status_id) }}
        </span>
        <!-- Comments toggle button (only for existing ITRs) -->
        <button
          v-if="!isNew && liveItr"
          type="button"
          :class="[
            'relative p-1.5 rounded-lg transition-colors mr-1',
            showComments ? 'bg-[#81938A]/15 text-[#81938A]' : 'text-gray-400 hover:text-[#81938A] hover:bg-gray-100'
          ]"
          title="Comments"
          @click="showComments = !showComments; console.log('[ITRModal] showComments:', showComments, 'liveItr.id:', liveItr?.id)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <!-- Comment count badge -->
          <span
            v-if="itrCommentStore.comments.length > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[#81938A] text-white text-[9px] font-bold flex items-center justify-center px-0.5"
          >{{ itrCommentStore.comments.length }}</span>
        </button>
        <button type="button" class="text-gray-400 hover:text-gray-600 transition p-1" @click="close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ── Tabs (hidden in create mode) ─────────────────────────────── -->
      <div v-if="!isNew && !showComments" class="flex border-b border-gray-200">
        <button
          type="button"
          :class="['flex-1 py-3 text-sm font-semibold border-b-2 transition',
            activeTab === 'request_itr'
              ? 'border-[#81938A] text-[#81938A] bg-[#81938A]/10'
              : 'border-transparent text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700']"
          @click="activeTab = 'request_itr'; editMode = false"
        >REQUEST ITR</button>
        <button
          type="button"
          :class="['flex-1 py-3 text-sm font-semibold border-b-2 transition',
            activeTab === 'inspection_report'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-700']"
          @click="activeTab = 'inspection_report'; editMode = false"
        >INSPECTION &amp; REPORT</button>
      </div>

      <!-- ── Scrollable form content ────────────────────────────────────── -->
      <!-- Comments panel (replaces form content when open) -->
      <div v-if="showComments && liveItr" class="flex-1 min-h-0 relative overflow-hidden">
        <ITRComments :itrId="liveItr.id" @close="showComments = false" />
      </div>

      <div v-if="!showComments" class="flex-1 overflow-y-auto px-6 py-5" style="min-height: 360px;">

        <!-- ═══ PLAN / REQUEST ITR FORM ═════════════════════════════════ -->
        <div v-if="activeTab === 'request_itr' || isNew">
          <form ref="draftFormRef" @submit.prevent class="space-y-3">
              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1">Basic Information</div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input v-model="requestForm.req_title" type="text" required :readonly="!isDraftEditable"
                  :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div class="sm:col-span-5">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Item No <span class="text-gray-400 font-normal">(internal)</span></label>
                  <div class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-mono text-[#81938A] font-semibold min-h-[2rem]">
                    {{ liveItr?.item_no ?? '(auto on save)' }}
                  </div>
                </div>
                <div class="sm:col-span-7">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Inspection Type</label>
                  <select v-model="requestForm.req_itr_type_id" :disabled="!isDraftEditable"
                    :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                    class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                    <option :value="null">— None —</option>
                    <option v-for="o in itrTypeStore.options" :key="o.value" :value="o.value">{{ o.title }}</option>
                  </select>
                </div>
              </div>
              <!-- External ITR Number -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">ITR Number <span class="text-gray-400 font-normal">(external — filled by external team)</span></label>
                <input v-model="requestForm.req_itr_number" type="text" :readonly="!isDraftEditable" placeholder="e.g. CHN1A-ITR-00XX"
                  :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
              <!-- Drawing Number + Revision Number -->
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div class="sm:col-span-8">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Drawing Number</label>
                  <input v-model="requestForm.req_drawing_number" type="text" :readonly="!isDraftEditable" placeholder="e.g. DWG-E-001"
                    :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                    class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
                </div>
                <div class="sm:col-span-4">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Revision No.</label>
                  <input v-model="requestForm.req_revision_number" type="text" :readonly="!isDraftEditable" placeholder="e.g. Rev.A"
                    :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                    class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Discipline</label>
                  <select v-model="requestForm.req_discipline_id" :disabled="!isDraftEditable"
                    :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                    class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                    <option :value="null">— None —</option>
                    <option v-for="o in disciplineStore.options" :key="o.value" :value="o.value">{{ o.title }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Planned Inspection Date & Time</label>
                  <DateTimePicker v-model="requestForm.req_planned_inspection_date" :readonly="!isDraftEditable" />
                </div>
              </div>

              <!-- Opened by (read-only info row) -->
              <div v-if="!isNew && draftByName" class="flex items-center gap-1.5 text-xs text-gray-500 pt-0.5">
                <span class="mdi mdi-account-outline text-base leading-none"></span>
                <span>Opened by <span class="font-semibold text-gray-700">{{ draftByName }}</span></span>
                <template v-if="liveItr?.draft_at">
                  <span class="text-gray-300">·</span>
                  <span>{{ new Date(liveItr.draft_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
                </template>
              </div>

              <!-- QC in Charge -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">QC in Charge</label>

                <!-- Selected chips (both modes) -->
                <div v-if="localQcUserIds.length" class="flex flex-wrap gap-1.5 mb-1.5">
                  <span
                    v-for="uid in localQcUserIds" :key="uid"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200"
                  >
                    <span class="mdi mdi-account-check text-sm leading-none"></span>
                    {{ qcMemberLabel(uid) }}
                    <button v-if="isDraftEditable" type="button" @click="localQcUserIds = localQcUserIds.filter(id => id !== uid)"
                      class="ml-0.5 text-teal-400 hover:text-red-500 transition leading-none">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </span>
                </div>
                <div v-else-if="!isDraftEditable" class="text-xs text-gray-400 italic">— None assigned —</div>

                <!-- Edit mode: searchable dropdown -->
                <div v-if="isDraftEditable" class="relative">
                  <div class="flex items-center gap-1.5 border border-gray-300 bg-white rounded px-2.5 py-1.5">
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                    </svg>
                    <input
                      v-model="qcSearch"
                      type="text"
                      placeholder="Search QC member…"
                      class="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                      @focus="qcDropOpen = true"
                      @blur="setTimeout(() => { qcDropOpen = false }, 150)"
                    />
                  </div>
                  <!-- Dropdown -->
                  <div v-if="qcDropOpen"
                    class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto"
                  >
                    <p v-if="qcFilteredMembers.length === 0" class="text-xs text-gray-400 px-3 py-2">No QC members found</p>
                    <button
                      v-for="m in qcFilteredMembers" :key="m.user_id"
                      type="button"
                      :disabled="localQcUserIds.includes(m.user_id)"
                      class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-teal-50 transition disabled:opacity-40 disabled:cursor-default"
                      @mousedown.prevent="localQcUserIds.includes(m.user_id) ? null : (localQcUserIds.push(m.user_id), qcSearch = '', qcDropOpen = false)"
                    >
                      <span class="flex-1 text-gray-800 font-medium">
                        {{ m.first_name ? (m.first_name + (m.last_name ? ' ' + m.last_name : '')) : m.email }}
                      </span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 shrink-0">{{ qcMemberRoleBadge(m) }}</span>
                      <svg v-if="localQcUserIds.includes(m.user_id)" class="w-3.5 h-3.5 text-teal-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">Task & Location</div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Linked Task</label>
                <select v-model="requestForm.req_task_id" :disabled="!isDraftEditable"
                  :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                  <option :value="null">— None —</option>
                  <option v-for="o in taskItems" :key="o.value" :value="o.value">{{ o.title }}</option>
                </select>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Linked Areas</label>
                  <div :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                    class="border rounded max-h-32 overflow-y-auto px-2 py-1 space-y-0.5">
                    <p v-if="areaItems.length === 0" class="text-xs text-gray-400 py-1">No areas set up</p>
                    <label v-for="o in areaItems" :key="o.value"
                      class="flex items-center gap-2 py-0.5 px-1 text-xs rounded hover:bg-gray-50 cursor-pointer"
                      :class="!isDraftEditable ? 'pointer-events-none opacity-60' : ''">
                      <input type="checkbox" :value="o.value" v-model="requestForm.req_area_ids"
                        :disabled="!isDraftEditable"
                        class="rounded border-gray-300 text-[#81938A] focus:ring-[#81938A]" />
                      <span class="text-gray-800">{{ o.title }}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input v-model="requestForm.req_location" type="text" :readonly="!isDraftEditable" placeholder="e.g. Level 3, Grid C-4"
                    :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                    class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
                </div>
              </div>

              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">Inspection & Test Plan</div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Select ITP</label>
                <!-- Read-only display -->
                <div v-if="!isDraftEditable" class="text-sm text-gray-900">
                  {{ requestForm.req_itp_id ? reqItpSelectedLabel : '— None —' }}
                </div>
                <!-- Editable: material-style -->
                <div v-else>
                  <div v-if="requestForm.req_itp_id" class="flex items-center justify-between px-2 py-1 bg-[#81938A]/10 rounded text-sm mb-1.5">
                    <span class="font-medium text-gray-800 truncate">{{ reqItpSelectedLabel }}</span>
                    <button type="button" class="ml-2 shrink-0 text-gray-400 hover:text-red-400 transition" @click="requestForm.req_itp_id = null">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <button type="button" @click="openItpPicker('request')"
                    class="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-[#81938A] hover:text-[#81938A] transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                    </svg>
                    Browse ITP…
                  </button>
                </div>
              </div>
              <template v-if="isMatType">
                <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">Material Approval Documents</div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-gray-600">Linked Materials</span>
                  </div>
                  <!-- Read-only display -->
                  <div v-if="!isDraftEditable">
                    <div v-if="!localMaterialIds.length" class="text-sm text-gray-400">— None —</div>
                    <div v-for="mid in localMaterialIds" :key="mid"
                      class="text-sm text-gray-900 py-0.5"
                    >{{ getMaterialLabel(mid) }}</div>
                  </div>
                  <!-- Editable multi-material list -->
                  <div v-else>
                    <!-- Selected list -->
                    <div v-if="localMaterialIds.length" class="space-y-1 mb-1.5">
                      <div v-for="mid in localMaterialIds" :key="mid"
                        class="flex items-center justify-between px-2 py-1 bg-[#81938A]/10 rounded text-sm"
                      >
                        <span class="font-medium text-gray-800 truncate">{{ getMaterialLabel(mid) }}</span>
                        <button type="button" class="ml-2 shrink-0 text-gray-400 hover:text-red-400 transition"
                          @click="removeMaterialFromList(mid)">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <!-- Browse button -->
                    <button type="button" @click="openMatPicker(true)"
                      class="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-[#81938A] hover:text-[#81938A] transition mt-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                      </svg>
                      Browse all materials…
                    </button>
                  </div>
                </div>
              </template>
              <!-- ── HTML Checklists ──────────────────────────────────────────────── -->
              <template v-if="isDraftEditable">
                <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">HTML Checklists</div>

                <!-- Selected checklists -->
                <div v-if="draftChecklistIds.length" class="space-y-1 mb-2">
                  <div
                    v-for="cid in draftChecklistIds" :key="cid"
                    class="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                    @click="openChecklistViewer(cid)"
                    :title="'View ' + (checklistById(cid)?.code ?? cid)"
                  >
                    <svg class="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                    <span class="font-mono text-xs font-bold text-blue-700 shrink-0">{{ checklistById(cid)?.code ?? '…' }}</span>
                    <span class="text-xs text-gray-700 flex-1 truncate">{{ checklistById(cid)?.title ?? cid }}</span>
                    <span v-if="itpDocNoForChecklist(cid)" class="text-xs text-gray-400 shrink-0">{{ itpDocNoForChecklist(cid) }}</span>
                    <svg class="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <button type="button" class="p-0.5 hover:bg-blue-200 rounded shrink-0" title="Remove" @click.stop="toggleChecklist(cid)">
                      <svg class="w-3 h-3 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <p v-else class="text-xs text-gray-400 italic mb-2">No checklists selected.</p>

                <!-- Quick-add chips from linked ITP -->
                <div v-if="unselectedLinkedChecklistsReq.length" class="mb-2">
                  <p class="text-xs text-gray-400 mb-1">From linked ITP:</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="c in unselectedLinkedChecklistsReq" :key="c.id"
                      type="button"
                      class="px-2 py-0.5 text-xs font-mono font-semibold rounded-full border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 transition"
                      @click="toggleChecklist(c.id)"
                      :title="c.title"
                    >+ {{ c.code }}</button>
                  </div>
                </div>

                <!-- Browse all button -->
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg text-xs text-gray-500 hover:text-blue-500 transition"
                  @click="openChecklistPicker"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  Browse all checklists
                </button>
              </template>

              <!-- ── HTML Checklists (view mode) ─────────────────────────────────── -->
              <template v-else-if="draftChecklistIds.length">
                <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">HTML Checklists</div>
                <div class="space-y-1">
                  <div
                    v-for="cid in draftChecklistIds" :key="cid"
                    class="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                    @click="openChecklistViewer(cid)"
                    :title="'View ' + (checklistById(cid)?.code ?? cid)"
                  >
                    <svg class="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                    <span class="font-mono text-xs font-bold text-blue-700 shrink-0">{{ checklistById(cid)?.code ?? '…' }}</span>
                    <span class="text-xs text-gray-700 flex-1 truncate">{{ checklistById(cid)?.title ?? cid }}</span>
                    <span v-if="itpDocNoForChecklist(cid)" class="text-xs text-gray-400 shrink-0">{{ itpDocNoForChecklist(cid) }}</span>
                    <svg class="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </div>
                </div>
              </template>

              <div class="mt-1">
                <label class="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea v-model="requestForm.req_notes" rows="2" :readonly="!isDraftEditable"
                  :class="isDraftEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-y" />
              </div>

              <!-- Attachments in edit mode -->
              <template v-if="isDraftEditable">
                <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-3">Attachments</div>
                <!-- Drawings -->
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/></svg>
                    <span class="text-sm font-medium text-gray-700">Drawing Files</span>
                  </div>
                  <div v-for="att in existingDrawings" :key="att.id" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <a :href="att.file_url" target="_blank" class="text-sm truncate text-[#81938A] hover:underline flex-1">{{ att.file_name }}</a>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="removeExistingAttachment(att.id)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div v-for="(f, i) in pendingDrawings" :key="'dr'+i" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingDrawings.splice(i,1)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="drawingInputRef?.click()">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    Add Drawing
                  </button>
                  <input ref="drawingInputRef" type="file" class="hidden" accept=".pdf,image/*" multiple @change="onFilePick($event, pendingDrawings)" />
                </div>
                <!-- Delivery Orders (MAT only) -->
                <div v-if="isMatType" class="mt-2">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
                    <span class="text-sm font-medium text-gray-700">Delivery Order Files</span>
                  </div>
                  <div v-for="att in existingDOs" :key="att.id" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <a :href="att.file_url" target="_blank" class="text-sm truncate text-[#81938A] hover:underline flex-1">{{ att.file_name }}</a>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="removeExistingAttachment(att.id)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div v-for="(f, i) in pendingDOs" :key="'do'+i" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingDOs.splice(i,1)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="doInputRef?.click()">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    Add DO File
                  </button>
                  <input ref="doInputRef" type="file" class="hidden" accept=".pdf,image/*" multiple @change="onFilePick($event, pendingDOs)" />
                </div>
                <!-- Additional files -->
                <div class="mt-2">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    <span class="text-sm font-medium text-gray-700">Additional Files</span>
                  </div>
                  <div v-for="att in existingAdditional" :key="att.id" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <a :href="att.file_url" target="_blank" class="text-sm truncate text-[#81938A] hover:underline flex-1">{{ att.file_name }}</a>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="removeExistingAttachment(att.id)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div v-for="(f, i) in pendingAdditional" :key="'ad'+i" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingAdditional.splice(i,1)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="additionalInputRef?.click()">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    Add File
                  </button>
                  <input ref="additionalInputRef" type="file" class="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" multiple @change="onFilePick($event, pendingAdditional)" />
                </div>
              </template>
              <!-- Attachments in view (read-only) mode -->
              <template v-else-if="liveItr">
                <div class="mt-2 space-y-2">
                  <AttachmentList :attachments="getAttachments('drawing','plan')" label="Drawings" />
                  <AttachmentList v-if="isMatType" :attachments="getAttachments('do','plan')" label="Delivery Orders" />
                  <AttachmentList :attachments="getAttachments('additional','plan')" label="Additional Files" />
                </div>
              </template>
          </form>
        </div>

        <!-- ═══ INSPECTION & REPORT FORM ════════════════════════════════ -->
        <div v-else-if="activeTab === 'inspection_report'">
          <form class="space-y-3">

            <!-- ── Basic Information (shared with REQUEST ITR) ────────────── -->
            <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1">Basic Information</div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input v-model="draftForm.title" type="text" required :readonly="!isInspectionTabEditable"
                :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-5">
                <label class="block text-xs font-medium text-gray-600 mb-1">Item No <span class="text-gray-400 font-normal">(internal)</span></label>
                <div class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-mono text-[#81938A] font-semibold min-h-[2rem]">
                  {{ liveItr?.item_no ?? '—' }}
                </div>
              </div>
              <div class="sm:col-span-7">
                <label class="block text-xs font-medium text-gray-600 mb-1">Inspection Type</label>
                <select v-model="draftForm.itr_type_id" :disabled="!isInspectionTabEditable"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                  <option :value="null">— None —</option>
                  <option v-for="o in itrTypeStore.options" :key="o.value" :value="o.value">{{ o.title }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">ITR Number <span class="text-gray-400 font-normal">(external — filled by external team)</span></label>
              <input v-model="draftForm.itr_number" type="text" :readonly="!isInspectionTabEditable" placeholder="e.g. CHN1A-ITR-00XX"
                :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-8">
                <label class="block text-xs font-medium text-gray-600 mb-1">Drawing Number</label>
                <input v-model="draftForm.drawing_number" type="text" :readonly="!isInspectionTabEditable" placeholder="e.g. DWG-E-001"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
              <div class="sm:col-span-4">
                <label class="block text-xs font-medium text-gray-600 mb-1">Revision No.</label>
                <input v-model="draftForm.revision_number" type="text" :readonly="!isInspectionTabEditable" placeholder="e.g. Rev.A"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Discipline</label>
                <select v-model="draftForm.discipline_id" :disabled="!isInspectionTabEditable"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                  <option :value="null">— None —</option>
                  <option v-for="o in disciplineStore.options" :key="o.value" :value="o.value">{{ o.title }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Planned Inspection Date & Time</label>
                <DateTimePicker v-model="draftForm.planned_inspection_date" :readonly="!isInspectionTabEditable" />
              </div>
            </div>
            <div v-if="!isNew && draftByName" class="flex items-center gap-1.5 text-xs text-gray-500 pt-0.5">
              <span class="mdi mdi-account-outline text-base leading-none"></span>
              <span>Opened by <span class="font-semibold text-gray-700">{{ draftByName }}</span></span>
              <template v-if="liveItr?.draft_at">
                <span class="text-gray-300">·</span>
                <span>{{ new Date(liveItr.draft_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
              </template>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">QC in Charge</label>
              <div v-if="localQcUserIds.length" class="flex flex-wrap gap-1.5 mb-1.5">
                <span v-for="uid in localQcUserIds" :key="uid"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                  <span class="mdi mdi-account-check text-sm leading-none"></span>
                  {{ qcMemberLabel(uid) }}
                  <button v-if="isInspectionTabEditable" type="button" @click="localQcUserIds = localQcUserIds.filter(id => id !== uid)"
                    class="ml-0.5 text-teal-400 hover:text-red-500 transition leading-none">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </span>
              </div>
              <div v-else-if="!isInspectionTabEditable" class="text-xs text-gray-400 italic">— None assigned —</div>
              <div v-if="isInspectionTabEditable" class="relative">
                <div class="flex items-center gap-1.5 border border-gray-300 bg-white rounded px-2.5 py-1.5">
                  <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  <input v-model="qcSearch" type="text" placeholder="Search QC member…"
                    class="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                    @focus="qcDropOpen = true"
                    @blur="setTimeout(() => { qcDropOpen = false }, 150)" />
                </div>
                <div v-if="qcDropOpen"
                  class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                  <p v-if="qcFilteredMembers.length === 0" class="text-xs text-gray-400 px-3 py-2">No QC members found</p>
                  <button v-for="m in qcFilteredMembers" :key="m.user_id" type="button"
                    :disabled="localQcUserIds.includes(m.user_id)"
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-teal-50 transition disabled:opacity-40 disabled:cursor-default"
                    @mousedown.prevent="localQcUserIds.includes(m.user_id) ? null : (localQcUserIds.push(m.user_id), qcSearch = '', qcDropOpen = false)">
                    <span class="flex-1 text-gray-800 font-medium">{{ m.first_name ? (m.first_name + (m.last_name ? ' ' + m.last_name : '')) : m.email }}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 shrink-0">{{ qcMemberRoleBadge(m) }}</span>
                    <svg v-if="localQcUserIds.includes(m.user_id)" class="w-3.5 h-3.5 text-teal-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">Task & Location</div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Linked Task</label>
              <select v-model="draftForm.task_id" :disabled="!isInspectionTabEditable"
                :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]">
                <option :value="null">— None —</option>
                <option v-for="o in taskItems" :key="o.value" :value="o.value">{{ o.title }}</option>
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Linked Areas</label>
                <div :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="border rounded max-h-32 overflow-y-auto px-2 py-1 space-y-0.5">
                  <p v-if="areaItems.length === 0" class="text-xs text-gray-400 py-1">No areas set up</p>
                  <label v-for="o in areaItems" :key="o.value"
                    class="flex items-center gap-2 py-0.5 px-1 text-xs rounded hover:bg-gray-50 cursor-pointer"
                    :class="!isInspectionTabEditable ? 'pointer-events-none opacity-60' : ''">
                    <input type="checkbox" :value="o.value" v-model="draftForm.area_ids"
                      :disabled="!isInspectionTabEditable"
                      class="rounded border-gray-300 text-[#81938A] focus:ring-[#81938A]" />
                    <span class="text-gray-800">{{ o.title }}</span>
                  </label>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <input v-model="draftForm.location" type="text" :readonly="!isInspectionTabEditable" placeholder="e.g. Level 3, Grid C-4"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
            </div>
            <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">Inspection & Test Plan</div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Select ITP</label>
              <div v-if="!isInspectionTabEditable" class="text-sm text-gray-900">
                {{ draftForm.itp_id ? itpSelectedLabel : '— None —' }}
              </div>
              <div v-else>
                <div v-if="draftForm.itp_id" class="flex items-center justify-between px-2 py-1 bg-[#81938A]/10 rounded text-sm mb-1.5">
                  <span class="font-medium text-gray-800 truncate">{{ itpSelectedLabel }}</span>
                  <button type="button" class="ml-2 shrink-0 text-gray-400 hover:text-red-400 transition" @click="draftForm.itp_id = null">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <button type="button" @click="openItpPicker"
                  class="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-[#81938A] hover:text-[#81938A] transition">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  Browse ITP…
                </button>
              </div>
            </div>
            <template v-if="isMatType">
              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">Material Approval Documents</div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-gray-600">Linked Materials</span>
                </div>
                <div v-if="!isInspectionTabEditable">
                  <div v-if="!localMaterialIds.length" class="text-sm text-gray-400">— None —</div>
                  <div v-for="mid in localMaterialIds" :key="mid" class="text-sm text-gray-900 py-0.5">{{ getMaterialLabel(mid) }}</div>
                </div>
                <div v-else>
                  <div v-if="localMaterialIds.length" class="space-y-1 mb-1.5">
                    <div v-for="mid in localMaterialIds" :key="mid"
                      class="flex items-center justify-between px-2 py-1 bg-[#81938A]/10 rounded text-sm">
                      <span class="font-medium text-gray-800 truncate">{{ getMaterialLabel(mid) }}</span>
                      <button type="button" class="ml-2 shrink-0 text-gray-400 hover:text-red-400 transition" @click="removeMaterialFromList(mid)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button type="button" @click="openMatPicker"
                    class="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-[#81938A] hover:text-[#81938A] transition mt-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                    </svg>
                    Browse all materials…
                  </button>
                </div>
              </div>
            </template>
            <!-- ── HTML Checklists ─────────────────────────────────────────────── -->
            <template v-if="isInspectionTabEditable">
              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">HTML Checklists</div>
              <div v-if="draftChecklistIds.length" class="space-y-1 mb-2">
                <div v-for="cid in draftChecklistIds" :key="cid"
                  class="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                  @click="openChecklistViewer(cid)" :title="'View ' + (checklistById(cid)?.code ?? cid)">
                  <svg class="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                  <span class="font-mono text-xs font-bold text-blue-700 shrink-0">{{ checklistById(cid)?.code ?? '…' }}</span>
                  <span class="text-xs text-gray-700 flex-1 truncate">{{ checklistById(cid)?.title ?? cid }}</span>
                  <span v-if="itpDocNoForChecklist(cid)" class="text-xs text-gray-400 shrink-0">{{ itpDocNoForChecklist(cid) }}</span>
                  <svg class="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <button type="button" class="p-0.5 hover:bg-blue-200 rounded shrink-0" title="Remove" @click.stop="toggleChecklist(cid)">
                    <svg class="w-3 h-3 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic mb-2">No checklists selected.</p>
              <div v-if="unselectedLinkedChecklists.length" class="mb-2">
                <p class="text-xs text-gray-400 mb-1">From linked ITP:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="c in unselectedLinkedChecklists" :key="c.id" type="button"
                    class="px-2 py-0.5 text-xs font-mono font-semibold rounded-full border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 transition"
                    @click="toggleChecklist(c.id)" :title="c.title">+ {{ c.code }}</button>
                </div>
              </div>
              <button type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg text-xs text-gray-500 hover:text-blue-500 transition"
                @click="openChecklistPicker">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                Browse all checklists
              </button>
            </template>
            <template v-else-if="draftChecklistIds.length">
              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">HTML Checklists</div>
              <div class="space-y-1">
                <div v-for="cid in draftChecklistIds" :key="cid"
                  class="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                  @click="openChecklistViewer(cid)" :title="'View ' + (checklistById(cid)?.code ?? cid)">
                  <svg class="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                  <span class="font-mono text-xs font-bold text-blue-700 shrink-0">{{ checklistById(cid)?.code ?? '…' }}</span>
                  <span class="text-xs text-gray-700 flex-1 truncate">{{ checklistById(cid)?.title ?? cid }}</span>
                  <span v-if="itpDocNoForChecklist(cid)" class="text-xs text-gray-400 shrink-0">{{ itpDocNoForChecklist(cid) }}</span>
                  <svg class="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </div>
              </div>
            </template>
            <!-- ── Inspection & Report exclusive fields ──────────────────────── -->
            <div class="border-t border-gray-200 pt-3 mt-2">
              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-2">Inspection & Report</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Confirmed Inspection Date & Time</label>
                  <DateTimePicker v-model="internalForm.req_inspection_date" :readonly="!isInspectionTabEditable" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Actual Inspection Date & Time</label>
                  <DateTimePicker v-model="reportForm.inspection_date" :readonly="!isInspectionTabEditable" />
                </div>
              </div>
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">ITR Request File Link (optional)</label>
                <a v-if="!isInspectionTabEditable && externalForm.itr_request_file_link"
                  :href="externalForm.itr_request_file_link" target="_blank" rel="noopener noreferrer"
                  class="block w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-blue-600 underline truncate hover:text-blue-800">
                  {{ externalForm.itr_request_file_link }}
                </a>
                <input v-else v-model="externalForm.itr_request_file_link" type="text" :readonly="!isInspectionTabEditable" placeholder="https://…"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">ITR Report File Link (optional)</label>
                <a v-if="!isInspectionTabEditable && reportForm.itr_report_file_link"
                  :href="reportForm.itr_report_file_link" target="_blank" rel="noopener noreferrer"
                  class="block w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-blue-600 underline truncate hover:text-blue-800">
                  {{ reportForm.itr_report_file_link }}
                </a>
                <input v-else v-model="reportForm.itr_report_file_link" type="text" :readonly="!isInspectionTabEditable" placeholder="https://…"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">QC Notes (optional)</label>
                <textarea v-model="internalForm.qc_notes" rows="2" :readonly="!isInspectionTabEditable"
                  :class="isInspectionTabEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-y" />
              </div>
            </div>

            <!-- Attachments (edit mode) -->
            <template v-if="isInspectionTabEditable && liveItr">
              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-3">Inspection Attachments</div>
              <!-- Drawings -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/></svg>
                  <span class="text-sm font-medium text-gray-700">Drawings</span>
                </div>
                <div v-for="(f, i) in pendingInternalDrawings" :key="'id'+i" class="flex items-center gap-1 mb-1">
                  <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                  <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingInternalDrawings.splice(i,1)">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="internalDrawingInputRef?.click()">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  Add Drawing
                </button>
                <input ref="internalDrawingInputRef" type="file" class="hidden" accept=".pdf,image/*" multiple @change="onFilePick($event, pendingInternalDrawings)" />
              </div>
              <!-- Delivery Orders (MAT only) -->
              <div v-if="isMatType" class="mt-2">
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
                  <span class="text-sm font-medium text-gray-700">Delivery Order Files</span>
                </div>
                <div v-for="(f, i) in pendingInternalDOs" :key="'ido'+i" class="flex items-center gap-1 mb-1">
                  <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                  <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingInternalDOs.splice(i,1)">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="internalDoInputRef?.click()">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  Add DO File
                </button>
                <input ref="internalDoInputRef" type="file" class="hidden" accept=".pdf,image/*" multiple @change="onFilePick($event, pendingInternalDOs)" />
              </div>
              <!-- Additional Files -->
              <div class="mt-2">
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  <span class="text-sm font-medium text-gray-700">Additional Files</span>
                </div>
                <div v-for="(f, i) in pendingInternalAdditional" :key="'ia'+i" class="flex items-center gap-1 mb-1">
                  <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                  <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingInternalAdditional.splice(i,1)">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="internalAdditionalInputRef?.click()">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  Add File
                </button>
                <input ref="internalAdditionalInputRef" type="file" class="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.zip" multiple @change="onFilePick($event, pendingInternalAdditional)" />
              </div>
            </template>
            <!-- Attachments (view mode) -->
            <template v-else-if="liveItr">
              <div class="mt-2 space-y-2">
                <AttachmentList :attachments="getAttachments('drawing','internal_request')" label="Drawings" />
                <AttachmentList v-if="isMatType" :attachments="getAttachments('do','internal_request')" label="Delivery Orders" />
                <AttachmentList :attachments="[...getAttachments('image','internal_request'), ...getAttachments('additional','internal_request')]" label="Additional Files" />
              </div>
            </template>
          </form>
        </div>

        <!-- Legacy step panels — no longer used in 2-tab UI ─────────────── -->
        <div v-else-if="false">
          <!-- Locked: not yet reached -->
          <div v-if="currentOrder < 2" class="text-center text-gray-400 py-8">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <p>Draft must be submitted and <strong>Request Internal Inspection</strong> confirmed before this step is available.</p>
          </div>

          <!-- Pending: requested but not yet confirmed by inspector -->
          <div v-else-if="currentOrder === 2 && !editMode" class="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-gray-800">Pending Internal Inspection</p>
              <p class="text-sm text-gray-500 mt-1">Internal inspection has been requested.<br/>Click <strong>Record Internal Inspection</strong> below to start filling the form.</p>
            </div>
            <div v-if="liveItr?.planned_inspection_date" class="text-xs text-gray-400">
              Planned: {{ fmtInspection(liveItr.planned_inspection_date) }}
            </div>
          </div>

          <!-- Active / done: show form (also when editMode opens it from pending state) -->
          <form v-else ref="internalFormRef" class="space-y-3">
            <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1">Internal Inspection Details</div>
            <!-- Title -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input v-model="draftForm.title" type="text" required :readonly="!isInternalEditable"
                :class="isInternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
            </div>
            <!-- Context from draft -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-if="liveItr?.planned_inspection_date">
                <label class="block text-xs font-medium text-gray-600 mb-1">Planned Inspection Date</label>
                <input :value="fmtInspection(liveItr.planned_inspection_date)" type="text" readonly class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">ITR Number</label>
                <input v-model="internalForm.itr_number" type="text" :readonly="!isInternalEditable"
                  :class="isInternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Confirmed Inspection Date & Time *</label>
                <DateTimePicker v-model="internalForm.req_inspection_date" :readonly="!isInternalEditable" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">ITP</label>
              <!-- Read-only display -->
              <div v-if="!isInternalEditable"
                class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 min-h-[2rem]">
                {{ internalForm.itp_id ? itpInternalSelectedLabel : '— None —' }}
              </div>
              <!-- Browse button selector -->
              <div v-else class="flex items-start gap-2">
                <div class="flex-1 text-sm leading-snug py-0.5">
                  <span v-if="internalForm.itp_id" class="text-gray-900 whitespace-normal break-words">{{ itpInternalSelectedLabel }}</span>
                  <span v-else class="text-gray-400 italic">— None selected —</span>
                </div>
                <div class="shrink-0 flex gap-1 mt-0.5">
                  <button v-if="internalForm.itp_id" type="button" class="text-gray-400 hover:text-gray-600 p-1 rounded" title="Clear" @click="internalForm.itp_id = null">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                  <button type="button" class="p-1.5 rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="openItpPicker('internal')" title="Search ITP">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <!-- Drawing Number + Revision Number -->
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-8">
                <label class="block text-xs font-medium text-gray-600 mb-1">Drawing Number</label>
                <input v-model="internalForm.drawing_number" type="text" :readonly="!isInternalEditable" placeholder="e.g. DWG-E-001"
                  :class="isInternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
              <div class="sm:col-span-4">
                <label class="block text-xs font-medium text-gray-600 mb-1">Revision No.</label>
                <input v-model="internalForm.revision_number" type="text" :readonly="!isInternalEditable" placeholder="e.g. Rev.A"
                  :class="isInternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">ITR Request File Link (optional)</label>
              <a v-if="!isInternalEditable && internalForm.itr_request_file_link"
                :href="internalForm.itr_request_file_link" target="_blank" rel="noopener noreferrer"
                class="block w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-blue-600 underline truncate hover:text-blue-800">
                {{ internalForm.itr_request_file_link }}
              </a>
              <input v-else v-model="internalForm.itr_request_file_link" type="text" :readonly="!isInternalEditable" placeholder="https://…"
                :class="isInternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">QC Notes (optional)</label>
              <textarea v-model="internalForm.qc_notes" rows="2" :readonly="!isInternalEditable"
                :class="isInternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-y" />
            </div>

            <!-- ── HTML Checklists ─────────────────────────────────────── -->
            <div>
              <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1 mt-2">HTML Checklists</div>

              <!-- Selected checklists -->
              <div v-if="draftChecklistIds.length" class="space-y-1 mb-2">
                <div
                  v-for="cid in draftChecklistIds" :key="cid"
                  class="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                  @click="openChecklistViewer(cid)"
                  :title="'View ' + (checklistById(cid)?.code ?? cid)"
                >
                  <svg class="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                  <span class="font-mono text-xs font-bold text-blue-700 shrink-0">{{ checklistById(cid)?.code ?? '…' }}</span>
                  <span class="text-xs text-gray-700 flex-1 truncate">{{ checklistById(cid)?.title ?? cid }}</span>
                  <span v-if="itpDocNoForChecklist(cid)" class="text-xs text-gray-400 shrink-0">{{ itpDocNoForChecklist(cid) }}</span>
                  <!-- View icon -->
                  <svg class="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  <!-- Remove button (edit mode only) -->
                  <button v-if="isInternalEditable" type="button"
                    class="p-0.5 hover:bg-blue-200 rounded shrink-0 ml-1" title="Remove"
                    @click.stop="toggleChecklist(cid)"
                  >
                    <svg class="w-3 h-3 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic mb-2">No checklists selected.</p>

              <!-- Edit mode: quick-add chips + browse -->
              <template v-if="isInternalEditable">
                <div v-if="unselectedLinkedChecklists.length" class="mb-2">
                  <p class="text-xs text-gray-400 mb-1">From linked ITP:</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="c in unselectedLinkedChecklists" :key="c.id"
                      type="button"
                      class="px-2 py-0.5 text-xs font-mono font-semibold rounded-full border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 transition"
                      @click="toggleChecklist(c.id)"
                      :title="c.title"
                    >+ {{ c.code }}</button>
                  </div>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg text-xs text-gray-500 hover:text-blue-500 transition"
                  @click="openChecklistPicker"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  Browse all checklists
                </button>
              </template>
            </div>

            <!-- Upload areas (editable state only) -->
            <template v-if="isInternalEditable && liveItr">
              <div class="space-y-2">
                <!-- Drawings -->
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-3.5 h-3.5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    <span class="text-sm text-gray-700">Add Drawings (optional)</span>
                  </div>
                  <div v-for="(f, i) in pendingInternalDrawings" :key="'id'+i" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingInternalDrawings.splice(i,1)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="internalDrawingInputRef?.click()">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    Add Drawing
                  </button>
                  <input ref="internalDrawingInputRef" type="file" class="hidden" accept=".pdf,image/*" multiple @change="onFilePick($event, pendingInternalDrawings)" />
                </div>
                <!-- Images -->
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-3.5 h-3.5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    <span class="text-sm text-gray-700">Add Images (optional)</span>
                  </div>
                  <div v-for="(f, i) in pendingInternalImages" :key="'ii'+i" class="flex items-center gap-1 mb-1">
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span class="text-sm truncate flex-1 text-gray-700">{{ f.name }}</span>
                    <button type="button" class="text-red-400 hover:text-red-600 p-0.5" @click="pendingInternalImages.splice(i,1)">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <button type="button" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-[#81938A]/10 text-[#81938A] hover:bg-[#81938A]/20 transition" @click="internalImageInputRef?.click()">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    Add Image
                  </button>
                  <input ref="internalImageInputRef" type="file" class="hidden" accept="image/*" multiple @change="onFilePick($event, pendingInternalImages)" />
                </div>
              </div>
            </template>
            <!-- View mode: show saved attachments -->
            <template v-else-if="liveItr">
              <div class="mt-2 space-y-2">
                <AttachmentList :attachments="getAttachments('drawing','internal_request')" label="Drawings" />
                <AttachmentList :attachments="getAttachments('image','internal_request')" label="Images" />
              </div>
            </template>
          </form>
        </div>

        <!-- ═══ REQUEST ITR FORM (legacy — hidden) ════════════════════════ -->
        <div v-else-if="false">
          <div v-if="currentOrder < 3" class="text-center text-gray-400 py-8">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <p>Complete Internal Inspection before this step is available.</p>
          </div>
          <form v-else ref="externalFormRef" class="space-y-3">
            <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1">Request ITR Details</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">ITR Number *</label>
                <input v-model="externalForm.itr_number" type="text" required :readonly="!isExternalEditable"
                  :class="isExternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Confirmed Inspection Date</label>
                <input :value="fmtInspection(liveItr?.req_inspection_date)" type="text" readonly class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">ITR Request File Link (optional)</label>
              <a v-if="!isExternalEditable && externalForm.itr_request_file_link"
                :href="externalForm.itr_request_file_link" target="_blank" rel="noopener noreferrer"
                class="block w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-blue-600 underline truncate hover:text-blue-800">
                {{ externalForm.itr_request_file_link }}
              </a>
              <input v-else v-model="externalForm.itr_request_file_link" type="text" :readonly="!isExternalEditable" placeholder="https://…"
                :class="isExternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">QC Notes (optional)</label>
              <textarea v-model="externalForm.qc_notes" rows="2" :readonly="!isExternalEditable"
                :class="isExternalEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-y" />
            </div>
            <template v-if="isExternalEditable && liveItr">
              <div>
                <FileUploadArea ref="extDrawingUploadRef" label="Add Drawings" category="drawing" :itr="liveItr" :statusId="statusIdFor('external_request')" class="mb-2" />
                <FileUploadArea ref="extImageUploadRef" label="Add Images" category="image" :itr="liveItr" :statusId="statusIdFor('external_request')" />
              </div>
            </template>
            <template v-else-if="liveItr">
              <div class="mt-2 space-y-2">
                <AttachmentList :attachments="getAttachments('itr_request','external_request')" label="Request Files" />
                <AttachmentList :attachments="getAttachments('drawing','external_request')" label="Drawings" />
                <AttachmentList :attachments="getAttachments('image','external_request')" label="Images" />
              </div>
            </template>
          </form>
        </div>

        <!-- ═══ REPORT SUBMITTED FORM (legacy — hidden) ════════════════ -->
        <div v-else-if="false">
          <div v-if="currentOrder < 4" class="text-center text-gray-400 py-8">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <p>Complete Request ITR before this step is available.</p>
          </div>
          <form v-else ref="reportFormRef" class="space-y-3">
            <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1">Report Details</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Actual Inspection Date & Time</label>
                <DateTimePicker v-model="reportForm.inspection_date" :readonly="!isReportEditable" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">ITR Report File Link (optional)</label>
                <input v-model="reportForm.itr_report_file_link" type="text" :readonly="!isReportEditable" placeholder="https://…"
                  :class="isReportEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                  class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">QC Notes (optional)</label>
              <textarea v-model="reportForm.qc_notes" rows="2" :readonly="!isReportEditable"
                :class="isReportEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-y" />
            </div>
            <template v-if="isReportEditable && liveItr">
              <div>
                <FileUploadArea ref="rptReportUploadRef" label="Add Report Files" category="itr_report" :itr="liveItr" :statusId="statusIdFor('report_submitted')" class="mb-2" />
                <FileUploadArea ref="rptImageUploadRef" label="Add Images" category="image" :itr="liveItr" :statusId="statusIdFor('report_submitted')" />
              </div>
            </template>
            <template v-else-if="liveItr">
              <div class="mt-2 space-y-2">
                <AttachmentList :attachments="getAttachments('itr_report','report_submitted')" label="Report Files" />
                <AttachmentList :attachments="getAttachments('image','report_submitted')" label="Images" />
              </div>
            </template>
          </form>
        </div>

        <!-- ═══ APPROVED FORM (legacy — hidden) ══════════════════════════ -->
        <div v-else-if="false">
          <div v-if="currentOrder < 5" class="text-center text-gray-400 py-8">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <p>Submit Report before Approval is available.</p>
          </div>
          <form v-else ref="approvedFormRef" class="space-y-3">
            <div class="text-[0.65rem] font-semibold tracking-widest uppercase text-gray-400 mb-1">Approval Details</div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Approved ITR Report File Link</label>
              <input v-model="approvedForm.approved_report_file_link" type="text" :readonly="!isApprovedEditable" placeholder="https://…"
                :class="isApprovedEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">QC Notes (optional)</label>
              <textarea v-model="approvedForm.qc_notes" rows="2" :readonly="!isApprovedEditable"
                :class="isApprovedEditable ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'"
                class="w-full rounded border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A] resize-y" />
            </div>
            <template v-if="isApprovedEditable && liveItr">
              <div>
                <FileUploadArea ref="appImageUploadRef" label="Add Images" category="image" :itr="liveItr" :statusId="statusIdFor('approved')" />
              </div>
            </template>
            <template v-else-if="liveItr">
              <div class="mt-2 space-y-2">
                <AttachmentList :attachments="getAttachments('approved_report','approved')" label="Approved Report" />
                <AttachmentList :attachments="getAttachments('image','approved')" label="Images" />
              </div>
            </template>
          </form>
        </div>

      </div>

      <!-- Upload progress bar -->
      <div v-if="uploading" class="h-1 w-full bg-gray-100 overflow-hidden">
        <div class="h-full bg-[#81938A] animate-pulse" style="width: 100%;" />
      </div>

      <div class="border-t border-gray-200" />

      <!-- ── Action buttons ──────────────────────────────────────────────── -->
      <div class="flex flex-col px-6 py-4 gap-2">
        <div class="flex items-center flex-wrap gap-2">
        <button type="button" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition" @click="close">Close</button>
        <div class="flex-1" />

        <!-- Create To Do button — view mode only -->
        <button
          v-if="!isNew && !editMode"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded border border-amber-400 text-amber-700 hover:bg-amber-50 transition"
          @click="openTodoDialog"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          To Do
        </button>

        <!-- Tab 1 (REQUEST ITR): Edit button in view mode — only ITR creator can edit -->
        <button
          v-if="!isNew && activeTab === 'request_itr' && !editMode && isItrCreator"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded border border-[#81938A] text-[#81938A] hover:bg-[#81938A]/10 transition"
          @click="editMode = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Edit
        </button>

        <!-- Tab 1 (REQUEST ITR): Request ITR to QC — only when status is Plan -->
        <button
          v-if="!isNew && activeTab === 'request_itr' && !editMode && currentCode === 'plan'"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          :disabled="itrStore.loading"
          @click="submitPlanForInternalInspection"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          Request ITR to QC
        </button>

        <!-- Tab 2 (INSPECTION & REPORT): Edit button in view mode -->
        <button
          v-if="!isNew && activeTab === 'inspection_report' && !editMode"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded border border-[#81938A] text-[#81938A] hover:bg-[#81938A]/10 transition"
          @click="editMode = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Edit
        </button>

        <!-- Edit mode: Cancel button -->
        <button
          v-if="!isNew && editMode"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          @click="editMode = false"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          Cancel
        </button>

        <!-- Tab 1 (REQUEST ITR / Plan): save, create, request -->
        <template v-if="(activeTab === 'request_itr' || isNew) && isDraftEditable">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-[#81938A] text-white hover:bg-[#6b7a72] transition disabled:opacity-50"
            :disabled="itrStore.loading || uploading"
            @click="saveDraft"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            {{ isNew ? 'Create Plan ITR' : 'Save Plan' }}
          </button>
          <button
            v-if="!isNew"
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            :disabled="itrStore.loading"
            @click="requestInternalInspection"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            Request to QC
          </button>
        </template>

        <!-- Tab 2 (INSPECTION & REPORT): Status selector + Save in edit mode -->
        <template v-if="activeTab === 'inspection_report' && isInspectionTabEditable">
          <div class="flex flex-col gap-0.5">
            <label class="text-[0.6rem] font-semibold tracking-widest uppercase text-gray-400 leading-none">Confirm Status</label>
            <select
              v-model="localStatusId"
              class="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#81938A] min-w-[160px]"
            >
              <option v-for="s in inspectionStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </select>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-[#81938A] text-white hover:bg-[#6b7a72] transition disabled:opacity-50"
            :disabled="itrStore.loading || uploading"
            @click="saveInspectionReport"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            Save Inspection &amp; Report
          </button>
        </template>

        <!-- Build HTML Report (opens picker) -->
        <button
          v-if="!isNew && hasHtmlReport"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
          @click="openReportPicker"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Build Report
        </button>

        <!-- Generate ITR Cover PDF -->
        <button
          v-if="!isNew && currentOrder >= 3"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
          @click="openCoverPdfDialog"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          ITR Cover PDF
        </button>

        <!-- Fill PDF Form — available for all master forms except itr_cover -->
        <template v-if="!isNew && currentOrder >= 3 && fillableForms.length > 0">
          <!-- Single form: direct button -->
          <button
            v-if="fillableForms.length === 1"
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-teal-100 text-teal-700 hover:bg-teal-200 transition"
            @click="openFormViewer(fillableForms[0].code)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Fill {{ fillableForms[0].title }}
          </button>
          <!-- Multiple forms: dropdown -->
          <div v-else class="relative" ref="fillFormDropRef">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-teal-100 text-teal-700 hover:bg-teal-200 transition"
              @click="fillFormDropOpen = !fillFormDropOpen"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Fill Form
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-if="fillFormDropOpen" class="absolute right-0 mt-1 w-52 bg-white rounded shadow-lg border border-gray-200 z-10">
              <button
                v-for="mf in fillableForms"
                :key="mf.code"
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 transition"
                @click="openFormViewer(mf.code); fillFormDropOpen = false"
              >{{ mf.title }}</button>
            </div>
          </div>
        </template>
        </div>
        <!-- Description bar — shown below buttons when a status with description is selected -->
        <p v-if="activeTab === 'inspection_report' && isInspectionTabEditable && itrStatusStore.getById(localStatusId ?? '')?.description"
          class="text-sm text-red-600 font-medium text-center w-full"
        >
          {{ itrStatusStore.getById(localStatusId ?? '')?.description }}
        </p>
      </div>
    </div>

    <!-- ── To Do Modal (shared component) ───────────────────────────────────────── -->
    <TaskTodoModal
      v-model="showTodoModal"
      :task-id="liveItr?.task_id ?? null"
      :task-name="liveItr?.title ?? ''"
      :project-id="liveItr?.project_id ?? null"
      :itr-id="liveItr?.id ?? null"
    />

    <!-- Snackbar -->
    <div
      v-if="snackbar.show"
      class="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm"
      :class="snackbar.color === 'error' ? 'bg-red-600' : snackbar.color === 'warning' ? 'bg-amber-600' : 'bg-green-600'"
    >
      {{ snackbar.text }}
      <button type="button" class="underline text-white/80 hover:text-white text-xs" @click="snackbar.show = false">OK</button>
    </div>

    <!-- ══ ITR Cover PDF — Signature Dialog ══ -->
    <!-- ── PDF Form Viewer Dialog ──────────────────────────────────────────── -->
    <div v-if="formViewer.open" class="fixed inset-0 z-[70] flex flex-col bg-white">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b bg-teal-700 text-white flex-shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        <h3 class="font-semibold flex-1 text-sm">Fill Form: {{ formViewer.title }}</h3>
        <span class="text-xs text-teal-200">{{ liveItr?.itr_number }}</span>
        <button type="button" class="text-teal-200 hover:text-white" @click="closeFormViewer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <!-- Viewer -->
      <div class="flex-1 min-h-0 overflow-hidden">
        <PDFFormViewer
          v-if="formViewer.pdfUrl"
          ref="formViewerRef"
          :pdfUrl="formViewer.pdfUrl"
          :initialValues="formViewer.initialValues"
        />
        <div v-else class="flex items-center justify-center h-full text-sm text-gray-500">
          No template found for this form. Upload a revision in Master Forms.
        </div>
      </div>
      <!-- Footer actions -->
      <div class="flex items-center justify-between px-4 py-3 border-t bg-gray-50 flex-shrink-0">
        <p class="text-xs text-gray-500">Fill the form fields above. Values are saved to this ITR record.</p>
        <div class="flex gap-2">
          <button type="button" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900" @click="closeFormViewer">Cancel</button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-50"
            :disabled="formViewer.saving"
            @click="saveFormViewer"
          >
            <svg v-if="formViewer.saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ formViewer.saving ? 'Saving…' : 'Save Field Values' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="coverPdf.dialogOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b flex-shrink-0">
          <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          <h3 class="text-base font-semibold text-gray-900 flex-1">Generate ITR Cover PDF</h3>
          <button type="button" class="text-gray-400 hover:text-gray-600" @click="closeCoverPdfDialog">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Scrollable body -->
        <div class="overflow-y-auto flex-1 min-h-0">
          <!-- ITR info -->
          <div class="px-5 py-3 bg-gray-50 text-sm text-gray-600 space-y-0.5">
            <p><span class="font-medium">ITR No.:</span> {{ liveItr?.itr_number ?? '—' }}</p>
            <p><span class="font-medium">Title:</span> {{ liveItr?.title ?? '—' }}</p>
            <p><span class="font-medium">Date:</span> {{ fmtInspection(liveItr?.req_inspection_date ?? null) }}</p>
          </div>
          <!-- Editable form fields -->
          <div class="px-5 pt-4 space-y-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Form Fields</p>
            <!-- To -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-0.5">To (Recipient)</label>
              <input v-model="coverFormFields.to" type="text" class="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Owner/Owner's representative" />
            </div>
            <!-- Ref Dwg No -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-0.5">Ref. Dwg. No.</label>
              <input v-model="coverFormFields.dwgNo" type="text" class="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. ZZ-0007_MST_for_Cable_Support" />
            </div>
            <!-- Inspection items — read-only preview from ITR data -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Inspection Items <span class="font-normal text-gray-400">(from ITR)</span></label>
              <div class="rounded border border-gray-200 overflow-hidden text-xs">
                <div class="grid grid-cols-[1fr_1fr_28%] bg-gray-100 font-medium text-gray-600">
                  <div class="px-2 py-1.5 border-r border-gray-200">Inspection Item</div>
                  <div class="px-2 py-1.5 border-r border-gray-200">Location</div>
                  <div class="px-2 py-1.5">Date &amp; Time</div>
                </div>
                <div class="grid grid-cols-[1fr_1fr_28%] border-t border-gray-200 bg-gray-50 text-gray-700">
                  <div class="px-2 py-1.5 border-r border-gray-200 truncate">{{ liveItr?.title ?? '—' }}</div>
                  <div class="px-2 py-1.5 border-r border-gray-200 truncate">{{ liveItr?.location ?? '—' }}</div>
                  <div class="px-2 py-1.5 truncate">{{ fmtInspection(liveItr?.req_inspection_date ?? null) }}</div>
                </div>
              </div>
            </div>
          </div>
          <!-- Signature pad -->
          <div class="px-5 pt-4 pb-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-700">Draw your signature (MEP)</span>
              <button type="button" class="text-xs text-red-500 hover:text-red-700 underline" @click="clearSignatureCanvas">Clear</button>
            </div>
            <div
              class="rounded border border-gray-300 bg-white cursor-crosshair"
              @mousedown="onSigMouseDown" @mousemove="onSigMouseMove" @mouseup="onSigMouseUp" @mouseleave="onSigMouseUp"
              @touchstart.prevent="onSigTouchStart" @touchmove.prevent="onSigTouchMove" @touchend="onSigMouseUp"
            >
              <canvas ref="sigCanvas" width="472" height="120" style="display:block; width:100%; height:120px;" />
            </div>
            <p class="text-xs text-gray-400 mt-1">Sign above using mouse or finger</p>
          </div>
        </div>
        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 px-5 py-4 border-t flex-shrink-0">
          <button type="button" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900" @click="closeCoverPdfDialog">Cancel</button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
            :disabled="!coverPdf.hasSigned || coverPdf.loading"
            @click="generateCoverPdfLocal"
          >
            <svg v-if="coverPdf.loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            {{ coverPdf.loading ? 'Generating...' : 'Generate & View PDF' }}
          </button>
        </div>
      </div>
    </div>

  <!-- ── ITP Picker Modal ──────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="itpPickerOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="itpPickerOpen = false" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style="max-height: 80vh">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <h3 class="font-semibold text-gray-900">Select ITP</h3>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-600 p-1 rounded" @click="itpPickerOpen = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Discipline filter chips -->
        <div class="px-4 pt-3 pb-2 flex gap-1.5 flex-wrap border-b border-gray-50">
          <button type="button"
            class="px-2.5 py-1 text-xs font-medium rounded-full border transition"
            :class="itpPickerDisc === null ? 'bg-[#81938A] text-white border-[#81938A]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#81938A]'"
            @click="itpPickerDisc = null"
          >All</button>
          <button
            v-for="d in disciplineStore.options" :key="d.value"
            type="button"
            class="px-2.5 py-1 text-xs font-medium rounded-full border transition"
            :class="itpPickerDisc === d.value ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'"
            :style="itpPickerDisc === d.value ? { background: d.color ?? '#81938A', borderColor: d.color ?? '#81938A' } : {}"
            @click="itpPickerDisc = d.value"
          >{{ d.title.split(' — ')[0] }}</button>
        </div>
        <!-- Search -->
        <div class="px-4 py-2 border-b border-gray-100">
          <input v-model="itpPickerSearch" type="text" placeholder="Search doc no or title…"
            class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#81938A]" />
        </div>
        <!-- Result count -->
        <div class="px-4 py-1 text-xs text-gray-400">{{ pickerFilteredItps.length }} ITP{{ pickerFilteredItps.length === 1 ? '' : 's' }}</div>
        <!-- List -->
        <div class="flex-1 overflow-y-auto px-2 pb-3">
          <div v-if="pickerFilteredItps.length === 0" class="text-center text-sm text-gray-400 py-10">No ITPs match</div>
          <button
            v-for="itp in pickerFilteredItps"
            :key="itp.id"
            type="button"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-[#81938A]/10 transition mb-0.5"
            :class="(itpPickerTarget === 'request' ? requestForm.req_itp_id : itpPickerTarget === 'internal' ? internalForm.itp_id : draftForm.itp_id) === itp.id ? 'bg-[#81938A]/15 ring-1 ring-[#81938A]/40' : ''"
            @click="itpPickerTarget === 'request' ? (requestForm.req_itp_id = itp.id) : itpPickerTarget === 'internal' ? (internalForm.itp_id = itp.id) : (draftForm.itp_id = itp.id); itpPickerOpen = false"
          >
            <div class="flex items-start gap-2">
              <div class="flex-1 min-w-0">
                <span class="font-semibold text-gray-800">{{ itp.doc_no }}</span>
                <span class="text-gray-500 ml-1">— {{ itp.title }}</span>
              </div>
              <svg v-if="(itpPickerTarget === 'request' ? requestForm.req_itp_id : itpPickerTarget === 'internal' ? internalForm.itp_id : draftForm.itp_id) === itp.id" class="w-4 h-4 text-[#81938A] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

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
            :class="localMaterialIds.includes(mat.id) ? 'bg-[#81938A]/15 ring-1 ring-[#81938A]/40' : ''"
            @click="localMaterialIds.includes(mat.id) ? removeMaterialFromList(mat.id) : addMaterialToList(mat.id)"
          >
            <div class="flex items-start gap-2">
              <div class="flex-1 min-w-0">
                <span class="font-semibold text-gray-800">{{ mat.doc_no }}</span>
                <span class="text-gray-500 ml-1">— {{ mat.title }}</span>
              </div>
              <svg v-if="localMaterialIds.includes(mat.id)" class="w-4 h-4 text-[#81938A] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        </div>
        <!-- Footer -->
        <div class="px-4 py-3 border-t border-gray-100 flex justify-between items-center shrink-0">
          <span class="text-xs text-gray-400">{{ localMaterialIds.length }} selected</span>
          <button type="button" @click="matPickerOpen = false"
            class="px-4 py-1.5 bg-[#81938A] text-white rounded-lg text-sm font-medium hover:bg-[#6f8078] transition">
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Checklist Picker Modal ────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="checklistPickerOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="checklistPickerOpen = false" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style="max-height: 80vh">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            <h3 class="font-semibold text-gray-900">Select HTML Checklists</h3>
            <span class="text-xs text-gray-400">(multi-select)</span>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-600 p-1 rounded" @click="checklistPickerOpen = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- ITP filter tabs -->
        <div class="px-4 pt-3 pb-2 flex gap-1.5 flex-wrap border-b border-gray-100">
          <button type="button"
            class="px-2.5 py-1 text-xs font-medium rounded-full border transition"
            :class="checklistPickerItpId === null ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'"
            @click="checklistPickerItpId = null"
          >All ITPs</button>
          <button
            v-for="itp in itpsWithChecklists" :key="itp.id"
            type="button"
            class="px-2.5 py-1 text-xs font-medium rounded-full border transition"
            :class="checklistPickerItpId === itp.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'"
            @click="checklistPickerItpId = itp.id"
          >{{ itp.doc_no }}</button>
        </div>
        <!-- Search -->
        <div class="px-4 py-2 border-b border-gray-100">
          <input v-model="checklistPickerSearch" type="text" placeholder="Search code or title…"
            class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        <!-- Result count + selected count -->
        <div class="px-4 py-1 flex items-center gap-2 text-xs text-gray-400">
          <span>{{ pickerFilteredChecklists.length }} checklist{{ pickerFilteredChecklists.length === 1 ? '' : 's' }}</span>
          <span v-if="draftChecklistIds.length" class="ml-auto text-blue-500 font-medium">{{ draftChecklistIds.length }} selected</span>
        </div>
        <!-- List -->
        <div class="flex-1 overflow-y-auto px-2 pb-3">
          <div v-if="pickerFilteredChecklists.length === 0" class="text-center text-sm text-gray-400 py-10">No checklists found</div>
          <button
            v-for="c in pickerFilteredChecklists"
            :key="c.id"
            type="button"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition mb-0.5 flex items-start gap-3"
            :class="draftChecklistIds.includes(c.id) ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'"
            @click="toggleChecklist(c.id)"
          >
            <!-- Checkbox -->
            <div class="w-4 h-4 mt-0.5 shrink-0 rounded border-2 flex items-center justify-center transition"
              :class="draftChecklistIds.includes(c.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"
            >
              <svg v-if="draftChecklistIds.includes(c.id)" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-blue-700">{{ c.code }}</span>
                <span class="text-xs text-gray-400">{{ c.version }}</span>
                <span class="text-xs text-gray-300 ml-auto">{{ itpStore.itps.find(p => p.id === c.itp_id)?.doc_no }}</span>
              </div>
              <p class="text-xs text-gray-600 mt-0.5 leading-snug">{{ c.title }}</p>
            </div>
          </button>
        </div>
        <!-- Footer -->
        <div class="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <span class="text-xs text-gray-500 flex-1">
            <span v-if="draftChecklistIds.length" class="font-medium text-blue-600">{{ draftChecklistIds.length }} selected</span>
            <span v-else>Click rows to toggle selection</span>
          </span>
          <button type="button"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
            @click="checklistPickerOpen = false"
          >Done</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Checklist HTML Viewer ─────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="checklistViewerOpen" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60" @click="checklistViewerOpen = false" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style="max-height: 90vh">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-100 shrink-0">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            <span class="font-semibold text-gray-900 text-sm">{{ checklistViewerLabel }}</span>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-600 p-1 rounded" @click="checklistViewerOpen = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Content: render HTML inside sandboxed iframe -->
        <div class="flex-1 overflow-hidden rounded-b-xl">
          <iframe
            v-if="checklistViewerHtml"
            :srcdoc="checklistViewerHtml"
            sandbox="allow-scripts allow-same-origin"
            class="w-full h-full border-0"
            style="min-height: 60vh"
          />
          <div v-else class="flex items-center justify-center h-40 text-sm text-gray-400">No HTML content available.</div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── ITR Report Builder Picker ────────────────────────────────────────── -->
  <Teleport to="body">
    <ITRReportPicker
      v-if="showReportPicker && liveItr"
      :itr="liveItr!"
      :data-map="pickerDataMap"
      :checklist-ids="draftChecklistIds"
      :itr-snapshots="itrSnapshots"
      @close="showReportPicker = false"
    />
  </Teleport>

  <!-- ── ITR Report Page Manager ─────────────────────────────────────────── -->
  <Teleport to="body">
    <ITRReportModal
      v-if="showReportModal"
      :pages="reportPages"
      :itr-title="(liveItr?.item_no ?? liveItr?.itr_number ?? '') ? ((liveItr?.item_no ?? liveItr?.itr_number ?? '') + (liveItr?.title ? ' — ' + liveItr.title : '')) : (liveItr?.title ?? 'ITR Report')"
      @close="showReportModal = false"
      @back="showReportModal = false; showReportPicker = true"
      @save="onReportSave"
    />
  </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useItrStore, type ITR, type AttachmentCategory, type ItrAttachment } from '@/stores/itrStore'
import { useItrCommentStore } from '@/stores/itrCommentStore'
import { useItrStatusStore, type ItrStatusCode } from '@/stores/itrStatusStore'
import { useItrTypeStore } from '@/stores/itrTypeStore'
import { useDisciplineStore } from '@/stores/disciplineStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAreaStore } from '@/stores/areaStore'
import { useItpStore } from '@/stores/itpStore'
import { useMaterialStore } from '@/stores/materialStore'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { useAuthorityStore } from '@/stores/authorityStore'
import { useMasterFormStore, type ItrFormSnapshot } from '@/stores/masterFormStore'
import { useItpChecklistStore, type ItpHtmlChecklist } from '@/stores/itpChecklistStore'
import { useItrChecklistSelectionStore } from '@/stores/itrChecklistSelectionStore'

import AttachmentList from '@/components/itr/AttachmentList.vue'
import TaskTodoModal from '@/components/task/TaskTodoModal.vue'
import FileUploadArea from '@/components/itr/FileUploadArea.vue'
import DateTimePicker from '@/components/DateTimePicker.vue'
import PDFFormViewer from '@/components/PDFFormViewer.vue'
import ITRReportPicker from '@/components/ITRReportPicker.vue'
import ITRComments from '@/components/ITRComments.vue'

// ── Datetime helpers (split/combine ISO local strings YYYY-MM-DDTHH:mm) ──────
function dtDate(val: string) { return val ? (val.split('T')[0] ?? '') : '' }
function dtTime(val: string) { return val ? (val.split('T')[1] ?? '') : '' }
function dtSet(val: string, part: 'date' | 'time', newVal: string) {
  const d = part === 'date' ? newVal : dtDate(val)
  const t = part === 'time' ? newVal : dtTime(val)
  return d ? (t ? `${d}T${t}` : d) : ''
}

// ── Props / Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: boolean
  itr: ITR | null        // null = create new
  autoOpenComments?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': [itr: ITR]
  'updated': []
}>()

// ── Stores ────────────────────────────────────────────────────────────────────

const itrStore        = useItrStore()
const itrStatusStore  = useItrStatusStore()
const itrTypeStore    = useItrTypeStore()
const disciplineStore = useDisciplineStore()
const taskStore       = useTaskStore()
const areaStore       = useAreaStore()
const itpStore           = useItpStore()
const materialStore      = useMaterialStore()
const projectStore       = useProjectStore()
const authStore          = useAuthStore()
const authorityStore     = useAuthorityStore()
const masterFormStore           = useMasterFormStore()
const itpChecklistStore         = useItpChecklistStore()
const itrChecklistSelectionStore = useItrChecklistSelectionStore()

// Form snapshots for this ITR — loaded on open, maps form_code → snapshot
const itrSnapshots = ref<Record<string, ItrFormSnapshot>>({})

// ── Report viewer state ─────────────────────────────────────────────────────
const showReportPicker = ref(false)
const showReportModal  = ref(false)
const pickerDataMap    = ref<Record<string, string>>({})

// ── Comments panel ───────────────────────────────────────────────────────────────
const showComments     = ref(false)
const itrCommentStore  = useItrCommentStore()

// ── Dialog open/close ─────────────────────────────────────────────────────────

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isNew = computed(() => !props.itr)

// Live ITR — auto-refreshes from store when attachments / status changes
const liveItr = computed<ITR | null>(() => {
  if (!props.itr?.id) return props.itr
  return itrStore.itrs.find(i => i.id === props.itr!.id) ?? props.itr
})

// ── Draft-by display name ─────────────────────────────────────────────────────

const draftByName = computed<string>(() => {
  const u = liveItr.value?.draft_user
  if (u) {
    if (u.first_name) return `${u.first_name}${u.last_name ? ' ' + u.last_name : ''}`.trim()
    return u.email
  }
  // Fall back: if the current user is the drafter, show their display name
  if (liveItr.value?.draft_by && liveItr.value.draft_by === authStore.userId) {
    return authStore.userDisplayName
  }
  return ''
})

// ── Snackbar ──────────────────────────────────────────────────────────────────

const snackbar = reactive({ show: false, text: '', color: 'success' as string })

// ── To Do modal ──────────────────────────────────────────────────────────────

const showTodoModal = ref(false)

function openTodoDialog() {
  showTodoModal.value = true
}
const showSnack = (text: string, color = 'success') => Object.assign(snackbar, { show: true, text, color })

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  plan: 1,
  request_qc: 2,
  request_internal_inspection: 2,  // legacy alias
  internal_request: 3,              // legacy alias
  external_request: 4,
  report_submitted: 5,
  approved: 6,
}

const currentCode = computed<ItrStatusCode | null>(() =>
  liveItr.value ? itrStatusStore.getCode(liveItr.value.status_id) : null
)

const currentOrder = computed<number>(() =>
  currentCode.value ? (STATUS_ORDER[currentCode.value] ?? 0) : 0
)

// ── Progress stepper ──────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { code: 'plan',              label: 'Plan',             icon: 'mdi-clipboard-list-outline', color: '#64748B' },
  { code: 'request_qc',       label: 'Requested to QC',  icon: 'mdi-clock-check-outline',    color: '#1D4ED8' },
  { code: 'external_request',  label: 'Request ITR',      icon: 'mdi-send-check-outline',    color: '#7C3AED' },
  { code: 'report_submitted',  label: 'Report Submitted', icon: 'mdi-file-check-outline',    color: '#0891B2' },
  { code: 'approved',          label: 'Approved',         icon: 'mdi-check-circle-outline',  color: '#059669' },
] as const

// Minimum currentOrder required to click each step
const STEP_MIN_ORDER: Record<string, number> = {
  plan: 1,
  request_qc: 2,          // accessible when at request_qc
  external_request: 2,    // accessible from request_qc onward (pre-fill)
  report_submitted: 4,    // accessible when at external_request
  approved: 5,            // accessible when at report_submitted
}

// Complete = ITR has moved past this step's range
const STEP_COMPLETE_ORDER: Record<string, number> = {
  plan: 2,                 // complete when >= request_qc (order 2)
  request_qc: 4,           // complete when >= external_request (order 4)
  external_request: 5,     // complete when >= report_submitted (order 5)
  report_submitted: 6,     // complete when >= approved (order 6)
  approved: 999,
}

const isStepClickable = (code: string): boolean => {
  if (isNew.value) return code === 'plan'
  return currentOrder.value >= (STEP_MIN_ORDER[code] ?? 99)
}

const isStepComplete = (code: string): boolean =>
  currentOrder.value >= (STEP_COMPLETE_ORDER[code] ?? 999)

const isStepActive = (code: string): boolean => {
  const min = STEP_MIN_ORDER[code] ?? 0
  const max = STEP_COMPLETE_ORDER[code] ?? 999
  return currentOrder.value >= min && currentOrder.value < max
}

// ── Selected step (which form is shown) ──────────────────────────────────────

const selectedStep = ref<string>('plan')
// Track whether the user has manually picked a step (don't override with auto-derive)
const userPickedStep = ref(false)

// ── Active tab (REQUEST ITR | INSPECTION & REPORT) ────────────────────────────
const activeTab = ref<'request_itr' | 'inspection_report'>('request_itr')

const selectStep = (code: string) => {
  userPickedStep.value = true
  selectedStep.value = code
  // Auto-enter edit mode on Request ITR step when status is still 'internal_request'
  // (form has never been filled yet — open ready to edit)
  if (code === 'external_request' && (currentCode.value === 'request_qc' || currentCode.value === 'internal_request')) {
    editMode.value = true
  } else {
    editMode.value = false  // always return to view mode when changing steps
  }
}

// Default step based on ITR status
const deriveDefaultStep = (code: ItrStatusCode | null): string => {
  switch (code) {
    case 'request_qc':                  return 'request_qc'
    case 'request_internal_inspection': return 'request_qc'   // legacy
    case 'internal_request':            return 'external_request'  // legacy
    case 'external_request':            return 'external_request'
    case 'report_submitted':            return 'report_submitted'
    case 'approved':                    return 'approved'
    default:                            return 'plan'
  }
}

// ── Fix race condition: statuses load async, re-derive selectedStep when they arrive ─
// When the dialog opens, itrStatusStore.statuses may be empty, causing getCode() to return
// null and deriveDefaultStep to return 'plan' even for non-plan ITRs.
// This watcher fires once statuses load (currentCode transitions null → real value) and
// corrects the selectedStep — but only if the user hasn't manually clicked a step.
watch(currentCode, (newCode, oldCode) => {
  if (oldCode === null && newCode !== null && !userPickedStep.value) {
    selectedStep.value = deriveDefaultStep(newCode)
    activeTab.value = newCode === 'plan' ? 'request_itr' : 'inspection_report'
  }
})

// ── Form editability ──────────────────────────────────────────────────────────

// ── Edit mode (view-first: opens as read-only, user must click Edit) ─────────
const editMode = ref(false)

// Whether the currently selected step CAN be edited (based on status)
const canEditCurrentStep = computed(() => {
  if (isNew.value) return true
  switch (selectedStep.value) {
    case 'plan':             return currentCode.value === 'plan'
    case 'request_qc':      return currentCode.value === 'request_qc' || currentCode.value === 'request_internal_inspection'
    case 'internal_request': return currentCode.value === 'internal_request'  // legacy
    case 'external_request': return currentCode.value === 'request_qc' || currentCode.value === 'internal_request'
    case 'report_submitted': return currentCode.value === 'external_request' || currentCode.value === 'report_submitted'
    case 'approved':         return currentCode.value === 'report_submitted' || currentCode.value === 'approved'
    default: return false
  }
})

const isDraftEditable    = computed(() => isNew.value || editMode.value)

/** True when the current user is the one who created this ITR (restricts REQUEST ITR editing) */
const isItrCreator = computed(() =>
  isNew.value || !liveItr.value?.created_by || liveItr.value.created_by === authStore.userId
)
const isInternalEditable = computed(() =>
  (currentCode.value === 'request_qc' || currentCode.value === 'request_internal_inspection' || currentCode.value === 'internal_request') && editMode.value
)
const isExternalEditable = computed(() => (currentCode.value === 'internal_request' || currentCode.value === 'external_request') && editMode.value)
const isReportEditable   = computed(() => (currentCode.value === 'external_request' || currentCode.value === 'report_submitted') && editMode.value)
const isApprovedEditable = computed(() => (currentCode.value === 'report_submitted' || currentCode.value === 'approved') && editMode.value)

// Combined Inspection & Report tab — editable whenever editMode is on and ITR exists
const isInspectionTabEditable = computed(() => !isNew.value && editMode.value)

// ── Form data ─────────────────────────────────────────────────────────────────

const draftFormRef    = ref()
const internalFormRef = ref()
const externalFormRef = ref()
const reportFormRef   = ref()
const approvedFormRef = ref()

// Auto-fill status dropdown with first inspection status when entering edit mode with no status set
watch(isInspectionTabEditable, (editable) => {
  if (editable && !localStatusId.value) {
    localStatusId.value = inspectionStatuses.value[0]?.id ?? null
  }
})

const draftForm = reactive({
  title: '', itr_number: '', itr_type_id: null as string | null,
  discipline_id: null as string | null, task_id: null as string | null,
  area_ids: [] as string[], itp_id: null as string | null,
  location: '', notes: '',
  planned_inspection_date: '',
  drawing_number: '',
  revision_number: '',
})

// REQUEST ITR tab form — stored in req_* columns; does NOT affect reports
const requestForm = reactive({
  req_title: '', req_itr_number: '', req_itr_type_id: null as string | null,
  req_discipline_id: null as string | null, req_task_id: null as string | null,
  req_area_ids: [] as string[], req_itp_id: null as string | null,
  req_location: '', req_notes: '',
  req_planned_inspection_date: '',
  req_drawing_number: '',
  req_revision_number: '',
})

const internalForm = reactive({
  itr_number: '', req_inspection_date: '', itr_request_file_link: '', qc_notes: '',
  itp_id: null as string | null,
  drawing_number: '',
  revision_number: '',
})

const externalForm = reactive({
  itr_number: '', itr_request_file_link: '', qc_notes: '',
})

const reportForm = reactive({
  inspection_date: '', itr_report_file_link: '', qc_notes: '',
})

const approvedForm = reactive({
  approved_report_file_link: '', qc_notes: '',
})

// Track last ITR id loaded so we only re-fetch checklist selections when
// switching to a different (or newly opened) ITR, not on every data refresh.
const _lastLoadedItrId = ref<string | null>(null)

// Populate forms when dialog opens or ITR changes
watch(
  () => [props.modelValue, liveItr.value] as const,
  ([open, itr], prev) => {
    if (!open) {
      _lastLoadedItrId.value = null
      return
    }
    if (itr) {
      Object.assign(draftForm, {
        title: itr.title,
        itr_number: itr.itr_number ?? '',
        itr_type_id: itr.itr_type_id ?? null,
        discipline_id: itr.discipline_id ?? null,
        task_id: itr.task_id ?? null,
        area_ids: itr.area_ids ?? (itr.area_id ? [itr.area_id] : []),
        itp_id: itr.itp_id ?? null,
        location: itr.location ?? '',
        notes: itr.notes ?? '',
        planned_inspection_date: itr.planned_inspection_date ?? '',
        drawing_number: itr.drawing_number ?? '',
        revision_number: itr.revision_number ?? '',
      })
      // requestForm: load req_* columns; fall back to core columns for old/existing ITRs
      Object.assign(requestForm, {
        req_title:                   itr.req_title                   ?? itr.title ?? '',
        req_itr_number:              itr.req_itr_number              ?? itr.itr_number ?? '',
        req_itr_type_id:             itr.req_itr_type_id             ?? itr.itr_type_id ?? null,
        req_discipline_id:           itr.req_discipline_id           ?? itr.discipline_id ?? null,
        req_task_id:                 itr.req_task_id                 ?? itr.task_id ?? null,
        req_area_ids:                itr.req_area_ids?.length        ? itr.req_area_ids : (itr.area_ids ?? []),
        req_itp_id:                  itr.req_itp_id                  ?? itr.itp_id ?? null,
        req_location:                itr.req_location                ?? itr.location ?? '',
        req_notes:                   itr.req_notes                   ?? itr.notes ?? '',
        req_planned_inspection_date: itr.req_planned_inspection_date ?? itr.planned_inspection_date ?? '',
        req_drawing_number:          itr.req_drawing_number          ?? itr.drawing_number ?? '',
        req_revision_number:         itr.req_revision_number         ?? itr.revision_number ?? '',
      })
      Object.assign(internalForm, {
        itr_number: itr.itr_number ?? '',
        req_inspection_date: itr.req_inspection_date ?? itr.planned_inspection_date ?? '',
        itr_request_file_link: itr.itr_request_file_link ?? '',
        qc_notes: itr.qc_notes ?? '',
        itp_id: itr.itp_id ?? null,
        drawing_number: itr.drawing_number ?? '',
        revision_number: itr.revision_number ?? '',
      })
      Object.assign(externalForm, {
        itr_number: itr.itr_number ?? '',
        itr_request_file_link: itr.itr_request_file_link ?? '',
        qc_notes: itr.qc_notes ?? '',
      })
      Object.assign(reportForm, {
        inspection_date: itr.inspection_date ?? '',
        itr_report_file_link: itr.itr_report_file_link ?? '',
        qc_notes: itr.qc_notes ?? '',
      })
      Object.assign(approvedForm, {
        approved_report_file_link: itr.approved_report_file_link ?? '',
        qc_notes: itr.qc_notes ?? '',
      })
      selectedStep.value = deriveDefaultStep(itrStatusStore.getCode(itr.status_id))
      activeTab.value = itrStatusStore.getCode(itr.status_id) === 'plan' ? 'request_itr' : 'inspection_report'
      localMaterialIds.value = (itr.itr_materials ?? []).map(im => im.material_id)
      localQcUserIds.value   = (itr.qc_assignments ?? []).map(a => a.user_id)
      localStatusId.value    = itr.status_id ?? null
      userPickedStep.value = false   // allow auto-correct if statuses arrive after this
      // Only re-fetch checklist selections when opening a different ITR.
      // Skipping the fetch when the same ITR is refreshed (e.g. after save)
      // prevents the store update from overwriting the user's current selection
      // before syncSelections has written it to the database.
      if (itr.id !== _lastLoadedItrId.value) {
        _lastLoadedItrId.value = itr.id
        itrChecklistSelectionStore.fetchSelections(itr.id).then(ids => {
          draftChecklistIds.value = ids
          // Fetch any selected checklists whose data isn't in the store yet.
          // We query by checklist ID directly rather than reverse-engineering
          // itp_id, which would silently fail when the store is still empty.
          if (ids.length) {
            const missing = ids.filter(id => !itpChecklistStore.checklists.find(c => c.id === id))
            if (missing.length) itpChecklistStore.fetchByIds(missing)
          }
        })
      }
    } else {
      // Reset for create mode
      _lastLoadedItrId.value = null
      Object.assign(draftForm, {
        title: '', itr_number: '', itr_type_id: null, discipline_id: null,
        task_id: null, area_ids: [], itp_id: null, location: '', notes: '', planned_inspection_date: '',
        drawing_number: '', revision_number: '',
      })
      Object.assign(requestForm, {
        req_title: '', req_itr_number: '', req_itr_type_id: null, req_discipline_id: null,
        req_task_id: null, req_area_ids: [], req_itp_id: null, req_location: '', req_notes: '',
        req_planned_inspection_date: '', req_drawing_number: '', req_revision_number: '',
      })
      draftChecklistIds.value = []
      localMaterialIds.value = []
      localQcUserIds.value = []
      localStatusId.value  = null
      selectedStep.value = 'plan'
      activeTab.value = 'request_itr'
      userPickedStep.value = false
    }
  },
  { immediate: true }
)

// Auto-check areas from linked task when creating a new ITR
watch(() => draftForm.task_id, (taskId) => {
  if (props.itr) return // don't override when viewing/editing existing ITR
  if (!taskId) { draftForm.area_ids = []; return }
  const task = taskStore.flatAll.find(t => t.id === taskId)
  if (task?.area_ids?.length) draftForm.area_ids = [...task.area_ids]
})

// Load dependent data when dialog opens
watch(() => props.modelValue, async (open) => {
  if (!open) return
  showComments.value = props.autoOpenComments ?? false
  editMode.value = false // always open in view mode
  const pid = projectStore.activeProject?.id
  if (!pid) return
  await Promise.all([
    itrTypeStore.itrTypes.length === 0    ? itrTypeStore.fetchItrTypes(pid)    : Promise.resolve(),
    itrStatusStore.statuses.length === 0  ? itrStatusStore.fetchStatuses(pid)  : Promise.resolve(),
    itpStore.itps.length === 0            ? itpStore.fetchItps(pid)            : Promise.resolve(),
    materialStore.materials.length === 0  ? materialStore.fetchMaterials(pid)  : Promise.resolve(),
    masterFormStore.fetchForms(pid),
    authorityStore.projectMembers.length === 0 ? authorityStore.fetchProjectMembers(pid) : Promise.resolve(),
  ])

  // Load snapshots for existing ITR so PDF uses the locked revision
  if (props.itr?.id) {
    itrSnapshots.value = await masterFormStore.fetchSnapshots(props.itr.id)
  } else {
    itrSnapshots.value = {}
  }
})

// ── Lookup helpers ────────────────────────────────────────────────────────────

const taskItems = computed(() =>
  taskStore.flatAll.map(t => ({
    title: `${t.wbs_code ? t.wbs_code + ' — ' : ''}${t.name}`, value: t.id,
  }))
)
const areaItems = computed(() =>
  areaStore.flatAll.map(a => ({
    title: `${'— '.repeat(a.level)}${a.name}${a.code ? ` (${a.code})` : ''}`, value: a.id,
  }))
)
const itpItems = computed(() =>
  itpStore.itps.map(p => ({ title: `${p.doc_no} — ${p.title}`, value: p.id }))
)
const materialItems = computed(() =>
  materialStore.materials.map(m => ({ title: `${m.doc_no} — ${m.title}`, value: m.id }))
)

// ── HTML Checklist multi-selection ──────────────────────────────────────────

const draftChecklistIds      = ref<string[]>([])
const checklistPickerOpen    = ref(false)
const checklistPickerSearch  = ref('')
const checklistPickerItpId   = ref<string | null>(null)

/** All checklists from the currently linked ITP */
const checklistsForLinkedItp = computed<ItpHtmlChecklist[]>(() =>
  draftForm.itp_id ? itpChecklistStore.forItp(draftForm.itp_id) : []
)

/** Checklists not yet selected, from the linked ITP — shown as quick-add chips */
const unselectedLinkedChecklists = computed(() =>
  checklistsForLinkedItp.value.filter(c => !draftChecklistIds.value.includes(c.id))
)

/** Full checklist object for a given id */
const checklistById = (id: string): ItpHtmlChecklist | undefined =>
  itpChecklistStore.checklists.find(c => c.id === id)

/** ITP doc_no label for a checklist id */
const itpDocNoForChecklist = (id: string): string => {
  const c = checklistById(id)
  return c ? (itpStore.itps.find(p => p.id === c.itp_id)?.doc_no ?? '') : ''
}

const toggleChecklist = (id: string) => {
  const idx = draftChecklistIds.value.indexOf(id)
  if (idx === -1) draftChecklistIds.value.push(id)
  else draftChecklistIds.value.splice(idx, 1)
}

// ── Checklist HTML viewer ────────────────────────────────────────────────────
const checklistViewerOpen  = ref(false)
const checklistViewerHtml  = ref<string>('')
const checklistViewerLabel = ref<string>('')

const openChecklistViewer = (id: string) => {
  const c = checklistById(id)
  if (!c) return
  checklistViewerLabel.value = `${c.code} — ${c.title}`
  checklistViewerHtml.value  = c.html_content ?? ''
  checklistViewerOpen.value  = true
}

const openChecklistPicker = () => {
  checklistPickerSearch.value = ''
  checklistPickerItpId.value  = draftForm.itp_id ?? null
  const allItpIds = itpStore.itps.map(p => p.id)
  if (allItpIds.length) itpChecklistStore.fetchForItpIds(allItpIds)
  checklistPickerOpen.value = true
}

/** Checklists shown in picker, filtered by ITP + search */
const pickerFilteredChecklists = computed(() => {
  let list = itpChecklistStore.checklists
  if (checklistPickerItpId.value) list = list.filter(c => c.itp_id === checklistPickerItpId.value)
  const q = checklistPickerSearch.value.trim().toLowerCase()
  if (q) list = list.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
  return list
})

/** ITPs that have at least one checklist loaded in the store */
const itpsWithChecklists = computed(() => {
  const itpIds = new Set(itpChecklistStore.checklists.map(c => c.itp_id))
  return itpStore.itps.filter(p => itpIds.has(p.id))
})

// When linked ITP changes, auto-fetch its checklists
watch(() => draftForm.itp_id, (id) => {
  if (id) itpChecklistStore.fetchChecklists(id)
})

/** Checklists from REQUEST ITR tab's linked ITP */
const checklistsForLinkedItpReq = computed<ItpHtmlChecklist[]>(() =>
  requestForm.req_itp_id ? itpChecklistStore.forItp(requestForm.req_itp_id) : []
)
const unselectedLinkedChecklistsReq = computed(() =>
  checklistsForLinkedItpReq.value.filter(c => !draftChecklistIds.value.includes(c.id))
)
watch(() => requestForm.req_itp_id, (id) => {
  if (id) itpChecklistStore.fetchChecklists(id)
})

// ── ITP Picker ────────────────────────────────────────────────────────────────

const itpPickerOpen   = ref(false)
const itpPickerDisc   = ref<string | null>(null)
const itpPickerSearch = ref('')
const itpPickerTarget = ref<'draft' | 'internal' | 'request'>('draft')

const openItpPicker = (target: 'draft' | 'internal' | 'request' = 'draft') => {
  itpPickerTarget.value = target
  itpPickerDisc.value   = (target === 'internal' ? liveItr.value?.discipline_id
    : target === 'request' ? requestForm.req_discipline_id
    : draftForm.discipline_id) ?? null
  itpPickerSearch.value = ''
  itpPickerOpen.value   = true
}

const pickerFilteredItps = computed(() => {
  let list = itpStore.itps
  if (itpPickerDisc.value) list = list.filter(p => p.discipline_id === itpPickerDisc.value)
  const q = itpPickerSearch.value.trim().toLowerCase()
  if (q) list = list.filter(p => p.doc_no?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q))
  return list
})

const itpSelectedLabel = computed(() => {
  if (!draftForm.itp_id) return ''
  const p = itpStore.itps.find(x => x.id === draftForm.itp_id)
  return p ? `${p.doc_no} — ${p.title}` : ''
})

const reqItpSelectedLabel = computed(() => {
  if (!requestForm.req_itp_id) return ''
  const p = itpStore.itps.find(x => x.id === requestForm.req_itp_id)
  return p ? `${p.doc_no} — ${p.title}` : ''
})

const itpInternalSelectedLabel = computed(() => {
  if (!internalForm.itp_id) return ''
  const p = itpStore.itps.find(x => x.id === internalForm.itp_id)
  return p ? `${p.doc_no} — ${p.title}` : ''
})

// ── Multi-material list ────────────────────────────────────────────────────
const localMaterialIds  = ref<string[]>([])
const localQcUserIds    = ref<string[]>([])
const localStatusId     = ref<string | null>(null)
const materialSearch    = ref('')
const materialDropOpen  = ref(false)
const matFilterByDisc   = ref(true)
const closeMaterialDrop = () => { setTimeout(() => { materialDropOpen.value = false }, 150) }
const matPickerOpen     = ref(false)
const matPickerDisc     = ref<string | null>(null)
const matPickerSearch   = ref('')

const openMatPicker = (fromRequest = false) => {
  matPickerDisc.value   = fromRequest ? requestForm.req_discipline_id ?? null : draftForm.discipline_id ?? null
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
  if (draftForm.discipline_id && matFilterByDisc.value) list = list.filter(m => m.discipline_id === draftForm.discipline_id)
  const q = materialSearch.value.trim().toLowerCase()
  if (q) list = list.filter(m => m.doc_no?.toLowerCase().includes(q) || m.title?.toLowerCase().includes(q))
  return list
})

const getMaterialLabel = (materialId: string): string => {
  const m = materialStore.materials.find(x => x.id === materialId)
  return m ? `${m.doc_no} — ${m.title}` : materialId
}

const addMaterialToList = (materialId: string) => {
  if (!localMaterialIds.value.includes(materialId)) localMaterialIds.value.push(materialId)
  materialSearch.value = ''
  materialDropOpen.value = false
}

const removeMaterialFromList = (materialId: string) => {
  localMaterialIds.value = localMaterialIds.value.filter(id => id !== materialId)
}

// ── QC in Charge ─────────────────────────────────────────────────────────────
const qcSearch  = ref('')
const qcDropOpen = ref(false)

const qcEligibleMembers = computed(() =>
  authorityStore.projectMembers.filter(m =>
    m.is_active &&
    (m.project_roles ?? []).some(r => ['qc_admin', 'qc_engineer', 'qc_inspector'].includes(r))
  )
)

const qcFilteredMembers = computed(() => {
  const q = qcSearch.value.trim().toLowerCase()
  if (!q) return qcEligibleMembers.value
  return qcEligibleMembers.value.filter(m => {
    const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim().toLowerCase()
    return name.includes(q) || m.email.toLowerCase().includes(q)
  })
})

const qcMemberLabel = (userId: string): string => {
  const m = authorityStore.projectMembers.find(p => p.user_id === userId)
  if (!m) return userId
  if (m.first_name) return `${m.first_name}${m.last_name ? ' ' + m.last_name : ''}`.trim()
  return m.email
}

const qcMemberRoleBadge = (m: { project_roles?: string[] }): string => {
  const roles = m.project_roles ?? []
  if (roles.includes('qc_admin')) return 'QC Admin'
  if (roles.includes('qc_engineer')) return 'QC Engineer'
  if (roles.includes('qc_inspector')) return 'QC Inspector'
  return ''
}

const isMatType = computed(() => {
  const id = requestForm.req_itr_type_id ?? draftForm.itr_type_id ?? liveItr.value?.itr_type_id
  if (!id) return false
  const t = itrTypeStore.itrTypes.find(x => x.id === id)
  return t?.code?.toUpperCase() === 'MAT'
})

// ── Attachment helpers ────────────────────────────────────────────────────────

const statusIdFor = (code: string): string | null =>
  itrStatusStore.getByCode(code)?.id ?? null

const getAttachments = (category: AttachmentCategory, stageCode?: string): ItrAttachment[] => {
  if (!liveItr.value) return []
  let list = liveItr.value.itr_attachments.filter(a => a.category === category)
  if (stageCode) {
    const sid = statusIdFor(stageCode)
    list = list.filter(a => a.status_id === sid)
  }
  return list
}

// Plan-stage existing attachments (for edit/delete in edit mode)
const draftStatusId = computed(() => itrStatusStore.getByCode('plan')?.id ?? null)

/** Statuses available in INSPECTION & REPORT tab — excludes Plan and Requested to QC */
const inspectionStatuses = computed(() =>
  itrStatusStore.statuses.filter(s =>
    s.code !== 'plan' && s.code !== 'request_qc' && s.code !== 'request_internal_inspection'
  ).sort((a, b) => a.sort_order - b.sort_order)
)
const existingDrawings = computed(() =>
  liveItr.value?.itr_attachments.filter(a => a.category === 'drawing' && a.status_id === draftStatusId.value) ?? []
)
const existingDOs = computed(() =>
  liveItr.value?.itr_attachments.filter(a => a.category === 'do' && a.status_id === draftStatusId.value) ?? []
)
const existingAdditional = computed(() =>
  liveItr.value?.itr_attachments.filter(a => a.category === 'additional' && a.status_id === draftStatusId.value) ?? []
)
const removeExistingAttachment = async (attachmentId: string) => {
  if (!liveItr.value) return
  await itrStore.deleteAttachment(liveItr.value.id, attachmentId)
}

// ── Pending file uploads ──────────────────────────────────────────────────────

const pendingDrawings   = ref<File[]>([])
const pendingDOs        = ref<File[]>([])
const pendingAdditional = ref<File[]>([])
// Internal Inspection stage pending files
const pendingInternalDrawings   = ref<File[]>([])
const pendingInternalImages     = ref<File[]>([])
const pendingInternalDOs        = ref<File[]>([])
const pendingInternalAdditional = ref<File[]>([])
const uploading         = ref(false)

const drawingInputRef    = ref<HTMLInputElement | null>(null)
const doInputRef         = ref<HTMLInputElement | null>(null)
const additionalInputRef = ref<HTMLInputElement | null>(null)
const internalDrawingInputRef   = ref<HTMLInputElement | null>(null)
const internalImageInputRef     = ref<HTMLInputElement | null>(null)
const internalDoInputRef        = ref<HTMLInputElement | null>(null)
const internalAdditionalInputRef = ref<HTMLInputElement | null>(null)

// FileUploadArea component refs — used to trigger pending uploads when Save is clicked
const extDrawingUploadRef = ref<InstanceType<typeof FileUploadArea> | null>(null)
const extImageUploadRef   = ref<InstanceType<typeof FileUploadArea> | null>(null)
const rptReportUploadRef  = ref<InstanceType<typeof FileUploadArea> | null>(null)
const rptImageUploadRef   = ref<InstanceType<typeof FileUploadArea> | null>(null)
const appImageUploadRef   = ref<InstanceType<typeof FileUploadArea> | null>(null)

const onFilePick = (e: Event, fileList: File[]) => {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  for (const f of Array.from(input.files)) fileList.push(f)
  input.value = ''
}

// ── Date formatter ────────────────────────────────────────────────────────────

const fmtInspection = (d: string | null | undefined): string => {
  if (!d) return '—'
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch { return d }
}

// ── Actions ───────────────────────────────────────────────────────────────────

/** Save / Create Plan */
const saveDraft = async () => {
  if (!draftFormRef.value?.reportValidity()) return
  const project = projectStore.activeProject
  if (!project) return

  // Snapshot material IDs NOW — before any awaits — because the watcher on
  // liveItr resets localMaterialIds after updateITR mutates the store.
  const pendingMaterialIds = [...localMaterialIds.value]
  const pendingQcUserIds   = [...localQcUserIds.value]

  const draftStatus = itrStatusStore.getByCode('plan')

  // Auto-generate internal item_no on first save (never overwrite if already set)
  let itemNo: string | null = liveItr.value?.item_no ?? null
  if (!itemNo && isNew.value) {
    const disc     = disciplineStore.getById(requestForm.req_discipline_id)
    const discCode = (disc?.code ?? 'GEN').toUpperCase()
    const typeCode = (itrTypeStore.getById(requestForm.req_itr_type_id)?.code ?? '').toUpperCase()
    itemNo = await itrStore.generateItrNumber(project.id, discCode, typeCode === 'MAT')
  }

  // req_* fields always saved (REQUEST ITR tab = preserved separately)
  const reqFields = {
    req_title:                   requestForm.req_title.trim() || null,
    req_itr_number:              requestForm.req_itr_number.trim() || null,
    req_itr_type_id:             requestForm.req_itr_type_id || null,
    req_discipline_id:           requestForm.req_discipline_id || null,
    req_task_id:                 requestForm.req_task_id || null,
    req_area_ids:                requestForm.req_area_ids,
    req_itp_id:                  requestForm.req_itp_id || null,
    req_location:                requestForm.req_location.trim() || null,
    req_notes:                   requestForm.req_notes.trim() || null,
    req_planned_inspection_date: requestForm.req_planned_inspection_date || null,
    req_drawing_number:          requestForm.req_drawing_number.trim() || null,
    req_revision_number:         requestForm.req_revision_number.trim() || null,
  }

  // For new ITRs: also populate core columns (INSPECTION & REPORT not filled yet)
  // For existing ITRs: only save req_* — core columns are owned by INSPECTION & REPORT tab
  const payload = isNew.value ? {
    title:                   requestForm.req_title.trim(),
    item_no:                 itemNo,
    itr_number:              requestForm.req_itr_number.trim() || null,
    itr_type_id:             requestForm.req_itr_type_id || null,
    discipline_id:           requestForm.req_discipline_id || null,
    task_id:                 requestForm.req_task_id || null,
    area_id:                 requestForm.req_area_ids[0] || null,
    area_ids:                requestForm.req_area_ids,
    itp_id:                  requestForm.req_itp_id || null,
    location:                requestForm.req_location.trim() || null,
    notes:                   requestForm.req_notes.trim() || null,
    planned_inspection_date: requestForm.req_planned_inspection_date || null,
    drawing_number:          requestForm.req_drawing_number.trim() || null,
    revision_number:         requestForm.req_revision_number.trim() || null,
    status_id:               draftStatus?.id ?? null,
    draft_by:                authStore.userId,
    draft_at:                new Date().toISOString(),
    ...reqFields,
  } : {
    // Existing ITR: only update req_* columns
    item_no: itemNo,
    ...reqFields,
  }

  let result: ITR | null = null
  if (isNew.value) {
    result = await itrStore.createITR({
      ...payload,
      project_id: project.id,
      created_by: authStore.userId ?? null,
    })
  } else {
    result = await itrStore.updateITR(liveItr.value!.id, payload)
  }
  if (!result) { showSnack(itrStore.error ?? 'Save failed', 'error'); return }

  // Sync material links (junction table — diff add/remove)
  // Use the snapshot captured before any awaits; localMaterialIds may have been
  // reset by the liveItr watcher once updateITR mutated the store.
  const existingMats = isNew.value ? [] : (liveItr.value?.itr_materials ?? [])
  const existingMids = existingMats.map(im => im.material_id)
  const matsToAdd    = pendingMaterialIds.filter(id => !existingMids.includes(id))
  const matsToRemove = existingMats.filter(im => !pendingMaterialIds.includes(im.material_id))
  await Promise.all([
    ...matsToAdd.map(mid => itrStore.addItrMaterial(result!.id, mid)),
    ...matsToRemove.map(im => itrStore.removeItrMaterial(result!.id, im.id)),
  ])

  // ITR header fields changed — clear stale data-key values from form_data so
  // HTML forms re-read from the updated ITR record on next report open.
  if (!isNew.value) await clearDataKeysFromFormData(result)

  // Lock the current latest form revisions onto this ITR (new ITRs only)
  if (isNew.value) {
    await masterFormStore.lockSnapshots(result.id, project.id)
    itrSnapshots.value = await masterFormStore.fetchSnapshots(result.id)
  }

  // Upload pending attachments
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
    pendingDrawings.value = []
    pendingDOs.value = []
    pendingAdditional.value = []
  }

  // Sync QC assignments
  await itrStore.syncItrQcAssignments(result.id, pendingQcUserIds)

  // Sync checklist selections
  await itrChecklistSelectionStore.syncSelections(result.id, draftChecklistIds.value)

  if (!isNew.value) editMode.value = false
  showSnack(isNew.value ? 'ITR created in Plan' : 'Plan saved')
  emit('saved', result)
}

/** Save plan form AND advance status to request_qc (Requested to QC) */
const requestInternalInspection = async () => {
  if (!liveItr.value) return
  if (!draftFormRef.value?.reportValidity()) return

  // Save REQUEST ITR data to req_* columns
  // AND copy to core columns so INSPECTION & REPORT tab starts pre-populated
  const saved = await itrStore.updateITR(liveItr.value.id, {
    // req_* columns (preserved audit trail of the original request)
    req_title:                   requestForm.req_title.trim() || null,
    req_itr_number:              requestForm.req_itr_number.trim() || null,
    req_itr_type_id:             requestForm.req_itr_type_id || null,
    req_discipline_id:           requestForm.req_discipline_id || null,
    req_task_id:                 requestForm.req_task_id || null,
    req_area_ids:                requestForm.req_area_ids,
    req_itp_id:                  requestForm.req_itp_id || null,
    req_location:                requestForm.req_location.trim() || null,
    req_notes:                   requestForm.req_notes.trim() || null,
    req_planned_inspection_date: requestForm.req_planned_inspection_date || null,
    req_drawing_number:          requestForm.req_drawing_number.trim() || null,
    req_revision_number:         requestForm.req_revision_number.trim() || null,
    // Core columns: initial copy from request so INSPECTION & REPORT tab is pre-populated
    title:                   requestForm.req_title.trim() || liveItr.value.title,
    itr_number:              requestForm.req_itr_number.trim() || null,
    itr_type_id:             requestForm.req_itr_type_id || null,
    discipline_id:           requestForm.req_discipline_id || null,
    task_id:                 requestForm.req_task_id || null,
    area_id:                 requestForm.req_area_ids[0] || null,
    area_ids:                requestForm.req_area_ids,
    itp_id:                  requestForm.req_itp_id || null,
    location:                requestForm.req_location.trim() || null,
    notes:                   requestForm.req_notes.trim() || null,
    planned_inspection_date: requestForm.req_planned_inspection_date || null,
    drawing_number:          requestForm.req_drawing_number.trim() || null,
    revision_number:         requestForm.req_revision_number.trim() || null,
  })
  if (!saved) { showSnack(itrStore.error ?? 'Save failed', 'error'); return }
  await clearDataKeysFromFormData(saved)

  // Sync QC assignments
  await itrStore.syncItrQcAssignments(saved.id, localQcUserIds.value)

  // Sync checklist selections
  await itrChecklistSelectionStore.syncSelections(saved.id, draftChecklistIds.value)

  // Advance status: plan → request_qc (Requested to QC)
  const ok = await itrStore.advanceStatus(liveItr.value.id, authStore.userId ?? '')
  if (ok) {
    editMode.value = false
    showSnack('Requested to QC — proceed to Inspection & Report tab')
    selectedStep.value = 'request_qc'
  } else {
    showSnack(itrStore.error ?? 'Advance failed', 'error')
  }
}

/** View-mode plan advance: no form save needed, just advance status */
const submitPlanForInternalInspection = async () => {
  if (!liveItr.value) return
  const ok = await itrStore.advanceStatus(liveItr.value.id, authStore.userId ?? '')
  if (ok) {
    showSnack('Requested to QC')
    selectedStep.value = 'request_qc'
  } else {
    showSnack(itrStore.error ?? 'Advance failed', 'error')
  }
}

/** Advance status from internal_request → external_request (ITR Requested) */
const submitForExternalInspection = async () => {
  if (!liveItr.value) return
  const ok = await itrStore.advanceStatus(liveItr.value.id, authStore.userId ?? '')
  if (ok) {
    showSnack('ITR Requested')
    selectedStep.value = 'external_request'
  } else {
    showSnack(itrStore.error ?? 'Advance failed', 'error')
  }
}

/** Record Internal Inspection: just opens the form in edit mode — no DB change yet */
const confirmInternalInspection = () => {
  editMode.value = true
}

/** Save Internal Inspection form → uploads pending files → advances status to internal_request */
const submitInternalInspection = async () => {
  if (!liveItr.value) return

  if (!internalForm.req_inspection_date) { showSnack('Confirmed inspection date is required', 'warning'); return }

  const saved = await itrStore.updateITR(liveItr.value.id, {
    title:                 draftForm.title.trim() || liveItr.value.title,
    itr_number:            internalForm.itr_number.trim(),
    req_inspection_date:   internalForm.req_inspection_date,
    itr_request_file_link: internalForm.itr_request_file_link.trim() || null,
    qc_notes:              internalForm.qc_notes.trim() || null,
    itp_id:                internalForm.itp_id || null,
    drawing_number:        internalForm.drawing_number.trim() || null,
    revision_number:       internalForm.revision_number.trim() || null,
  })
  if (!saved) { showSnack(itrStore.error ?? 'Save failed', 'error'); return }
  await clearDataKeysFromFormData(saved)

  // Upload any pending attachments before advancing (avoids loss on component unmount)
  const internalStatusId = itrStatusStore.getByCode('internal_request')?.id ?? null
  const totalInternalFiles = pendingInternalDrawings.value.length + pendingInternalImages.value.length
  if (totalInternalFiles > 0) {
    uploading.value = true
    const userId = authStore.userId
    for (const file of pendingInternalDrawings.value)
      await itrStore.addAttachment(liveItr.value, file, userId, 'drawing', internalStatusId)
    for (const file of pendingInternalImages.value)
      await itrStore.addAttachment(liveItr.value, file, userId, 'image', internalStatusId)
    pendingInternalDrawings.value = []
    pendingInternalImages.value = []
    uploading.value = false
  }

  // If already at internal_request, just save — don't advance again
  if (currentCode.value === 'internal_request') {
    editMode.value = false
    showSnack('Internal Inspection updated')
    return
  }

  const ok = await itrStore.advanceStatus(liveItr.value.id, authStore.userId ?? '')
  if (ok) {
    editMode.value = false
    showSnack('Internal Inspection saved')
    selectedStep.value = 'external_request'
  } else {
    showSnack(itrStore.error ?? 'Advance failed', 'error')
  }
}

/** Save Request ITR form → advances to external_request (ITR Requested), or just saves if already there */
const submitExternalInspection = async () => {
  if (!liveItr.value) return
  if (!externalForm.itr_number.trim()) { showSnack('ITR Number is required', 'warning'); return }

  // Flush any pending FileUploadArea files first
  await extDrawingUploadRef.value?.uploadAll()
  await extImageUploadRef.value?.uploadAll()

  const saved = await itrStore.updateITR(liveItr.value.id, {
    itr_number:            externalForm.itr_number.trim(),
    itr_request_file_link: externalForm.itr_request_file_link.trim() || null,
    qc_notes:              externalForm.qc_notes.trim() || null,
  })
  if (!saved) { showSnack(itrStore.error ?? 'Save failed', 'error'); return }
  await clearDataKeysFromFormData(saved)

  if (currentCode.value === 'external_request') {
    editMode.value = false
    showSnack('Changes saved')
    return
  }

  const ok = await itrStore.advanceStatus(liveItr.value.id, authStore.userId ?? '')
  if (ok) {
    editMode.value = false
    showSnack('ITR Requested')
    selectedStep.value = 'report_submitted'
  } else {
    showSnack(itrStore.error ?? 'Advance failed', 'error')
  }
}

/** Submit Report → advances to report_submitted, or just saves if already there */
const submitReport = async () => {
  if (!liveItr.value) return

  // Flush any pending FileUploadArea files first
  await rptReportUploadRef.value?.uploadAll()
  await rptImageUploadRef.value?.uploadAll()
  const saved = await itrStore.updateITR(liveItr.value.id, {
    inspection_date:      reportForm.inspection_date || null,
    itr_report_file_link: reportForm.itr_report_file_link.trim() || null,
    qc_notes:             reportForm.qc_notes.trim() || null,
  })
  if (!saved) { showSnack(itrStore.error ?? 'Save failed', 'error'); return }

  if (currentCode.value === 'report_submitted') {
    editMode.value = false
    showSnack('Changes saved')
    return
  }

  const ok = await itrStore.advanceStatus(liveItr.value.id, authStore.userId ?? '')
  if (ok) {
    editMode.value = false
    showSnack('Report submitted')
    selectedStep.value = 'approved'
  } else {
    showSnack(itrStore.error ?? 'Advance failed', 'error')
  }
}

/** Approve ITR, or just save if already approved */
const saveApproved = async () => {
  if (!liveItr.value) return

  // Flush any pending FileUploadArea files first
  await appImageUploadRef.value?.uploadAll()
  const saved = await itrStore.updateITR(liveItr.value.id, {
    approved_report_file_link: approvedForm.approved_report_file_link.trim() || null,
    qc_notes:                  approvedForm.qc_notes.trim() || null,
  })
  if (!saved) { showSnack(itrStore.error ?? 'Save failed', 'error'); return }

  if (currentCode.value === 'approved') {
    editMode.value = false
    showSnack('Changes saved')
    return
  }

  const ok = await itrStore.advanceStatus(liveItr.value.id, authStore.userId ?? '')
  if (ok) { editMode.value = false; showSnack('ITR Approved ✓') }
  else showSnack(itrStore.error ?? 'Advance failed', 'error')
}

/** Reject back to Plan */
const doReject = async () => {
  if (!liveItr.value) return
  const ok = await itrStore.rejectToDraft(liveItr.value.id, authStore.userId ?? '')
  if (ok) {
    showSnack('Sent back to Plan')
    selectedStep.value = 'plan'
    activeTab.value = 'request_itr'
  } else {
    showSnack(itrStore.error ?? 'Reject failed', 'error')
  }
}

/** Save combined Inspection & Report tab (all shared fields + inspection-exclusive fields) */
const saveInspectionReport = async () => {
  if (!liveItr.value) return

  // Snapshot material IDs before any awaits (watcher may reset them after updateITR)
  const pendingMaterialIds = [...localMaterialIds.value]

  const saved = await itrStore.updateITR(liveItr.value.id, {
    title:                   draftForm.title.trim() || liveItr.value.title,
    itr_number:              draftForm.itr_number.trim() || null,
    itr_type_id:             draftForm.itr_type_id || null,
    status_id:               localStatusId.value || liveItr.value.status_id,
    discipline_id:           draftForm.discipline_id || null,
    task_id:                 draftForm.task_id || null,
    area_id:                 draftForm.area_ids[0] || null,
    area_ids:                draftForm.area_ids,
    itp_id:                  draftForm.itp_id || null,
    location:                draftForm.location.trim() || null,
    planned_inspection_date: draftForm.planned_inspection_date || null,
    drawing_number:          draftForm.drawing_number.trim() || null,
    revision_number:         draftForm.revision_number.trim() || null,
    req_inspection_date:     internalForm.req_inspection_date || null,
    itr_request_file_link:   externalForm.itr_request_file_link.trim() || null,
    inspection_date:         reportForm.inspection_date || null,
    itr_report_file_link:    reportForm.itr_report_file_link.trim() || null,
    qc_notes:                internalForm.qc_notes.trim() || null,
  })
  if (!saved) { showSnack(itrStore.error ?? 'Save failed', 'error'); return }
  await clearDataKeysFromFormData(saved)

  // Sync material links
  const existingMats = liveItr.value?.itr_materials ?? []
  const existingMids = existingMats.map(im => im.material_id)
  const matsToAdd    = pendingMaterialIds.filter(id => !existingMids.includes(id))
  const matsToRemove = existingMats.filter(im => !pendingMaterialIds.includes(im.material_id))
  await Promise.all([
    ...matsToAdd.map(mid => itrStore.addItrMaterial(saved.id, mid)),
    ...matsToRemove.map(im => itrStore.removeItrMaterial(saved.id, im.id)),
  ])

  // Sync QC assignments
  await itrStore.syncItrQcAssignments(saved.id, localQcUserIds.value)

  // Sync checklist selections
  await itrChecklistSelectionStore.syncSelections(saved.id, draftChecklistIds.value)

  // Upload pending inspection attachments
  const internalStatusId = itrStatusStore.getByCode('internal_request')?.id ?? null
  const totalFiles = pendingInternalDrawings.value.length + pendingInternalDOs.value.length + pendingInternalAdditional.value.length
  if (totalFiles > 0) {
    uploading.value = true
    const userId = authStore.userId
    for (const file of pendingInternalDrawings.value)
      await itrStore.addAttachment(saved, file, userId, 'drawing', internalStatusId)
    for (const file of pendingInternalDOs.value)
      await itrStore.addAttachment(saved, file, userId, 'do', internalStatusId)
    for (const file of pendingInternalAdditional.value)
      await itrStore.addAttachment(saved, file, userId, 'additional', internalStatusId)
    pendingInternalDrawings.value = []
    pendingInternalDOs.value = []
    pendingInternalAdditional.value = []
    uploading.value = false
  }

  editMode.value = false
  showSnack('Inspection & Report saved')
  emit('updated')
}

// ══ PDF Form Viewer (generic — works for any master form) ══════════════

const fillFormDropOpen = ref(false)
const fillFormDropRef  = ref<HTMLElement | null>(null)

/** Master forms except itr_cover (which has its own dialog) */
const fillableForms = computed(() =>
  masterFormStore.forms.filter(f => f.code !== 'itr_cover' && masterFormStore.getLatestRevision(f.id) !== null)
)

const formViewerRef = ref<InstanceType<typeof PDFFormViewer> | null>(null)
const formViewer = reactive({
  open:          false,
  formCode:      '',
  title:         '',
  pdfUrl:        '',
  initialValues: {} as Record<string, string>,
  saving:        false,
})

function openFormViewer(formCode: string) {
  const mf = masterFormStore.forms.find(f => f.code === formCode)
  if (!mf) return
  const snapshot  = itrSnapshots.value[formCode] ?? null
  const pdfUrl    = masterFormStore.getTemplateUrl(formCode, snapshot) ?? ''
  const saved     = ((liveItr.value?.form_data ?? {})[formCode] ?? {}) as Record<string, string>
  formViewer.formCode      = formCode
  formViewer.title         = mf.title
  formViewer.pdfUrl        = pdfUrl
  formViewer.initialValues = { ...saved }
  formViewer.saving        = false
  formViewer.open          = true
}

function closeFormViewer() {
  formViewer.open = false
}

async function saveFormViewer() {
  if (!liveItr.value || !formViewerRef.value) return
  formViewer.saving = true
  try {
    const values = formViewerRef.value.extractValues()
    const newFormData = {
      ...(liveItr.value.form_data ?? {}),
      [formViewer.formCode]: values,
    }
    const ok = await itrStore.updateITR(liveItr.value.id, { form_data: newFormData })
    if (ok) {
      showSnack('Form data saved')
      closeFormViewer()
    } else {
      showSnack(itrStore.error ?? 'Save failed', 'error')
    }
  } finally {
    formViewer.saving = false
  }
}

// ══ ITR Cover PDF Generator ════════════════════════════════════════════

const sigCanvas = ref<HTMLCanvasElement | null>(null)
let sigDrawing = false
let sigLastX = 0
let sigLastY = 0

const coverPdf = reactive({ dialogOpen: false, hasSigned: false, loading: false })

const coverFormFields = reactive({
  to: "Owner/Owner's representative",
  dwgNo: '',
})

const openCoverPdfDialog = () => {
  coverPdf.dialogOpen = true
  coverPdf.hasSigned = false
  coverPdf.loading = false
  // Load saved form_data for itr_cover
  const saved = (liveItr.value?.form_data?.['itr_cover'] ?? {}) as Record<string, unknown>
  coverFormFields.to    = (saved.to as string)    ?? "Owner/Owner's representative"
  coverFormFields.dwgNo = (saved.dwgNo as string) ?? getAttachments('drawing').find(Boolean)?.file_name ?? ''
  nextTick(() => clearSignatureCanvas())
}
const closeCoverPdfDialog = () => { coverPdf.dialogOpen = false; clearSignatureCanvas() }
const clearSignatureCanvas = () => {
  const c = sigCanvas.value; if (!c) return
  c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
  coverPdf.hasSigned = false
}
const getSigPos = (c: HTMLCanvasElement, cx: number, cy: number) => {
  const r = c.getBoundingClientRect()
  return { x: (cx - r.left) * c.width / r.width, y: (cy - r.top) * c.height / r.height }
}
const onSigMouseDown = (e: MouseEvent) => {
  const c = sigCanvas.value; if (!c) return
  sigDrawing = true; const p = getSigPos(c, e.clientX, e.clientY); sigLastX = p.x; sigLastY = p.y
}
const onSigMouseMove = (e: MouseEvent) => {
  if (!sigDrawing) return
  const c = sigCanvas.value; if (!c) return
  const ctx = c.getContext('2d')!; const p = getSigPos(c, e.clientX, e.clientY)
  ctx.beginPath(); ctx.moveTo(sigLastX, sigLastY); ctx.lineTo(p.x, p.y)
  ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
  sigLastX = p.x; sigLastY = p.y; coverPdf.hasSigned = true
}
const onSigMouseUp = () => { sigDrawing = false }
const onSigTouchStart = (e: TouchEvent) => {
  const c = sigCanvas.value; if (!c) return
  sigDrawing = true; const p = getSigPos(c, e.touches[0].clientX, e.touches[0].clientY); sigLastX = p.x; sigLastY = p.y
}
const onSigTouchMove = (e: TouchEvent) => {
  if (!sigDrawing) return
  const c = sigCanvas.value; if (!c) return
  const ctx = c.getContext('2d')!; const p = getSigPos(c, e.touches[0].clientX, e.touches[0].clientY)
  ctx.beginPath(); ctx.moveTo(sigLastX, sigLastY); ctx.lineTo(p.x, p.y)
  ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
  sigLastX = p.x; sigLastY = p.y; coverPdf.hasSigned = true
}

const generateCoverPdf = async () => {
  if (!liveItr.value) return
  const c = sigCanvas.value; if (!c) return
  coverPdf.loading = true
  try {
    const sigBase64 = c.toDataURL('image/png').split(',')[1]
    const itr = liveItr.value
    const project = projectStore.activeProject
    const drawingAttach = getAttachments('drawing').find(Boolean)
    const itpDoc = itr.itp_id ? itpStore.itps.find(p => p.id === itr.itp_id) : null
    const areaObj = itr.area_id ? areaStore.flatAll.find(a => a.id === itr.area_id) : null
    const discObj = itr.discipline_id ? disciplineStore.getById(itr.discipline_id) : null
    const fmtShort = (d: string | null) => {
      if (!d) return ''
      try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) }
      catch { return d }
    }
    const payload = {
      apiKey:    import.meta.env.VITE_APPS_SCRIPT_KEY ?? '',
      sheetId:   import.meta.env.VITE_COVER_SHEET_ID ?? '1U_uUCGICsVoJ5v9IX2hrtDiG3wC6GlBNSPZBZhm_vLM',
      formType:  itrSnapshots.value['itr_cover']?.master_form_revisions?.apps_script_form_type ?? 'itr_cover',
      sheetName: 'cover',
      data: {
        itrNo:         itr.itr_number ?? '',
        project:       project?.name ?? '',
        discipline:    discObj ? `${discObj.code} — ${discObj.title}` : '',
        area:          areaObj?.name ?? '',
        issueDate:     fmtShort(itr.planned_inspection_date),
        dwgNo:         drawingAttach?.file_name ?? '',
        itpNo:         itpDoc?.doc_no ?? '',
        title:         itr.title ?? '',
        location:      itr.location ?? '',
        confirmedDate: fmtShort(itr.req_inspection_date),
        sig_mep:       sigBase64,
        sigDate_mep:   fmtShort(new Date().toISOString()),
      },
    }
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL
    if (!appsScriptUrl) { showSnack('Apps Script URL not configured', 'error'); return }
    const res  = await fetch(appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!json.success) { showSnack(json.error ?? 'PDF generation failed', 'error'); return }
    const bytes = Uint8Array.from(atob(json.pdf), ch => ch.charCodeAt(0))
    window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank')
    showSnack('ITR Cover PDF generated!')
    closeCoverPdfDialog()
  } catch (err: unknown) {
    showSnack(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
  } finally {
    coverPdf.loading = false
  }
}

// ══ ITR Cover PDF — Local pdf-lib (AcroForm) ══════════════════════════════════

const generateCoverPdfLocal = async () => {
  if (!liveItr.value) return
  const c = sigCanvas.value
  if (!c) return
  coverPdf.loading = true
  try {
    const { PDFDocument } = await import('pdf-lib')
    const itr     = liveItr.value
    const project = projectStore.activeProject
    const areaObj = itr.area_id ? areaStore.flatAll.find(a => a.id === itr.area_id) : null
    const discObj = itr.discipline_id ? disciplineStore.getById(itr.discipline_id) : null
    const itpDoc  = itr.itp_id ? itpStore.itps.find(p => p.id === itr.itp_id) : null
    const fmtShort = (d: string | null) => {
      if (!d) return ''
      try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) }
      catch { return d }
    }

    // Persist user-filled fields to DB first
    const newFormData = {
      ...(itr.form_data ?? {}),
      itr_cover: { to: coverFormFields.to, dwgNo: coverFormFields.dwgNo },
    }
    await itrStore.updateITR(itr.id, { form_data: newFormData })

    // Resolve template URL: prefer snapshot-locked revision, fall back to latest, then env var
    const snapshot     = itrSnapshots.value['itr_cover'] ?? null
    const templateUrl  = masterFormStore.getTemplateUrl('itr_cover', snapshot)
                      || import.meta.env.VITE_ITR_FORM_TEMPLATE_URL
                      || '/itr_template_FORM.pdf'
    const templateBytes = await fetch(templateUrl).then(r => r.arrayBuffer())
    const pdfDoc = await PDFDocument.load(templateBytes)
    const form   = pdfDoc.getForm()

    const textFields: Record<string, string> = {
      itrNo:         itr.itr_number ?? '',
      to:            coverFormFields.to,
      project:       project?.name ?? '',
      discipline:    discObj ? `${discObj.code} — ${discObj.title}` : '',
      area:          areaObj?.name ?? '',
      issueDate:     fmtShort(itr.planned_inspection_date),
      dwgNo:         coverFormFields.dwgNo,
      itpNo:         itpDoc?.doc_no ?? '',
      title:         itr.title ?? '',
      location:      itr.location ?? '',
      confirmedDate: fmtShort(itr.req_inspection_date),
      sigDate_mep:   fmtShort(new Date().toISOString()),
    }
    // Inspection item row 1 — pulled directly from ITR record
    textFields['item_1'] = itr.title ?? ''
    textFields['loc_1']  = itr.location ?? ''
    textFields['dt_1']   = fmtShort(itr.req_inspection_date)

    for (const [name, value] of Object.entries(textFields)) {
      try {
        form.getTextField(name).setText(value)
      } catch {
        // field not in this template — skip
      }
    }

    // Embed signature image if user has signed
    if (coverPdf.hasSigned) {
      const sigDataUrl = c.toDataURL('image/png')
      const sigBytes   = await fetch(sigDataUrl).then(r => r.arrayBuffer())
      const sigImage   = await pdfDoc.embedPng(sigBytes)
      try {
        form.getButton('sig_mep').setImage(sigImage)
      } catch {
        // Fallback: draw image directly at the sig_mep text-field widget rectangle
        try {
          const sigField = form.getTextField('sig_mep')
          const widgets  = sigField.acroField.getWidgets()
          if (widgets.length > 0) {
            const rect = widgets[0].getRectangle()
            pdfDoc.getPages()[0].drawImage(sigImage, {
              x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            })
            sigField.setText('')
          }
        } catch { /* no signature field in template — skip */ }
      }
    }

    form.flatten()
    const pdfBytes = await pdfDoc.save()
    window.open(URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' })), '_blank')
    showSnack('ITR Cover PDF generated!')
    closeCoverPdfDialog()
  } catch (err: unknown) {
    showSnack(`PDF error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error')
  } finally {
    coverPdf.loading = false
  }
}

// ── Close ─────────────────────────────────────────────────────────────────────

const close = () => {
  isOpen.value = false
  editMode.value = false
  itpPickerOpen.value = false
  materialSearch.value = ''
  materialDropOpen.value = false
  nextTick(() => {
    pendingDrawings.value = []
    pendingDOs.value = []
    pendingAdditional.value = []
    pendingInternalDrawings.value = []
    pendingInternalImages.value = []
    pendingInternalDOs.value = []
    pendingInternalAdditional.value = []
    Object.assign(requestForm, {
      req_title: '', req_itr_number: '', req_itr_type_id: null, req_discipline_id: null,
      req_task_id: null, req_area_ids: [], req_itp_id: null, req_location: '', req_notes: '',
      req_planned_inspection_date: '', req_drawing_number: '', req_revision_number: '',
    })
  })
}

// ── HTML Report assembly ──────────────────────────────────────────────────────

/** Returns the MasterFormRevision for a form code, preferring the locked snapshot */
const getRevisionForReport = (code: string) =>
  itrSnapshots.value[code]?.master_form_revisions
    ?? masterFormStore.getLatestRevision(code)

/** True when at least one HTML template (cover or photo) is uploaded */
const hasHtmlReport = computed(() =>
  !!(getRevisionForReport('itr_cover')?.html_content
    || getRevisionForReport('photo_report')?.html_content
    || draftChecklistIds.value.some(id => checklistById(id)?.html_content))
)

/** Build the field injection map for the current ITR (shared between picker and legacy path) */
function buildDataMap(itr: ITR): Record<string, string> {
  const areaNames = (itr.area_ids ?? (itr.area_id ? [itr.area_id] : []))
    .map(id => areaStore.flatAll.find(a => a.id === id)?.name ?? '')
    .filter(Boolean)
    .join(', ')
  const discObj   = itr.discipline_id ? disciplineStore.getById(itr.discipline_id) : null
  const discLabel = discObj ? discObj.title : (itr.discipline ?? '')
  const requestNo = itr.itr_number ?? ''
  const formDate  = itr.req_inspection_date
    ? new Date(itr.req_inspection_date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB')

  const inspDT = itr.req_inspection_date ? new Date(itr.req_inspection_date) : null
  const inspDateOnly = inspDT
    ? String(inspDT.getDate()).padStart(2, '0') + '/' +
      String(inspDT.getMonth() + 1).padStart(2, '0') + '/' +
      inspDT.getFullYear()
    : ''
  const inspTimeOnly = inspDT
    ? String(inspDT.getHours()).padStart(2, '0') + ':' +
      String(inspDT.getMinutes()).padStart(2, '0')
    : ''

  return {
    'sys:itr_number':            requestNo,
    'sys:title':                 itr.title ?? '',
    'sys:location':              itr.location ?? '',
    'sys:area':                  areaNames,
    'sys:req_inspection_date':   fmtInspection(itr.req_inspection_date),
    'discipline':                discLabel,
    'request-date':              formDate,
    'ref-dwg':                   itr.drawing_number ?? '',
    'rev-no':                    itr.revision_number ?? '',
    'area':                      areaNames,
    'location':                  itr.location ?? '',
    'report-no':                 requestNo,
    'drawing-no':                itr.drawing_number ?? '',
    'itp-no':                    itpStore.itps.find(p => p.id === itr.itp_id)?.doc_no ?? '',
    'form-date':                 formDate,
    // Split inspection date/time variants
    'req_inspection_date-time':  fmtInspection(itr.req_inspection_date),
    'req_inspection_date':       inspDateOnly,
    'req_inspection_time':       inspTimeOnly,
  }
}

/**
 * After saving ITR header fields in the modal, strip those data-key entries from every
 * form_data formCode so the next report render picks up fresh values from the ITR record.
 * (If the user later edits in the HTML form and locks, those values are saved back to
 * form_data and will win again until the next ITR modal save — last-write wins.)
 */
async function clearDataKeysFromFormData(itr: ITR) {
  if (!itr.form_data || Object.keys(itr.form_data).length === 0) return
  const keysToRemove = new Set(Object.keys(buildDataMap(itr)))
  const cleaned: Record<string, Record<string, unknown>> = {}
  for (const [formCode, entry] of Object.entries(itr.form_data as Record<string, Record<string, unknown>>)) {
    const cleanedEntry = { ...entry }
    for (const k of keysToRemove) delete cleanedEntry[k]
    cleaned[formCode] = cleanedEntry
  }
  const ok = await itrStore.updateITR(itr.id, { form_data: cleaned })
  if (ok && liveItr.value?.id === itr.id) {
    liveItr.value = { ...liveItr.value, form_data: cleaned }
  }
}

/** Opens the report builder picker */
function openReportPicker() {
  if (!liveItr.value) return
  pickerDataMap.value = buildDataMap(liveItr.value)
  showReportPicker.value = true
}

</script>
