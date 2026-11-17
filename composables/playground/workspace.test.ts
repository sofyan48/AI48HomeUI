import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ref } from 'vue'
import * as chat from './chat'

// Execute the production send handler with isolated workspace state and transport.
const source = readFileSync(new URL('./usePlaygroundWorkspace.ts', import.meta.url), 'utf8')
const handler = source.slice(source.indexOf('  async function send()'), source.indexOf('  watch(token,'))
const javascript = new Bun.Transpiler({ loader: 'ts' }).transformSync(handler)

function workspace(response: Response, streaming: boolean) {
  const messages = ref<chat.ChatMessage[]>([])
  const draft = ref('Hello')
  const sending = ref(false)
  const activeId = ref<string | null>(null)
  const saved: (string | null)[] = []
  const requests: Record<string, unknown>[] = []
  const dependencies = {
    ...chat,
    messages, draft, sending,
    canSend: ref(true), endpoint: ref('https://cpa.example/v1/chat/completions'),
    selectedModel: ref('test-model'), selectedKey: ref('test-key'),
    systemPrompt: ref('Be helpful'), temperature: ref(''), maxTokens: ref(''), stream: ref(streaming),
    history: { activeId },
    saveConversation(id: string | null) { saved.push(id); activeId.value = 'chat-1'; return 'chat-1' },
    patch(id: string, update: Partial<chat.ChatMessage>) {
      Object.assign(messages.value.find(message => message.id === id)!, update)
    },
    append(id: string, content: string, reasoning: string) {
      const message = messages.value.find(message => message.id === id)!
      message.content += content
      message.reasoning = (message.reasoning || '') + reasoning
    },
    t: (key: string) => key,
    async fetch(_url: string, options: RequestInit) {
      requests.push(JSON.parse(String(options.body)))
      return response
    }
  }
  const send = new Function(...Object.keys(dependencies), `let controller = null; ${javascript}; return send`)(...Object.values(dependencies))
  return { send, messages, draft, sending, activeId, saved, requests }
}

describe('playground send handler', () => {
  for (const streaming of [false, true]) {
    test(`sends ${streaming ? 'streamed' : 'non-streamed'} chat and saves its conversation`, async () => {
      const response = streaming
        ? new Response('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
        : Response.json({ choices: [{ message: { content: 'Hi' } }] })
      const state = workspace(response, streaming)
      await state.send()
      expect(state.requests[0]?.messages).toEqual([
        { role: 'system', content: 'Be helpful' }, { role: 'user', content: 'Hello' }
      ])
      expect(state.messages.value[1]).toMatchObject({ role: 'assistant', content: 'Hi', pending: false })
      expect(state.activeId.value).toBe('chat-1')
      expect(state.saved).toEqual([null, 'chat-1'])
      expect(state.draft.value).toBe('')
      expect(state.sending.value).toBe(false)
    })
  }

  test('clears sending state and saves the conversation after an upstream error', async () => {
    const state = workspace(Response.json({ error: { message: 'Unavailable' } }, { status: 503 }), false)
    await state.send()
    expect(state.messages.value[1]).toMatchObject({ pending: false, error: '503 · Unavailable' })
    expect(state.sending.value).toBe(false)
    expect(state.saved).toEqual([null, 'chat-1'])
  })
})
