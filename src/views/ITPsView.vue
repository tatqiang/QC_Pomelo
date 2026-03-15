<template>
  <div class="min-h-screen p-4 md:p-6">

    <!-- ─── No project guard ─────────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h2 class="text-xl font-semibold mb-2 text-gray-900">No Active Project</h2>
      <p class="text-gray-600 mb-6">Select a project to view its Inspection and Test Plans.</p>
      <button
        class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
        @click="selectorOpen = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select Project
      </button>
      <ProjectSelectorDialog v-model="selectorOpen" />
    </div>

    <template v-else>
      <!-- ─── Header ──────────────────────────────────────────────────── -->
      <div class="flex items-center mb-5 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">ITP</h1>
          <p class="text-gray-600 text-sm">
            {{ projectStore.activeProject.name }} · {{ itpStore.itps.length }} record(s)
          </p>
        </div>
        <div class="flex-1"></div>

        <!-- Add new -->
        <button
          class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
          @click="openCreate"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New
        </button>

        <!-- Google Sheet sync -->
        <button
          :class="[
            'px-4 py-2 rounded-lg transition inline-flex items-center gap-2',
            gsheetUrl
              ? 'bg-teal-500/20 text-teal-600 hover:bg-teal-500/30'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
          ]"
          :disabled="syncing"
          @click="gsheetUrl ? syncFromGSheet() : (gsheetDialogOpen = true)"
          :title="gsheetUrl ? 'Sync from Google Sheet' : 'Set up Google Sheet URL'"
        >
          <svg v-if="!syncing" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ gsheetUrl ? 'Sync' : 'Google Sheet' }}
        </button>
        <button
          v-if="gsheetUrl"
          class="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Change Google Sheet URL"
          @click="gsheetUrlInput = gsheetUrl; gsheetDialogOpen = true"
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <!-- Import -->
        <button
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition inline-flex items-center gap-2"
          @click="triggerImport"
          :disabled="importing"
        >
          <svg v-if="!importing" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Import
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,.xlsx,.xls"
          style="display: none;"
          @change="handleFileImport"
        />

        <!-- Export dropdown -->
        <div class="relative">
          <button
            class="px-4 py-2 bg-moss/20 hover:bg-moss/30 text-moss rounded-lg transition inline-flex items-center gap-2"
            @click="exportMenuOpen = !exportMenuOpen"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Export
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="exportMenuOpen"
            class="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-xl z-50"
            @click="exportMenuOpen = false"
          >
            <button
              class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 rounded-t-lg text-gray-700"
              @click="exportExcel"
            >
              <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Excel (.xlsx)</span>
            </button>
            <button
              class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 text-gray-700"
              @click="exportCsv"
            >
              <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>CSV (.csv)</span>
            </button>
            <div class="h-px bg-gray-200 my-1"></div>
            <button
              class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 rounded-b-lg text-gray-700"
              @click="downloadTemplate"
            >
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Template</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Import instructions card ────────────────────────────────── -->
      <div
        v-if="showInfoAlert"
        class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm relative text-gray-700"
      >
        <button
          class="absolute top-2 right-2 p-1 hover:bg-blue-100 rounded text-gray-600"
          @click="showInfoAlert = false"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <strong>Import / Export format:</strong>
        Columns: <code class="px-1 py-0.5 bg-gray-200 rounded text-xs">Discipline · Doc_No · Title · Last_Revision · Revision_Date · Status · Document_Link</code>.
        Use the <em>Download Template</em> option to get a pre-formatted file.
        Rows are matched by <code class="px-1 py-0.5 bg-gray-200 rounded text-xs">Doc_No</code> — existing records with the same Doc_No will be updated.
        <span v-if="gsheetUrl"> · Last synced: <strong>{{ lastSyncLabel }}</strong></span>
      </div>

      <!-- ─── DB error ─────────────────────────────────────────────────── -->
      <div
        v-if="itpStore.error"
        class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-gray-700"
      >
        <div class="font-semibold mb-1">Database Setup Required</div>
        <div class="text-sm">
          Run <code class="px-1 py-0.5 bg-gray-200 rounded text-xs">database/009_itps.sql</code> in
          <strong>Supabase Dashboard → SQL Editor</strong>, then click Retry.
        </div>
        <div class="mt-1 text-xs text-gray-600">{{ itpStore.error }}</div>
        <button
          class="mt-2 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition inline-flex items-center gap-2"
          @click="load"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>

      <!-- ─── Search bar ───────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Search doc no, title…"
            class="w-full max-w-xs pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
          />
        </div>
        <select
          v-model="filterDisc"
          class="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss max-w-[180px] text-gray-900"
        >
          <option :value="null">All Disciplines</option>
          <option v-for="d in disciplineStore.disciplines" :key="d.id" :value="d.id">
            {{ d.code }} — {{ d.title }}
          </option>
        </select>
        <select
          v-model="filterStatus"
          class="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss max-w-[160px] text-gray-900"
        >
          <option :value="null">All Statuses</option>
          <option v-for="s in statusFilterItems.slice(1)" :key="s.value" :value="s.value">
            {{ s.title }}
          </option>
        </select>
        <div class="flex-1"></div>
        <span class="text-gray-600 text-sm whitespace-nowrap">
          {{ filtered.length }} / {{ itpStore.itps.length }} rows
        </span>
      </div>

      <!-- ─── Loading ──────────────────────────────────────────────────── -->
      <div v-if="itpStore.loading && itpStore.itps.length === 0" class="text-center py-16">
        <svg class="animate-spin h-12 w-12 text-moss mx-auto" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- ─── Empty state ──────────────────────────────────────────────── -->
      <div v-else-if="!itpStore.loading && itpStore.itps.length === 0 && !itpStore.error" class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 class="text-xl font-semibold mb-2 text-gray-900">No ITPs Yet</h2>
        <p class="text-gray-600 mb-6">
          Import an Excel or CSV file to populate the ITP register for this project.
        </p>
        <button
          class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
          @click="triggerImport"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import ITP Data
        </button>
      </div>

      <!-- ─── Data table ───────────────────────────────────────────────── -->
      <div v-else-if="itpStore.itps.length > 0" class="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <!-- horizontal scroll wrapper for mobile -->
        <div class="itp-scroll-wrap">
          <div class="itp-table-inner" :style="{ '--itp-total-width': totalColWidth + 'px' }">

        <!-- Table header -->
        <div class="itp-header flex items-center px-4 py-3">
          <div
            v-for="col in COLS" :key="col.key"
            class="itp-col flex items-center relative flex-shrink-0"
            :style="{ width: colWidths[col.key] + 'px' }"
          >
            {{ col.label }}
            <div
              v-if="col.key !== 'actions'"
              class="col-resize-handle"
              @mousedown.stop.prevent="startColResize(col.key, $event)"
              title="Drag to resize"
            />
          </div>
        </div>

        <!-- Table rows -->
        <div
          v-for="(row, idx) in filtered"
          :key="row.id"
          class="itp-row flex items-center px-4 py-2"
        >
          <!-- # -->
          <div class="itp-col flex-shrink-0 text-gray-500" :style="{ width: colWidths.seq + 'px', fontSize: '0.72rem' }">
            {{ idx + 1 }}
          </div>

          <!-- Discipline chip -->
          <div class="itp-col flex-shrink-0" :style="{ width: colWidths.disc + 'px' }">
            <span
              v-if="discOf(row)"
              :style="{ backgroundColor: discOf(row)?.color + '20', color: discOf(row)?.color }"
              class="inline-block px-2 py-0.5 rounded text-xs font-bold font-mono min-w-[32px] text-center"
            >{{ discOf(row)?.code }}</span>
            <span v-else class="text-gray-500 text-xs">—</span>
          </div>

          <!-- Doc No -->
          <div class="itp-col flex-shrink-0" :style="{ width: colWidths.docno + 'px' }">
            <span style="font-size: 0.72rem; font-family: monospace; color: #64748b;">{{ row.doc_no }}</span>
          </div>

          <!-- Title -->
          <div class="itp-col flex-shrink-0" :style="{ width: colWidths.title + 'px' }">
            <span class="truncate" style="font-size: 0.8rem; color: #1e293b;" :title="row.title">{{ row.title }}</span>
          </div>

          <!-- Last revision -->
          <div class="itp-col flex-shrink-0 text-center" :style="{ width: colWidths.rev + 'px' }">
            <span v-if="row.last_revision" class="inline-block px-2 py-0.5 bg-moss/20 text-moss rounded text-xs">
              {{ row.last_revision }}
            </span>
          </div>

          <!-- Revision date -->
          <div class="itp-col flex-shrink-0 text-gray-500" :style="{ width: colWidths.revdate + 'px', fontSize: '0.72rem' }">
            {{ row.revision_date ? fmtDate(row.revision_date) : '—' }}
          </div>

          <!-- Status -->
          <div class="itp-col flex-shrink-0" :style="{ width: colWidths.status + 'px' }">
            <span
              v-if="row.status"
              :class="[
                'inline-block px-2 py-0.5 rounded text-xs',
                statusColor(row.status) === 'success' ? 'bg-green-500/20 text-green-400' :
                statusColor(row.status) === 'error' ? 'bg-red-500/20 text-red-400' :
                statusColor(row.status) === 'info' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-100 text-gray-600'
              ]"
            >{{ row.status }}</span>
          </div>

          <!-- Files -->
          <div class="itp-col flex-shrink-0 flex items-center gap-1" :style="{ width: colWidths.link + 'px' }">
            <template v-if="row.itp_files?.length">
              <!-- ITP docs pill -->
              <button
                v-if="row.itp_files.filter(f => f.file_category === 'itp').length"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-moss/20 text-moss rounded text-xs hover:bg-moss/30 transition"
                :title="'ITP: ' + row.itp_files.filter(f => f.file_category === 'itp').map(f => f.file_name).join(', ')"
                @click.stop="openEdit(row)"
              >
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {{ row.itp_files.filter(f => f.file_category === 'itp').length }}
              </button>
              <!-- Checklist pill -->
              <button
                v-if="row.itp_files.filter(f => f.file_category === 'checklist').length"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded text-xs hover:bg-blue-500/30 transition"
                :title="'Checklists: ' + row.itp_files.filter(f => f.file_category === 'checklist').map(f => f.file_name).join(', ')"
                @click.stop="openEdit(row)"
              >
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {{ row.itp_files.filter(f => f.file_category === 'checklist').length }}
              </button>
            </template>
            <span v-else class="text-gray-400" style="font-size: 0.7rem;">—</span>
          </div>

          <!-- Actions -->
          <div class="itp-col flex-shrink-0 flex justify-end gap-0" :style="{ width: colWidths.actions + 'px' }">
            <button class="p-1 hover:bg-moss/10 rounded" title="Edit" @click.stop="openEdit(row)">
              <svg class="w-4 h-4 text-gray-600 hover:text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button v-if="isSystemAdmin" class="p-1 hover:bg-red-50 rounded" title="Delete" @click.stop="confirmDelete(row)">
              <svg class="w-4 h-4 text-gray-600 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty filter -->
        <div v-if="filtered.length === 0" class="text-center py-8 text-gray-600">
          No records match the current filters.
        </div>

          </div><!-- /itp-table-inner -->
        </div><!-- /itp-scroll-wrap -->
      </div>
    </template>

    <!-- ─── Add / Edit dialog ─────────────────────────────────────────────── -->
    <div v-if="formDialogOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center p-5 pb-3 gap-2 border-b border-gray-200">
          <svg v-if="editTarget" class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <svg v-else class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <h2 class="text-lg font-semibold text-gray-900">{{ editTarget ? 'Edit ITP Record' : 'New ITP Record' }}</h2>
          <div class="flex-1"></div>
          <button class="p-1 hover:bg-gray-100 rounded text-gray-600" @click="closeForm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveForm" class="p-5">
          <div class="grid grid-cols-12 gap-4">
            <!-- Discipline -->
            <div class="col-span-12 sm:col-span-4">
              <label class="block text-sm font-medium mb-1 text-gray-700">Discipline</label>
              <select
                v-model="form.discipline_id"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              >
                <option :value="null">—</option>
                <option v-for="opt in disciplineStore.options" :key="opt.value" :value="opt.value">
                  {{ opt.title }}
                </option>
              </select>
              <p v-if="disciplineStore.options.length === 0" class="text-xs text-gray-500 mt-1">Go to Disciplines to set up</p>
            </div>
            <!-- Doc No -->
            <div class="col-span-12 sm:col-span-8">
              <label class="block text-sm font-medium mb-1 text-gray-700">Doc No <span class="text-red-500">*</span></label>
              <input
                v-model="form.doc_no"
                type="text"
                required
                placeholder="e.g. CHN1A-003-E-ITP-ZZZ-0001"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss font-mono text-gray-900"
              />
            </div>
            <!-- Title -->
            <div class="col-span-12">
              <label class="block text-sm font-medium mb-1 text-gray-700">Title <span class="text-red-500">*</span></label>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="e.g. Inspection and Test Plan for Grounding Systems"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              />
            </div>
            <!-- Last Revision -->
            <div class="col-span-12 sm:col-span-4">
              <label class="block text-sm font-medium mb-1 text-gray-700">Last Revision</label>
              <input
                v-model="form.last_revision"
                type="text"
                placeholder="e.g. 07"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              />
            </div>
            <!-- Revision Date -->
            <div class="col-span-12 sm:col-span-4">
              <label class="block text-sm font-medium mb-1 text-gray-700">Revision Date</label>
              <input
                v-model="form.revision_date"
                type="date"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              />
            </div>
            <!-- Status -->
            <div class="col-span-12 sm:col-span-4">
              <label class="block text-sm font-medium mb-1 text-gray-700">Status</label>
              <input
                v-model="form.status"
                type="text"
                placeholder="e.g. Approved"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              />
            </div>
            <!-- Files (R2 storage) -->
            <div class="col-span-12">
              <template v-if="editTarget">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <!-- ── ITP Documents ── -->
                  <div class="rounded-lg border border-gray-200 p-3">
                    <div class="flex items-center gap-1.5 mb-2">
                      <svg class="w-3.5 h-3.5 text-moss flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span class="text-sm font-medium text-gray-700">ITP Documents</span>
                      <span class="ml-auto text-xs text-gray-400 tabular-nums">{{ itpFilesOf('itp').length }}</span>
                    </div>
                    <div class="space-y-1 mb-2">
                      <div
                        v-for="f in itpFilesOf('itp')"
                        :key="f.id"
                        class="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-100 rounded"
                      >
                        <a :href="f.file_url" target="_blank" rel="noopener noreferrer"
                           class="text-xs text-moss hover:underline truncate flex-1" :title="f.file_name"
                        >{{ f.file_name }}</a>
                        <span class="text-xs text-gray-400 flex-shrink-0">{{ fmtFileSize(f.file_size) }}</span>
                        <button type="button" class="p-0.5 hover:bg-red-50 rounded flex-shrink-0"
                                :disabled="itpStore.loading" @click.prevent="removeItpFile(f.id)">
                          <svg class="w-3.5 h-3.5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p v-if="!itpFilesOf('itp').length" class="text-xs text-gray-400 italic">No files yet.</p>
                    </div>
                    <label class="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 hover:border-moss rounded-lg text-xs text-gray-500 hover:text-moss transition">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload ITP files
                      <input type="file" class="hidden" multiple @change="e => handleItpFileUpload(e, 'itp')" />
                    </label>
                    <div v-if="uploadingItpFiles.length" class="mt-1.5 flex flex-wrap gap-1">
                      <span v-for="name in uploadingItpFiles" :key="name"
                            class="inline-flex items-center gap-1 px-2 py-0.5 bg-moss/10 text-moss rounded text-xs">
                        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {{ name }}
                      </span>
                    </div>
                  </div>

                  <!-- ── HTML Checklists ── -->
                  <div class="rounded-lg border border-gray-200 p-3">
                    <div class="flex items-center gap-1.5 mb-2">
                      <svg class="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span class="text-sm font-medium text-gray-700">HTML Checklists</span>
                      <span class="ml-auto text-xs text-gray-400 tabular-nums">{{ editableChecklists.length }}</span>
                    </div>

                    <!-- Pending "add" confirmation row -->
                    <div v-if="pendingChecklist" class="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p class="text-xs text-blue-600 font-medium mb-2 truncate">
                        📄 {{ pendingChecklist.file.name }}
                        <span class="font-normal text-blue-400 ml-1">({{ fmtFileSize(pendingChecklist.file.size) }})</span>
                      </p>
                      <div class="grid grid-cols-12 gap-1.5 mb-1.5">
                        <input
                          v-model="pendingChecklist.code"
                          type="text"
                          placeholder="Code e.g. EE-002"
                          class="col-span-4 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <input
                          v-model="pendingChecklist.title"
                          type="text"
                          placeholder="Form title"
                          class="col-span-8 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                      <div class="flex items-center gap-2">
                        <input
                          v-model="pendingChecklist.version"
                          type="text"
                          placeholder="Rev0"
                          class="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <div class="flex-1"></div>
                        <button
                          type="button"
                          class="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition"
                          @click="pendingChecklist = null"
                        >Cancel</button>
                        <button
                          type="button"
                          class="px-2.5 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition inline-flex items-center gap-1"
                          :disabled="pendingChecklist.saving || itpChecklistStore.loading"
                          @click="confirmAddChecklist"
                        >
                          <svg v-if="pendingChecklist.saving" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Add
                        </button>
                      </div>
                    </div>

                    <!-- Checklist list -->
                    <div class="space-y-1 mb-2">
                      <div
                        v-for="c in editableChecklists"
                        :key="c.id"
                        class="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-100 rounded"
                      >
                        <span class="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-bold flex-shrink-0">{{ c.code }}</span>
                        <span class="text-xs text-gray-700 truncate flex-1" :title="c.title">{{ c.title }}</span>
                        <span class="text-xs text-gray-400 flex-shrink-0">{{ c.version }}</span>
                        <button
                          type="button" class="p-0.5 hover:bg-blue-50 rounded flex-shrink-0" title="Preview form"
                          @click.prevent="previewHtmlChecklist(c)"
                        >
                          <svg class="w-3.5 h-3.5 text-blue-400 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <!-- Replace HTML in-place (preserves UUID → keeps all ITR selections) -->
                        <label class="p-0.5 hover:bg-yellow-50 rounded flex-shrink-0 cursor-pointer" title="Replace HTML (keeps existing ITR selections)">
                          <svg class="w-3.5 h-3.5 text-yellow-500 hover:text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <input type="file" class="hidden" accept=".html,.htm" @change="handleHtmlChecklistReplace($event, c.id)" />
                        </label>
                        <button
                          type="button" class="p-0.5 hover:bg-red-50 rounded flex-shrink-0"
                          :disabled="itpChecklistStore.loading" title="Delete checklist"
                          @click.prevent="removeHtmlChecklist(c.id)"
                        >
                          <svg class="w-3.5 h-3.5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p v-if="!editableChecklists.length && !pendingChecklist" class="text-xs text-gray-400 italic">No HTML checklists yet.</p>
                    </div>

                    <!-- Upload button -->
                    <label
                      v-if="!pendingChecklist"
                      class="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg text-xs text-gray-500 hover:text-blue-500 transition"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload HTML checklist
                      <input type="file" class="hidden" accept=".html,.htm" @change="handleHtmlChecklistUpload" />
                    </label>
                  </div>

                </div>
              </template>

              <!-- create mode -->
              <p v-else class="text-sm text-gray-400 italic">Files and checklists can be attached after the record is created.</p>
            </div>
          </div>
        </form>

        <div class="border-t border-gray-200 p-4 flex items-center gap-2">
          <button
            type="button"
            class="px-4 py-2 hover:bg-gray-100 rounded-lg transition text-gray-700"
            @click="closeForm"
          >
            Cancel
          </button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
            :disabled="itpStore.loading"
            @click="saveForm"
          >
            <svg v-if="itpStore.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ editTarget ? 'Save Changes' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Delete confirm (system_admin only) ───────────────────────── -->
    <div v-if="deleteDialogOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="deleteDialogOpen = false">
      <div class="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        <!-- Warning header -->
        <div class="bg-red-50 px-5 pt-5 pb-4 flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-red-700">Delete ITP Record?</h2>
            <p class="text-sm text-red-600 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <!-- Body -->
        <div class="px-5 py-4 text-sm text-gray-700">
          You are about to permanently delete:<br/>
          <span class="mt-1 block font-semibold text-gray-900">{{ deleteTarget?.doc_no }}</span>
          <span class="block text-gray-500 truncate">{{ deleteTarget?.title }}</span>
        </div>
        <!-- Actions -->
        <div class="border-t border-gray-200 px-5 py-4 flex items-center gap-2">
          <button
            type="button"
            class="px-4 py-2 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm"
            @click="deleteDialogOpen = false"
          >
            Cancel
          </button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition inline-flex items-center gap-2 text-sm font-medium"
            :disabled="itpStore.loading"
            @click="doDelete"
          >
            <svg v-if="itpStore.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Yes, Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Toast notification ──────────────────────────────────────────────── -->
    <div
      v-if="snackbar.show"
      :class="[
        'fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50',
        snackbar.color === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
        snackbar.color === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
        snackbar.color === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
        'bg-moss/20 text-moss border border-moss/30'
      ]"
    >
      <span>{{ snackbar.text }}</span>
      <button class="p-1 hover:bg-white/10 rounded" @click="snackbar.show = false">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <ProjectSelectorDialog v-model="selectorOpen" />

    <!-- ─── Google Sheet URL dialog ────────────────────────────────────────── -->
    <div v-if="gsheetDialogOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-lg">
        <div class="flex items-center p-5 pb-3 gap-2 border-b border-gray-200">
          <svg class="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h2 class="text-lg font-semibold text-gray-900">Google Sheet Sync</h2>
          <div class="flex-1"></div>
          <button class="p-1 hover:bg-gray-100 rounded text-gray-600" @click="gsheetDialogOpen = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-5 pt-4">
          <p class="text-gray-600 mb-4 text-sm">
            Paste your Google Sheet URL below. The sheet must be shared as
            <strong>“Anyone with the link can view”</strong>.
            The app will fetch it as CSV and upsert all rows.
          </p>
          <div class="mb-3">
            <label class="block text-sm font-medium mb-1 text-gray-700">Google Sheet URL</label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <input
                v-model="gsheetUrlInput"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                class="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-gray-900"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ gsheetUrlInput ? gsheetPreviewCsvUrl : 'e.g. https://docs.google.com/spreadsheets/d/1abc.../edit' }}
            </p>
          </div>
          <div
            v-if="gsheetUrlError"
            class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"
          >
            {{ gsheetUrlError }}
          </div>
        </div>

        <div class="border-t border-gray-200 p-4 flex items-center gap-2">
          <button
            v-if="gsheetUrl"
            type="button"
            class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            @click="clearGSheetUrl"
          >
            Remove
          </button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-4 py-2 hover:bg-gray-100 rounded-lg transition text-gray-700"
            @click="gsheetDialogOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition"
            :disabled="!gsheetUrlInput?.trim()"
            @click="saveGSheetUrl"
          >
            Save &amp; Sync Now
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const exportMenuOpen = ref(false)
const showInfoAlert = ref(true)
import { ref, computed, reactive, watch, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useItpStore, type ITP, type ItpFile, type ItpFileCategory } from '@/stores/itpStore'
import { useProjectStore }          from '@/stores/projectStore'
import { useDisciplineStore }       from '@/stores/disciplineStore'
import ProjectSelectorDialog        from '@/components/ProjectSelectorDialog.vue'
import { useItpChecklistStore, type ItpHtmlChecklist } from '@/stores/itpChecklistStore'
import HtmlPreviewModal                                from '@/components/itp/HtmlPreviewModal.vue'
import { useAuthority }                                from '@/composables/useAuthority'

// ── Column definitions & resize ───────────────────────────────────────────────

const COLS = [
  { key: 'seq',     label: '#'             },
  { key: 'disc',    label: 'Disc.'         },
  { key: 'docno',   label: 'Doc No'        },
  { key: 'title',   label: 'Title'         },
  { key: 'rev',     label: 'Rev.'          },
  { key: 'revdate', label: 'Rev. Date'     },
  { key: 'status',  label: 'Status'        },
  { key: 'link',    label: 'Files'         },
  { key: 'actions', label: ''              },
] as const

type ColKey = typeof COLS[number]['key']

const colWidths = reactive<Record<ColKey, number>>({
  seq:     36,
  disc:    52,
  docno:   210,
  title:   280,
  rev:     52,
  revdate: 90,
  status:  88,
  link:    110,
  actions: 64,
})

const totalColWidth = computed(() =>
  (Object.values(colWidths) as number[]).reduce((a, b) => a + b, 0) + 32 // +32 for px-4 padding
)

const startColResize = (col: ColKey, e: MouseEvent) => {
  const startX = e.clientX
  const startW = colWidths[col]
  const onMove = (ev: MouseEvent) => { colWidths[col] = Math.max(40, startW + ev.clientX - startX) }
  const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Stores ─────────────────────────────────────────────────────────────────────

const itpStore            = useItpStore()
const projectStore        = useProjectStore()
const disciplineStore     = useDisciplineStore()
const itpChecklistStore   = useItpChecklistStore()
const { isSystemAdmin }   = useAuthority()

// ── State ──────────────────────────────────────────────────────────────────────

const selectorOpen     = ref(false)
const fileInputRef     = ref<HTMLInputElement | null>(null)
const importing        = ref(false)
const syncing          = ref(false)
const deleteDialogOpen = ref(false)
const deleteTarget     = ref<ITP | null>(null)
const search           = ref('')
const filterDisc       = ref<string | null>(null)   // discipline_id
const filterStatus     = ref<string | null>(null)

// ── Google Sheet sync ──────────────────────────────────────────────────────────

const GSHEET_KEY = (projectId: string) => `itp_gsheet_${projectId}`

const gsheetUrl         = ref('')  // stored URL for active project
const gsheetDialogOpen  = ref(false)
const gsheetUrlInput    = ref('')
const gsheetUrlError    = ref('')
const lastSyncTime      = ref<Date | null>(null)

const lastSyncLabel = computed(() =>
  lastSyncTime.value ? lastSyncTime.value.toLocaleTimeString() : 'never'
)

/** Convert any Google Sheets share/edit URL to a direct CSV export URL */
const toGSheetCsvUrl = (url: string): string => {
  const trimmed = url.trim()
  // Already a CSV output URL (published)
  if (trimmed.includes('output=csv') || trimmed.includes('format=csv')) return trimmed
  // Standard spreadsheet URL: https://docs.google.com/spreadsheets/d/ID/...
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([^/?#]+)/)
  if (!idMatch) throw new Error('Not a valid Google Sheets URL')
  const id = idMatch[1]
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

const gsheetPreviewCsvUrl = computed(() => {
  try { return toGSheetCsvUrl(gsheetUrlInput.value) }
  catch { return '' }
})

const loadGSheetUrl = () => {
  const id = projectStore.activeProjectId
  if (id) gsheetUrl.value = localStorage.getItem(GSHEET_KEY(id)) ?? ''
}

const saveGSheetUrl = () => {
  gsheetUrlError.value = ''
  const raw = gsheetUrlInput.value.trim()
  try {
    toGSheetCsvUrl(raw)  // validate
  } catch {
    gsheetUrlError.value = 'Not a valid Google Sheets URL. Make sure it contains "/spreadsheets/d/".'
    return
  }
  const id = projectStore.activeProjectId
  if (!id) return
  localStorage.setItem(GSHEET_KEY(id), raw)
  gsheetUrl.value = raw
  gsheetDialogOpen.value = false
  syncFromGSheet()
}

const clearGSheetUrl = () => {
  const id = projectStore.activeProjectId
  if (id) localStorage.removeItem(GSHEET_KEY(id))
  gsheetUrl.value = ''
  gsheetUrlInput.value = ''
  gsheetDialogOpen.value = false
}

const syncFromGSheet = async () => {
  const project = projectStore.activeProject
  if (!project || !gsheetUrl.value) return
  syncing.value = true
  try {
    const csvUrl = toGSheetCsvUrl(gsheetUrl.value)
    const resp = await fetch(csvUrl)
    if (!resp.ok) throw new Error(`HTTP ${resp.status} — make sure the sheet is shared as "Anyone with the link".`)
    const csvText = await resp.text()

    // Parse CSV with XLSX
    const wb = XLSX.read(csvText, { type: 'string' })
    const ws = wb.Sheets[wb.SheetNames[0]!]!
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    if (rawRows.length === 0) { showSnack('Sheet is empty or has no data rows', 'warning'); return }

    const firstRow = rawRows[0]!
    const missing = ['Discipline', 'Doc_No', 'Title'].filter(h => !(h in firstRow))
    if (missing.length) {
      showSnack(`Sheet missing columns: ${missing.join(', ')}`, 'error'); return
    }

    if (disciplineStore.disciplines.length === 0)
      await disciplineStore.fetchDisciplines(project.id)

    const discCodeMap = new Map(
      disciplineStore.disciplines.map(d => [d.code.trim().toUpperCase(), d.id])
    )

    const rows = rawRows.map((r: any) => ({
      project_id:    project.id,
      discipline_id: discCodeMap.get(String(r['Discipline'] ?? '').trim().toUpperCase()) ?? null,
      doc_no:        String(r['Doc_No']         ?? '').trim(),
      title:         String(r['Title']          ?? '').trim(),
      last_revision: String(r['Last_Revision']  ?? '').trim() || null,
      revision_date: parseDate(String(r['Revision_Date'] ?? '')),
      status:        String(r['Status']         ?? '').trim() || null,
      document_link: String(r['Document_Link']  ?? '').trim() || null,
    })).filter((r: any) => r.doc_no && r.title)

    if (rows.length === 0) { showSnack('No valid rows found in sheet', 'warning'); return }

    const result = await itpStore.upsertItps(rows)
    if (result !== null) {
      lastSyncTime.value = new Date()
      showSnack(`✓ Synced ${result.inserted} row(s) from Google Sheet`)
    } else {
      showSnack(itpStore.error ?? 'Sync failed', 'error')
    }
  } catch (err) {
    console.error('GSheet sync error:', err)
    showSnack(err instanceof Error ? err.message : 'Sync failed', 'error')
  } finally {
    syncing.value = false
  }
}

// ── Form dialog ────────────────────────────────────────────────────────────────

const formDialogOpen = ref(false)
const editTarget     = ref<ITP | null>(null)

const blankForm = () => ({
  discipline_id: null as string | null,
  doc_no:        '',
  title:         '',
  last_revision: '',
  revision_date: '',
  status:        '',
})

const form = ref(blankForm())

const openCreate = () => {
  editTarget.value = null
  form.value = blankForm()
  formDialogOpen.value = true
}

const openEdit = (row: ITP) => {
  editTarget.value = row
  form.value = {
    discipline_id: row.discipline_id,
    doc_no:        row.doc_no,
    title:         row.title,
    last_revision: row.last_revision ?? '',
    revision_date: row.revision_date ?? '',
    status:        row.status ?? '',
  }
  formDialogOpen.value = true
  // Fetch HTML checklists for this ITP
  itpChecklistStore.fetchChecklists(row.id)
}

const closeForm = () => { formDialogOpen.value = false; pendingChecklist.value = null }

const saveForm = async () => {
  const formEl = document.querySelector('form') as HTMLFormElement | null
  if (!formEl || !formEl.checkValidity()) {
    formEl?.reportValidity()
    return
  }
  const project = projectStore.activeProject
  if (!project) return

  const payload = {
    project_id:    project.id,
    discipline_id: form.value.discipline_id || null,
    doc_no:        form.value.doc_no.trim(),
    title:         form.value.title.trim(),
    last_revision: form.value.last_revision.trim() || null,
    revision_date: form.value.revision_date || null,
    status:        form.value.status.trim() || null,
  }

  if (editTarget.value) {
    const ok = await itpStore.updateItp(editTarget.value.id, payload)
    if (ok) { showSnack('Record updated'); closeForm() }
    else showSnack(itpStore.error ?? 'Update failed', 'error')
  } else {
    const ok = await itpStore.createItp(payload)
    if (ok) { showSnack('Record created'); closeForm() }
    else showSnack(itpStore.error ?? 'Create failed', 'error')
  }
}

const snackbar = ref({ show: false, text: '', color: 'success' as string })
const showSnack = (text: string, color = 'success') =>
  Object.assign(snackbar.value, { show: true, text, color })

// ── ITP File uploads (R2) ──────────────────────────────────────────────────

const uploadingItpFiles   = ref<string[]>([])
const uploadingChecklists = ref<string[]>([])

const handleItpFileUpload = async (e: Event, category: ItpFileCategory = 'itp') => {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  ;(e.target as HTMLInputElement).value = ''
  if (!files.length || !editTarget.value) return

  const uploading = category === 'itp' ? uploadingItpFiles : uploadingChecklists

  for (const file of files) {
    uploading.value.push(file.name)
    try {
      const result = await itpStore.addItpFile(editTarget.value, file, category)
      if (!result) showSnack(itpStore.error ?? 'Upload failed', 'error')
    } finally {
      uploading.value = uploading.value.filter(n => n !== file.name)
    }
  }
}

const removeItpFile = async (fileId: string) => {
  if (!editTarget.value) return
  const ok = await itpStore.deleteItpFile(editTarget.value.id, fileId)
  if (!ok) showSnack(itpStore.error ?? 'Delete failed', 'error')
}

const itpFilesOf = (category: ItpFileCategory) =>
  (editTarget.value?.itp_files ?? []).filter(f => f.file_category === category)

const fmtFileSize = (bytes: number | null): string => {
  if (!bytes) return ''
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── HTML Checklist management ────────────────────────────────────────────────

const editableChecklists = computed(() =>
  editTarget.value ? itpChecklistStore.forItp(editTarget.value.id) : []
)

const pendingChecklist = ref<{
  file:        File
  htmlContent: string
  code:        string
  title:       string
  version:     string
  saving:      boolean
} | null>(null)

const htmlPreviewOpen    = ref(false)
const htmlPreviewContent = ref('')
const htmlPreviewTitle   = ref('')
const htmlPreviewSchema  = ref<string[] | null>(null)

/** Extract all non-sys:, non-sig: data-key values from an HTML string */
const extractFieldSchema = (html: string): string[] => {
  const parser = new DOMParser()
  const doc    = parser.parseFromString(html, 'text/html')
  const keys   = new Set<string>()
  doc.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key')
    if (key && !key.startsWith('sys:') && !key.startsWith('sig:')) keys.add(key)
  })
  return Array.from(keys)
}

const handleHtmlChecklistUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file || !editTarget.value) return

  const htmlContent = await file.text()

  // Auto-extract title from <title> tag
  const titleMatch     = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)
  const extractedTitle = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.[^.]+$/, '')

  // Auto-extract code: everything before the first underscore or space in filename
  const codeMatch     = file.name.match(/^([A-Za-z0-9-]+)/)
  const extractedCode = codeMatch ? codeMatch[1] : 'CHK'

  pendingChecklist.value = {
    file,
    htmlContent,
    code:    extractedCode,
    title:   extractedTitle,
    version: 'Rev0',
    saving:  false,
  }
}

const confirmAddChecklist = async () => {
  const pc = pendingChecklist.value
  if (!pc || !editTarget.value) return
  pc.saving = true
  const fieldSchema = extractFieldSchema(pc.htmlContent)
  const result = await itpChecklistStore.createChecklist({
    itp_id:       editTarget.value.id,
    code:         pc.code.trim() || 'CHK',
    title:        pc.title.trim() || pc.file.name,
    version:      pc.version.trim() || 'Rev0',
    html_content: pc.htmlContent,
    field_schema: fieldSchema.length ? fieldSchema : null,
    discipline:   null,
    is_active:    true,
    created_by:   null,
  })
  if (result) {
    showSnack(`✓ HTML checklist "${result.code}" added`)
    pendingChecklist.value = null
  } else {
    showSnack(itpChecklistStore.error ?? 'Failed to add checklist', 'error')
    pc.saving = false
  }
}

const removeHtmlChecklist = async (id: string) => {
  const ok = await itpChecklistStore.deleteChecklist(id)
  if (!ok) showSnack(itpChecklistStore.error ?? 'Delete failed', 'error')
}

// Replace HTML content in-place — preserves UUID so all itr_checklist_selections stay intact
const handleHtmlChecklistReplace = async (e: Event, id: string) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  const htmlContent = await file.text()
  const fieldSchema = extractFieldSchema(htmlContent)
  const ok = await itpChecklistStore.updateChecklist(id, {
    html_content: htmlContent,
    field_schema: fieldSchema.length ? fieldSchema : null,
  })
  if (ok) showSnack('✓ HTML replaced — existing ITR selections preserved')
  else showSnack(itpChecklistStore.error ?? 'Replace failed', 'error')
}

const previewHtmlChecklist = (c: ItpHtmlChecklist) => {
  htmlPreviewContent.value = c.html_content
  htmlPreviewTitle.value   = `${c.code} — ${c.title}`
  htmlPreviewSchema.value  = c.field_schema
  htmlPreviewOpen.value    = true
}

// ── Load ───────────────────────────────────────────────────────────────────────

const load = async () => {
  const project = projectStore.activeProject
  if (!project) return
  await Promise.all([
    itpStore.fetchItps(project.id),
    disciplineStore.disciplines.length === 0
      ? disciplineStore.fetchDisciplines(project.id)
      : Promise.resolve(),
  ])
}

onMounted(load)
watch(() => projectStore.activeProjectId, id => { if (id) { load(); loadGSheetUrl() } })

// load GSheet URL for the initial project
onMounted(loadGSheetUrl)

// ── Helpers ────────────────────────────────────────────────────────────────────

const discOf = (row: ITP) =>
  row.discipline_id ? disciplineStore.getById(row.discipline_id) : undefined

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const statusColor = (s: string) => {
  const l = s.toLowerCase()
  if (l.includes('approv'))   return 'success'
  if (l.includes('reject'))   return 'error'
  if (l.includes('review') || l.includes('submit')) return 'info'
  if (l.includes('draft'))    return 'surface-variant'
  return 'secondary'
}

// ── Filter options ─────────────────────────────────────────────────────────────

const discFilterItems = computed(() => [
  { title: 'All Disciplines', value: null },
  ...disciplineStore.disciplines.map(d => ({ title: `${d.code} — ${d.title}`, value: d.id })),
])

const statusFilterItems = computed(() => {
  const statuses = [...new Set(itpStore.itps.map(r => r.status).filter(Boolean) as string[])]
  return [{ title: 'All Statuses', value: null }, ...statuses.map(s => ({ title: s, value: s }))]
})

// ── Filtered rows ──────────────────────────────────────────────────────────────

const filtered = computed(() => {
  let rows = itpStore.itps
  if (filterDisc.value)   rows = rows.filter(r => r.discipline_id === filterDisc.value)
  if (filterStatus.value) rows = rows.filter(r => r.status === filterStatus.value)
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    rows = rows.filter(r =>
      r.doc_no.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q)
    )
  }
  return rows
})

// ── Delete ─────────────────────────────────────────────────────────────────────

const confirmDelete = (row: ITP) => { deleteTarget.value = row; deleteDialogOpen.value = true }
const doDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await itpStore.deleteItp(deleteTarget.value.id)
  if (ok) showSnack('Record deleted')
  else showSnack(itpStore.error ?? 'Delete failed', 'error')
  deleteDialogOpen.value = false; deleteTarget.value = null
}

// ══ EXPORT ════════════════════════════════════════════════════════════════════

/** Column headers used in both export and template */
const EXPORT_HEADERS = ['Discipline', 'Doc_No', 'Title', 'Last_Revision', 'Revision_Date', 'Status', 'Document_Link']

/** Build data rows for export (discipline shown as code) */
const buildExportRows = () =>
  itpStore.itps.map(row => ({
    Discipline:     discOf(row)?.code ?? '',
    Doc_No:         row.doc_no,
    Title:          row.title,
    Last_Revision:  row.last_revision ?? '',
    Revision_Date:  row.revision_date ?? '',
    Status:         row.status ?? '',
    Document_Link:  row.document_link ?? '',
  }))

const exportExcel = () => {
  const project  = projectStore.activeProject
  const rows     = buildExportRows()
  const ws       = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS })
  const wb       = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ITP')
  // Auto column widths
  ws['!cols'] = [{ wch: 10 }, { wch: 36 }, { wch: 60 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 50 }]
  const filename = `ITP_${project?.code ?? project?.name ?? 'export'}_${today()}.xlsx`
  XLSX.writeFile(wb, filename)
}

const exportCsv = () => {
  const project  = projectStore.activeProject
  const rows     = buildExportRows()
  const ws       = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS })
  const csv      = XLSX.utils.sheet_to_csv(ws)
  const blob     = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href = url
  a.download = `ITP_${project?.code ?? project?.name ?? 'export'}_${today()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS])
  ws['!cols'] = [{ wch: 10 }, { wch: 36 }, { wch: 60 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 50 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ITP')
  XLSX.writeFile(wb, 'ITP_Import_Template.xlsx')
}

const today = () => new Date().toISOString().slice(0, 10)

// ══ IMPORT ════════════════════════════════════════════════════════════════════

const triggerImport = () => fileInputRef.value?.click()

const handleFileImport = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''   // reset so same file can be re-imported

  const project = projectStore.activeProject
  if (!project) { showSnack('No active project', 'error'); return }

  importing.value = true
  try {
    const buffer   = await file.arrayBuffer()
    // cellDates: true → Excel date serials are returned as JS Date objects
    const wb       = XLSX.read(buffer, { type: 'array', cellDates: true })
    const ws       = wb.Sheets[wb.SheetNames[0]!]!
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })

    if (rawRows.length === 0) { showSnack('File is empty or has no data rows', 'warning'); return }

    // Validate required columns
    const firstRow = rawRows[0]!
    const missing = ['Discipline', 'Doc_No', 'Title'].filter(h => !(h in firstRow))
    if (missing.length) {
      showSnack(`Missing columns: ${missing.join(', ')}`, 'error')
      return
    }

    // Build lookup: discipline code → id (for the active project)
    if (disciplineStore.disciplines.length === 0)
      await disciplineStore.fetchDisciplines(project.id)

    const discCodeMap = new Map(
      disciplineStore.disciplines.map(d => [d.code.trim().toUpperCase(), d.id])
    )

    const rows = rawRows.map(r => ({
      project_id:    project.id,
      discipline_id: discCodeMap.get(String(r['Discipline'] ?? '').trim().toUpperCase()) ?? null,
      doc_no:        String(r['Doc_No']         ?? '').trim(),
      title:         String(r['Title']          ?? '').trim(),
      last_revision: String(r['Last_Revision']  ?? '').trim() || null,
      revision_date: parseDate(String(r['Revision_Date'] ?? '')),
      status:        String(r['Status']         ?? '').trim() || null,
      document_link: String(r['Document_Link']  ?? '').trim() || null,
    })).filter(r => r.doc_no && r.title)   // skip blank rows

    if (rows.length === 0) { showSnack('No valid rows found in file', 'warning'); return }

    const result = await itpStore.upsertItps(rows)
    if (result !== null) {
      showSnack(`✓ ${result.inserted} record(s) imported / updated.`)
    } else {
      showSnack(itpStore.error ?? 'Import failed', 'error')
    }

  } catch (err) {
    console.error('Import error:', err)
    showSnack(`Parse error: ${err instanceof Error ? err.message : err}`, 'error')
  } finally {
    importing.value = false
  }
}

/**
 * Parse a date value from the spreadsheet cell.
 * SheetJS may return a number (Excel serial), a formatted string, or empty.
 */
const parseDate = (val: string): string | null => {
  if (!val) return null
  const trimmed = val.trim()
  if (!trimmed) return null
  // Try ISO or common date strings
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}
</script>

<style scoped>
/* ── Table layout ──────────────────────────────────────────────────────────── */
.itp-scroll-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  /* thin scrollbar on desktop */
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.1) transparent;
}
.itp-scroll-wrap::-webkit-scrollbar { height: 5px; }
.itp-scroll-wrap::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }

.itp-table-inner {
  min-width: var(--itp-total-width, 1000px);
}

.itp-col { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Column resize handle ──────────────────────────────────────────────────── */
.col-resize-handle {
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.15s;
}
.col-resize-handle:hover,
.col-resize-handle:active {
  background: rgba(129,147,138,0.4);
}

/* ── Header row ────────────────────────────────────────────────────────────── */
.itp-header {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(75,85,99,0.8);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: #f9fafb;
}

/* ── Data row ──────────────────────────────────────────────────────────────── */
.itp-row {
  border-bottom: 1px solid rgba(0,0,0,0.04);
  transition: background 0.1s;
  min-height: 40px;
}
.itp-row:hover { background: rgba(129,147,138,0.06); }
.itp-row:last-child { border-bottom: none; }

/* ── Document link ─────────────────────────────────────────────────────────── */
.doc-link {
  text-decoration: none;
  color: rgb(var(--v-theme-primary));
}
.doc-link:hover { text-decoration: underline; }
</style>
