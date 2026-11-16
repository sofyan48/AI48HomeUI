import { computed, inject, onMounted, onScopeDispose, provide, ref, watch, type InjectionKey } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { errorMessage } from '~/composables/workspace/common'
import { keyEntries, maskKey, normalizeKey, type WorkspaceKey } from '~/composables/workspace/keys'
import type { CatalogModel } from '~/composables/userModelCatalog'
import {
  chatCompletionsUrl, completionReply, historyFor, messageId, parseOptionalNumber, parseStreamLine,
  readLines, responseErrorMessage, type ChatMessage
} from './chat'
import { useConversationHistory } from './useConversationHistory'

/**
 * Shared state for the chat playground (/app/playground).
 *
 * The page calls `providePlaygroundWorkspace()` once; sections call `usePlaygroundWorkspace()`.
 * Requests go straight to the public CPA endpoint with one of the user's own API keys,
 * so they are billed and logged exactly like any other client call.
 */
function createPlaygroundWorkspace() {
  const { t } = usePortalI18n()
  const { token, fetchAPI, serverInfo, capabilities, loadCapabilities, currentUser } = useUserApi()
  const history = useConversationHistory({
    userId: computed(() => currentUser.value?.id),
    serverSupported: computed(() => capabilities.value.chat_history === true),
    fetchAPI,
    failedMessage: () => t('playground.historySyncFailed')
  })
  const openingId = ref<string | null>(null)

  const keys = useWorkspaceState<WorkspaceKey[]>('user:playground:keys', () => [])
  const models = useWorkspaceState<CatalogModel[]>('user:playground:models', () => [])
  const loading = useWorkspaceState('user:playground:loading', () => true)
  const loadError = useWorkspaceState('user:playground:load-error', () => '')
  const modelsError = useWorkspaceState('user:playground:models-error', () => '')

  const selectedKey = ref('')
  const selectedModel = ref('')
  const systemPrompt = ref('')
  const temperature = ref('')
  const maxTokens = ref('')
  const stream = ref(true)
  const draft = ref('')
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  let controller: AbortController | null = null
  let loadGeneration = 0

  const endpoint = computed(() => chatCompletionsUrl(serverInfo.value.cpa_public_url))
  const hasKeys = computed(() => keys.value.length > 0)
  const disabledReason = computed(() => {
    if (loading.value) return ''
    if (!hasKeys.value) return 'noKey'
    if (!endpoint.value) return 'noEndpoint'
    if (!models.value.length) return 'noModel'
    return ''
  })
  const ready = computed(() => !loading.value && !disabledReason.value)
  const canSend = computed(() => ready.value && !sending.value && Boolean(draft.value.trim()) && Boolean(selectedKey.value) && Boolean(selectedModel.value))
  const keyOptions = computed(() => keys.value.map(key => ({ value: key.api_key, label: `${key.display_name || t('ws.keys.unnamed')} · ${maskKey(key.api_key)}` })))
  const modelOptions = computed(() => models.value.map(model => ({ value: model.id, label: model.display_name && model.display_name !== model.id ? `${model.display_name} (${model.id})` : model.id })))
  const activeModel = computed(() => models.value.find(model => model.id === selectedModel.value) || null)

  async function load() {
    const generation = ++loadGeneration
    loading.value = true
    loadError.value = ''
    modelsError.value = ''
    const [keysResult, modelsResult] = await Promise.allSettled([
      fetchAPI<any>('/api-keys'),
      fetchAPI<{ models?: CatalogModel[] }>('/models/accessible'),
      loadCapabilities().catch(() => {})
    ])
    if (generation !== loadGeneration) return
    if (keysResult.status === 'fulfilled') keys.value = keyEntries(keysResult.value).map(normalizeKey).filter((item): item is WorkspaceKey => Boolean(item))
    else loadError.value = errorMessage(keysResult.reason, t('playground.loadFailed'))
    if (modelsResult.status === 'fulfilled') {
      const list = Array.isArray(modelsResult.value?.models) ? modelsResult.value.models : []
      models.value = [...list].sort((a, b) => (a.display_name || a.id).localeCompare(b.display_name || b.id))
    } else {
      models.value = []
      modelsError.value = errorMessage(modelsResult.reason, t('playground.modelsFailed'))
    }
    if (!keys.value.some(key => key.api_key === selectedKey.value)) selectedKey.value = keys.value[0]?.api_key || ''
    if (!models.value.some(model => model.id === selectedModel.value)) selectedModel.value = models.value[0]?.id || ''
    loading.value = false
  }

  function stop() {
    controller?.abort()
  }

  /** Leaves the current conversation, keeping any partial reply that is still streaming. */
  function detach() {
    if (sending.value) history.commit(history.activeId.value, messages.value, selectedModel.value)
    stop()
  }

  function newChat() {
    openingId.value = null
    detach()
    history.activeId.value = null
    messages.value = []
  }

  async function openConversation(id: string) {
    if (id === history.activeId.value) return
    const conversation = history.conversations.value.find(item => item.id === id)
    if (!conversation) return
    openingId.value = id
    const loaded = await history.messagesOf(id)
    // Ignore a slow load when the user already picked another conversation.
    if (openingId.value !== id) return
    openingId.value = null
    if (!loaded) return
    detach()
    history.activeId.value = conversation.id
    messages.value = loaded.map(message => ({ ...message }))
    if (conversation.model && models.value.some(model => model.id === conversation.model)) selectedModel.value = conversation.model
  }

  function deleteConversation(id: string) {
    if (id === history.activeId.value) newChat()
    history.remove(id)
  }

  function clearHistory() {
    newChat()
    return history.clearAll()
  }

  /** Stores the current transcript; the conversation is created on its first message. */
  function saveConversation(id: string | null) {
    const savedId = history.commit(id, messages.value, selectedModel.value)
    // Only follow the saved conversation when the user has not switched away meanwhile.
    if (history.activeId.value === id) history.activeId.value = savedId
    return savedId
  }

  function patch(id: string, update: Partial<ChatMessage>) {
    const index = messages.value.findIndex(message => message.id === id)
    if (index >= 0) messages.value.splice(index, 1, { ...messages.value[index]!, ...update })
  }
  function append(id: string, content: string, reasoning: string) {
    const current = messages.value.find(message => message.id === id)
    if (current) patch(id, { content: current.content + content, reasoning: (current.reasoning || '') + reasoning })
  }

  async function send() {
    const text = draft.value.trim()
    if (!canSend.value || !text || !endpoint.value) return
    const history = historyFor([...messages.value, { id: '', role: 'user', content: text }], systemPrompt.value)
    const reply: ChatMessage = { id: messageId(), role: 'assistant', content: '', reasoning: '', model: selectedModel.value, pending: true }
    messages.value = [...messages.value, { id: messageId(), role: 'user', content: text }, reply]
    draft.value = ''
    sending.value = true
    const conversationId = saveConversation(history.activeId.value)
    controller = new AbortController()
    const started = performance.now()
    const body: Record<string, unknown> = { model: selectedModel.value, messages: history, stream: stream.value }
    const temp = parseOptionalNumber(temperature.value, 0, 2)
    const limit = parseOptionalNumber(maxTokens.value, 1, 1_000_000, true)
    if (temp !== undefined) body.temperature = temp
    if (limit !== undefined) body.max_tokens = limit
    if (stream.value) body.stream_options = { include_usage: true }
    try {
      const response = await fetch(endpoint.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${selectedKey.value}` },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      if (!response.ok) throw new Error(await responseErrorMessage(response))
      const contentType = response.headers.get('content-type') || ''
      if (stream.value && response.body && contentType.includes('text/event-stream')) {
        for await (const line of readLines(response.body)) {
          const delta = parseStreamLine(line)
          if (!delta) continue
          if (delta.done) break
          if (delta.error) throw new Error(delta.error)
          if (delta.content || delta.reasoning) append(reply.id, delta.content, delta.reasoning)
          if (delta.usage) patch(reply.id, { usage: delta.usage })
        }
      } else {
        const result = completionReply(await response.json())
        if (result.error) throw new Error(result.error)
        patch(reply.id, { content: result.content, reasoning: result.reasoning, usage: result.usage })
      }
      patch(reply.id, { pending: false, latencyMs: Math.round(performance.now() - started) })
    } catch (cause: any) {
      const aborted = cause?.name === 'AbortError'
      const current = messages.value.find(message => message.id === reply.id)
      if (aborted) patch(reply.id, { pending: false, stopped: true, latencyMs: Math.round(performance.now() - started), ...(current?.content ? {} : { error: t('playground.stopped') }) })
      else patch(reply.id, { pending: false, error: cause instanceof TypeError ? t('playground.networkError') : cause?.message || t('playground.requestFailed') })
    } finally {
      sending.value = false
      controller = null
      if (history.activeId.value === conversationId) saveConversation(conversationId)
    }
  }

  watch(token, () => {
    newChat()
    void load()
  })
  onScopeDispose(() => { loadGeneration++; stop() })
  onMounted(() => { void load() })

  return {
    keys, models, loading, loadError, modelsError, endpoint, hasKeys, disabledReason, ready, canSend,
    selectedKey, selectedModel, activeModel, systemPrompt, temperature, maxTokens, stream, draft, messages, sending,
    keyOptions, modelOptions, load, send, stop, newChat,
    conversations: history.conversations, activeConversationId: history.activeId, activeConversation: history.activeConversation,
    historyMode: history.mode, historyLoading: history.loading, historySyncError: history.syncError, reloadHistory: history.load, openingId,
    openConversation, deleteConversation, clearHistory
  }
}

export type PlaygroundWorkspace = ReturnType<typeof createPlaygroundWorkspace>

const playgroundKey: InjectionKey<PlaygroundWorkspace> = Symbol('user-playground-workspace')

export function providePlaygroundWorkspace(): PlaygroundWorkspace {
  const workspace = createPlaygroundWorkspace()
  provide(playgroundKey, workspace)
  return workspace
}

export function usePlaygroundWorkspace(): PlaygroundWorkspace {
  const workspace = inject(playgroundKey)
  if (!workspace) throw new Error('usePlaygroundWorkspace() must be used inside the playground page')
  return workspace
}
