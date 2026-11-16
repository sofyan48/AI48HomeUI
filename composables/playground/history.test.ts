import { describe, expect, test } from 'bun:test'
import {
  conversationGroup, conversationId, fromServerConversation, groupConversations, historyStorageKey, parseHistory,
  serializeHistory, storableMessages, titleFrom, toServerPayload, type Conversation
} from './history'

const day = 24 * 60 * 60 * 1000

describe('playground history helpers', () => {
  test('generates server-compatible conversation ids and per-user storage keys', () => {
    const id = conversationId()
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/)
    expect(conversationId()).not.toBe(id)
    expect(historyStorageKey(7)).toBe('ai48.playground.history.v1:7')
    expect(historyStorageKey(undefined)).toBe('')
  })

  test('derives compact titles from the first message', () => {
    expect(titleFrom('  Hello\n\n  world ')).toBe('Hello world')
    expect(titleFrom('x'.repeat(100))).toHaveLength(60)
  })

  test('stores streaming replies as stopped and drops empty pending ones', () => {
    const stored = storableMessages([
      { id: 'a', role: 'user', content: 'hi' },
      { id: 'b', role: 'assistant', content: 'partial', pending: true },
      { id: 'c', role: 'assistant', content: '', pending: true }
    ])
    expect(stored.map(message => message.id)).toEqual(['a', 'b'])
    expect(stored[1]).toMatchObject({ stopped: true })
    expect(stored[1]).not.toHaveProperty('pending')
  })

  test('maps server summaries and builds the PUT payload', () => {
    const summary = fromServerConversation({ id: 'chat-1', title: 'T', model: 'm', message_count: 4, created_at: '2026-11-16T10:00:00Z', updated_at: '2026-11-16T11:00:00Z' })
    expect(summary).toMatchObject({ id: 'chat-1', messageCount: 4, updatedAt: Date.parse('2026-11-16T11:00:00Z') })
    expect(summary?.messages).toBeUndefined()

    const full = fromServerConversation({ id: 'chat-1', messages: [{ id: 'm', role: 'assistant', content: 'ok', latency_ms: 12 }] })
    expect(full?.messages?.[0]).toMatchObject({ content: 'ok', latencyMs: 12 })

    const payload = toServerPayload({ title: 'T', model: 'm' }, [{ id: 'm', role: 'assistant', content: 'ok', latencyMs: 12, usage: { total_tokens: 3 } }])
    expect(payload.messages[0]).toEqual({ id: 'm', role: 'assistant', content: 'ok', usage: { total_tokens: 3 }, latency_ms: 12 })
    expect(fromServerConversation({ title: 'no id' })).toBeNull()
  })

  test('round-trips local history and ignores malformed data', () => {
    const conversation: Conversation = { id: 'chat-1', title: 'T', model: 'm', createdAt: 1, updatedAt: 2, messageCount: 1, messages: [{ id: 'a', role: 'user', content: 'hi' }] }
    expect(parseHistory(serializeHistory([conversation]))).toEqual([conversation])
    expect(parseHistory('not json')).toEqual([])
    expect(parseHistory('[{"id":"x","messages":[]}]')).toEqual([])
  })

  test('groups conversations into date buckets', () => {
    const now = new Date('2026-11-16T12:00:00').getTime()
    expect(conversationGroup(now - 1000, now)).toBe('today')
    expect(conversationGroup(now - day, now)).toBe('yesterday')
    expect(conversationGroup(now - 3 * day, now)).toBe('week')
    expect(conversationGroup(now - 20 * day, now)).toBe('month')
    expect(conversationGroup(now - 60 * day, now)).toBe('older')
    const make = (id: string, updatedAt: number): Conversation => ({ id, title: id, model: '', createdAt: updatedAt, updatedAt, messageCount: 1 })
    const groups = groupConversations([make('old', now - 60 * day), make('new', now), make('newer', now + 1)], now)
    expect(groups.map(group => group.key)).toEqual(['today', 'older'])
    expect(groups[0]!.items.map(item => item.id)).toEqual(['newer', 'new'])
  })
})
