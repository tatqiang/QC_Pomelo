import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold'
export type Discipline = 'civil' | 'mechanical' | 'electrical' | 'plumbing' | 'hvac' | 'fire' | 'instrumentation' | 'general'

export interface Task {
    id: string
    project_id: string
    parent_id: string | null
    wbs_code: string | null
    name: string
    discipline: Discipline
    status: TaskStatus
    progress: number          // 0–100
    start_date: string | null    // ISO date "YYYY-MM-DD" — null for group/parent tasks (derived from children)
    end_date: string | null
    sort_order: number
    notes: string | null
    location: string | null
    area_id: string | null        // legacy – kept for ITR backward-compat (mirrors first area_ids entry)
    area_ids: string[]            // 1:M – populated from task_areas junction table
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface TaskNode extends Task {
    level: number
    children: TaskNode[]
    expanded: boolean
}

export type TaskInsert = Pick<Task, 'project_id' | 'name'> &
    Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project_id' | 'name'>>

export type TaskUpdate = Partial<Omit<Task, 'id' | 'project_id' | 'created_at' | 'updated_at'>>

// ─── Discipline meta ──────────────────────────────────────────────────────────

export const DISCIPLINE_META: Record<Discipline, { label: string; color: string; icon: string }> = {
    civil: { label: 'Civil', color: '#78716C', icon: 'mdi-terrain' },
    mechanical: { label: 'Mechanical', color: '#F97316', icon: 'mdi-cog-outline' },
    electrical: { label: 'Electrical', color: '#EAB308', icon: 'mdi-lightning-bolt' },
    plumbing: { label: 'Plumbing', color: '#3B82F6', icon: 'mdi-pipe' },
    hvac: { label: 'HVAC', color: '#06B6D4', icon: 'mdi-air-conditioner' },
    fire: { label: 'Fire', color: '#EF4444', icon: 'mdi-fire' },
    instrumentation: { label: 'Instrumentation', color: '#A855F7', icon: 'mdi-gauge' },
    general: { label: 'General', color: '#64748B', icon: 'mdi-briefcase-outline' },
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: 'surface-variant' },
    in_progress: { label: 'In Progress', color: 'info' },
    completed: { label: 'Completed', color: 'success' },
    on_hold: { label: 'On Hold', color: 'warning' },
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTaskStore = defineStore('task', () => {
    const tasks = ref<Task[]>([])
    const expanded = ref<Set<string>>(new Set())   // track which parent IDs are expanded
    const loading = ref(false)
    const error = ref<string | null>(null)

    // ── Tree helpers ─────────────────────────────────────────────────────────

    /** Build nested tree from flat task array */
    const tree = computed<TaskNode[]>(() => buildTree(tasks.value, null, 0))

    function buildTree(all: Task[], parentId: string | null, level: number): TaskNode[] {
        return all
            .filter(t => t.parent_id === parentId)
            .sort((a, b) => a.sort_order - b.sort_order || (a.wbs_code ?? '').localeCompare(b.wbs_code ?? ''))
            .map(t => ({
                ...t,
                level,
                expanded: expanded.value.has(t.id),
                children: buildTree(all, t.id, level + 1),
            }))
    }

    /** Flatten tree respecting expand/collapse state — for rendering the WBS list */
    const flatVisible = computed<TaskNode[]>(() => flattenVisible(tree.value))

    function flattenVisible(nodes: TaskNode[]): TaskNode[] {
        const result: TaskNode[] = []
        for (const node of nodes) {
            result.push(node)
            if (node.children.length > 0 && node.expanded) {
                result.push(...flattenVisible(node.children))
            }
        }
        return result
    }

    /** ALL tasks flat (no filtering) for Gantt rows — each row is one task bar */
    const flatAll = computed<TaskNode[]>(() => flattenAll(tree.value))

    function flattenAll(nodes: TaskNode[]): TaskNode[] {
        const result: TaskNode[] = []
        for (const node of nodes) {
            result.push(node)
            if (node.children.length > 0) result.push(...flattenAll(node.children))
        }
        return result
    }

    // ── Expand / collapse ────────────────────────────────────────────────────

    const toggleExpand = (id: string) => {
        if (expanded.value.has(id)) expanded.value.delete(id)
        else expanded.value.add(id)
    }

    const expandAll = () => {
        tasks.value.filter(t => tasks.value.some(c => c.parent_id === t.id))
            .forEach(t => expanded.value.add(t.id))
    }

    const collapseAll = () => expanded.value.clear()

    // ── CRUD ─────────────────────────────────────────────────────────────────

    const fetchTasks = async (projectId: string): Promise<void> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: dbErr } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .order('sort_order', { ascending: true })

            if (dbErr) throw dbErr
            const rawTasks = (data as Task[]) ?? []

            // Fetch task_areas for all tasks in this project
            const taskIds = rawTasks.map(t => t.id)
            const areaMap: Record<string, string[]> = {}
            if (taskIds.length > 0) {
                const { data: ta, error: taErr } = await supabase
                    .from('task_areas')
                    .select('task_id, area_id, sort_order')
                    .in('task_id', taskIds)
                    .order('sort_order', { ascending: true })
                if (taErr) throw taErr
                for (const row of (ta ?? [])) {
                    if (!areaMap[row.task_id]) areaMap[row.task_id] = []
                    areaMap[row.task_id].push(row.area_id)
                }
            }

            tasks.value = rawTasks.map(t => ({
                ...t,
                area_ids: areaMap[t.id] ?? (t.area_id ? [t.area_id] : []),
            }))
            expandAll()   // default: all groups open
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load tasks'
            console.error('❌ fetchTasks:', err)
        } finally {
            loading.value = false
        }
    }

    /** Replace all linked areas for a task (upsert junction rows, delete removed ones) */
    const syncTaskAreas = async (taskId: string, areaIds: string[]): Promise<void> => {
        // Delete all existing links then re-insert
        await supabase.from('task_areas').delete().eq('task_id', taskId)
        if (areaIds.length > 0) {
            await supabase.from('task_areas').insert(
                areaIds.map((aid, i) => ({ task_id: taskId, area_id: aid, sort_order: i }))
            )
        }
        // Patch local state
        const idx = tasks.value.findIndex(t => t.id === taskId)
        if (idx !== -1) {
            tasks.value[idx] = {
                ...tasks.value[idx],
                area_ids: areaIds,
                area_id: areaIds[0] ?? null,
            }
        }
    }

    const createTask = async (payload: TaskInsert): Promise<Task | null> => {
        loading.value = true
        error.value = null
        try {
            // Auto sort_order: append after siblings
            const siblings = tasks.value.filter(t => t.parent_id === (payload.parent_id ?? null))
            const maxOrder = siblings.reduce((m, t) => Math.max(m, t.sort_order), -1)
            const { area_ids, ...taskPayload } = payload as any
            const insertPayload = {
                ...taskPayload,
                sort_order: maxOrder + 1,
                area_id: (area_ids as string[] | undefined)?.[0] ?? payload.area_id ?? null,
            }
            const { data, error: dbErr } = await supabase
                .from('tasks')
                .insert(insertPayload)
                .select()
                .single()
            if (dbErr) throw dbErr
            const t = data as Task
            const ids: string[] = area_ids ?? (t.area_id ? [t.area_id] : [])
            t.area_ids = ids
            tasks.value.push(t)
            if (t.parent_id) expanded.value.add(t.parent_id)  // auto-expand parent
            await syncTaskAreas(t.id, ids)
            return t
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create task'
            console.error('❌ createTask:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    const updateTask = async (id: string, payload: TaskUpdate): Promise<Task | null> => {
        loading.value = true
        error.value = null
        try {
            const { area_ids, ...taskPayload } = payload as any
            const dbPayload = {
                ...taskPayload,
                area_id: area_ids !== undefined
                    ? ((area_ids as string[])[0] ?? null)
                    : (payload as any).area_id,
            }
            const { data, error: dbErr } = await supabase
                .from('tasks')
                .update(dbPayload)
                .eq('id', id)
                .select()
                .single()
            if (dbErr) throw dbErr
            const updated = data as Task
            const ids: string[] = area_ids ?? (updated.area_id ? [updated.area_id] : [])
            updated.area_ids = ids
            const idx = tasks.value.findIndex(t => t.id === id)
            if (idx !== -1) tasks.value[idx] = updated
            if (area_ids !== undefined) await syncTaskAreas(id, ids)
            return updated
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update task'
            console.error('❌ updateTask:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteTask = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            const { error: dbErr } = await supabase.from('tasks').delete().eq('id', id)
            if (dbErr) throw dbErr
            // Remove task and all descendants from local state
            const toRemove = new Set<string>()
            const collect = (tid: string) => {
                toRemove.add(tid)
                tasks.value.filter(t => t.parent_id === tid).forEach(c => collect(c.id))
            }
            collect(id)
            tasks.value = tasks.value.filter(t => !toRemove.has(t.id))
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete task'
            console.error('❌ deleteTask:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    const reorderTask = async (
        draggedId: string,
        targetId: string,
        position: 'before' | 'after'
    ): Promise<boolean> => {
        const dragged = tasks.value.find(t => t.id === draggedId)
        const target = tasks.value.find(t => t.id === targetId)
        if (!dragged || !target) return false

        // Only allow reorder within the same parent
        const parentId = target.parent_id
        const siblings = tasks.value
            .filter(t => t.parent_id === parentId)
            .sort((a, b) => a.sort_order - b.sort_order)

        // Remove dragged from its current position (might be a different parent — move it)
        const withoutDragged = siblings.filter(t => t.id !== draggedId)
        const targetIdx = withoutDragged.findIndex(t => t.id === targetId)
        const insertAt = position === 'before' ? targetIdx : targetIdx + 1
        withoutDragged.splice(insertAt, 0, { ...dragged, parent_id: parentId })

        // Renumber sort_order 0, 1, 2, ...
        const updates = withoutDragged.map((t, i) => ({ id: t.id, sort_order: i, parent_id: parentId }))

        // Optimistic local update
        updates.forEach(u => {
            const idx = tasks.value.findIndex(t => t.id === u.id)
            if (idx !== -1) {
                tasks.value[idx] = {
                    ...tasks.value[idx],
                    sort_order: u.sort_order,
                    parent_id: u.parent_id as string | null,
                } as Task
            }
        })

        // Persist to DB — individual updates (upsert would fail NOT NULL on INSERT path)
        loading.value = true
        try {
            const results = await Promise.all(
                updates.map(u =>
                    supabase
                        .from('tasks')
                        .update({ sort_order: u.sort_order, parent_id: u.parent_id })
                        .eq('id', u.id)
                )
            )
            const failed = results.find(r => r.error)
            if (failed?.error) throw failed.error
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Reorder failed'
            return false
        } finally {
            loading.value = false
        }
    }

    const clearTasks = () => {
        tasks.value = []
        expanded.value.clear()
    }

    return {
        tasks, loading, error, tree, flatVisible, flatAll,
        fetchTasks, createTask, updateTask, deleteTask, clearTasks, reorderTask,
        syncTaskAreas,
        toggleExpand, expandAll, collapseAll,
        DISCIPLINE_META, STATUS_META,
    }
})
