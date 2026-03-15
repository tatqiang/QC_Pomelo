<template>
  <div class="min-h-screen p-4 md:p-6">

    <!-- ─── No project guard ─────────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <h2 class="text-xl font-semibold mb-2 text-gray-900">No Active Project</h2>
      <p class="text-gray-600 mb-6">Select a project to view its Material Approval register.</p>
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
          <h1 class="text-2xl font-bold text-gray-900">Materials</h1>
          <p class="text-gray-600 text-sm">
            {{ projectStore.activeProject.name }} · {{ materialStore.materials.length }} record(s)
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
            v-click-outside="() => exportMenuOpen = false"
            class="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-xl z-50"
          >
            <button
              class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 rounded-t-lg text-gray-700"
              @click="exportExcel"
            >
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Excel (.xlsx)</span>
            </button>
            <button
              class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 text-gray-700"
              @click="exportCsv"
            >
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        Columns: <code class="px-1 py-0.5 bg-gray-200 rounded text-xs">Discipline · Doc_No · Title · Last_Revision · Revision_Date · Status</code>.
        Use the <em>Download Template</em> option to get a pre-formatted file.
        Rows are matched by <code class="px-1 py-0.5 bg-gray-200 rounded text-xs">Doc_No</code> — existing records with the same Doc_No will be updated.
        <span v-if="gsheetUrl"> · Last synced: <strong>{{ lastSyncLabel }}</strong></span>
      </div>

      <!-- ─── DB error ─────────────────────────────────────────────────── -->
      <div
        v-if="materialStore.error"
        class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-gray-700"
      >
        <div class="font-semibold mb-1">Database Setup Required</div>
        <div class="text-sm">
          Run <code class="px-1 py-0.5 bg-gray-200 rounded text-xs">database/010_materials.sql</code> in
          <strong>Supabase Dashboard → SQL Editor</strong>, then click Retry.
        </div>
        <div class="mt-1 text-xs text-gray-600">{{ materialStore.error }}</div>
        <button
          class="mt-2 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 rounded transition inline-flex items-center gap-2"
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
          <option v-for="item in discFilterItems.slice(1)" :key="item.value" :value="item.value">
            {{ item.title }}
          </option>
        </select>
        <select
          v-model="filterStatus"
          class="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss max-w-[160px] text-gray-900"
        >
          <option :value="null">All Statuses</option>
          <option v-for="item in statusFilterItems.slice(1)" :key="item.value" :value="item.value">
            {{ item.title }}
          </option>
        </select>
        <div class="flex-1"></div>
        <span class="text-gray-600 text-sm whitespace-nowrap">
          {{ filtered.length }} / {{ materialStore.materials.length }} rows
        </span>
      </div>

      <!-- ─── Loading ──────────────────────────────────────────────────── -->
      <div v-if="materialStore.loading && materialStore.materials.length === 0" class="text-center py-16">
        <svg class="animate-spin h-12 w-12 text-moss mx-auto" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- ─── Empty state ──────────────────────────────────────────────── -->
      <div v-else-if="!materialStore.loading && materialStore.materials.length === 0 && !materialStore.error" class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h2 class="text-xl font-semibold mb-2 text-gray-900">No Materials Yet</h2>
        <p class="text-gray-600 mb-6">
          Import an Excel or CSV file to populate the Material register for this project.
        </p>
        <button
          class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
          @click="triggerImport"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import Material Data
        </button>
      </div>

      <!-- ─── Data table ───────────────────────────────────────────────── -->
      <div v-else-if="materialStore.materials.length > 0" class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <!-- horizontal scroll wrapper for mobile -->
        <div class="mat-scroll-wrap">
          <div class="mat-table-inner" :style="{ '--mat-total-width': totalColWidth + 'px' }">

        <!-- Table header -->
        <div class="mat-header flex items-center px-4 py-3">
          <div
            v-for="col in COLS" :key="col.key"
            class="mat-col flex items-center relative flex-shrink-0"
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
          class="mat-row flex items-center px-4 py-2"
        >
          <!-- # -->
          <div class="mat-col flex-shrink-0 text-gray-500 text-xs" :style="{ width: colWidths.seq + 'px' }">
            {{ idx + 1 }}
          </div>

          <!-- Discipline chip -->
          <div class="mat-col flex-shrink-0" :style="{ width: colWidths.disc + 'px' }">
            <span
              v-if="discOf(row)"
              class="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold font-mono rounded min-w-[32px]"
              :style="{ backgroundColor: discOf(row)?.color + '30', color: discOf(row)?.color }"
            >{{ discOf(row)?.code }}</span>
            <span v-else class="text-gray-500 text-xs">—</span>
          </div>

          <!-- Doc No -->
          <div class="mat-col flex-shrink-0" :style="{ width: colWidths.docno + 'px' }">
            <span class="text-xs font-mono text-gray-600">{{ row.doc_no }}</span>
          </div>

          <!-- Title -->
          <div class="mat-col flex-shrink-0" :style="{ width: colWidths.title + 'px' }">
            <span class="truncate text-sm text-gray-900" :title="row.title">{{ row.title }}</span>
          </div>

          <!-- Last revision -->
          <div class="mat-col flex-shrink-0 text-center" :style="{ width: colWidths.rev + 'px' }">
            <span
              v-if="row.last_revision"
              class="inline-flex items-center justify-center px-2 py-0.5 text-xs rounded"
              style="background-color: #81938A30; color: #81938A;"
            >
              {{ row.last_revision }}
            </span>
          </div>

          <!-- Revision date -->
          <div class="mat-col flex-shrink-0 text-gray-500 text-xs" :style="{ width: colWidths.revdate + 'px' }">
            {{ row.revision_date ? fmtDate(row.revision_date) : '—' }}
          </div>

          <!-- Status -->
          <div class="mat-col flex-shrink-0" :style="{ width: colWidths.status + 'px' }">
            <span
              v-if="row.status"
              class="inline-flex items-center justify-center px-2 py-0.5 text-xs rounded"
              :style="{ backgroundColor: statusColor(row.status) + '30', color: statusColor(row.status) }"
            >{{ row.status }}</span>
          </div>

          <!-- Files -->
          <div class="mat-col flex-shrink-0 flex items-center gap-1" :style="{ width: colWidths.link + 'px' }">
            <button
              v-if="row.material_files?.length"
              class="inline-flex items-center gap-1 px-2 py-0.5 bg-moss/20 text-moss rounded text-xs hover:bg-moss/30 transition"
              :title="row.material_files.map(f => f.file_name).join(', ')"
              @click.stop="openEdit(row)"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {{ row.material_files.length }}
            </button>
            <span v-else class="text-gray-400 text-xs">—</span>
          </div>

          <!-- Actions -->
          <div class="mat-col flex-shrink-0 flex justify-end gap-0" :style="{ width: colWidths.actions + 'px' }">
            <button
              class="p-1 hover:bg-gray-100 rounded transition"
              title="Edit"
              @click.stop="openEdit(row)"
            >
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="p-1 hover:bg-red-50 rounded transition"
              title="Delete"
              @click.stop="confirmDelete(row)"
            >
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty filter -->
        <div v-if="filtered.length === 0" class="text-center py-8 text-gray-500">
          No records match the current filters.
        </div>

          </div><!-- /mat-table-inner -->
        </div><!-- /mat-scroll-wrap -->
      </div>
    </template>

    <!-- ─── Add / Edit dialog ─────────────────────────────────────────────── -->
    <div v-if="formDialogOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-[600px] max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <svg v-if="editTarget" class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <svg v-else class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <h2 class="text-lg font-semibold text-gray-900 flex-1">
            {{ editTarget ? 'Edit Material Record' : 'New Material Record' }}
          </h2>
          <button class="p-1 hover:bg-gray-100 rounded transition" @click="closeForm">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="overflow-y-auto flex-1 px-5 py-4">
          <form @submit.prevent="saveForm" class="space-y-4">
            <div class="grid grid-cols-12 gap-4">
              <!-- Discipline -->
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
                <select
                  v-model="form.discipline_id"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                >
                  <option :value="null">—</option>
                  <option v-for="opt in disciplineStore.options" :key="opt.value" :value="opt.value">
                    {{ opt.title }}
                  </option>
                </select>
                <p v-if="disciplineStore.options.length === 0" class="mt-1 text-xs text-gray-500">
                  Go to Disciplines to set up
                </p>
              </div>
              
              <!-- Doc No -->
              <div class="col-span-12 sm:col-span-8">
                <label class="block text-sm font-medium text-gray-700 mb-1">Doc No *</label>
                <input
                  v-model="form.doc_no"
                  type="text"
                  required
                  placeholder="e.g. CHN1A-003-E-MTA-ZZZ-0001"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss font-mono text-gray-900"
                />
              </div>
              
              <!-- Title -->
              <div class="col-span-12">
                <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  v-model="form.title"
                  type="text"
                  required
                  placeholder="e.g. EE - LV Cable"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                />
              </div>
              
              <!-- Last Revision -->
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Last Revision</label>
                <input
                  v-model="form.last_revision"
                  type="text"
                  placeholder="e.g. 07"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                />
              </div>
              
              <!-- Revision Date -->
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Revision Date</label>
                <input
                  v-model="form.revision_date"
                  type="date"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                />
              </div>
              
              <!-- Status -->
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
                  <!-- files list -->
                  <div class="rounded-lg border border-gray-200 p-3 mb-0">
                    <div class="flex items-center gap-1.5 mb-2">
                      <svg class="w-3.5 h-3.5 text-moss flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span class="text-sm font-medium text-gray-700">Files</span>
                      <span class="ml-auto text-xs text-gray-400 tabular-nums">{{ editTarget.material_files?.length ?? 0 }}</span>
                    </div>
                    <div class="space-y-1 mb-2">
                      <div
                        v-for="f in (editTarget.material_files ?? [])"
                        :key="f.id"
                        class="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-100 rounded"
                      >
                        <a :href="f.file_url" target="_blank" rel="noopener noreferrer"
                           class="text-xs text-moss hover:underline truncate flex-1" :title="f.file_name"
                        >{{ f.file_name }}</a>
                        <span class="text-xs text-gray-400 flex-shrink-0">{{ fmtFileSize(f.file_size) }}</span>
                        <button type="button" class="p-0.5 hover:bg-red-50 rounded flex-shrink-0"
                                :disabled="materialStore.loading" @click.prevent="removeMaterialFile(f.id)">
                          <svg class="w-3.5 h-3.5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p v-if="!(editTarget.material_files?.length)" class="text-xs text-gray-400 italic">No files attached yet.</p>
                    </div>
                    <!-- upload trigger -->
                    <label class="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 hover:border-moss rounded-lg text-xs text-gray-500 hover:text-moss transition">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload files
                      <input type="file" class="hidden" multiple @change="handleMaterialFileUpload" />
                    </label>
                    <div v-if="uploadingMatFiles.length" class="mt-1.5 flex flex-wrap gap-1">
                      <span v-for="name in uploadingMatFiles" :key="name"
                            class="inline-flex items-center gap-1 px-2 py-0.5 bg-moss/10 text-moss rounded text-xs">
                        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {{ name }}
                      </span>
                    </div>
                  </div>
                </template>
                <p v-else class="text-sm text-gray-400 italic">Files can be attached after the record is created.</p>
              </div>
            </div>
          </form>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            @click="closeForm"
          >
            Cancel
          </button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
            :disabled="materialStore.loading"
            @click="saveForm"
          >
            <svg v-if="materialStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ editTarget ? 'Save Changes' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Delete confirm ──────────────────────────────────────────────── -->
    <div v-if="deleteDialogOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="deleteDialogOpen = false">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-[360px]">
        <div class="px-5 py-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Delete Material Record?</h2>
          <p class="text-gray-600">
            "<strong>{{ deleteTarget?.doc_no }}</strong>" will be permanently removed.
          </p>
        </div>
        <div class="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
          <button
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            @click="deleteDialogOpen = false"
          >
            Cancel
          </button>
          <div class="flex-1"></div>
          <button
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition inline-flex items-center gap-2"
            :disabled="materialStore.loading"
            @click="doDelete"
          >
            <svg v-if="materialStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Snackbar ────────────────────────────────────────────────────── -->
    <div
      v-if="snackbar.show"
      class="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[200px] max-w-[400px]"
      :class="{
        'bg-green-600 text-white': snackbar.color === 'success',
        'bg-red-600 text-white': snackbar.color === 'error',
        'bg-blue-600 text-white': snackbar.color === 'info',
        'bg-yellow-600 text-white': snackbar.color === 'warning',
        'bg-gray-800 text-white': !snackbar.color || snackbar.color === 'default'
      }"
    >
      <span class="flex-1">{{ snackbar.text }}</span>
      <button
        class="px-2 py-1 hover:bg-white/20 rounded transition text-sm font-medium"
        @click="snackbar.show = false"
      >
        OK
      </button>
    </div>

    <ProjectSelectorDialog v-model="selectorOpen" />

    <!-- ─── Google Sheet URL dialog ────────────────────────────────────────── -->
    <div v-if="gsheetDialogOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="gsheetDialogOpen = false">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-[560px]">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <svg class="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM7 4h3v3H7V4zm0 4h3v3H7V8zm0 4h3v3H7v-3zm0 4h3v3H7v-3zm4-12h3v3h-3V4zm0 4h3v3h-3V8zm0 4h3v3h-3v-3zm0 4h3v3h-3v-3zm4-12h3v3h-3V4zm0 4h3v3h-3V8zm0 4h3v3h-3v-3zm0 4h3v3h-3v-3z"/>
          </svg>
          <h2 class="text-lg font-semibold text-gray-900 flex-1">Google Sheet Sync</h2>
          <button class="p-1 hover:bg-gray-100 rounded transition" @click="gsheetDialogOpen = false">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="px-5 py-4">
          <p class="text-gray-600 text-sm mb-4">
            Paste your Google Sheet URL below. The sheet must be shared as
            <strong>"Anyone with the link can view"</strong>.
            The app will fetch it as CSV and upsert all rows.
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Google Sheet URL</label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM7 4h3v3H7V4zm0 4h3v3H7V8zm0 4h3v3H7v-3zm0 4h3v3H7v-3zm4-12h3v3h-3V4zm0 4h3v3h-3V8zm0 4h3v3h-3v-3zm0 4h3v3h-3v-3zm4-12h3v3h-3V4zm0 4h3v3h-3V8zm0 4h3v3h-3v-3zm0 4h3v3h-3v-3z"/>
              </svg>
              <input
                v-model="gsheetUrlInput"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                class="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal text-gray-900"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500">
              {{ gsheetUrlInput ? gsheetPreviewCsvUrl : 'e.g. https://docs.google.com/spreadsheets/d/1abc.../edit' }}
            </p>
          </div>
          <div v-if="gsheetUrlError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-red-800">{{ gsheetUrlError }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
          <button
            v-if="gsheetUrl"
            class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            @click="clearGSheetUrl"
          >
            Remove
          </button>
          <div class="flex-1"></div>
          <button
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            @click="gsheetDialogOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-teal hover:bg-teal/90 text-white rounded-lg transition"
            :disabled="!gsheetUrlInput?.trim()"
            @click="saveGSheetUrl"
          >
            Save &amp; Sync Now
          </button>
        </div>
      </div>
    </div>

    <ProjectSelectorDialog v-model="selectorOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useMaterialStore, type Material, type MaterialFile } from '@/stores/materialStore'
import { useProjectStore }                  from '@/stores/projectStore'
import { useDisciplineStore }               from '@/stores/disciplineStore'
import ProjectSelectorDialog                from '@/components/ProjectSelectorDialog.vue'

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
  (Object.values(colWidths) as number[]).reduce((a, b) => a + b, 0) + 32
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

const materialStore   = useMaterialStore()
const projectStore    = useProjectStore()
const disciplineStore = useDisciplineStore()

// ── State ──────────────────────────────────────────────────────────────────────

const selectorOpen     = ref(false)
const fileInputRef     = ref<HTMLInputElement | null>(null)
const importing        = ref(false)
const syncing          = ref(false)
const deleteDialogOpen = ref(false)
const deleteTarget     = ref<Material | null>(null)
const search           = ref('')
const filterDisc       = ref<string | null>(null)
const filterStatus     = ref<string | null>(null)
const exportMenuOpen   = ref(false)
const showInfoAlert    = ref(true)

// ── Google Sheet sync ──────────────────────────────────────────────────────────

const GSHEET_KEY = (projectId: string) => `mat_gsheet_${projectId}`

const gsheetUrl        = ref('')
const gsheetDialogOpen = ref(false)
const gsheetUrlInput   = ref('')
const gsheetUrlError   = ref('')
const lastSyncTime     = ref<Date | null>(null)

const lastSyncLabel = computed(() =>
  lastSyncTime.value ? lastSyncTime.value.toLocaleTimeString() : 'never'
)

const toGSheetCsvUrl = (url: string): string => {
  const trimmed = url.trim()
  if (trimmed.includes('output=csv') || trimmed.includes('format=csv')) return trimmed
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
    toGSheetCsvUrl(raw)
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
      document_link: null,
    })).filter((r: any) => r.doc_no && r.title)

    if (rows.length === 0) { showSnack('No valid rows found in sheet', 'warning'); return }

    const result = await materialStore.upsertMaterials(rows)
    if (result !== null) {
      lastSyncTime.value = new Date()
      showSnack(`✓ Synced ${result.inserted} row(s) from Google Sheet`)
    } else {
      showSnack(materialStore.error ?? 'Sync failed', 'error')
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
const editTarget     = ref<Material | null>(null)
const formRef        = ref()

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

const openEdit = (row: Material) => {
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
}

const closeForm = () => { formDialogOpen.value = false }

const saveForm = async () => {
  if (!form.value.doc_no.trim() || !form.value.title.trim()) return
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
    document_link: null,
  }

  if (editTarget.value) {
    const ok = await materialStore.updateMaterial(editTarget.value.id, payload)
    if (ok) { showSnack('Record updated'); closeForm() }
    else showSnack(materialStore.error ?? 'Update failed', 'error')
  } else {
    const ok = await materialStore.createMaterial(payload)
    if (ok) { showSnack('Record created'); closeForm() }
    else showSnack(materialStore.error ?? 'Create failed', 'error')
  }
}

const snackbar = ref({ show: false, text: '', color: 'success' as string })
const showSnack = (text: string, color = 'success') =>
  Object.assign(snackbar.value, { show: true, text, color })

// ── Material File uploads (R2) ──────────────────────────────────────────

const uploadingMatFiles = ref<string[]>([])

const handleMaterialFileUpload = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  ;(e.target as HTMLInputElement).value = ''
  if (!files.length || !editTarget.value) return
  for (const file of files) {
    uploadingMatFiles.value.push(file.name)
    try {
      const result = await materialStore.addMaterialFile(editTarget.value, file)
      if (!result) showSnack(materialStore.error ?? 'Upload failed', 'error')
    } finally {
      uploadingMatFiles.value = uploadingMatFiles.value.filter(n => n !== file.name)
    }
  }
}

const removeMaterialFile = async (fileId: string) => {
  if (!editTarget.value) return
  const ok = await materialStore.deleteMaterialFile(editTarget.value.id, fileId)
  if (!ok) showSnack(materialStore.error ?? 'Delete failed', 'error')
}

const fmtFileSize = (bytes: number | null): string => {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Load ───────────────────────────────────────────────────────────────────────

const load = async () => {
  const project = projectStore.activeProject
  if (!project) return
  await Promise.all([
    materialStore.fetchMaterials(project.id),
    disciplineStore.disciplines.length === 0
      ? disciplineStore.fetchDisciplines(project.id)
      : Promise.resolve(),
  ])
}

onMounted(load)
watch(() => projectStore.activeProjectId, id => { if (id) { load(); loadGSheetUrl() } })
onMounted(loadGSheetUrl)

// ── Helpers ────────────────────────────────────────────────────────────────────

const discOf = (row: Material) =>
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
  const statuses = [...new Set(materialStore.materials.map(r => r.status).filter(Boolean) as string[])]
  return [{ title: 'All Statuses', value: null }, ...statuses.map(s => ({ title: s, value: s }))]
})

// ── Filtered rows ──────────────────────────────────────────────────────────────

const filtered = computed(() => {
  let rows = materialStore.materials
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

const confirmDelete = (row: Material) => { deleteTarget.value = row; deleteDialogOpen.value = true }
const doDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await materialStore.deleteMaterial(deleteTarget.value.id)
  if (ok) showSnack('Record deleted')
  else showSnack(materialStore.error ?? 'Delete failed', 'error')
  deleteDialogOpen.value = false; deleteTarget.value = null
}

// ══ EXPORT ════════════════════════════════════════════════════════════════════

const EXPORT_HEADERS = ['Discipline', 'Doc_No', 'Title', 'Last_Revision', 'Revision_Date', 'Status']

const buildExportRows = () =>
  materialStore.materials.map(row => ({
    Discipline:     discOf(row)?.code ?? '',
    Doc_No:         row.doc_no,
    Title:          row.title,
    Last_Revision:  row.last_revision ?? '',
    Revision_Date:  row.revision_date ?? '',
    Status:         row.status ?? '',
  }))

const exportExcel = () => {
  const project  = projectStore.activeProject
  const rows     = buildExportRows()
  const ws       = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS })
  const wb       = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Materials')
  ws['!cols'] = [{ wch: 10 }, { wch: 36 }, { wch: 60 }, { wch: 10 }, { wch: 14 }, { wch: 12 }]
  const filename = `MAT_${project?.code ?? project?.name ?? 'export'}_${today()}.xlsx`
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
  a.download = `MAT_${project?.code ?? project?.name ?? 'export'}_${today()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS])
  ws['!cols'] = [{ wch: 10 }, { wch: 36 }, { wch: 60 }, { wch: 10 }, { wch: 14 }, { wch: 12 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Materials')
  XLSX.writeFile(wb, 'Material_Import_Template.xlsx')
}

const today = () => new Date().toISOString().slice(0, 10)

// ══ IMPORT ════════════════════════════════════════════════════════════════════

const triggerImport = () => fileInputRef.value?.click()

const handleFileImport = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''

  const project = projectStore.activeProject
  if (!project) { showSnack('No active project', 'error'); return }

  importing.value = true
  try {
    const buffer   = await file.arrayBuffer()
    const wb       = XLSX.read(buffer, { type: 'array', cellDates: true })
    const ws       = wb.Sheets[wb.SheetNames[0]!]!
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })

    if (rawRows.length === 0) { showSnack('File is empty or has no data rows', 'warning'); return }

    const firstRow = rawRows[0]!
    const missing = ['Discipline', 'Doc_No', 'Title'].filter(h => !(h in firstRow))
    if (missing.length) {
      showSnack(`Missing columns: ${missing.join(', ')}`, 'error')
      return
    }

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
      document_link: null,
    })).filter(r => r.doc_no && r.title)

    if (rows.length === 0) { showSnack('No valid rows found in file', 'warning'); return }

    const result = await materialStore.upsertMaterials(rows)
    if (result !== null) {
      showSnack(`✓ ${result.inserted} record(s) imported / updated.`)
    } else {
      showSnack(materialStore.error ?? 'Import failed', 'error')
    }

  } catch (err) {
    console.error('Import error:', err)
    showSnack(`Parse error: ${err instanceof Error ? err.message : err}`, 'error')
  } finally {
    importing.value = false
  }
}

const parseDate = (val: string): string | null => {
  if (!val) return null
  const trimmed = val.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}
</script>

<style scoped>
/* ── Table layout ──────────────────────────────────────────────────────────── */
.mat-scroll-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.15) transparent;
}
.mat-scroll-wrap::-webkit-scrollbar { height: 5px; }
.mat-scroll-wrap::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }

.mat-table-inner {
  min-width: var(--mat-total-width, 1000px);
}

.mat-col { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
  background: rgba(129,147,138,0.5);
}

/* ── Header row ────────────────────────────────────────────────────────────── */
.mat-header {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

/* ── Data row ──────────────────────────────────────────────────────────────── */
.mat-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
  min-height: 40px;
  background: white;
}
.mat-row:hover { background: #f9fafb; }
.mat-row:last-child { border-bottom: none; }

/* ── Document link ─────────────────────────────────────────────────────────── */
.doc-link {
  text-decoration: none;
  color: #81938A;
}
.doc-link:hover { text-decoration: underline; }
</style>
