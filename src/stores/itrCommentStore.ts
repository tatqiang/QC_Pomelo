import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ItrComment {
  id: string
  itr_id: string
  user_id: string
  user_name: string
  body: string
  created_at: string
}

export const useItrCommentStore = defineStore('itrComments', () => {
  const comments      = ref<ItrComment[]>([])
  const loading       = ref(false)
  /** Map of itr_id → comment count for the ITR table view */
  const commentCounts     = ref<Record<string, number>>({})
  /** Map of itr_id → latest comment body for the ITR table view */
  const lastCommentBodies = ref<Record<string, string>>({})

  let channel: RealtimeChannel | null = null
  let subscribedItrId: string | null  = null

  async function fetchCountsForItrs(itrIds: string[]): Promise<void> {
    if (!itrIds.length) return
    const { data, error } = await supabase
      .from('itr_comments')
      .select('itr_id, body, created_at')
      .in('itr_id', itrIds)
      .order('created_at', { ascending: false })
    if (error) { console.error('[itrComments] fetchCounts error:', error); return }
    const counts: Record<string, number> = {}
    const bodies: Record<string, string> = {}
    for (const row of (data ?? []) as { itr_id: string; body: string }[]) {
      counts[row.itr_id] = (counts[row.itr_id] ?? 0) + 1
      // ordered desc — first occurrence per itr_id is the latest
      if (!bodies[row.itr_id]) bodies[row.itr_id] = row.body
    }
    commentCounts.value     = counts
    lastCommentBodies.value = bodies
  }

  async function fetchComments(itrId: string) {
    loading.value = true
    try {
      console.log('[itrComments] fetchComments itrId:', itrId)
      const { data, error } = await supabase
        .from('itr_comments')
        .select('*')
        .eq('itr_id', itrId)
        .order('created_at', { ascending: true })
      console.log('[itrComments] result:', { data, error })
      if (error) {
        console.error('[itrComments] fetch error:', error)
      } else if (data) {
        comments.value = data as ItrComment[]
      }
    } finally {
      loading.value = false
    }
  }

  async function addComment(itrId: string, body: string, userId: string, userName: string) {
    const { data, error } = await supabase
      .from('itr_comments')
      .insert({ itr_id: itrId, user_id: userId, user_name: userName, body: body.trim() })
      .select()
      .single()
    if (!error && data && !comments.value.find(c => c.id === (data as ItrComment).id)) {
      comments.value.push(data as ItrComment)
      commentCounts.value[itrId] = (commentCounts.value[itrId] ?? 0) + 1
      lastCommentBodies.value[itrId] = (data as ItrComment).body
    }
    return { error }
  }

  async function deleteComment(id: string) {
    const target = comments.value.find(c => c.id === id)
    const { error } = await supabase.from('itr_comments').delete().eq('id', id)
    if (!error) {
      comments.value = comments.value.filter(c => c.id !== id)
      if (target) {
        const cur = commentCounts.value[target.itr_id] ?? 0
        commentCounts.value[target.itr_id] = Math.max(0, cur - 1)
      }
    }
    return { error }
  }

  function subscribe(itrId: string) {
    if (subscribedItrId === itrId) return
    unsubscribe()
    subscribedItrId = itrId

    channel = supabase
      .channel(`itr_comments_${itrId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'itr_comments', filter: `itr_id=eq.${itrId}` },
        (payload) => {
          const c = payload.new as ItrComment
          if (!comments.value.find(x => x.id === c.id)) comments.value.push(c)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'itr_comments', filter: `itr_id=eq.${itrId}` },
        (payload) => {
          const old = payload.old as { id: string }
          comments.value = comments.value.filter(c => c.id !== old.id)
        }
      )
      .subscribe()
  }

  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
      subscribedItrId = null
    }
  }

  return { comments, commentCounts, lastCommentBodies, loading, fetchComments, fetchCountsForItrs, addComment, deleteComment, subscribe, unsubscribe }
})
