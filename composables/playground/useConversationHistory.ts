import { computed, ref, watch, type Ref } from 'vue'
import {
  HISTORY_LIMIT, conversationId, fromServerConversation, historyStorageKey, parseHistory, serializeHistory,
  sortConversations, storableMessages, titleFrom, toServerPayload, type Conversation
} from './history'
import type { ChatMessage } from './chat'
import { errorMessage } from '~/composables/workspace/common'

type FetchAPI = <T = unknown>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>
type Options = {
  userId: Ref<number | string | null | undefined>
  /** True when Home advertises `chat_history`; otherwise history stays in this browser. */
  serverSupported: Ref<boolean>
  fetchAPI: FetchAPI
  failedMessage: () => string
}

const basePath = '/chat/conversations'

/**
 * Playground conversation history. With a supporting Home it is stored per user
 * through /user/chat/conversations; older Homes fall back to browser localStorage.
 */
export function useConversationHistory({ userId, serverSupported, fetchAPI, failedMessage }: Options) {
  const conversations = ref<Conversation[]>([])
  const activeId = ref<string | null>(null)
  const loading = ref(false)
  const syncError = ref('')
  const mode = computed<'server' | 'local'>(() => serverSupported.value ? 'server' : 'local')
  const storageKey = computed(() => historyStorageKey(userId.value))
  let generation = 0
  // Writes for one conversation run in order so an older snapshot never lands last.
  const writes = new Map<string, Promise<void>>()

  function storage() {
    try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null }
  }

  function persistLocal() {
    const store = storage()
    if (mode.value !== 'local' || !store || !storageKey.value) return
    try {
      store.setItem(storageKey.value, serializeHistory(conversations.value))
    } catch {
      // Storage is full: keep the newest conversations and try once more.
      conversations.value = sortConversations(conversations.value).slice(0, Math.max(1, Math.floor(HISTORY_LIMIT / 5)))
      try { store.setItem(storageKey.value, serializeHistory(conversations.value)) } catch { /* History stays in memory only. */ }
    }
  }

  function fail(cause: unknown) {
    syncError.value = errorMessage(cause, failedMessage())
  }

  async function load() {
    const current = ++generation
    activeId.value = null
    syncError.value = ''
    writes.clear()
    if (!userId.value) {
      conversations.value = []
      return
    }
    if (mode.value === 'local') {
      const store = storage()
      let raw: string | null = null
      if (store && storageKey.value) { try { raw = store.getItem(storageKey.value) } catch { raw = null } }
      conversations.value = parseHistory(raw)
      return
    }
    loading.value = true
    try {
      const response = await fetchAPI<{ items?: unknown[] }>(basePath)
      if (current !== generation) return
      const items = Array.isArray(response?.items) ? response.items : []
      conversations.value = sortConversations(items.map(fromServerConversation).filter((item): item is Conversation => Boolean(item)))
    } catch (cause) {
      if (current !== generation) return
      conversations.value = []
      fail(cause)
    } finally {
      if (current === generation) loading.value = false
    }
  }

  watch([mode, () => userId.value], () => { void load() }, { immediate: true })

  const activeConversation = computed(() => conversations.value.find(item => item.id === activeId.value) || null)

  /** Returns the messages of a conversation, fetching them from Home when only the summary is known. */
  async function messagesOf(id: string): Promise<ChatMessage[] | null> {
    const known = conversations.value.find(item => item.id === id)
    if (!known) return null
    if (known.messages) return known.messages
    const current = generation
    try {
      const response = await fetchAPI<{ conversation?: unknown }>(`${basePath}/${encodeURIComponent(id)}`)
      const loaded = fromServerConversation(response?.conversation)
      if (current !== generation || !loaded) return null
      conversations.value = conversations.value.map(item => item.id === id ? { ...item, ...loaded } : item)
      return loaded.messages || []
    } catch (cause) {
      if (current === generation) fail(cause)
      return null
    }
  }

  function enqueue(id: string, task: () => Promise<unknown>) {
    const current = generation
    const next = (writes.get(id) || Promise.resolve())
      .then(async () => {
        if (current !== generation) return
        await task()
        if (current === generation) syncError.value = ''
      })
      .catch((cause) => { if (current === generation) fail(cause) })
    writes.set(id, next)
    void next.finally(() => { if (writes.get(id) === next) writes.delete(id) })
  }

  /** Saves messages into the given conversation, creating it on the first message. */
  function commit(id: string | null, messages: ChatMessage[], model: string): string | null {
    const snapshot = storableMessages(messages)
    if (!snapshot.length) return id
    const now = Date.now()
    const existing = id ? conversations.value.find(item => item.id === id) : undefined
    let saved: Conversation
    if (existing) {
      saved = { ...existing, messages: snapshot, messageCount: snapshot.length, model: model || existing.model, updatedAt: now }
      conversations.value = sortConversations(conversations.value.map(item => item.id === existing.id ? saved : item))
    } else {
      saved = {
        id: id || conversationId(),
        title: titleFrom(snapshot.find(message => message.role === 'user')?.content || ''),
        model,
        createdAt: now,
        updatedAt: now,
        messageCount: snapshot.length,
        messages: snapshot
      }
      conversations.value = [saved, ...conversations.value].slice(0, HISTORY_LIMIT)
    }
    if (mode.value === 'server') {
      const body = toServerPayload(saved, snapshot)
      enqueue(saved.id, () => fetchAPI(`${basePath}/${encodeURIComponent(saved.id)}`, { method: 'PUT', body }))
    } else {
      persistLocal()
    }
    return saved.id
  }

  function remove(id: string) {
    conversations.value = conversations.value.filter(item => item.id !== id)
    if (activeId.value === id) activeId.value = null
    if (mode.value === 'server') {
      enqueue(id, () => fetchAPI(`${basePath}/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch((cause: any) => {
        // Already gone on the server (or never saved) is the desired end state.
        if (cause?.statusCode !== 404 && cause?.status !== 404) throw cause
      }))
    } else {
      persistLocal()
    }
  }

  async function clearAll() {
    const previous = conversations.value
    conversations.value = []
    activeId.value = null
    if (mode.value !== 'server') {
      persistLocal()
      return true
    }
    try {
      await Promise.allSettled([...writes.values()])
      await fetchAPI(basePath, { method: 'DELETE' })
      syncError.value = ''
      return true
    } catch (cause) {
      conversations.value = previous
      fail(cause)
      return false
    }
  }

  return { conversations, activeId, activeConversation, mode, loading, syncError, load, messagesOf, commit, remove, clearAll }
}
