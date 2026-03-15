<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button class="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition" @click="$router.push('/config')">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <div>
        <h1 class="text-xl font-bold text-gray-900">Master Form Templates</h1>
        <p class="text-sm text-gray-500">Manage form templates and revisions. The latest revision is used when creating new ITRs. Supports PDF and HTML templates.</p>
      </div>
      <div class="flex-1"/>
      <button
        class="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-[#81938A] text-white rounded-md hover:bg-[#6b7a72] transition font-medium"
        @click="newFormDialog.open = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        New Form
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.forms.length === 0" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-6 h-6 text-[#81938A] mr-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span class="text-sm text-gray-500">Loading…</span>
    </div>

    <!-- Form cards -->
    <div v-else class="space-y-6">
      <div v-for="form in store.forms" :key="form.id" class="bg-white border border-gray-200 rounded-xl overflow-hidden">

        <!-- Form header -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div class="w-10 h-10 rounded-lg bg-[#81938A]/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900">{{ form.name }}</div>
            <div class="text-xs text-gray-500 font-mono">{{ form.code }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="store.getLatestRevision(form.code)" class="text-xs text-[#81938A] bg-[#81938A]/10 px-2.5 py-1 rounded-full font-medium">
              Latest: {{ store.getLatestRevision(form.code)?.revision }}
            </span>
            <span v-else class="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
              No revision yet
            </span>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#81938A] text-white rounded-md hover:bg-[#6b7a72] transition font-medium"
              @click="openAddRevision(form)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add Revision
            </button>
          </div>
        </div>

        <!-- Revision list -->
        <div v-if="form.master_form_revisions.length === 0" class="px-5 py-6 text-sm text-gray-400 text-center">
          No revisions uploaded yet. Add the first revision above.
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th class="text-left px-5 py-2.5">Revision</th>
              <th class="text-left px-4 py-2.5">Release Date</th>
              <th class="text-left px-4 py-2.5 hidden sm:table-cell">Notes</th>
              <th class="text-left px-4 py-2.5">Template</th>
              <th class="text-right px-5 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rev in form.master_form_revisions"
              :key="rev.id"
              class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition"
              :class="rev.is_latest ? 'bg-[#81938A]/5' : ''"
            >
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-900">{{ rev.revision }}</span>
                  <span v-if="rev.is_latest" class="text-[10px] font-bold uppercase tracking-wider text-white bg-[#81938A] px-1.5 py-0.5 rounded">Latest</span>
                </div>
                <div class="text-xs text-gray-400 mt-0.5">#{{ rev.revision_number }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">
                {{ rev.released_date ? fmtDate(rev.released_date) : '—' }}
              </td>
              <td class="px-4 py-3 text-gray-500 hidden sm:table-cell max-w-[220px] truncate">
                {{ rev.notes || '—' }}
              </td>
              <td class="px-4 py-3">
                <!-- HTML revision -->
                <button
                  v-if="rev.html_content"
                  class="inline-flex items-center gap-1 text-[#81938A] hover:underline text-xs"
                  @click="openHtml(rev.html_content)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                  </svg>
                  View HTML
                </button>
                <!-- PDF revision -->
                <a
                  v-else-if="rev.template_url"
                  :href="rev.template_url"
                  target="_blank"
                  class="inline-flex items-center gap-1 text-[#81938A] hover:underline text-xs"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  View PDF
                </a>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="!rev.is_latest"
                    class="px-2.5 py-1 text-xs rounded-md border border-[#81938A] text-[#81938A] hover:bg-[#81938A]/10 transition font-medium"
                    :disabled="store.loading"
                    @click="setLatest(form.id, rev.id)"
                  >
                    Set Latest
                  </button>
                  <!-- Edit button (all revisions) -->
                  <button
                    class="p-1.5 text-gray-400 hover:text-[#81938A] transition rounded"
                    title="Edit revision"
                    :disabled="store.loading"
                    @click="openEditRevision(rev)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    v-if="!rev.is_latest"
                    class="p-1.5 text-gray-400 hover:text-red-500 transition rounded"
                    title="Delete revision"
                    :disabled="store.loading"
                    @click="confirmDelete(rev)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ New Form Dialog ══════════════════════════════════════════ -->
    <div v-if="newFormDialog.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div class="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <svg class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <h3 class="font-semibold text-gray-900">New Master Form</h3>
          <div class="flex-1"/>
          <button class="text-gray-400 hover:text-gray-600" @click="newFormDialog.open = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="px-6 py-5 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Form Code <span class="text-red-500">*</span></label>
            <input v-model="newFormDialog.code" type="text" placeholder="e.g. mat_receive"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
            <p class="text-xs text-gray-400 mt-0.5">Unique identifier — lowercase, underscores only</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
            <input v-model="newFormDialog.name" type="text" placeholder="e.g. Material Receive Report"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="newFormDialog.description" rows="2"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A] resize-y"
              placeholder="Optional description…" />
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition" @click="newFormDialog.open = false">Cancel</button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#81938A] hover:bg-[#6b7a72] rounded-md transition disabled:opacity-50"
            :disabled="!newFormDialog.code.trim() || !newFormDialog.name.trim() || store.loading"
            @click="saveNewForm"
          >Create Form</button>
        </div>
      </div>
    </div>

    <!-- ═══ Add Revision Dialog ═════════════════════════════════════════ -->
    <div v-if="addDialog.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div class="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <svg class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <h3 class="font-semibold text-gray-900">Add Revision — {{ addDialog.form?.name }}</h3>
          <div class="flex-1"/>
          <button class="text-gray-400 hover:text-gray-600" @click="closeAddRevision">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="px-6 py-5 space-y-4">

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Revision Label *</label>
              <input v-model="addDialog.revision" type="text" placeholder="e.g. Rev 1"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Revision # *</label>
              <input v-model.number="addDialog.revisionNumber" type="number" min="0"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
              <p class="text-xs text-gray-400 mt-0.5">Numeric order (0, 1, 2…)</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Release Date</label>
            <input v-model="addDialog.releasedDate" type="date"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Apps Script Form Type</label>
            <input v-model="addDialog.appsScriptFormType" type="text" :placeholder="addDialog.form?.code ?? ''"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
            <p class="text-xs text-gray-400 mt-0.5">Used as <code>formType</code> in the Apps Script PDF generator. Leave blank to use form code.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea v-model="addDialog.notes" rows="2"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A] resize-y"
              placeholder="Change summary / what's new in this revision…" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Template File * <span class="text-gray-400 font-normal">(PDF or HTML)</span></label>
            <label
              class="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-5 cursor-pointer hover:border-[#81938A] transition"
              :class="addDialog.file ? 'border-[#81938A] bg-[#81938A]/5' : ''"
            >
              <template v-if="!addDialog.file">
                <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <span class="text-sm text-gray-500">Click to upload template</span>
                <span class="text-xs text-gray-400 mt-1">AcroForm PDF — or interactive HTML form</span>
              </template>
              <template v-else>
                <svg class="w-8 h-8 text-[#81938A] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-sm font-medium text-gray-800">{{ addDialog.file.name }}</span>
                <span class="text-xs text-gray-500 mt-0.5">{{ fmtSize(addDialog.file.size) }}</span>
              </template>
              <input type="file" accept=".pdf,.html" class="hidden" @change="onFilePick" />
            </label>
          </div>

          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="addDialog.makeLatest" class="rounded border-gray-300 text-[#81938A] focus:ring-[#81938A]" />
            <span class="text-sm text-gray-700">Mark as latest revision (recommended)</span>
          </label>

        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition" @click="closeAddRevision">Cancel</button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#81938A] hover:bg-[#6b7a72] rounded-md transition disabled:opacity-50"
            :disabled="!canSave || store.loading"
            @click="saveRevision"
          >
            <svg v-if="store.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Upload Revision
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Edit Revision Dialog ══════════════════════════════════════ -->
    <div v-if="editDialog.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div class="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <svg class="w-5 h-5 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <h3 class="font-semibold text-gray-900">Edit Revision — {{ editDialog.rev?.revision }}</h3>
          <div class="flex-1"/>
          <button class="text-gray-400 hover:text-gray-600" @click="editDialog.open = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="px-6 py-5 space-y-4">

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Revision Label *</label>
              <input v-model="editDialog.revision" type="text"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Revision #</label>
              <input v-model.number="editDialog.revisionNumber" type="number" min="0"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Release Date</label>
            <input v-model="editDialog.releasedDate" type="date"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Apps Script Form Type</label>
            <input v-model="editDialog.appsScriptFormType" type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A]" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea v-model="editDialog.notes" rows="2"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#81938A] resize-y" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Replace Template <span class="text-gray-400 font-normal">(optional — PDF or HTML)</span></label>
            <label
              class="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-[#81938A] transition"
              :class="editDialog.file ? 'border-[#81938A] bg-[#81938A]/5' : ''"
            >
              <template v-if="!editDialog.file">
                <svg class="w-7 h-7 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <span class="text-sm text-gray-500">Click to upload a replacement (PDF or HTML)</span>
                <span class="text-xs text-gray-400 mt-0.5">Leave empty to keep existing file</span>
              </template>
              <template v-else>
                <svg class="w-7 h-7 text-[#81938A] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-sm font-medium text-gray-800">{{ editDialog.file.name }}</span>
                <span class="text-xs text-gray-500 mt-0.5">{{ fmtSize(editDialog.file.size) }}</span>
                <button type="button" class="text-xs text-red-500 mt-1 hover:underline" @click.prevent="editDialog.file = null">Remove</button>
              </template>
              <input type="file" accept=".pdf,.html" class="hidden" @change="onEditFilePick" />
            </label>
          </div>

        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition" @click="editDialog.open = false">Cancel</button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#81938A] hover:bg-[#6b7a72] rounded-md transition disabled:opacity-50"
            :disabled="!editDialog.revision.trim() || store.loading"
            @click="saveEdit"
          >
            <svg v-if="store.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Delete confirm ════════════════════════════════════════════= -->
    <div v-if="deleteDialog.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div class="px-6 py-5">
          <h3 class="font-semibold text-gray-900 mb-1">Delete Revision?</h3>
          <p class="text-sm text-gray-600">
            <strong>{{ deleteDialog.rev?.revision }}</strong> will be permanently removed.
            This cannot be undone. ITRs that locked this revision will still show it in their snapshots.
          </p>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition" @click="deleteDialog.open = false">Cancel</button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:opacity-50"
            :disabled="store.loading"
            @click="doDelete"
          >Delete</button>
        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <div v-if="snack.show" class="fixed bottom-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium"
      :class="snack.color === 'error' ? 'bg-red-600' : 'bg-[#81938A]'">
      {{ snack.text }}
      <button class="hover:opacity-75" @click="snack.show = false">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { useMasterFormStore, type MasterForm, type MasterFormRevision } from '@/stores/masterFormStore'
import { useAuthStore }        from '@/stores/authStore'
import { useProjectStore }     from '@/stores/projectStore'

const store        = useMasterFormStore()
const authStore    = useAuthStore()
const projectStore = useProjectStore()

watch(
  () => projectStore.activeProject?.id,
  (pid) => { if (pid) store.fetchForms(pid) },
  { immediate: true },
)

// ── Snackbar ──────────────────────────────────────────────────────────────────

const snack = reactive({ show: false, text: '', color: 'success' })
const showSnack = (text: string, color = 'success') => Object.assign(snack, { show: true, text, color })

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── New Form dialog ───────────────────────────────────────────────────────────

const newFormDialog = reactive({ open: false, code: '', name: '', description: '' })

const saveNewForm = async () => {
  const pid = projectStore.activeProject?.id
  if (!pid || !newFormDialog.code.trim() || !newFormDialog.name.trim()) return
  const result = await store.createForm(pid, newFormDialog.code.trim(), newFormDialog.name.trim(), newFormDialog.description.trim() || undefined)
  if (result) {
    showSnack(`"${result.name}" created`)
    newFormDialog.open = false
  } else {
    showSnack(store.error ?? 'Failed to create form', 'error')
  }
}

// ── Add Revision dialog ───────────────────────────────────────────────────────

const addDialog = reactive({
  open: false,
  form: null as MasterForm | null,
  revision: '',
  revisionNumber: 0,
  releasedDate: new Date().toISOString().slice(0, 10),
  appsScriptFormType: '',
  notes: '',
  file: null as File | null,
  makeLatest: true,
})

const canSave = computed(() =>
  !!addDialog.revision.trim() && addDialog.revisionNumber >= 0 && !!addDialog.file
)

const openAddRevision = (form: MasterForm) => {
  const revisions = form.master_form_revisions
  const maxNum = revisions.length > 0
    ? Math.max(...revisions.map(r => r.revision_number))
    : -1
  Object.assign(addDialog, {
    open: true,
    form,
    revision: `Rev ${maxNum + 1}`,
    revisionNumber: maxNum + 1,
    releasedDate: new Date().toISOString().slice(0, 10),
    appsScriptFormType: form.code,
    notes: '',
    file: null,
    makeLatest: true,
  })
}

const closeAddRevision = () => { addDialog.open = false }

const onFilePick = (e: Event) => {
  const input = e.target as HTMLInputElement
  addDialog.file = input.files?.[0] ?? null
  input.value = ''
}

const saveRevision = async () => {
  if (!addDialog.form || !addDialog.file) return
  const result = await store.addRevision(
    addDialog.form.id,
    addDialog.file,
    {
      revision:              addDialog.revision.trim(),
      revision_number:       addDialog.revisionNumber,
      apps_script_form_type: addDialog.appsScriptFormType.trim() || addDialog.form.code,
      notes:                 addDialog.notes.trim() || null,
      released_date:         addDialog.releasedDate || null,
      created_by:            authStore.userId ?? null,
    },
    addDialog.makeLatest,
  )
  if (result) {
    showSnack(`${addDialog.form.name} — ${result.revision} uploaded successfully`)
    closeAddRevision()
  } else {
    showSnack(store.error ?? 'Upload failed', 'error')
  }
}

// ── Edit Revision dialog ─────────────────────────────────────────────────────

const editDialog = reactive({
  open: false,
  rev: null as MasterFormRevision | null,
  revision: '',
  revisionNumber: 0,
  releasedDate: '',
  appsScriptFormType: '',
  notes: '',
  file: null as File | null,
})

const openEditRevision = (rev: MasterFormRevision) => {
  Object.assign(editDialog, {
    open: true,
    rev,
    revision: rev.revision,
    revisionNumber: rev.revision_number,
    releasedDate: rev.released_date ?? '',
    appsScriptFormType: rev.apps_script_form_type ?? '',
    notes: rev.notes ?? '',
    file: null,
  })
}

const onEditFilePick = (e: Event) => {
  const input = e.target as HTMLInputElement
  editDialog.file = input.files?.[0] ?? null
  input.value = ''
}

const saveEdit = async () => {
  if (!editDialog.rev) return
  const ok = await store.updateRevision(
    editDialog.rev,
    {
      revision_label:        editDialog.revision.trim(),
      revision_number:       editDialog.revisionNumber,
      apps_script_form_type: editDialog.appsScriptFormType.trim() || null,
      notes:                 editDialog.notes.trim() || null,
      released_date:         editDialog.releasedDate || null,
    },
    editDialog.file ?? undefined,
  )
  if (ok) {
    showSnack('Revision updated')
    editDialog.open = false
  } else {
    showSnack(store.error ?? 'Update failed', 'error')
  }
}

// ── Set latest ────────────────────────────────────────────────────────────────

const setLatest = async (formId: string, revisionId: string) => {
  const ok = await store.setLatestRevision(formId, revisionId)
  if (ok) showSnack('Latest revision updated')
  else showSnack(store.error ?? 'Failed to update', 'error')
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteDialog = reactive({ open: false, rev: null as MasterFormRevision | null })
const confirmDelete = (rev: MasterFormRevision) => { deleteDialog.rev = rev; deleteDialog.open = true }
const doDelete = async () => {
  if (!deleteDialog.rev) return
  const ok = await store.deleteRevision(deleteDialog.rev.id)
  if (ok) { showSnack('Revision deleted'); deleteDialog.open = false }
  else showSnack(store.error ?? 'Delete failed', 'error')
}

// ── HTML preview ──────────────────────────────────────────────────────────────

const openHtml = (htmlContent: string) => {
  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  // Revoke the object URL once the window is done with it
  if (win) win.addEventListener('unload', () => URL.revokeObjectURL(url))
}
</script>
