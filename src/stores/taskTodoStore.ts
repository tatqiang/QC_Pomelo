import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { r2StorageService } from '@/services/r2StorageService'
import { useNotificationStore } from './notificationStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskTodoFile {
    id: string
    todo_id: string
    project_id: string
    file_name: string
    file_url: string
    file_type: string | null
    file_size: number | null
    uploaded_by: string | null
    uploaded_at: string
}

export interface TaskTodo {
    id: string
    task_id: string
    project_id: string
    title: string
    notes: string | null
    link: string | null
    assigned_to: string | null
    due_date: string | null       // ISO "YYYY-MM-DD"
    is_done: boolean
    sort_order: number
    created_by: string | null
    created_at: string
    updated_at: string
    /** Joined from users via assigned_to FK */
    assigned_user?: { first_name: string | null; last_name: string | null; email: string } | null
    /** Joined task info */
    task?: { id: string; name: string } | null
    /** Joined files */
    task_todo_files?: TaskTodoFile[]
}

export type TaskTodoInsert = Pick<TaskTodo, 'task_id' | 'project_id' | 'title'> &
    Partial<Pick<TaskTodo, 'notes' | 'link' | 'assigned_to' | 'due_date' | 'sort_order' | 'created_by'>>

export type TaskTodoUpdate = Partial<Pick<TaskTodo, 'title' | 'notes' | 'link' | 'assigned_to' | 'due_date' | 'is_done' | 'sort_order'>>

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTaskTodoStore = defineStore('taskTodo', () => {
    const todos        = ref<TaskTodo[]>([])
    const projectTodos = ref<TaskTodo[]>([])
    const loading      = ref(false)
    const saving       = ref(false)
    const error        = ref<string | null>(null)
    const activeTaskId = ref<string | null>(null)

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchTodos = async (taskId: string): Promise<void> => {
        loading.value  = true
        error.value    = null
        activeTaskId.value = taskId
        try {
            const { data, error: dbErr } = await supabase
                .from('task_todos')
                .select('*, assigned_user:users!assigned_to(first_name, last_name, email), task_todo_files(*)')
                .eq('task_id', taskId)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true })

            if (dbErr) throw dbErr
            todos.value = (data as TaskTodo[]) ?? []
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load to-dos'
            console.error('❌ fetchTodos:', err)
        } finally {
            loading.value = false
        }
    }

    // ── Fetch all todos for a project ─────────────────────────────────────────

    const fetchProjectTodos = async (projectId: string): Promise<void> => {
        loading.value = true
        error.value   = null
        try {
            const { data, error: dbErr } = await supabase
                .from('task_todos')
                .select('*, assigned_user:users!assigned_to(first_name, last_name, email), task:tasks!task_id(id, name), task_todo_files(*)')
                .eq('project_id', projectId)
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true })

            if (dbErr) throw dbErr
            projectTodos.value = (data as TaskTodo[]) ?? []
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load project to-dos'
            console.error('❌ fetchProjectTodos:', err)
        } finally {
            loading.value = false
        }
    }

    // ── Create ────────────────────────────────────────────────────────────────

    const createTodo = async (payload: TaskTodoInsert): Promise<TaskTodo | null> => {
        saving.value = true
        error.value  = null
        try {
            const { data, error: dbErr } = await supabase
                .from('task_todos')
                .insert({ ...payload, sort_order: payload.sort_order ?? todos.value.length })
                .select('*, assigned_user:users!assigned_to(first_name, last_name, email), task_todo_files(*)')
                .single()

            if (dbErr) throw dbErr
            const created = data as TaskTodo
            todos.value.push(created)
            return created
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to create to-do'
            console.error('❌ createTodo:', err)
            return null
        } finally {
            saving.value = false
        }
    }

    // ── Create + notify all project members ───────────────────────────────────

    const createTodoAndNotify = async (
        payload: TaskTodoInsert,
        taskName: string,
        memberIds: string[],     // all project member user_ids
        creatorId: string | null,
    ): Promise<TaskTodo | null> => {
        const created = await createTodo(payload)
        if (!created) return null

        // Fire-and-forget notification to every project member (including creator)
        const notifStore = useNotificationStore()
        if (memberIds.length > 0) {
            notifStore.sendToUsers(memberIds, {
                project_id: payload.project_id,
                type:       'todo_created',
                title:      'New To-Do added',
                body:       `"${created.title}" was added to task "${taskName}"`,
                link:       '/todos',
                ref_id:     created.id,
                created_by: creatorId,
            })
        }
        return created
    }

    // ── Update ────────────────────────────────────────────────────────────────

    const updateTodo = async (id: string, patch: TaskTodoUpdate): Promise<boolean> => {
        saving.value = true
        error.value  = null
        try {
            const { data, error: dbErr } = await supabase
                .from('task_todos')
                .update(patch)
                .eq('id', id)
                .select('*, assigned_user:users!assigned_to(first_name, last_name, email), task_todo_files(*)')
                .single()

            if (dbErr) throw dbErr
            const idx = todos.value.findIndex(t => t.id === id)
            if (idx !== -1) todos.value[idx] = data as TaskTodo
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to update to-do'
            console.error('❌ updateTodo:', err)
            return false
        } finally {
            saving.value = false
        }
    }

    // ── Toggle done ───────────────────────────────────────────────────────────

    const toggleDone = async (id: string): Promise<void> => {
        // find in either list
        const todo = todos.value.find(t => t.id === id)
            ?? projectTodos.value.find(t => t.id === id)
        if (!todo) return
        // Optimistic update in both lists
        const flip = !todo.is_done
        todos.value.find(t => t.id === id) && (todos.value.find(t => t.id === id)!.is_done = flip)
        projectTodos.value.find(t => t.id === id) && (projectTodos.value.find(t => t.id === id)!.is_done = flip)
        const ok = await updateTodo(id, { is_done: flip })
        if (!ok) {
            todos.value.find(t => t.id === id) && (todos.value.find(t => t.id === id)!.is_done = !flip)
            projectTodos.value.find(t => t.id === id) && (projectTodos.value.find(t => t.id === id)!.is_done = !flip)
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    const deleteTodo = async (id: string): Promise<boolean> => {
        saving.value = true
        error.value  = null
        try {
            const { error: dbErr } = await supabase
                .from('task_todos')
                .delete()
                .eq('id', id)

            if (dbErr) throw dbErr
            todos.value = todos.value.filter(t => t.id !== id)
            projectTodos.value = projectTodos.value.filter(t => t.id !== id)
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete to-do'
            console.error('❌ deleteTodo:', err)
            return false
        } finally {
            saving.value = false
        }
    }

    // ── Add a folder / URL link (no R2 upload) ───────────────────────────────

    const addFolderLink = async (
        todoId: string,
        projectId: string,
        label: string,
        url: string,
        uploadedBy: string | null,
    ): Promise<TaskTodoFile | null> => {
        saving.value = true
        error.value  = null
        try {
            const { data, error: dbErr } = await supabase
                .from('task_todo_files')
                .insert({
                    todo_id:     todoId,
                    project_id:  projectId,
                    file_name:   label,
                    file_url:    url,
                    file_type:   'folder_link',
                    file_size:   null,
                    uploaded_by: uploadedBy,
                })
                .select()
                .single()

            if (dbErr) throw dbErr
            const created = data as TaskTodoFile
            const todo = todos.value.find(t => t.id === todoId)
            if (todo) {
                if (!todo.task_todo_files) todo.task_todo_files = []
                todo.task_todo_files.push(created)
            }
            return created
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to save folder link'
            console.error('❌ addFolderLink:', err)
            return null
        } finally {
            saving.value = false
        }
    }

    // ── Upload file to a todo ─────────────────────────────────────────────────

    const uploadFile = async (
        todoId: string,
        projectId: string,
        file: File,
        uploadedBy: string | null,
    ): Promise<TaskTodoFile | null> => {
        saving.value = true
        error.value  = null
        try {
            const fileUrl = await r2StorageService.uploadFile(file, `todos/${projectId}/${todoId}`)
            const { data, error: dbErr } = await supabase
                .from('task_todo_files')
                .insert({
                    todo_id:     todoId,
                    project_id:  projectId,
                    file_name:   file.name,
                    file_url:    fileUrl,
                    file_type:   file.type || null,
                    file_size:   file.size,
                    uploaded_by: uploadedBy,
                })
                .select()
                .single()

            if (dbErr) throw dbErr
            const uploaded = data as TaskTodoFile
            // Append to the matching todo's files array
            const todo = todos.value.find(t => t.id === todoId)
            if (todo) {
                if (!todo.task_todo_files) todo.task_todo_files = []
                todo.task_todo_files.push(uploaded)
            }
            return uploaded
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to upload file'
            console.error('❌ uploadFile:', err)
            return null
        } finally {
            saving.value = false
        }
    }

    // ── Delete a file attachment ──────────────────────────────────────────────

    const deleteFile = async (fileId: string, todoId: string): Promise<boolean> => {
        saving.value = true
        error.value  = null
        try {
            const { error: dbErr } = await supabase
                .from('task_todo_files')
                .delete()
                .eq('id', fileId)

            if (dbErr) throw dbErr
            const todo = todos.value.find(t => t.id === todoId)
            if (todo?.task_todo_files) {
                todo.task_todo_files = todo.task_todo_files.filter(f => f.id !== fileId)
            }
            return true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete file'
            console.error('❌ deleteFile:', err)
            return false
        } finally {
            saving.value = false
        }
    }

    // ── Clear ─────────────────────────────────────────────────────────────────

    const clearTodos = () => {
        todos.value        = []
        activeTaskId.value = null
        error.value        = null
    }

    return {
        todos, projectTodos, loading, saving, error, activeTaskId,
        fetchTodos, fetchProjectTodos, createTodo, createTodoAndNotify, updateTodo, toggleDone, deleteTodo,
        uploadFile, addFolderLink, deleteFile,
        clearTodos,
    }
})
