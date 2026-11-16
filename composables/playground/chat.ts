/** Pure helpers for the user chat playground (/app/playground). */
export type ChatUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  model?: string
  pending?: boolean
  stopped?: boolean
  error?: string
  usage?: ChatUsage | null
  latencyMs?: number
}
export type StreamDelta = { content: string; reasoning: string; usage: ChatUsage | null; done: boolean; error?: string }

let sequence = 0
export function messageId() { return `msg-${Date.now().toString(36)}-${(sequence++).toString(36)}` }

/** Builds the OpenAI-compatible chat endpoint from the public CPA URL; null when it is missing or not HTTP(S). */
export function chatCompletionsUrl(base?: string | null): string | null {
  const raw = String(base || '').trim()
  if (!raw) return null
  let url: URL
  try { url = new URL(raw) } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const basePath = url.pathname.replace(/\/+$/, '')
  url.pathname = `${basePath.endsWith('/v1') ? basePath : `${basePath}/v1`}/chat/completions`
  url.search = ''
  url.hash = ''
  return url.toString()
}

function textContent(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(part => typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : '').join('')
  return ''
}

function payloadError(payload: any): string | undefined {
  const error = payload?.error
  if (!error) return undefined
  if (typeof error === 'string') return error
  return typeof error.message === 'string' && error.message ? error.message : 'Upstream error'
}

function usageOf(payload: any): ChatUsage | null {
  const usage = payload?.usage
  return usage && typeof usage === 'object' ? usage : null
}

/** Parses one server-sent-events line of a streamed chat completion. */
export function parseStreamLine(line: string): StreamDelta | null {
  const text = line.trim()
  if (!text.startsWith('data:')) return null
  const data = text.slice(5).trim()
  if (!data) return null
  if (data === '[DONE]') return { content: '', reasoning: '', usage: null, done: true }
  let payload: any
  try { payload = JSON.parse(data) } catch { return null }
  const delta = payload?.choices?.[0]?.delta ?? {}
  return {
    content: textContent(delta.content),
    reasoning: textContent(delta.reasoning_content ?? delta.reasoning),
    usage: usageOf(payload),
    done: false,
    error: payloadError(payload)
  }
}

/** Extracts the reply of a non-streamed chat completion. */
export function completionReply(payload: any) {
  const message = payload?.choices?.[0]?.message ?? {}
  return {
    content: textContent(message.content),
    reasoning: textContent(message.reasoning_content ?? message.reasoning),
    usage: usageOf(payload),
    error: payloadError(payload)
  }
}

/** Yields complete lines from a byte stream, keeping partial lines buffered between chunks. */
export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let index = buffer.indexOf('\n')
      while (index >= 0) {
        yield buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        index = buffer.indexOf('\n')
      }
    }
    buffer += decoder.decode()
    if (buffer) yield buffer
  } finally {
    reader.releaseLock()
  }
}

/** Reads a readable error message from a failed HTTP response. */
export async function responseErrorMessage(response: Response) {
  const text = await response.text().catch(() => '')
  try {
    const message = payloadError(JSON.parse(text))
    if (message) return `${response.status} · ${message}`
  } catch { /* Fall back to the raw body below. */ }
  return `${response.status} · ${text.trim().slice(0, 300) || response.statusText || 'Request failed'}`
}

/** Conversation history for the next request: drops failed or still-pending replies. */
export function historyFor(messages: ChatMessage[], systemPrompt: string) {
  const system = systemPrompt.trim()
  return [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    ...messages.filter(message => !message.pending && !message.error && message.content).map(message => ({ role: message.role, content: message.content }))
  ]
}

export function parseOptionalNumber(value: unknown, min: number, max: number, integer = false): number | undefined {
  const text = String(value ?? '').trim()
  if (!text) return undefined
  const number = Number(text)
  if (!Number.isFinite(number) || number < min || number > max) return undefined
  return integer ? Math.trunc(number) : number
}
