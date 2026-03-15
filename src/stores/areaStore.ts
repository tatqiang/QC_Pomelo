import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Area {
    id: string
    project_id: string
    parent_id: string | null
    name: string
    code: string | null
    description: string | null
    sort_order: number
    created_at: string
    updated_at: string
}

export interface AreaNode extends Area {
    level: number
    children: AreaNode[]
    expanded: boolean
}

export type AreaInsert = Pick<Area, 'project_id' | 'name'> &
    Partial<Omit<Area, 'id' | 'created_at' | 'updated_at' | 'project_id' | 'name'>>

export type AreaUpdate = Partial<Omit<Area, 'id' | 'project_id' | 'created_at' | 'updated_at'>>

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAreaStore = defineStore('area', () => {
    const areas = ref<Area[]>([])
    const expanded = ref<Set<string>>(new Set())
    const loading = ref(false)
    const error = ref<string | null>(null)

    // ── Tree helpers ─────────────────────────────────────────────────────────

    const tree = computed<AreaNode[]>(() => buildTree(areas.value, null, 0))

    function buildTree(all: Area[], parentId: string | null, level: number): AreaNode[] {
        return all
            .filter(a => a.parent_id === parentId)
            .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
            .map(a => ({
                ...a,
                level,
                expanded: expanded.value.has(a.id),
                children: buildTree(all, a.id, level + 1),
            }))
    }

    /** Flattened list respecting expand/collapse — for rendering the tree rows */
    const flatVisible = computed<AreaNode[]>(() => flattenVisible(tree.value))

    function flattenVisible(nodes: AreaNode[]): AreaNode[] {
        const result: AreaNode[] = []
        for (const node of nodes) {
            result.push(node)
            if (node.children.length > 0 && node.expanded) {
                result.push(...flattenVisible(node.children))
            }
        }
        return result
    }

    /** All areas flat (including children) — for select dropdowns in task/ITR forms */
    const flatAll = computed<AreaNode[]>(() => flattenAll(tree.value))

    function flattenAll(nodes: AreaNode[]): AreaNode[] {
        const result: AreaNode[] = []
        for (const node of nodes) {
            result.push(node)
            if (node.children.length > 0) result.push(...flattenAll(node.children))
        }
        return result
    }

    const hasChildren = (id: string) => areas.value.some(a => a.parent_id === id)

    // ── Expand / Collapse ─────────────────────────────────────────────────────

    const toggleExpand = (id: string) => {
        if (expanded.value.has(id)) expanded.value.delete(id)
        else expanded.value.add(id)
    }

    const expandAll = () =>
        areas.value.filter(a => areas.value.some(c => c.parent_id === a.id))
            .forEach(a => expanded.value.add(a.id))

    const collapseAll = () => expanded.value.clear()

    // ── CRUD ─────────────────────────────────────────────────────────────────

    const fetchAreas = async (projectId: string): Promise<void> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: dbErr } = await supabase
                .from('areas')
                .select('*')
                .eq('project_id', projectId)
                .order('sort_order', { ascending: true })

            if (dbErr) throw dbErr
            areas.value = (data as Area[]) ?? []
            expandAll()
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load areas'
            console.error('❌ fetchAreas:', err)
        } finally {
            loading.value = false
        }
    }

    const createArea = async (payload: AreaInsert): Promise<Area | null> => {
        loading.value = true
        error.value = null
        try {
            const siblings = areas.value.filter(a => a.parent_id === (payload.parent_id ?? null))
            const maxOrder = siblings.reduce((m, a) => Math.max(m, a.sort_order), -1)
            const { data, error: dbErr } = await supabase
                .from('areas')
                .insert({ ...payload, sort_order: maxOrder + 1 })
                .select()
                .single()

            if (dbErr) throw dbErr
            const area = data as Area
            areas.value.push(area)
            if (area.parent_id) expanded.value.add(area.parent_id)
            return area
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create area'
            console.error('❌ createArea:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    const updateArea = async (id: string, payload: AreaUpdate): Promise<Area | null> => {
        loading.value = true
        error.value = null
        try {
            const { data, error: dbErr } = await supabase
                .from('areas')
                .update(payload)
                .eq('id', id)
                .select()
                .single()

            if (dbErr) throw dbErr
            const updated = data as Area
            const idx = areas.value.findIndex(a => a.id === id)
            if (idx !== -1) areas.value[idx] = updated
            return updated
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update area'
            console.error('❌ updateArea:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    const deleteArea = async (id: string): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            const { error: dbErr } = await supabase.from('areas').delete().eq('id', id)
            if (dbErr) throw dbErr
            // Remove area and all descendants locally (cascade handled by DB too)
            const toRemove = new Set<string>()
            const collect = (aid: string) => {
                toRemove.add(aid)
                areas.value.filter(a => a.parent_id === aid).forEach(c => collect(c.id))
            }
            collect(id)
            areas.value = areas.value.filter(a => !toRemove.has(a.id))
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete area'
            console.error('❌ deleteArea:', err)
            return false
        } finally {
            loading.value = false
        }
    }

    const clearAreas = () => {
        areas.value = []
        expanded.value.clear()
    }

    return {
        areas, loading, error,
        tree, flatVisible, flatAll,
        hasChildren,
        fetchAreas, createArea, updateArea, deleteArea, clearAreas,
        toggleExpand, expandAll, collapseAll,
    }
})
