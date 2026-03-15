<template>
  <div class="flex flex-col h-full">

    <!-- ── Header bar ──────────────────────────────────────────────────── -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
      <svg class="w-4 h-4 text-[#81938A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <span class="text-sm font-semibold text-gray-700">
        Comments
        <span v-if="store.comments.length > 0" class="ml-1.5 text-xs font-normal text-gray-400">
          ({{ store.comments.length }})
        </span>
      </span>
      <div class="flex-1"/>
      <button
        type="button"
        class="text-xs text-gray-400 hover:text-gray-600 transition"
        @click="$emit('close')"
      >✕ Close</button>
    </div>

    <!-- ── Comment list ────────────────────────────────────────────────── -->
    <div ref="listEl" class="flex-1 overflow-y-auto px-4 py-4 space-y-4">

      <!-- Loading skeleton -->
      <template v-if="store.loading">
        <div v-for="n in 3" :key="n" class="flex gap-3 animate-pulse">
          <div class="w-8 h-8 rounded-full bg-gray-200 shrink-0"/>
          <div class="flex-1 space-y-1.5">
            <div class="h-3 bg-gray-200 rounded w-24"/>
            <div class="h-10 bg-gray-100 rounded w-full"/>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else-if="store.comments.length === 0"
           class="flex flex-col items-center justify-center h-full text-center py-12 text-gray-300">
        <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <p class="text-sm">No comments yet</p>
        <p class="text-xs mt-0.5">Be the first to start the discussion</p>
      </div>

      <!-- Comments -->
      <template v-else>
        <div
          v-for="comment in store.comments"
          :key="comment.id"
          :class="['flex gap-2.5 group', isOwn(comment) ? 'flex-row-reverse' : 'flex-row']"
        >
          <!-- Avatar -->
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5',
                        isOwn(comment) ? 'bg-[#81938A]' : 'bg-gray-400']">
            {{ initials(comment.user_name) }}
          </div>

          <!-- Bubble -->
          <div :class="['max-w-[75%] flex flex-col', isOwn(comment) ? 'items-end' : 'items-start']">
            <div :class="['flex items-center gap-2 mb-0.5', isOwn(comment) ? 'flex-row-reverse' : '']">
              <span class="text-xs font-semibold text-gray-700">
                {{ isOwn(comment) ? 'You' : comment.user_name }}
              </span>
              <span class="text-[10px] text-gray-400">{{ relativeTime(comment.created_at) }}</span>
            </div>

            <div class="relative">
              <div :class="[
                'px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                isOwn(comment)
                  ? 'bg-[#81938A] text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              ]">
                {{ comment.body }}
              </div>

              <!-- Delete button (own comments only, hover to reveal) -->
              <button
                v-if="isOwn(comment)"
                type="button"
                class="absolute -left-6 top-1 opacity-0 group-hover:opacity-100 transition-opacity
                       text-red-400 hover:text-red-600 p-0.5"
                title="Delete comment"
                @click="confirmDelete(comment.id)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Input area ──────────────────────────────────────────────────── -->
    <div class="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
      <form @submit.prevent="send" class="flex gap-2 items-end">
        <textarea
          ref="inputEl"
          v-model="draft"
          rows="1"
          placeholder="Write a comment…"
          class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900
                 focus:outline-none focus:ring-2 focus:ring-[#81938A]/40 focus:border-[#81938A]
                 resize-none leading-snug max-h-28 overflow-y-auto transition"
          style="min-height: 38px;"
          @keydown.enter.exact.prevent="send"
          @keydown.enter.shift.exact="draft += '\n'"
          @input="autoResize"
          @focus="scrollToBottom"
        />
        <button
          type="submit"
          :disabled="!draft.trim() || sending"
          class="shrink-0 w-9 h-9 rounded-xl bg-[#81938A] text-white
                 hover:bg-[#6f8078] disabled:opacity-40 disabled:cursor-not-allowed
                 flex items-center justify-center transition-colors"
          title="Send (Enter)"
        >
          <svg v-if="!sending" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
        </button>
      </form>
      <p class="text-[10px] text-gray-300 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
    </div>

    <!-- ── Delete confirm mini-modal ──────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="deleteTargetId"
           class="absolute inset-0 rounded-lg bg-black/30 flex items-center justify-center z-10 p-4"
           @click.self="deleteTargetId = null">
        <div class="bg-white rounded-xl shadow-xl p-5 w-72 flex flex-col gap-4">
          <p class="text-sm font-semibold text-gray-800">Delete this comment?</p>
          <p class="text-xs text-gray-500 -mt-2">This cannot be undone.</p>
          <div class="flex gap-2 justify-end">
            <button type="button"
                    class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    @click="deleteTargetId = null">Cancel</button>
            <button type="button"
                    class="px-3 py-1.5 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
                    @click="doDelete">Delete</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { useItrCommentStore }    from '@/stores/itrCommentStore'
import { useAuthStore }          from '@/stores/authStore'
import { useItrStore }           from '@/stores/itrStore'
import { useNotificationStore }  from '@/stores/notificationStore'

const props = defineProps<{ itrId: string }>()
defineEmits<{ (e: 'close'): void }>()

const store    = useItrCommentStore()
const auth     = useAuthStore()
const itrStore = useItrStore()
const notifStore = useNotificationStore()
const listEl   = ref<HTMLElement | null>(null)
const inputEl  = ref<HTMLTextAreaElement | null>(null)
const draft    = ref('')
const sending  = ref(false)
const deleteTargetId = ref<string | null>(null)

// ── Helpers ────────────────────────────────────────────────────────────────

function isOwn(c: { user_id: string }) {
  return c.user_id === auth.userId
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 112) + 'px'
}

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

// ── Send ───────────────────────────────────────────────────────────────────

async function send() {
  const body = draft.value.trim()
  if (!body) return
  sending.value = true
  draft.value   = ''
  nextTick(() => {
    if (inputEl.value) { inputEl.value.style.height = 'auto'; inputEl.value.focus() }
  })
  const { error } = await store.addComment(props.itrId, body, auth.userId ?? '', auth.userDisplayName ?? 'User')
  if (!error) {
    // Notify all users who have acted on this ITR (except the commenter)
    const itr = itrStore.itrs.find(i => i.id === props.itrId)
    if (itr) {
      const actorFields: (keyof typeof itr)[] = [
        'draft_by', 'internal_request_by', 'external_request_by',
        'report_submitted_by', 'approved_by', 'submitted_by',
        'reviewed_by', 'created_by'
      ]
      const recipientIds = [...new Set(
        actorFields.map(f => itr[f] as string | null).filter((id): id is string => !!id && id !== auth.userId)
      )]
      if (recipientIds.length > 0) {
        notifStore.sendToUsers(recipientIds, {
          project_id: itr.project_id,
          type:       'itr_comment',
          title:      `💬 New comment on ${itr.item_no ?? itr.itr_number ?? itr.title}`,
          body:       `${auth.userDisplayName ?? 'Someone'}: ${body.length > 80 ? body.slice(0, 80) + '…' : body}`,
          link:       '/itrs',
          ref_id:     itr.id,
          created_by: auth.userId ?? undefined,
        })
      }
    }
  }
  sending.value = false
  scrollToBottom()
}

// ── Delete ─────────────────────────────────────────────────────────────────

function confirmDelete(id: string) {
  deleteTargetId.value = id
}

async function doDelete() {
  if (deleteTargetId.value) await store.deleteComment(deleteTargetId.value)
  deleteTargetId.value = null
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

watch(
  () => props.itrId,
  async (id) => {
    console.log('[ITRComments] watch fired, itrId:', id)
    if (!id) return
    await store.fetchComments(id)
    store.subscribe(id)
    scrollToBottom()
  },
  { immediate: true }
)

// Auto-scroll when new comments arrive
watch(() => store.comments.length, () => scrollToBottom())

onUnmounted(() => store.unsubscribe())
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
