<template>
  <div class="gantt-root flex flex-col" style="height: 100vh; overflow: hidden;">

    <!-- ─── No Project Guard ──────────────────────────────────────────────── -->
    <div v-if="!projectStore.activeProject" class="flex flex-col items-center justify-center flex-grow p-8">
      <svg class="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <h2 class="text-xl font-semibold mb-2 text-gray-900">No Active Project</h2>
      <p class="text-gray-600 mb-6">Select a project to view the Gantt chart.</p>
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
      <!-- ─── Toolbar ──────────────────────────────────────────────────────── -->
      <div class="gantt-toolbar flex items-center px-4 py-2 gap-2 flex-shrink-0">
        <svg class="w-5 h-5 mr-1 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span class="font-bold text-sm text-gray-900">{{ projectStore.activeProject.name }}</span>
        <div class="flex-1"></div>

        <!-- Precision toggle -->
        <div class="inline-flex rounded-lg border border-moss/30 bg-white overflow-hidden">
          <button
            v-for="mode in ['month', 'week', 'day']" :key="mode"
            :class="[
              'px-3 py-1 text-sm font-medium transition',
              precision === mode
                ? 'bg-moss text-white'
                : 'text-gray-700 hover:bg-gray-50'
            ]"
            @click="precision = mode"
          >
            {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
          </button>
        </div>

        <button class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition inline-flex items-center gap-2" @click="scrollToToday">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Today
        </button>
        <button class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition inline-flex items-center gap-2" @click="taskStore.expandAll()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Expand
        </button>
        <button class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition inline-flex items-center gap-2" @click="taskStore.collapseAll()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
          Collapse
        </button>
        <!-- Edit Lock toggle — only visible to roles with edit_gantt permission -->
        <button
          v-if="canEditGantt"
          :class="[
            'px-3 py-1 text-sm rounded-lg transition inline-flex items-center gap-2 border',
            editLocked
              ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              : 'bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100'
          ]"
          :title="editLocked ? 'Click to enable editing' : 'Click to lock (view only)'"
          @click="editLocked = !editLocked"
        >
          <!-- Lock icon (locked state) -->
          <svg v-if="editLocked" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <!-- Unlock / pencil icon (edit state) -->
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          {{ editLocked ? 'Locked' : 'Editing' }}
        </button>

        <button v-if="canEditGantt" class="px-3 py-1 text-sm bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2" @click="openCreate(null)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      <!-- ─── Loading ──────────────────────────────────────────────────────── -->
      <div v-if="taskStore.loading && rows.length === 0" class="flex justify-center items-center flex-grow">
        <svg class="animate-spin h-12 w-12 text-moss" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- ─── Empty State ──────────────────────────────────────────────────── -->
      <div v-else-if="!taskStore.loading && rows.length === 0" class="flex flex-col items-center justify-center flex-grow p-8">
        <svg class="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h2 class="text-xl font-semibold mb-2 text-gray-900">No Tasks Yet</h2>
        <p class="text-gray-600 mb-6">Add your first task to start planning.</p>
        <button
          v-if="canEditGantt"
          class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
          @click="openCreate(null)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      <!-- ─── Split Panel ──────────────────────────────────────────────────── -->
      <div v-else class="gantt-split flex-grow flex" style="overflow: hidden; min-height: 0;">

        <!-- ── Left Panel ─────────────────────────────────────────────────── -->
        <div class="gantt-left flex flex-col flex-shrink-0" :style="{ width: splitterX + 'px' }">
          <!-- Column headers -->
          <div
            ref="leftHeaderRef"
            class="gantt-col-header flex-shrink-0"
            style="overflow-x: hidden; white-space: nowrap;"
          >
            <div class="flex items-center" :style="{ width: totalLeftWidth + 'px' }">
              <div v-for="col in COLS" :key="col.key"
                class="gcol flex items-center relative flex-shrink-0"
                :style="{ width: colWidths[col.key] + 'px' }"
              >
                {{ col.label }}
                <!-- Resize handle -->
                <div
                  class="col-resize-handle"
                  @mousedown.stop.prevent="startColResize(col.key, $event)"
                  title="Drag to resize column"
                />
              </div>
            </div>
          </div>

          <!-- Task rows -->
          <div
            ref="leftBodyRef"
            class="gantt-left-body flex-grow"
            style="overflow-y: auto; overflow-x: auto;"
            @scroll.passive="onLeftScroll"
          >
            <!-- Inner wrapper with fixed total width so columns don't wrap -->
            <div :style="{ width: totalLeftWidth + 'px', minWidth: '100%' }">
              <div
                v-for="task in rows"
                :key="task.id"
                class="gantt-row flex items-center"
                :class="{
                  'drag-over-above': dragOverId === task.id && dragPosition === 'before',
                  'drag-over-below': dragOverId === task.id && dragPosition === 'after',
                  'row-dragging':    draggedId   === task.id,
                  'cursor-pointer':  !editLocked,
                  'cursor-default':  editLocked,
                  'row-top-level':   task.level === 0,
                }"
                :draggable="!editLocked"
                @dragstart="!editLocked && onDragStart(task, $event)"
                @dragover.prevent="!editLocked && onDragOver(task, $event)"
                @dragleave="!editLocked && onDragLeave()"
                @drop.prevent="!editLocked && onDrop(task)"
                @dragend="onDragEnd"
                @click="!editLocked && openEdit(task)"
              >
                <!-- Drag grip -->
                <div class="drag-grip flex-shrink-0" title="Drag to reorder">
                  <svg class="w-3 h-3 opacity-35" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
                  </svg>
                </div>

                <!-- WBS # -->
                <div class="gcol flex-shrink-0 text-gray-500" :style="{ width: colWidths.wbs + 'px', fontSize: '0.7rem', fontFamily: 'monospace' }">
                  {{ task.wbs_code ?? '—' }}
                </div>

                <!-- Task name with indent + expand toggle -->
                <div class="gcol gcol-name-cell flex items-center flex-shrink-0" :style="{ width: colWidths.name + 'px', paddingLeft: (task.level * 16 + 4) + 'px' }">
                  <button
                    v-if="hasChildren(task.id)"
                    class="mr-1 flex-shrink-0 p-0 hover:bg-gray-100 rounded transition"
                    style="width: 18px; height: 18px;"
                    @click.stop="taskStore.toggleExpand(task.id)"
                  >
                    <svg v-if="task.expanded" class="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                    <svg v-else class="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                  </button>
                  <div v-else class="mr-1 flex-shrink-0" style="width: 18px;" />
                  <span class="truncate text-gray-900" style="font-size: 0.78rem; flex: 1; min-width: 0;" :title="task.name">{{ task.name }}</span>
                  <!-- Hover actions -->
                  <div class="row-hover-actions ml-1 flex gap-1 flex-shrink-0" @click.stop>
                    <button v-if="!editLocked" class="p-1 hover:bg-gray-100 rounded transition" title="Add child" @click.stop="openCreate(task.id)">
                      <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button v-if="task.level > 0" class="p-1 hover:bg-moss/10 rounded transition" title="New ITR" @click.stop="openCreateITR(task)">
                      <svg class="w-4 h-4 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </button>
                    <!-- To-do list button (all tasks, any role) -->
                    <button class="p-1 hover:bg-blue-50 rounded transition" title="To-Do list" @click.stop="openTodos(task)">
                      <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h.01M9 17h.01M9 12h.01M12 12h3" />
                      </svg>
                    </button>
                    <button v-if="!editLocked" class="p-1 hover:bg-red-50 rounded transition" title="Delete" @click.stop="confirmDelete(task)">
                      <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Area -->
                <div class="gcol flex-shrink-0" :style="{ width: colWidths.area + 'px' }">
                  <span class="text-gray-600" style="font-size: 0.7rem;" :title="areaLabel(task)">{{ areaLabel(task) }}</span>
                </div>

                <!-- Location -->
                <div class="gcol flex-shrink-0" :style="{ width: colWidths.location + 'px' }">
                  <span v-if="task.location" class="truncate text-gray-600" style="font-size: 0.7rem;" :title="task.location">{{ task.location }}</span>
                  <span v-else class="text-gray-400" style="font-size: 0.7rem;">—</span>
                </div>

                <!-- Discipline -->
                <div class="gcol flex-shrink-0" :style="{ width: colWidths.disc + 'px' }">
                  <span
                    v-if="discOf(task)"
                    class="disc-chip"
                    :style="{ background: (discOf(task)!.color ?? '#81938A') + '22', color: discOf(task)!.color ?? '#81938A', borderColor: (discOf(task)!.color ?? '#81938A') + '55' }"
                  >{{ discOf(task)!.code }}</span>
                </div>

                <!-- Start / End (show effective dates for group tasks) -->
                <div class="gcol flex-shrink-0 text-gray-600" :style="{ width: colWidths.start + 'px', fontSize: '0.7rem', opacity: hasChildren(task.id) ? '0.65' : '1' }">
                  {{ fmtDate(effectiveStart(task)) }}
                </div>
                <div class="gcol flex-shrink-0 text-gray-600" :style="{ width: colWidths.end + 'px', fontSize: '0.7rem', opacity: hasChildren(task.id) ? '0.65' : '1' }">
                  {{ fmtDate(effectiveEnd(task)) }}
                </div>

                <!-- Progress -->
                <div class="gcol flex flex-col items-center justify-center gap-0 flex-shrink-0" :style="{ width: colWidths.pct + 'px' }">
                  <span style="font-size: 0.68rem;">{{ task.progress }}%</span>
                  <div class="mini-progress" :style="{ '--pct': task.progress + '%', '--col': barColor(task) }" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Splitter ───────────────────────────────────────────────────── -->
        <div
          class="gantt-splitter flex-shrink-0"
          @mousedown.prevent="startDrag"
          title="Drag to resize"
        />

        <!-- ── Right Panel (Timeline) ─────────────────────────────────────── -->
        <div class="gantt-right flex-grow flex flex-col" style="overflow: hidden; min-width: 0;">
          <!-- Timeline header -->
          <div class="gantt-timeline-header flex-shrink-0" style="overflow: hidden;">
            <div ref="timelineHeaderRef" style="overflow: hidden;">
              <svg
                :width="svgTotalWidth"
                :height="HEADER_H"
                style="display: block;"
              >
                <!-- Month row -->
                <g v-for="m in monthBuckets" :key="m.label">
                  <rect :x="m.x" y="0" :width="m.width" :height="HEADER_H / 2" class="header-month" />
                  <text :x="m.x + 6" :y="HEADER_H / 2 - 8" class="header-text-month">{{ m.label }}</text>
                  <line :x1="m.x" y1="0" :x2="m.x" :y2="HEADER_H" class="header-divider" />
                </g>

                <!-- Week/day row -->
                <g v-for="b in subBuckets" :key="b.label + b.x">
                  <rect :x="b.x" :y="HEADER_H / 2" :width="b.width" :height="HEADER_H / 2" class="header-sub" />
                  <text :x="b.x + b.width / 2" :y="HEADER_H - 5" class="header-text-sub" text-anchor="middle">{{ b.label }}</text>
                  <line :x1="b.x" :y1="HEADER_H / 2" :x2="b.x" :y2="HEADER_H" class="header-divider" />
                </g>

                <!-- Today marker header -->
                <line v-if="todayX >= 0" :x1="todayX" y1="0" :x2="todayX" :y2="HEADER_H" class="today-line-header" />
              </svg>
            </div>
          </div>

          <!-- Timeline body -->
          <div
            ref="timelineBodyRef"
            class="gantt-timeline-body flex-grow-1"
            style="overflow: auto;"
            @scroll.passive="onTimelineScroll"
          >
            <svg
              :width="svgTotalWidth"
              :height="rows.length * ROW_H"
              style="display: block;"
            >
              <!-- Weekend / alternating row bands -->
              <rect
                v-for="(row, i) in rows"
                :key="'band-' + row.id"
                x="0"
                :y="i * ROW_H"
                :width="svgTotalWidth"
                :height="ROW_H"
                :class="row.level === 0 ? 'row-band-top' : (i % 2 === 0 ? 'row-band-even' : 'row-band-odd')"
              />

              <!-- Vertical grid lines (sub-buckets) -->
              <line
                v-for="b in subBuckets"
                :key="'vl-' + b.x"
                :x1="b.x" y1="0"
                :x2="b.x" :y2="rows.length * ROW_H"
                class="grid-line"
              />

              <!-- Today line -->
              <line
                v-if="todayX >= 0"
                :x1="todayX" y1="0"
                :x2="todayX" :y2="rows.length * ROW_H"
                class="today-line"
              />

              <!-- Bars -->
              <g v-for="(task, i) in rows" :key="'bar-' + task.id">

                <!-- ── Summary bar (parent/group task) ── -->
                <template v-if="hasChildren(task.id) && barVisible(task)">
                  <!-- Thin spine -->
                  <rect
                    :x="barX(task)"
                    :y="i * ROW_H + ROW_H * 0.38"
                    :width="Math.max(barW(task), 4)"
                    :height="ROW_H * 0.18"
                    :fill="barColor(task)"
                    opacity="0.9"
                    class="gantt-bar"
                    @click.stop="!editLocked && openEdit(task)"
                  >
                    <title>{{ task.name }} (group)</title>
                  </rect>
                  <!-- Left end-cap (downward notch) -->
                  <polygon
                    :points="`${barX(task)},${i * ROW_H + ROW_H * 0.38} ${barX(task) + 7},${i * ROW_H + ROW_H * 0.38} ${barX(task)},${i * ROW_H + ROW_H * 0.38 + 8}`"
                    :fill="barColor(task)"
                    opacity="0.9"
                    style="pointer-events:none;"
                  />
                  <!-- Right end-cap (downward notch) -->
                  <polygon
                    :points="`${barX(task) + barW(task)},${i * ROW_H + ROW_H * 0.38} ${barX(task) + barW(task) - 7},${i * ROW_H + ROW_H * 0.38} ${barX(task) + barW(task)},${i * ROW_H + ROW_H * 0.38 + 8}`"
                    :fill="barColor(task)"
                    opacity="0.9"
                    style="pointer-events:none;"
                  />
                </template>

                <!-- ── Regular bar (leaf task) ── -->
                <template v-else-if="!hasChildren(task.id)">
                  <rect
                    v-if="barVisible(task)"
                    :x="barX(task)"
                    :y="i * ROW_H + ROW_H * 0.2"
                    :width="Math.max(barW(task), 4)"
                    :height="ROW_H * 0.6"
                    :rx="3"
                    :fill="barColor(task)"
                    class="gantt-bar"
                    @click.stop="!editLocked && openEdit(task)"
                  >
                    <title>{{ task.name }} ({{ task.progress }}%)</title>
                  </rect>
                  <!-- Progress fill -->
                  <rect
                    v-if="barVisible(task) && task.progress > 0"
                    :x="barX(task)"
                    :y="i * ROW_H + ROW_H * 0.2"
                    :width="Math.max(barW(task) * task.progress / 100, 2)"
                    :height="ROW_H * 0.6"
                    :rx="3"
                    :fill="barColor(task)"
                    opacity="0.5"
                    class="gantt-bar-progress"
                  />
                  <!-- Bar label -->
                  <text
                    v-if="barVisible(task) && barW(task) > 40"
                    :x="barX(task) + 6"
                    :y="i * ROW_H + ROW_H * 0.62"
                    class="bar-label"
                  >{{ task.progress }}%</text>
                </template>

              </g>
            </svg>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ Task Dialog ════════════════════════════════════════════════════ -->
    <div v-if="dialogOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-[560px] max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <svg v-if="editTarget" class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <svg v-else-if="parentId" class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <svg v-else class="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <h2 class="text-lg font-semibold text-gray-900 flex-1">
            {{ editTarget ? 'Edit Task' : (parentId ? 'Add Child Task' : 'Add Task') }}
          </h2>
          <button class="p-1 hover:bg-gray-100 rounded transition" @click="closeDialog">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="overflow-y-auto flex-1 px-5 py-4">
          <form @submit.prevent="saveTask" class="space-y-4">
            <!-- Task Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
              <input
                v-model="form.name"
                type="text"
                required
                autofocus
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              />
            </div>

            <div class="grid grid-cols-12 gap-4">
              <!-- WBS Code -->
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">WBS Code</label>
                <input
                  v-model="form.wbs_code"
                  type="text"
                  placeholder="e.g. 1.2.3"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                />
              </div>

              <!-- Discipline -->
              <div class="col-span-12 sm:col-span-8">
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

              <!-- Start Date -->
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  v-model="form.start_date"
                  type="date"
                  :required="!form.parent_id"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                />
                <p v-if="form.parent_id" class="mt-1 text-xs text-gray-500">
                  Optional — auto-derived from subtasks
                </p>
              </div>

              <!-- End Date -->
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  v-model="form.end_date"
                  type="date"
                  :required="!form.parent_id"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                />
                <p v-if="form.parent_id" class="mt-1 text-xs text-gray-500">
                  Optional — auto-derived from subtasks
                </p>
              </div>

              <!-- Status -->
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  v-model="form.status"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                >
                  <option v-for="s in statusItems" :key="s.value" :value="s.value">
                    {{ s.title }}
                  </option>
                </select>
              </div>

              <!-- Progress -->
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">Progress {{ form.progress }}%</label>
                <input
                  v-model.number="form.progress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <!-- Parent Task -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Parent Task</label>
              <select
                v-model="form.parent_id"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              >
                <option :value="null">—</option>
                <option v-for="opt in parentOptions" :key="opt.value" :value="opt.value">
                  {{ opt.title }}
                </option>
              </select>
            </div>

            <!-- Linked Areas (1:M) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Linked Areas</label>
              <div class="border border-gray-300 rounded-lg max-h-40 overflow-y-auto bg-white divide-y divide-gray-100">
                <label
                  v-if="areaItems.length === 0"
                  class="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 italic"
                >No areas yet — go to Areas to set up</label>
                <label
                  v-for="a in areaItems"
                  :key="a.value"
                  class="flex items-center gap-3 px-3 py-2 hover:bg-moss/5 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    :value="a.value"
                    v-model="form.area_ids"
                    class="w-4 h-4 rounded accent-moss"
                  />
                  <span class="text-sm text-gray-800">{{ a.title }}</span>
                </label>
              </div>
              <p v-if="form.area_ids.length > 0" class="mt-1 text-xs text-moss font-medium">
                {{ form.area_ids.length }} area{{ form.area_ids.length > 1 ? 's' : '' }} selected
              </p>
            </div>

            <!-- Location -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  v-model="form.location"
                  type="text"
                  placeholder="e.g. Level 3, Grid C-4"
                  class="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
                />
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                v-model="form.notes"
                rows="2"
                class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-gray-900"
              ></textarea>
            </div>
          </form>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            @click="closeDialog"
          >
            Cancel
          </button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-lg transition inline-flex items-center gap-2"
            :disabled="taskStore.loading"
            @click="saveTask"
          >
            <svg v-if="taskStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ editTarget ? 'Save Changes' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="deleteDialogOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="deleteDialogOpen = false">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-[360px]">
        <div class="px-5 py-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Delete Task?</h2>
          <p class="text-gray-600">
            "<strong>{{ deleteTarget?.name }}</strong>" and all its subtasks will be removed.
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
            :disabled="taskStore.loading"
            @click="doDelete"
          >
            <svg v-if="taskStore.loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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

    <!-- ═══ ITR Form Dialog (from Gantt) ═══════════════════════════════ -->
    <ITRFormDialog
      v-model="itrFormOpen"
      :pre-fill="itrPreFill"
      @saved="onITRSaved"
    />

    <!-- ═══ Task To-Do Modal ════════════════════════════════════════════ -->
    <TaskTodoModal
      v-model="todoModalOpen"
      :task-id="todoTaskId"
      :task-name="todoTaskName"
      :project-id="todoProjectId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import dayjs from 'dayjs'
import { useProjectStore }    from '@/stores/projectStore'
import { useTaskStore, STATUS_META, type TaskNode, type TaskStatus } from '@/stores/taskStore'
import { useAreaStore }       from '@/stores/areaStore'
import { useDisciplineStore } from '@/stores/disciplineStore'
import ProjectSelectorDialog  from '@/components/ProjectSelectorDialog.vue'
import ITRFormDialog           from '@/components/ITRFormDialog.vue'
import { useItrStore }         from '@/stores/itrStore'
import { useItrStatusStore }   from '@/stores/itrStatusStore'
import { useAuthorityStore }   from '@/stores/authorityStore'
import { useTaskTodoStore }    from '@/stores/taskTodoStore'
import TaskTodoModal           from '@/components/task/TaskTodoModal.vue'

// ── Stores ────────────────────────────────────────────────────────────────────

const projectStore    = useProjectStore()
const taskStore       = useTaskStore()
const areaStore       = useAreaStore()
const disciplineStore = useDisciplineStore()
const itrStore        = useItrStore()
const itrStatusStore  = useItrStatusStore()

// ── Layout constants ──────────────────────────────────────────────────────────

const ROW_H    = 36   // row height px
const HEADER_H = 52   // timeline header height px

// ── Column widths (resizable) ────────────────────────────────────────────────

const COLS = [
  { key: 'wbs',      label: '#'         },
  { key: 'name',     label: 'Task Name' },
  { key: 'area',     label: 'Area'      },
  { key: 'location', label: 'Location'  },
  { key: 'disc',     label: 'Disc.'     },
  { key: 'start',    label: 'Start'     },
  { key: 'end',      label: 'Finish'    },
  { key: 'pct',      label: '%'         },
] as const

type ColKey = typeof COLS[number]['key']

const colWidths = reactive<Record<ColKey, number>>({
  wbs:      56,
  name:     220,
  area:     80,
  location: 100,
  disc:     52,
  start:    74,
  end:      74,
  pct:      52,
})

const totalLeftWidth = computed(() =>
  (Object.values(colWidths) as number[]).reduce((a, b) => a + b, 0)
)

const startColResize = (col: ColKey, e: MouseEvent) => {
  const startX = e.clientX
  const startW = colWidths[col]
  const onMove = (ev: MouseEvent) => { colWidths[col] = Math.max(40, startW + ev.clientX - startX) }
  const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup',  onUp)
}

// ── Splitter drag ─────────────────────────────────────────────────────────────

const splitterX = ref(460)  // left panel viewport width

const startDrag = (e: MouseEvent) => {
  const startX   = e.clientX
  const startW   = splitterX.value
  const onMove   = (ev: MouseEvent) => { splitterX.value = Math.max(160, Math.min(startW + ev.clientX - startX, 900)) }
  const onUp     = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup',  onUp)
}

// ── Precision & day-width ─────────────────────────────────────────────────────

const precision = ref<'day' | 'week' | 'month'>('week')
const dayWidth = computed(() => precision.value === 'day' ? 28 : precision.value === 'week' ? 8 : 3)

// ── Date range ────────────────────────────────────────────────────────────────

const viewStart = computed<dayjs.Dayjs>(() => {
  const tasks = taskStore.flatAll
  if (!tasks.length) return dayjs().subtract(1, 'month').startOf('month')
  const dates = tasks.map(t => t.start_date).filter(Boolean) as string[]
  if (!dates.length) return dayjs().subtract(1, 'month').startOf('month')
  const earliest = dates.reduce((min, d) => d < min ? d : min, dates[0]!)
  return dayjs(earliest).subtract(1, 'month').startOf('month')
})

const viewEnd = computed<dayjs.Dayjs>(() => {
  const tasks = taskStore.flatAll
  if (!tasks.length) return dayjs().add(5, 'month').endOf('month')
  const dates = tasks.map(t => t.end_date).filter(Boolean) as string[]
  if (!dates.length) return dayjs().add(5, 'month').endOf('month')
  const latest = dates.reduce((max, d) => d > max ? d : max, dates[0]!)
  return dayjs(latest).add(1, 'month').endOf('month')
})

const totalDays = computed(() => viewEnd.value.diff(viewStart.value, 'day'))
const svgTotalWidth = computed(() => Math.max(totalDays.value * dayWidth.value, 800))

// ── Effective date rollup (parent dates derived from children) ───────────────

/** Recursively get effective { start, end } for a task.
 *  If the task has children, derives from earliest/latest child. */
const effectiveDates = (task: TaskNode): { start: string; end: string } | null => {
  if (hasChildren(task.id)) {
    const children = taskStore.tasks.filter(t => t.parent_id === task.id)
    const starts: string[] = []
    const ends:   string[] = []
    for (const child of children) {
      const childNode = taskStore.flatAll.find(n => n.id === child.id)
      if (!childNode) continue
      const ed = effectiveDates(childNode)
      if (ed) { starts.push(ed.start); ends.push(ed.end) }
    }
    if (starts.length && ends.length) {
      return {
        start: starts.reduce((a, b) => a < b ? a : b),
        end:   ends.reduce((a, b)   => a > b ? a : b),
      }
    }
    return null
  }
  if (task.start_date && task.end_date) return { start: task.start_date, end: task.end_date }
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const daysFromStart = (dateStr: string) => dayjs(dateStr).diff(viewStart.value, 'day')

const barX = (task: TaskNode) => {
  const ed = effectiveDates(task)
  if (!ed) return -9999
  return Math.max(0, daysFromStart(ed.start) * dayWidth.value)
}
const barW = (task: TaskNode) => {
  const ed = effectiveDates(task)
  if (!ed) return 0
  return Math.max(1, dayjs(ed.end).diff(dayjs(ed.start), 'day') * dayWidth.value)
}
const barVisible = (task: TaskNode) => {
  const x = barX(task)
  return x + barW(task) > 0 && x < svgTotalWidth.value && barW(task) > 0
}

const barColor = (task: TaskNode) => {
  const discId = (task as any).discipline_id as string | null
  return discId ? (disciplineStore.getById(discId)?.color ?? '#39ace7') : '#39ace7'
}

const todayX = computed(() => daysFromStart(dayjs().format('YYYY-MM-DD')) * dayWidth.value)

const fmtDate = (d: string | null) => d ? dayjs(d).format('DD MMM') : '—'

const hasChildren = (id: string) => taskStore.tasks.some(t => t.parent_id === id)

/** Effective display date for a task (derived from children for group tasks) */
const effectiveStart = (task: TaskNode) => effectiveDates(task)?.start ?? null
const effectiveEnd   = (task: TaskNode) => effectiveDates(task)?.end   ?? null

const areaLabel = (task: TaskNode) => {
  const list = task.area_ids?.length ? task.area_ids : (task.area_id ? [task.area_id] : [])
  if (list.length === 0) return '—'
  return list
    .map(aid => {
      const a = areaStore.flatAll.find(x => x.id === aid)
      return a ? (a.code ?? a.name) : '?'
    })
    .join(', ')
}

const discOf = (task: TaskNode) => {
  const id = (task as any).discipline_id as string | null
  return id ? disciplineStore.getById(id) : null
}

// ── Rows (visible tasks with expand/collapse) ─────────────────────────────────

const rows = computed(() => taskStore.flatVisible)

// ── Timeline buckets ──────────────────────────────────────────────────────────

interface Bucket { label: string; x: number; width: number }

const monthBuckets = computed<Bucket[]>(() => {
  const buckets: Bucket[] = []
  let cur = viewStart.value.startOf('month')
  while (cur.isBefore(viewEnd.value)) {
    const x = daysFromStart(cur.format('YYYY-MM-DD')) * dayWidth.value
    const w = cur.daysInMonth() * dayWidth.value
    buckets.push({ label: cur.format('MMM YYYY'), x: Math.max(0, x), width: w })
    cur = cur.add(1, 'month')
  }
  return buckets
})

const subBuckets = computed<Bucket[]>(() => {
  const buckets: Bucket[] = []
  if (precision.value === 'month') {
    // show weeks
    let cur = viewStart.value.startOf('week')
    while (cur.isBefore(viewEnd.value)) {
      const x = daysFromStart(cur.format('YYYY-MM-DD')) * dayWidth.value
      const w = 7 * dayWidth.value
      buckets.push({ label: `W${cur.week()}`, x, width: w })
      cur = cur.add(1, 'week')
    }
  } else if (precision.value === 'week') {
    // show weeks with start date
    let cur = viewStart.value.startOf('week')
    while (cur.isBefore(viewEnd.value)) {
      const x = daysFromStart(cur.format('YYYY-MM-DD')) * dayWidth.value
      const w = 7 * dayWidth.value
      buckets.push({ label: cur.format('D MMM'), x, width: w })
      cur = cur.add(1, 'week')
    }
  } else {
    // day precision — show day numbers
    let cur = viewStart.value
    while (cur.isBefore(viewEnd.value)) {
      const x = daysFromStart(cur.format('YYYY-MM-DD')) * dayWidth.value
      buckets.push({ label: cur.format('D'), x, width: dayWidth.value })
      cur = cur.add(1, 'day')
    }
  }
  return buckets
})

// ── Scroll sync ───────────────────────────────────────────────────────────────

const leftHeaderRef    = ref<HTMLElement | null>(null)
const leftBodyRef      = ref<HTMLElement | null>(null)
const timelineBodyRef  = ref<HTMLElement | null>(null)
const timelineHeaderRef = ref<HTMLElement | null>(null)
let isSyncing = false

// Left body is the scroll master for the left side:
// - vertical scroll  → synced to timeline body
// - horizontal scroll → synced to left header (so header tracks column pan)
const onLeftScroll = (e: Event) => {
  if (isSyncing) return
  isSyncing = true
  const el = e.target as HTMLElement
  if (timelineBodyRef.value)  timelineBodyRef.value.scrollTop  = el.scrollTop
  if (leftHeaderRef.value)    leftHeaderRef.value.scrollLeft   = el.scrollLeft
  isSyncing = false
}

// Timeline body is the scroll master for the right side:
// - vertical scroll   → synced back to left body
// - horizontal scroll → synced to timeline header
const onTimelineScroll = (e: Event) => {
  if (isSyncing) return
  isSyncing = true
  const el = e.target as HTMLElement
  if (leftBodyRef.value)       leftBodyRef.value.scrollTop      = el.scrollTop
  if (timelineHeaderRef.value) timelineHeaderRef.value.scrollLeft = el.scrollLeft
  isSyncing = false
}

const scrollToToday = () => {
  nextTick(() => {
    if (!timelineBodyRef.value) return
    const x = todayX.value - 200
    timelineBodyRef.value.scrollLeft = Math.max(0, x)
    if (timelineHeaderRef.value) timelineHeaderRef.value.scrollLeft = Math.max(0, x)
  })
}

// ── Dialog & form ─────────────────────────────────────────────────────────────

const dialogOpen       = ref(false)
const editTarget       = ref<TaskNode | null>(null)
const parentId         = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deleteTarget     = ref<TaskNode | null>(null)
const selectorOpen     = ref(false)
const editLocked       = ref(true)   // true = view-only; false = edit mode

const authorityStore   = useAuthorityStore()
const canEditGantt     = computed(() => authorityStore.currentProjectPermissions.includes('edit_gantt'))
// Force locked state when user loses edit permission
watch(canEditGantt, (v) => { if (!v) editLocked.value = true })
const formRef          = ref<HTMLFormElement | null>(null)

const snackbar = reactive({ show: false, text: '', color: 'success' as string })
const showSnack = (text: string, color = 'success') => Object.assign(snackbar, { show: true, text, color })

const form = reactive({
  name:          '',
  wbs_code:      '',
  discipline_id: null as string | null,
  status:        'not_started' as TaskStatus,
  progress:      0,
  start_date:    '',
  end_date:      '',
  parent_id:     null as string | null,
  area_ids:      [] as string[],
  location:      '',
  notes:         '',
})

const resetForm = () => Object.assign(form, {
  name: '', wbs_code: '', discipline_id: null, status: 'not_started',
  progress: 0, start_date: '', end_date: '', parent_id: null, area_ids: [], location: '', notes: '',
})

// ── Drag-and-drop row reorder ─────────────────────────────────────────────────

const draggedId    = ref<string | null>(null)
const dragOverId   = ref<string | null>(null)
const dragPosition = ref<'before' | 'after'>('before')

const onDragStart = (task: TaskNode, e: DragEvent) => {
  draggedId.value = task.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
  }
}

const onDragOver = (task: TaskNode, e: DragEvent) => {
  if (!draggedId.value || draggedId.value === task.id) return
  dragOverId.value = task.id
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dragPosition.value = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

const onDragLeave = () => {
  dragOverId.value = null
}

const onDrop = async (target: TaskNode) => {
  const fromId = draggedId.value
  if (!fromId || fromId === target.id) { onDragEnd(); return }
  onDragEnd()
  const ok = await taskStore.reorderTask(fromId, target.id, dragPosition.value)
  if (!ok) showSnack(taskStore.error ?? 'Reorder failed', 'error')
}

const onDragEnd = () => {
  draggedId.value  = null
  dragOverId.value = null
}

const statusItems = Object.entries(STATUS_META).map(([v, m]) => ({ title: m.label, value: v }))

const parentOptions = computed(() =>
  taskStore.flatAll
    .filter(t => !editTarget.value || t.id !== editTarget.value.id)
    .map(t => ({ title: `${t.wbs_code ? t.wbs_code + ' — ' : ''}${t.name}`, value: t.id }))
)

const areaItems = computed(() =>
  areaStore.flatAll.map(a => ({
    title: `${'— '.repeat(a.level)}${a.name}${a.code ? ` (${a.code})` : ''}`,
    value: a.id,
  }))
)

const openCreate = (pid: string | null) => {
  editTarget.value = null
  parentId.value = pid
  resetForm()
  form.parent_id = pid
  // Inherit discipline, areas, and location from parent task
  if (pid) {
    const parent = taskStore.flatAll.find(t => t.id === pid)
    if (parent) {
      form.discipline_id = (parent as any).discipline_id ?? null
      form.area_ids      = parent.area_ids?.length ? [...parent.area_ids] : (parent.area_id ? [parent.area_id] : [])
      form.location      = parent.location ?? ''
    }
  }
  // Default dates for all new tasks (required by DB NOT NULL constraint)
  const today = new Date()
  form.start_date = today.toISOString().slice(0, 10)
  today.setDate(today.getDate() + 14)
  form.end_date = today.toISOString().slice(0, 10)
  dialogOpen.value = true
}

const openEdit = (task: TaskNode) => {
  editTarget.value = task
  parentId.value = task.parent_id
  Object.assign(form, {
    name:          task.name,
    wbs_code:      task.wbs_code ?? '',
    discipline_id: (task as any).discipline_id ?? null,
    status:        task.status,
    progress:      task.progress,
    start_date:    task.start_date,
    end_date:      task.end_date,
    parent_id:     task.parent_id,
    location:      task.location ?? '',
    notes:         task.notes ?? '',
  })
  // area_ids from junction
  form.area_ids = task.area_ids?.length ? task.area_ids : (task.area_id ? [task.area_id] : [])
  dialogOpen.value = true
}

const closeDialog = () => { dialogOpen.value = false; nextTick(resetForm) }

const saveTask = async () => {
  if (!form.name.trim()) return
  const project = projectStore.activeProject
  if (!project) return

  const payload = {
    name:          form.name.trim(),
    wbs_code:      form.wbs_code.trim() || null,
    discipline_id: form.discipline_id || null,
    status:        form.status,
    progress:      form.progress,
    start_date:    form.start_date || null,
    end_date:      form.end_date || null,
    parent_id:     form.parent_id || null,
    area_ids:      form.area_ids,
    area_id:       form.area_ids[0] ?? null,
    location:      form.location.trim() || null,
    notes:         form.notes.trim() || null,
  }

  if (editTarget.value) {
    const ok = await taskStore.updateTask(editTarget.value.id, payload)
    if (ok) { showSnack('Task updated'); closeDialog() }
    else showSnack(taskStore.error ?? 'Update failed', 'error')
  } else {
    const ok = await taskStore.createTask({ ...payload, project_id: project.id })
    if (ok) { showSnack(`"${ok.name}" created`); closeDialog() }
    else showSnack(taskStore.error ?? 'Create failed', 'error')
  }
}

// ── ITR from Gantt ────────────────────────────────────────────────────────────

const itrFormOpen = ref(false)
const itrPreFill  = ref<Record<string, any> | null>(null)

const openCreateITR = (task: TaskNode) => {
  itrPreFill.value = {
    title: task.name,
    task_id: task.id,
    discipline_id: (task as any).discipline_id ?? null,
    area_id: task.area_ids?.[0] ?? task.area_id ?? null,
    location: task.location ?? '',
  }
  itrFormOpen.value = true
}

const onITRSaved = () => {
  showSnack('ITR draft created')
  itrPreFill.value = null
}

// ── Task To-Do modal ──────────────────────────────────────────────────────────

const todoStore      = useTaskTodoStore()
const todoModalOpen  = ref(false)
const todoTaskId     = ref<string | null>(null)
const todoTaskName   = ref('')
const todoProjectId  = ref<string | null>(null)

const openTodos = (task: TaskNode) => {
  todoTaskId.value    = task.id
  todoTaskName.value  = task.name
  todoProjectId.value = task.project_id
  todoModalOpen.value = true
}

const confirmDelete = (task: TaskNode) => { deleteTarget.value = task; deleteDialogOpen.value = true }
const doDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await taskStore.deleteTask(deleteTarget.value.id)
  if (ok) showSnack('Task deleted')
  else showSnack(taskStore.error ?? 'Delete failed', 'error')
  deleteDialogOpen.value = false; deleteTarget.value = null
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const loadForProject = async (projectId: string) => {
  taskStore.clearTasks()
  disciplineStore.clearDisciplines()
  await Promise.all([
    taskStore.fetchTasks(projectId),
    areaStore.areas.length === 0 ? areaStore.fetchAreas(projectId) : Promise.resolve(),
    disciplineStore.fetchDisciplines(projectId),
    itrStatusStore.fetchStatuses(projectId),
  ])
  nextTick(() => scrollToToday())
}

onMounted(async () => {
  if (projectStore.projects.length === 0) await projectStore.fetchProjects()
  if (projectStore.activeProject) await loadForProject(projectStore.activeProject.id)
})

watch(() => projectStore.activeProjectId, async (id) => {
  if (id) await loadForProject(id)
  else { taskStore.clearTasks(); disciplineStore.clearDisciplines() }
})

onUnmounted(() => { taskStore.clearTasks(); disciplineStore.clearDisciplines() })
</script>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.gantt-root { background: #f9fafb; color: #111827; }

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.gantt-toolbar {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  height: 52px;
}

/* ── Left panel ──────────────────────────────────────────────────────────── */
.gantt-left {
  background: white;
  border-right: 1px solid #e5e7eb;
}

.gantt-col-header {
  height: 52px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

/* ── Column widths ─────────────────────────────────────────────────────── */
.gcol          { flex-shrink: 0; padding: 0 6px; display: flex; align-items: center; overflow: hidden; }

/* ── Drag grip ────────────────────────────────────────────────────────── */
.drag-grip {
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  flex-shrink: 0;
  color: #9ca3af;
}
.drag-grip:active { cursor: grabbing; }
.gantt-row:hover .drag-grip { opacity: 1; }

/* ── Drag states ──────────────────────────────────────────────────────── */
.row-dragging    { opacity: 0.4; }
.drag-over-above { box-shadow: inset 0 2px 0 0 #81938A; }
.drag-over-below { box-shadow: inset 0 -2px 0 0 #81938A; }
.gcol-wbs      { width: 56px; }
.gcol-name     { flex: 1; min-width: 120px; }
.gcol-area     { width: 90px; }
.gcol-disc     { width: 52px; }
.gcol-start    { width: 74px; }
.gcol-end      { width: 74px; }
.gcol-pct      { width: 52px; }

/* ── Rows ─────────────────────────────────────────────────────────────── */
.gantt-row {
  height: 36px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.1s;
  color: #111827;
}
.gantt-row:hover { background: #f9fafb; }
.gantt-row:hover .row-hover-actions { opacity: 1; }

/* ── Top-level task rows (level 0) ───────────────────────────────────── */
.row-top-level {
  background: #e5e7eb;
}
.row-top-level:hover { background: #d1d5db !important; }
.row-hover-actions { opacity: 0; transition: opacity 0.12s; }

/* On touch devices (no hover), always show action buttons */
@media (pointer: coarse) {
  .row-hover-actions { opacity: 1; }
}

/* ── Discipline chip ──────────────────────────────────────────────────── */
.disc-chip {
  font-size: 0.62rem;
  font-weight: 700;
  font-family: monospace;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid;
  white-space: nowrap;
}

/* ── Column resize handle ─────────────────────────────────────────────── */
.col-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
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

/* ── Progress mini bar ────────────────────────────────────────────────── */
.mini-progress {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #e5e7eb;
  position: relative;
  overflow: hidden;
}
.mini-progress::after {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: var(--pct);
  background: var(--col);
  border-radius: 2px;
}

/* ── Splitter ─────────────────────────────────────────────────────────── */
.gantt-splitter {
  width: 5px;
  cursor: col-resize;
  background: #e5e7eb;
  transition: background 0.15s;
  flex-shrink: 0;
}
.gantt-splitter:hover { background: rgba(129,147,138,0.4); }

/* ── Timeline header ──────────────────────────────────────────────────── */
.gantt-timeline-header {
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  height: 52px;
}

/* ── SVG styles ─────────────────────────────────────────────────────────── */
.header-month { fill: #f9fafb; }
.header-sub   { fill: white; }
.header-text-month {
  fill: #374151;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
}
.header-text-sub {
  fill: #6b7280;
  font-size: 9px;
  font-family: 'Inter', sans-serif;
}
.header-divider { stroke: #e5e7eb; stroke-width: 1; }

.row-band-even { fill: white; }
.row-band-odd  { fill: #f9fafb; }
.row-band-top  { fill: #e5e7eb; }
.grid-line     { stroke: #f3f4f6; stroke-width: 1; }

.today-line        { stroke: #81938A; stroke-width: 1.5; stroke-dasharray: 3 3; opacity: 0.8; }
.today-line-header { stroke: #81938A; stroke-width: 2; opacity: 0.9; }

.gantt-bar         { cursor: pointer; opacity: 0.85; transition: opacity 0.15s; }
.gantt-bar:hover   { opacity: 1; }
.gantt-bar-progress { opacity: 0.3; pointer-events: none; }
.bar-label {
  fill: #fff;
  font-size: 9px;
  font-family: 'Inter', sans-serif;
  pointer-events: none;
}
</style>
