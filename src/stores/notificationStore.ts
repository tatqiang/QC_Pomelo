import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Notification {
    id: string
    project_id: string | null
    user_id: string
    type: string
    title: string
    body: string | null
    link: string | null
    ref_id: string | null
    is_read: boolean
    created_by: string | null
    created_at: string
}

export const useNotificationStore = defineStore('notification', () => {
    const items   = ref<Notification[]>([])
    const loading = ref(false)
    let channel: RealtimeChannel | null = null

    const unreadCount = computed(() => items.value.filter(n => !n.is_read).length)

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchNotifications = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return
        loading.value = true
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', authStore.userId)
                .order('created_at', { ascending: false })
                .limit(50)
            if (error) throw error
            items.value = (data as Notification[]) ?? []
        } catch (err) {
            console.error('❌ fetchNotifications:', err)
        } finally {
            loading.value = false
        }
    }

    // ── Send notifications to a list of user IDs ──────────────────────────────

    const sendToUsers = async (
        userIds: string[],
        payload: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'created_at'>
    ) => {
        if (!userIds.length) return
        const authStore = useAuthStore()
        const rows = userIds.map(uid => ({ ...payload, user_id: uid, is_read: false }))
        const { error } = await supabase.from('notifications').insert(rows)
        if (error) { console.error('❌ sendToUsers:', error); return }
        // Refresh the bell if current user is among recipients (Realtime may not be enabled)
        if (authStore.userId && userIds.includes(authStore.userId)) {
            await fetchNotifications()
        }
    }

    // ── Mark one as read ──────────────────────────────────────────────────────

    const markRead = async (id: string) => {
        const n = items.value.find(x => x.id === id)
        if (n) n.is_read = true   // optimistic
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
        if (error && n) n.is_read = false   // revert
    }

    // ── Mark all read ─────────────────────────────────────────────────────────

    const markAllRead = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return
        items.value.forEach(n => { n.is_read = true })
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', authStore.userId)
            .eq('is_read', false)
        if (error) console.error('❌ markAllRead:', error)
    }

    // ── Realtime subscription ─────────────────────────────────────────────────

    const subscribe = () => {
        const authStore = useAuthStore()
        if (!authStore.userId || channel) return
        channel = supabase
            .channel('notifications-me')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${authStore.userId}` },
                (payload) => {
                    items.value.unshift(payload.new as Notification)
                }
            )
            .subscribe()
    }

    const unsubscribe = () => {
        if (channel) { supabase.removeChannel(channel); channel = null }
    }

    return { items, unreadCount, loading, fetchNotifications, sendToUsers, markRead, markAllRead, subscribe, unsubscribe }
})
