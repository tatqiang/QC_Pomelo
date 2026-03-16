<template>
  <div class="p-4 md:p-6 max-w-full overflow-x-hidden">

    <!-- ─── No project guard ──────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">No Active Project</h2>
      <p class="text-gray-500 mb-6">Select a project to view its ITRs.</p>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 bg-[#81938A] text-white rounded-md hover:bg-[#6b7a72] transition"
        @click="selectorOpen = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        Select Project
      </button>
      <ProjectSelectorDialog v-model="selectorOpen" />
    </div>

    <template v-else>
      <!-- QC-in-Charge edit backdrop -->
      <div v-if="qcEditItrId !== null" class="fixed inset-0 z-40" @click="saveActiveQcEdit" />
      <!-- Req. Inspection Date edit backdrop -->
      <div v-if="reqDateEditItrId !== null" class="fixed inset-0 z-40" @click="saveActiveReqDateEdit" />

      <!-- ─── Header ─────────────────────────────────────────────── -->
      <div class="flex items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900">ITRs</h1>
          <p class="text-sm text-gray-500">
            {{ projectStore.activeProject.name }} · {{ itrStore.stats.total ?? 0 }} total
          </p>
        </div>
        <div class="ml-auto">
          <button
            class="inline-flex items-center gap-2 px-4 py-2 bg-[#81938A] text-white rounded-md hover:bg-[#6b7a72] transition text-sm font-medium"
            @click="() => { modalITR = null; modalOpen = true }"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            New ITR
          </button>
        </div>
      </div>

      <!-- ─── Stats row (per status) ──────────────────────────────── -->
      <div class="grid gap-2 mb-4" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))">
        <!-- All chip -->
        <button
          class="rounded-lg p-3 text-left border transition cursor-pointer hover:opacity-85"
          :class="activeFilter === 'all'
            ? 'bg-[#81938A]/10 border-[#81938A] text-[#81938A]'
            : 'bg-white border-gray-200 text-gray-900'"
          @click="toggleFilter('all')"
        >
          <div class="text-[0.6rem] font-bold uppercase tracking-wider opacity-70">All</div>
          <div class="text-2xl font-bold">{{ itrStore.stats.total ?? 0 }}</div>
        </button>
        <!-- Per-status chips -->
        <button
          v-for="st in itrStatusStore.sorted.filter(s => s.code !== 'draft')"
          :key="st.id"
          class="rounded-lg p-3 text-left border transition cursor-pointer hover:opacity-85"
          :class="activeFilter === st.id
            ? 'border-current'
            : 'bg-white border-gray-200'"
          :style="activeFilter === st.id ? `background: ${st.color ?? '#81938A'}15; border-color: ${st.color ?? '#81938A'}; color: ${st.color ?? '#81938A'}` : ''"
          @click="toggleFilter(st.id)"
        >
          <div class="text-[0.6rem] font-bold uppercase tracking-wider" :class="activeFilter === st.id ? '' : 'text-gray-500'">{{ st.title }}</div>
          <div class="text-2xl font-bold" :class="activeFilter === st.id ? '' : 'text-gray-900'">{{ itrStore.stats[st.code] ?? 0 }}</div>
        </button>
      </div>

      <!-- ─── Search + Column picker ───────────────────────────── -->
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <div class="relative" style="max-width: 280px; width: 100%;">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            v-model="itrStore.filterSearch"
            type="text"
            placeholder="Search title, ITR number…"
            class="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81938A] focus:border-transparent"
          />
          <button
            v-if="itrStore.filterSearch"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            @click="itrStore.filterSearch = ''"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Export button -->
        <button
          class="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition"
          title="Export current view to Excel"
          @click="exportToExcel"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          Export
        </button>

        <!-- Columns picker -->
        <div class="relative ml-auto" ref="colPickerRef">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition"
            @click.stop="colPickerOpen = !colPickerOpen"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h18M3 10h18M3 15h18M3 20h18"/>
            </svg>
            Columns
          </button>
          <!-- backdrop -->
          <div v-if="colPickerOpen" class="fixed inset-0 z-10" @click="colPickerOpen = false" />
          <!-- panel -->
          <div v-if="colPickerOpen" class="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 min-w-[180px]">
            <div class="px-3 py-1 mb-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-100">Columns</div>
            <label
              v-for="col in columns"
              :key="col.id"
              class="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              @click.stop
            >
              <input
                type="checkbox"
                v-model="col.visible"
                @change="persistCols()"
                class="w-3.5 h-3.5 rounded accent-[#81938A]"
              />
              <span class="text-sm text-gray-700">{{ col.id === 'attachments' ? 'Attachments' : col.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- ─── Loading ─────────────────────────────────────────────── -->
      <div v-if="itrStore.loading && itrStore.itrs.length === 0" class="text-center py-16">
        <svg class="animate-spin h-12 w-12 text-[#81938A] mx-auto" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- ─── Empty ────────────────────────────────────────────────── -->
      <div v-else-if="!itrStore.loading && itrStore.filteredITRs.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">No ITRs Found</h2>
        <p class="text-gray-500 mb-6">
          {{ itrStore.itrs.length > 0 ? 'Try adjusting filters.' : 'Create your first ITR to get started.' }}
        </p>
        <button
          v-if="itrStore.itrs.length === 0"
          class="inline-flex items-center gap-2 px-4 py-2 bg-[#81938A] text-white rounded-md hover:bg-[#6b7a72] transition text-sm font-medium"
          @click="() => { modalITR = null; modalOpen = true }"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          New Plan ITR
        </button>
      </div>

      <!-- ─── Table ──────────────────────────────────────────────────── -->
      <div v-else class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <!-- Draggable column headers -->
                <th
                  v-for="(col, idx) in visibleColumns"
                  :key="col.id"
                  draggable="true"
                  @dragstart="onColDragStart(idx)"
                  @dragover.prevent="onColDragOver(idx)"
                  @drop.prevent="onColDrop(idx)"
                  @dragend="onColDragEnd"
                  class="text-left px-2 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wider select-none transition-colors"
                  :class="{ 'bg-[#81938A]/10 border-b-2 border-[#81938A]': dragOverColIdx === idx && dragColIdx !== idx }"
                  :style="col.width ? `width:${col.width};min-width:${col.width}` : ''"
                  style="position:relative"
                >
                  <div class="flex items-center gap-0.5">
                    <!-- sort button (click) + drag handle (drag) -->
                    <button
                      type="button"
                      class="flex items-center gap-1 flex-1 min-w-0 hover:text-[#81938A] transition-colors"
                      @click.stop="toggleSort(col.id)"
                    >
                      <svg class="w-2 h-3 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 8 12">
                        <circle cx="2" cy="2" r="1.5"/><circle cx="6" cy="2" r="1.5"/>
                        <circle cx="2" cy="6" r="1.5"/><circle cx="6" cy="6" r="1.5"/>
                        <circle cx="2" cy="10" r="1.5"/><circle cx="6" cy="10" r="1.5"/>
                      </svg>
                      <template v-if="col.id === 'attachments'">
                        <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                        </svg>
                      </template>
                      <template v-else><span class="truncate">{{ col.label }}</span></template>
                      <!-- sort arrow -->
                      <svg v-if="sortCol === col.id && sortDir === 'asc'" class="w-3 h-3 flex-shrink-0 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                      <svg v-else-if="sortCol === col.id && sortDir === 'desc'" class="w-3 h-3 flex-shrink-0 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <!-- filter funnel button -->
                    <button
                      type="button"
                      class="flex-shrink-0 p-0.5 rounded transition-colors"
                      :class="hasColFilter(col.id) ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-gray-500'"
                      @click.stop="toggleFilterPanel(col.id, $event)"
                    >
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                  <!-- resize handle -->
                  <div
                    class="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-[#81938A]/40 active:bg-[#81938A]/70 z-10"
                    @mousedown.stop.prevent="onColResizeStart(col.id, $event)"
                  />
                </th>
                <!-- Actions column always last -->
                <th class="w-[70px]"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in displayedITRs"
                :key="item.id"
                class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                :class="{ 'bg-blue-50/40': newItrIds.includes(item.id) }"
                @click="openDetail(item)"
              >
                <!-- Dynamic cells per visible column -->
                <td v-for="col in visibleColumns" :key="col.id" class="px-3 py-2.5">
                  <!-- Item No -->
                  <template v-if="col.id === 'item_no'">
                    <span class="text-[#81938A] font-bold text-xs whitespace-nowrap font-mono">{{ item.item_no ?? '—' }}</span>
                  </template>
                  <!-- ITR Number -->
                  <template v-else-if="col.id === 'itr_number'">
                    <span class="text-gray-500 text-xs whitespace-nowrap">{{ item.itr_number ?? '—' }}</span>
                  </template>
                  <!-- Title -->
                  <template v-else-if="col.id === 'title'">
                    <span class="font-medium text-gray-900" :title="item.title">{{ item.title }}</span>
                  </template>
                  <!-- Status -->
                  <template v-else-if="col.id === 'status'">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      :style="`background: ${itrStatusStore.getColor(item.status_id)}20; color: ${itrStatusStore.getColor(item.status_id)}`"
                    >{{ itrStatusStore.getLabel(item.status_id) }}</span>
                  </template>
                  <!-- Type -->
                  <template v-else-if="col.id === 'type'">
                    <span class="text-xs text-gray-600">{{ itrTypeStore.getLabel(item.itr_type_id) }}</span>
                  </template>
                  <!-- Discipline -->
                  <template v-else-if="col.id === 'discipline'">
                    <span v-if="getDiscLabel(item.discipline_id)" class="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-[#81938A]/10 text-[#81938A]">{{ getDiscLabel(item.discipline_id) }}</span>
                    <span v-else class="text-gray-400">—</span>
                  </template>
                  <!-- Task -->
                  <template v-else-if="col.id === 'task'">
                    <span class="text-xs text-gray-600">{{ getTaskName(item.task_id) ?? '—' }}</span>
                  </template>
                  <!-- Area -->
                  <template v-else-if="col.id === 'area'">
                    <span class="text-xs text-gray-600">{{ getAreaNames(item) }}</span>
                  </template>
                  <!-- Date -->
                  <template v-else-if="col.id === 'date'">
                    <span class="text-xs text-gray-600 whitespace-nowrap">{{ fmtInspection(item.inspection_date) }}</span>
                  </template>
                  <!-- Planned Inspection Date -->
                  <template v-else-if="col.id === 'planned_date'">
                    <span class="text-xs text-gray-600 whitespace-nowrap">{{ fmtInspection(item.planned_inspection_date) }}</span>
                  </template>
                  <!-- Req. Inspection Date -->
                  <template v-else-if="col.id === 'req_date'">
                    <div class="relative" @click.stop>
                      <!-- Edit mode -->
                      <div v-if="reqDateEditItrId === item.id" class="relative z-50">
                        <input
                          type="datetime-local"
                          v-model="reqDateEditValue"
                          class="text-xs border border-teal-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400 w-[170px]"
                          @keydown.enter="saveActiveReqDateEdit"
                          @keydown.esc="closeReqDateEdit"
                        />
                        <div class="flex gap-1 mt-1">
                          <button
                            type="button"
                            :disabled="reqDateSaving"
                            class="text-[10px] px-2 py-0.5 rounded bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                            @click="saveActiveReqDateEdit"
                          >{{ reqDateSaving ? 'Saving…' : 'Save' }}</button>
                          <button type="button" class="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200" @click="closeReqDateEdit">Cancel</button>
                        </div>
                      </div>
                      <!-- View mode -->
                      <div v-else class="flex items-center gap-1 group/reqdate">
                        <span class="text-xs text-gray-600 whitespace-nowrap">{{ fmtInspection(item.req_inspection_date) }}</span>
                        <button
                          v-if="canEditReqDate"
                          type="button"
                          title="Edit Req. Inspection Date"
                          class="opacity-0 group-hover/reqdate:opacity-100 p-0.5 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition"
                          @click="openReqDateEdit(item)"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 13l6.364-6.364a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </template>
                  <!-- Attachments -->
                  <template v-else-if="col.id === 'attachments'">
                    <span class="inline-flex items-center gap-0.5 text-xs text-gray-500">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                      {{ item.itr_attachments.length }}
                    </span>
                  </template>
                  <!-- Created by -->
                  <template v-else-if="col.id === 'created_by'">
                    <span class="text-xs text-gray-600">
                      {{ item.draft_user ? ((item.draft_user.first_name ?? '') + ' ' + (item.draft_user.last_name ?? '')).trim() || item.draft_user.email : '—' }}
                    </span>
                  </template>
                  <!-- Created date -->
                  <template v-else-if="col.id === 'created_at'">
                    <span class="text-xs text-gray-600 whitespace-nowrap">{{ item.draft_at ? new Date(item.draft_at).toLocaleDateString() : '—' }}</span>
                  </template>
                  <!-- QC in Charge -->
                  <template v-else-if="col.id === 'qc_incharge'">
                    <div class="relative" @click.stop>
                      <!-- ── Edit mode ── -->
                      <div v-if="qcEditItrId === item.id" class="relative z-50 min-w-[210px]">
                        <!-- Selected chips with × -->
                        <div class="flex flex-wrap gap-1 mb-1.5">
                          <span
                            v-for="uid in qcEditUserIds" :key="uid"
                            class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-800 border border-teal-300"
                          >
                            {{ getQcMemberLabel(uid) }}
                            <button type="button" class="ml-0.5 leading-none text-teal-500 hover:text-red-500" @click="toggleQcInlineUser(uid)">×</button>
                          </span>
                          <span v-if="!qcEditUserIds.length" class="text-xs text-gray-400 italic">None selected</span>
                        </div>
                        <!-- Search input -->
                        <input
                          v-model="qcEditSearch"
                          type="text"
                          placeholder="Search member…"
                          class="w-full text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                          @keydown.esc="closeQcEdit"
                        />
                        <!-- Dropdown list -->
                        <div v-if="qcInlineFiltered.length" class="absolute left-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto text-xs w-full z-50">
                          <button
                            v-for="m in qcInlineFiltered" :key="m.user_id"
                            type="button"
                            class="w-full text-left px-2 py-1.5 hover:bg-teal-50 flex items-center gap-1.5"
                            @click="toggleQcInlineUser(m.user_id)"
                          >
                            <span class="font-medium text-gray-800">{{ getQcMemberLabel(m.user_id) }}</span>
                            <span class="text-gray-400 whitespace-nowrap">{{ qcRoleBadge(m) }}</span>
                          </button>
                        </div>
                        <!-- Save / Cancel -->
                        <div class="flex gap-1 mt-1.5">
                          <button
                            type="button"
                            :disabled="qcEditSaving"
                            class="text-[10px] px-2 py-0.5 rounded bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                            @click="saveQcEdit(item)"
                          >{{ qcEditSaving ? 'Saving…' : 'Save' }}</button>
                          <button type="button" class="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200" @click="closeQcEdit">Cancel</button>
                        </div>
                      </div>
                      <!-- ── View mode ── -->
                      <div v-else class="flex flex-wrap gap-1 items-center group/qc">
                        <span
                          v-for="a in item.qc_assignments" :key="a.user_id"
                          class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap"
                        >
                          {{ getQcMemberLabel(a.user_id) }}
                        </span>
                        <span v-if="!item.qc_assignments?.length" class="text-gray-400 text-xs">—</span>
                        <button
                          v-if="canEditQc"
                          type="button"
                          title="Edit QC in Charge"
                          class="opacity-0 group-hover/qc:opacity-100 ml-0.5 p-0.5 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition"
                          @click="openQcEdit(item)"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 13l6.364-6.364a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </template>
                </td>
                <!-- Actions (always visible) -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      class="p-1 text-gray-400 hover:text-blue-500 transition"
                      title="To-Do list"
                      @click.stop="openTodosForItr(item)"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                      </svg>
                    </button>
                    <button
                      v-if="itrStatusStore.getCode(item.status_id) === 'plan'"
                      class="p-1 text-gray-400 hover:text-[#81938A] transition"
                      title="Edit Plan"
                      @click.stop="openEdit(item)"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ═══ Dialogs ════════════════════════════════════════════════════════ -->
    <ITRModal
      v-model="modalOpen"
      :itr="modalITR"
      @saved="onSaved"
      @updated="onModalUpdated"
    />

    <TaskTodoModal
      v-model="todoModalOpen"
      :task-id="todoTaskId"
      :task-name="todoTaskName"
      :project-id="todoProjectId"
    />

    <!-- Delete confirm -->
    <div
      v-if="deleteDialogOpen"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"

    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Delete ITR?</h3>
        </div>
        <div class="px-6 py-4">
          <p class="text-gray-700">"<strong>{{ deleteTarget?.title }}</strong>" will be permanently deleted.</p>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition" @click="deleteDialogOpen = false">Cancel</button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:opacity-50"
            :disabled="itrStore.loading"
            @click="doDelete"
          >
            <svg v-if="itrStore.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <div
      v-if="snackbar.show"
      class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-white text-sm"
      :class="{
        'bg-green-600': snackbar.color === 'success',
        'bg-red-600': snackbar.color === 'error',
        'bg-yellow-600': snackbar.color === 'warning',
        'bg-gray-800': !['success','error','warning'].includes(snackbar.color)
      }"
    >
      <span class="flex-1">{{ snackbar.text }}</span>
      <button class="px-2 py-1 hover:bg-white/20 rounded transition text-sm font-medium" @click="snackbar.show = false">OK</button>
    </div>

    <!-- ── Column filter panel (teleported outside overflow containers) ── -->
    <Teleport to="body">
      <template v-if="filterOpen">
        <div class="fixed inset-0 z-[999]" @click="filterOpen = null" />
        <div
          class="fixed z-[1000] bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64"
          :style="`top:${filterPanelPos.top}px; left:${filterPanelPos.left}px`"
          @click.stop
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {{ visibleColumns.find(c => c.id === filterOpen)?.label ?? filterOpen }}
            </span>
            <button
              v-if="hasColFilter(filterOpenId)"
              type="button"
              class="text-xs text-red-500 hover:text-red-700 font-medium"
              @click="clearColFilter(filterOpenId)"
            >Clear</button>
          </div>
          <!-- text search for text columns -->
          <template v-if="TEXT_FILTER_COLS.has(filterOpenId)">
            <input
              type="text"
              :value="activeColFilter.text"
              @input="onColFilterText($event)"
              placeholder="Search…"
              autofocus
              class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#81938A]"
            />
          </template>
          <!-- multi-select for categorical columns -->
          <template v-else>
            <div class="max-h-52 overflow-y-auto space-y-0.5">
              <label
                v-for="opt in activeColOptions"
                :key="opt"
                class="flex items-center gap-2 px-1 py-1 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="opt"
                  :checked="activeColFilter.selected.includes(opt)"
                  @change="toggleColFilterOption(filterOpenId, opt)"
                  class="w-3.5 h-3.5 rounded accent-[#81938A]"
                />
                <span class="text-sm text-gray-700 truncate">{{ opt || '(empty)' }}</span>
              </label>
              <div v-if="activeColOptions.length === 0" class="text-xs text-gray-400 text-center py-2">No values</div>
            </div>
          </template>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useItrStore, type ITR } from '@/stores/itrStore'
import { useItrStatusStore } from '@/stores/itrStatusStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAreaStore } from '@/stores/areaStore'
import { useItrTypeStore } from '@/stores/itrTypeStore'
import { useDisciplineStore } from '@/stores/disciplineStore'
import { useItpStore } from '@/stores/itpStore'
import { useMaterialStore } from '@/stores/materialStore'
import ProjectSelectorDialog from '@/components/ProjectSelectorDialog.vue'
import ITRModal from '@/components/ITRModal.vue'
import TaskTodoModal from '@/components/task/TaskTodoModal.vue'
import { useAuthorityStore } from '@/stores/authorityStore'
import { useTaskTodoStore } from '@/stores/taskTodoStore'

const itrStore        = useItrStore()
const itrStatusStore  = useItrStatusStore()
const projectStore    = useProjectStore()
const taskStore       = useTaskStore()
const areaStore       = useAreaStore()
const itrTypeStore    = useItrTypeStore()
const disciplineStore = useDisciplineStore()
const itpStore        = useItpStore()
const materialStore   = useMaterialStore()
const authorityStore  = useAuthorityStore()
useTaskTodoStore() // pre-init

// ── State ─────────────────────────────────────────────────────────────────────

const selectorOpen    = ref(false)
const modalOpen       = ref(false)
const modalITR        = ref<ITR | null>(null)
const deleteDialogOpen = ref(false)
const deleteTarget    = ref<ITR | null>(null)
const snackbar = reactive({ show: false, text: '', color: 'success' as string })
const showSnack = (text: string, color = 'success') => Object.assign(snackbar, { show: true, text, color })

// ── To-Do modal ───────────────────────────────────────────────────────────────
const todoModalOpen    = ref(false)
const todoTaskId       = ref<string | null>(null)
const todoTaskName     = ref('')
const todoProjectId    = ref<string | null>(null)

const openTodosForItr = (itr: ITR) => {
  if (!itr.task_id) { showSnack('This ITR has no linked task — add a task first', 'warning'); return }
  todoTaskId.value    = itr.task_id
  todoTaskName.value  = getTaskName(itr.task_id) ?? itr.title
  todoProjectId.value = itr.project_id
  todoModalOpen.value = true
}

// ── Stats filter ──────────────────────────────────────────────────────────────

const activeFilter = ref<string>('all')

const toggleFilter = (key: string) => {
  activeFilter.value = key
  itrStore.filterStatusId = key
}

// ── Column management ─────────────────────────────────────────────────────────
interface ColDef { id: string; label: string; width: string; visible: boolean }

const COL_DEFAULTS: ColDef[] = [
  { id: 'item_no',     label: 'Item No',  width: '120px', visible: true },
  { id: 'itr_number',  label: 'ITR No.',  width: '110px', visible: true },
  { id: 'title',       label: 'Title',    width: '',      visible: true },
  { id: 'status',      label: 'Status',   width: '140px', visible: true },
  { id: 'type',        label: 'Type',     width: '120px', visible: true },
  { id: 'discipline',  label: 'Disc.',    width: '90px',  visible: true },
  { id: 'task',        label: 'Task',     width: '140px', visible: true },
  { id: 'area',        label: 'Area',     width: '110px', visible: true },
  { id: 'date',         label: 'Inspection Date',      width: '120px', visible: true },
  { id: 'planned_date', label: 'Planned Insp. Date',   width: '120px', visible: false },
  { id: 'req_date',     label: 'Req. Inspection Date', width: '130px', visible: false },
  { id: 'attachments', label: 'Files',                  width: '50px',  visible: true },
  { id: 'created_by',  label: 'Created by', width: '120px', visible: false },
  { id: 'created_at',  label: 'Created date', width: '110px', visible: false },
  { id: 'qc_incharge', label: 'QC in Charge', width: '140px', visible: false },
]

const COLS_KEY = 'qc_itr_columns_v2'

function initColumns(): ColDef[] {
  try {
    const saved = JSON.parse(localStorage.getItem(COLS_KEY) || 'null') as { id: string; visible: boolean; width?: string }[] | null
    if (!saved) return COL_DEFAULTS.map(c => ({ ...c }))
    const result: ColDef[] = []
    for (const sc of saved) {
      const def = COL_DEFAULTS.find(c => c.id === sc.id)
      if (def) result.push({ ...def, visible: sc.visible, width: sc.width ?? def.width })
    }
    for (const def of COL_DEFAULTS) {
      if (!result.find(c => c.id === def.id)) result.push({ ...def })
    }
    return result
  } catch { return COL_DEFAULTS.map(c => ({ ...c })) }
}

const columns        = ref<ColDef[]>(initColumns())
const visibleColumns = computed(() => columns.value.filter(c => c.visible))
const colPickerOpen  = ref(false)
const colPickerRef   = ref<HTMLElement | null>(null)

function persistCols() {
  localStorage.setItem(COLS_KEY, JSON.stringify(columns.value.map(c => ({ id: c.id, visible: c.visible, width: c.width }))))
}

// ── Column drag-and-drop reorder ─────────────────────────────────────────────
const dragColIdx     = ref<number | null>(null)
const dragOverColIdx = ref<number | null>(null)

function onColDragStart(visIdx: number) { dragColIdx.value = visIdx }
function onColDragOver(visIdx: number)  { dragOverColIdx.value = visIdx }
function onColDragEnd()                 { dragColIdx.value = null; dragOverColIdx.value = null }

// ── Column resize ─────────────────────────────────────────────────────────────
function onColResizeStart(colId: string, e: MouseEvent) {
  const startX   = e.clientX
  const col      = columns.value.find(c => c.id === colId)
  if (!col) return
  const startW   = parseInt(col.width || '80')

  function onMove(ev: MouseEvent) {
    const newW = Math.max(50, startW + ev.clientX - startX)
    const idx  = columns.value.findIndex(c => c.id === colId)
    if (idx >= 0) columns.value[idx] = { ...columns.value[idx], width: newW + 'px' }
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    persistCols()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ── Sort ─────────────────────────────────────────────────────────────────────
const sortCol = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(colId: string) {
  if (sortCol.value === colId) {
    if (sortDir.value === 'asc') { sortDir.value = 'desc' }
    else { sortCol.value = null; sortDir.value = 'asc' }
  } else {
    sortCol.value = colId
    sortDir.value = 'asc'
  }
}

// ── Column filters ────────────────────────────────────────────────────────────
interface ColFilter { text: string; selected: string[] }
const colFilters = ref<Record<string, ColFilter>>({})

function getColFilter(id: string): ColFilter {
  if (!colFilters.value[id]) colFilters.value[id] = { text: '', selected: [] }
  return colFilters.value[id]
}
function hasColFilter(id: string): boolean {
  const f = colFilters.value[id]
  return !!f && (f.text !== '' || f.selected.length > 0)
}
function clearColFilter(id: string) { colFilters.value[id] = { text: '', selected: [] } }
function toggleColFilterOption(colId: string, val: string) {
  const f = getColFilter(colId)
  const idx = f.selected.indexOf(val)
  if (idx >= 0) f.selected.splice(idx, 1)
  else f.selected.push(val)
}

const TEXT_FILTER_COLS = new Set(['item_no', 'itr_number', 'title', 'date', 'planned_date', 'req_date', 'created_at', 'attachments'])

function fmtInspection(d: string | null | undefined): string {
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

function getColValue(item: ITR, colId: string): string {
  switch (colId) {
    case 'item_no':     return item.item_no ?? ''
    case 'itr_number':  return item.itr_number ?? ''
    case 'title':       return item.title ?? ''
    case 'status':      return itrStatusStore.getLabel(item.status_id)
    case 'type':        return itrTypeStore.getLabel(item.itr_type_id) ?? ''
    case 'discipline':  return getDiscLabel(item.discipline_id) ?? ''
    case 'task':        return getTaskName(item.task_id) ?? ''
    case 'area':        return getAreaNames(item)
    case 'date':         return fmtInspection(item.inspection_date)
    case 'planned_date': return fmtInspection(item.planned_inspection_date)
    case 'req_date':     return fmtInspection(item.req_inspection_date)
    case 'attachments': return String(item.itr_attachments.length)
    case 'created_by':  return item.draft_user ? (((item.draft_user.first_name ?? '') + ' ' + (item.draft_user.last_name ?? '')).trim() || item.draft_user.email) : ''
    case 'created_at':  return item.draft_at ? new Date(item.draft_at).toLocaleDateString() : ''
    case 'qc_incharge': return (item.qc_assignments ?? []).map(a => getQcMemberLabel(a.user_id)).join(', ')
    default:            return ''
  }
}

function getColOptions(colId: string): string[] {
  const vals = new Set<string>()
  for (const item of itrStore.itrs) {
    const v = getColValue(item, colId)
    if (v) vals.add(v)
  }
  return [...vals].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// ── Filter panel (teleported) ─────────────────────────────────────────────────
const filterOpen      = ref<string | null>(null)
const filterPanelPos  = ref({ top: 0, left: 0 })

function toggleFilterPanel(colId: string, event: MouseEvent) {
  if (filterOpen.value === colId) { filterOpen.value = null; return }
  const btn  = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  filterPanelPos.value = {
    top:  rect.bottom + 4,
    left: Math.min(rect.left, window.innerWidth - 272),
  }
  filterOpen.value = colId
}

const activeColFilter  = computed((): ColFilter   => filterOpen.value ? getColFilter(filterOpen.value) : { text: '', selected: [] })
const activeColOptions = computed((): string[]    => filterOpen.value ? getColOptions(filterOpen.value) : [])
const filterOpenId     = computed((): string      => filterOpen.value ?? '')

function onColFilterText(e: Event) {
  if (!filterOpen.value) return
  getColFilter(filterOpen.value).text = (e.target as HTMLInputElement).value
}

function onColDrop(targetVisIdx: number) {
  const from = dragColIdx.value
  if (from === null || from === targetVisIdx) { onColDragEnd(); return }
  const visCols = visibleColumns.value
  const fromId  = visCols[from]?.id
  const toId    = visCols[targetVisIdx]?.id
  if (!fromId || !toId) { onColDragEnd(); return }
  const all = [...columns.value]
  const fi  = all.findIndex(c => c.id === fromId)
  const ti  = all.findIndex(c => c.id === toId)
  const [moved] = all.splice(fi, 1)
  all.splice(ti, 0, moved)
  columns.value = all
  persistCols()
  onColDragEnd()
}

// ── New-ITR at top ────────────────────────────────────────────────────────────
const newItrIds = ref<string[]>([])
const displayedITRs = computed(() => {
  let list = [...itrStore.filteredITRs]

  // Apply column filters
  for (const [colId, filter] of Object.entries(colFilters.value)) {
    if (!filter) continue
    if (filter.text) {
      const q = filter.text.toLowerCase()
      list = list.filter(item => getColValue(item, colId).toLowerCase().includes(q))
    }
    if (filter.selected.length) {
      const sel = new Set(filter.selected)
      list = list.filter(item => sel.has(getColValue(item, colId)))
    }
  }

  // Apply sort
  if (sortCol.value) {
    const col = sortCol.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      const av = getColValue(a, col)
      const bv = getColValue(b, col)
      if (col === 'attachments') return (Number(av) - Number(bv)) * dir
      return av.localeCompare(bv, undefined, { numeric: true }) * dir
    })
  }

  // New ITRs float to top only when no sort is active
  if (newItrIds.value.length && !sortCol.value) {
    const ns = new Set(newItrIds.value)
    return [...list.filter(i => ns.has(i.id)), ...list.filter(i => !ns.has(i.id))]
  }
  return list
})

// ── Export ────────────────────────────────────────────────────────────────────

function exportToExcel() {
  const visibleCols = columns.value.filter(c => c.visible && c.id !== 'attachments')
  const rows = displayedITRs.value.map(item => {
    const row: Record<string, string> = {}
    for (const col of visibleCols) {
      row[col.label] = getColValue(item, col.id)
    }
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ITRs')

  // Build filename: project + active filter label
  const projectName = (projectStore.activeProject?.name ?? 'Project').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filterLabel = activeFilter.value === 'all'
    ? 'All'
    : (itrStatusStore.sorted.find(s => s.id === activeFilter.value)?.title ?? activeFilter.value)
  const filterSlug  = filterLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr     = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `ITR_${projectName}_${filterSlug}_${dateStr}.xlsx`)
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

const getTaskName = (id: string | null) => {
  if (!id) return null
  const t = taskStore.flatAll.find(t => t.id === id)
  return t ? t.name : null
}
const getAreaNames = (itr: ITR) => {
  const ids = itr.area_ids?.length ? itr.area_ids : (itr.area_id ? [itr.area_id] : [])
  if (!ids.length) return '—'
  return ids
    .map(id => {
      const a = areaStore.flatAll.find(a => a.id === id)
      return a ? (a.code || a.name) : null
    })
    .filter(Boolean)
    .join(', ')
}
const getDiscLabel = (id: string | null) => {
  if (!id) return null
  const d = disciplineStore.getById(id)
  return d ? d.code : null
}

const getQcMemberLabel = (userId: string): string => {
  const m = authorityStore.projectMembers.find(p => p.user_id === userId)
  if (!m) return userId.slice(0, 8) + '…'
  if (m.first_name) return `${m.first_name}${m.last_name ? ' ' + m.last_name : ''}`.trim()
  return m.email
}

// ── Inline QC-in-Charge editing ───────────────────────────────────────────────

/** Roles allowed to edit Req. Inspection Date directly from the table */
const canEditReqDate = computed(() =>
  authorityStore.currentProjectRoles.some(r => ['project_admin', 'qc_admin'].includes(r))
)

const reqDateEditItrId = ref<string | null>(null)
const reqDateEditValue = ref('')
const reqDateSaving    = ref(false)

/** Convert an ISO/null date to datetime-local input value (local time) */
const toDatetimeLocal = (iso: string | null | undefined): string => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return '' }
}

const openReqDateEdit = (itr: ITR) => {
  reqDateEditItrId.value = itr.id
  reqDateEditValue.value = toDatetimeLocal(itr.req_inspection_date)
}

const closeReqDateEdit = () => {
  reqDateEditItrId.value = null
  reqDateEditValue.value = ''
}

const saveActiveReqDateEdit = async () => {
  if (!reqDateEditItrId.value) return
  const itr = itrStore.itrs.find(i => i.id === reqDateEditItrId.value)
  if (!itr) { closeReqDateEdit(); return }
  reqDateSaving.value = true
  try {
    const newVal = reqDateEditValue.value ? new Date(reqDateEditValue.value).toISOString() : null
    await itrStore.updateITR(itr.id, { req_inspection_date: newVal } as any)
  } finally {
    reqDateSaving.value = false
    closeReqDateEdit()
  }
}

/** Roles allowed to edit QC in Charge directly from the table */
const canEditQc = computed(() =>
  authorityStore.currentProjectRoles.some(r =>
    ['project_admin', 'qc_admin', 'qc_engineer', 'qc_inspector'].includes(r)
  )
)

/** Members eligible to be assigned as QC in Charge */
const qcEligibleMembersInline = computed(() =>
  authorityStore.projectMembers.filter(m =>
    m.is_active &&
    (m.project_roles ?? []).some(r => ['qc_admin', 'qc_engineer', 'qc_inspector'].includes(r))
  )
)

const qcEditItrId   = ref<string | null>(null)
const qcEditUserIds = ref<string[]>([])
const qcEditSearch  = ref('')
const qcEditSaving  = ref(false)

/** Eligible members not yet selected, filtered by search query */
const qcInlineFiltered = computed(() => {
  const q = qcEditSearch.value.toLowerCase().trim()
  return qcEligibleMembersInline.value.filter(m => {
    if (qcEditUserIds.value.includes(m.user_id)) return false
    if (!q) return true
    const name = `${m.first_name ?? ''} ${m.last_name ?? ''} ${m.email}`.toLowerCase()
    return name.includes(q)
  })
})

const qcRoleBadge = (m: { project_roles?: string[] }): string => {
  const r = (m.project_roles ?? []).find(r => ['qc_admin', 'qc_engineer', 'qc_inspector'].includes(r))
  if (r === 'qc_admin') return 'QC Admin'
  if (r === 'qc_engineer') return 'QC Engr'
  if (r === 'qc_inspector') return 'Inspector'
  return ''
}

const openQcEdit = (itr: ITR) => {
  qcEditItrId.value   = itr.id
  qcEditUserIds.value = (itr.qc_assignments ?? []).map(a => a.user_id)
  qcEditSearch.value  = ''
}

const closeQcEdit = () => {
  qcEditItrId.value  = null
  qcEditSearch.value = ''
}

const toggleQcInlineUser = (userId: string) => {
  const idx = qcEditUserIds.value.indexOf(userId)
  if (idx === -1) qcEditUserIds.value.push(userId)
  else qcEditUserIds.value.splice(idx, 1)
  qcEditSearch.value = ''
}

const saveQcEdit = async (itr: ITR) => {
  qcEditSaving.value = true
  try {
    await itrStore.syncItrQcAssignments(itr.id, qcEditUserIds.value)
  } finally {
    qcEditSaving.value = false
    closeQcEdit()
  }
}

/** Save the currently open inline QC edit (called by backdrop click) */
const saveActiveQcEdit = async () => {
  if (!qcEditItrId.value) return
  const itr = itrStore.itrs.find(i => i.id === qcEditItrId.value)
  if (itr) await saveQcEdit(itr)
  else closeQcEdit()
}

// ── Dialog handlers ───────────────────────────────────────────────────────────

const openDetail = (itr: ITR) => {
  modalITR.value = itr
  modalOpen.value = true
}

const openEdit = (itr: ITR) => {
  modalITR.value = itr
  modalOpen.value = true
}

const onSaved = (itr: ITR) => {
  showSnack(`"${itr.title}" saved`)
  if (!newItrIds.value.includes(itr.id)) newItrIds.value = [itr.id, ...newItrIds.value]
  modalITR.value = itr
  onModalUpdated()
}

const onModalUpdated = () => {
  if (projectStore.activeProject) {
    itrStore.fetchITRs(projectStore.activeProject.id)
  }
}

const confirmDeleteITR = (itr: ITR) => { deleteTarget.value = itr; deleteDialogOpen.value = true }
const doDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await itrStore.deleteITR(deleteTarget.value.id)
  if (ok) showSnack('ITR deleted')
  else showSnack(itrStore.error ?? 'Delete failed', 'error')
  deleteDialogOpen.value = false; deleteTarget.value = null
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const load = async (projectId: string) => {
  itrStore.clearITRs()
  await Promise.all([
    itrStore.fetchITRs(projectId),
    itrStatusStore.fetchStatuses(projectId),
    itrTypeStore.fetchItrTypes(projectId),
    disciplineStore.disciplines.length === 0 ? disciplineStore.fetchDisciplines(projectId) : Promise.resolve(),
    taskStore.tasks.length === 0 ? taskStore.fetchTasks(projectId) : Promise.resolve(),
    areaStore.areas.length === 0 ? areaStore.fetchAreas(projectId) : Promise.resolve(),
    itpStore.itps.length === 0 ? itpStore.fetchItps(projectId) : Promise.resolve(),
    materialStore.materials.length === 0 ? materialStore.fetchMaterials(projectId) : Promise.resolve(),
    authorityStore.fetchProjectMembers(projectId),
  ])
}

onMounted(async () => {
  if (projectStore.projects.length === 0) await projectStore.fetchProjects()
  if (projectStore.activeProject) await load(projectStore.activeProject.id)
})

watch(() => projectStore.activeProjectId, async id => {
  newItrIds.value = []
  if (id) await load(id)
  else itrStore.clearITRs()
})

onUnmounted(() => { itrStore.clearITRs(); itrStatusStore.clearStatuses() })
</script>
