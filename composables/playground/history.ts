/** Pure helpers for the playground conversation history (server-backed or browser-local). */
import type { ChatMessage } from './chat'

export type Conversation = {
  id: string
  title: string
  model: string
  createdAt: number
  updatedAt: number
  messageCount: number
  /** Undefined until loaded: server lists return summaries only. */
  messages?: ChatMessage[]
}
export type ConversationGroup = 'today' | 'yesterday' | 'week' | 'month' | 'older'

export const HISTORY_LIMIT = 100
const TITLE_LENGTH = 60

/** Local fallback history is scoped per user so shared browsers do not mix conversations. */
export function historyStorageKey(userId: number | string | null | undefined) {
  return userId === null || userId === undefined || userId === '' ? '' : `ai48.playground.history.v1:${userId}`
}

let sequence = 0
/** Matches the server ID rule: 1-64 characters from A-Z a-z 0-9 - _. */
export function conversationId() { return `chat-${Date.now().toString(36)}-${(sequence++).toString(36)}` }

export function titleFrom(text: string) {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > TITLE_LENGTH ? `${line.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : line
}

export function sanitizeMessage(value: any): ChatMessage | null {
  if (!value || typeof value !== 'object') return null
  if (value.role !== 'user' && value.role !== 'assistant') return null
  const content = typeof value.content === 'string' ? value.content : ''
  const error = typeof value.error === 'string' && value.error ? value.error : undefined
  // A reply that was still pending when the page closed is kept only if it produced text.
  if (!content && !error) return null
  const message: ChatMessage = { id: String(value.id || ''), role: value.role, content }
  if (typeof value.reasoning === 'string' && value.reasoning) message.reasoning = value.reasoning
  if (typeof value.model === 'string' && value.model) message.model = value.model
  if (value.stopped || value.pending) message.stopped = true
  if (error) message.error = error
  if (value.usage && typeof value.usage === 'object') message.usage = value.usage
  const latency = value.latencyMs ?? value.latency_ms
  if (Number.isFinite(latency)) message.latencyMs = latency
  return message
}

export function sanitizeMessages(value: unknown): ChatMessage[] {
  return Array.isArray(value) ? value.map(sanitizeMessage).filter((item): item is ChatMessage => Boolean(item)) : []
}

/** Snapshot of the live transcript: still-streaming replies become stopped, empty ones are dropped. */
export function storableMessages(messages: ChatMessage[]): ChatMessage[] {
  return sanitizeMessages(messages)
}

function sanitizeConversation(value: any): Conversation | null {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id) return null
  const messages = sanitizeMessages(value.messages)
  if (!messages.length) return null
  const updatedAt = Number.isFinite(value.updatedAt) ? value.updatedAt : 0
  return {
    id: value.id,
    title: typeof value.title === 'string' && value.title.trim() ? value.title : titleFrom(messages.find(message => message.role === 'user')?.content || ''),
    model: typeof value.model === 'string' ? value.model : '',
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : updatedAt,
    updatedAt,
    messageCount: messages.length,
    messages
  }
}

/** Parses browser-local history, dropping malformed entries and keeping the newest first. */
export function parseHistory(raw: string | null | undefined): Conversation[] {
  if (!raw) return []
  let data: unknown
  try { data = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(data)) return []
  return sortConversations(data.map(sanitizeConversation).filter((item): item is Conversation => Boolean(item))).slice(0, HISTORY_LIMIT)
}

/** Serializes browser-local history without transient streaming flags. */
export function serializeHistory(conversations: Conversation[]) {
  const stored = sortConversations(conversations)
    .map(conversation => sanitizeConversation(JSON.parse(JSON.stringify(conversation))))
    .filter((item): item is Conversation => Boolean(item))
    .slice(0, HISTORY_LIMIT)
  return JSON.stringify(stored)
}

function timeOf(value: unknown) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(time) ? time : 0
}

/** Maps a server conversation (summary or full) to the client shape. */
export function fromServerConversation(value: any): Conversation | null {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id) return null
  const messages = Array.isArray(value.messages) ? sanitizeMessages(value.messages) : undefined
  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : '',
    model: typeof value.model === 'string' ? value.model : '',
    createdAt: timeOf(value.created_at),
    updatedAt: timeOf(value.updated_at),
    messageCount: Number.isFinite(value.message_count) ? value.message_count : messages?.length || 0,
    messages
  }
}

/** Request body for PUT /user/chat/conversations/:id. */
export function toServerPayload(conversation: Pick<Conversation, 'title' | 'model'>, messages: ChatMessage[]) {
  return {
    title: conversation.title,
    model: conversation.model,
    messages: messages.map(message => ({
      id: message.id,
      role: message.role,
      content: message.content,
      ...(message.reasoning ? { reasoning: message.reasoning } : {}),
      ...(message.model ? { model: message.model } : {}),
      ...(message.stopped ? { stopped: true } : {}),
      ...(message.error ? { error: message.error } : {}),
      ...(message.usage ? { usage: message.usage } : {}),
      ...(message.latencyMs != null ? { latency_ms: message.latencyMs } : {})
    }))
  }
}

export function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
}

function startOfDay(time: number) {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function conversationGroup(updatedAt: number, now = Date.now()): ConversationGroup {
  const today = startOfDay(now)
  const day = 24 * 60 * 60 * 1000
  if (updatedAt >= today) return 'today'
  if (updatedAt >= today - day) return 'yesterday'
  if (updatedAt >= today - 7 * day) return 'week'
  if (updatedAt >= today - 30 * day) return 'month'
  return 'older'
}

/** Groups conversations (newest first) into ChatGPT-style date buckets, skipping empty buckets. */
export function groupConversations(conversations: Conversation[], now = Date.now()) {
  const order: ConversationGroup[] = ['today', 'yesterday', 'week', 'month', 'older']
  const buckets = new Map<ConversationGroup, Conversation[]>(order.map(key => [key, []]))
  for (const conversation of sortConversations(conversations)) buckets.get(conversationGroup(conversation.updatedAt, now))!.push(conversation)
  return order.map(key => ({ key, items: buckets.get(key)! })).filter(group => group.items.length)
}
