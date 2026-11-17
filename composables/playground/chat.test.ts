import { describe, expect, test } from 'bun:test'
import { chatCompletionsUrl, completionReply, historyFor, parseOptionalNumber, parseStreamLine, readLines } from './chat'

describe('playground chat helpers', () => {
  test('builds the chat endpoint from the public CPA URL', () => {
    expect(chatCompletionsUrl('https://api.example.com')).toBe('https://api.example.com/v1/chat/completions')
    expect(chatCompletionsUrl('https://api.example.com/v1/')).toBe('https://api.example.com/v1/chat/completions')
    expect(chatCompletionsUrl('https://api.example.com/proxy?x=1#y')).toBe('https://api.example.com/proxy/v1/chat/completions')
    expect(chatCompletionsUrl('')).toBeNull()
    expect(chatCompletionsUrl('not a url')).toBeNull()
    expect(chatCompletionsUrl('javascript:alert(1)')).toBeNull()
  })

  test('parses streamed deltas, usage, errors and the done marker', () => {
    expect(parseStreamLine('data: {"choices":[{"delta":{"content":"Hi"}}]}')).toMatchObject({ content: 'Hi', reasoning: '', done: false })
    expect(parseStreamLine('data: {"choices":[{"delta":{"reasoning_content":"think"}}]}')?.reasoning).toBe('think')
    expect(parseStreamLine('data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":5}}')?.usage).toEqual({ prompt_tokens: 3, completion_tokens: 5 })
    expect(parseStreamLine('data: {"error":{"message":"quota"}}')?.error).toBe('quota')
    expect(parseStreamLine('data: [DONE]')?.done).toBe(true)
    expect(parseStreamLine(': keep-alive')).toBeNull()
    expect(parseStreamLine('event: message')).toBeNull()
    expect(parseStreamLine('data: {broken')).toBeNull()
  })

  test('reads non-streamed replies including content parts', () => {
    expect(completionReply({ choices: [{ message: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } }] }).content).toBe('ab')
    expect(completionReply({ error: 'denied' }).error).toBe('denied')
  })

  test('history keeps the system prompt and drops failed or pending replies', () => {
    expect(historyFor([
      { id: '1', role: 'user', content: 'q1' },
      { id: '2', role: 'assistant', content: '', error: 'boom' },
      { id: '3', role: 'assistant', content: 'partial', pending: true },
      { id: '4', role: 'user', content: 'q2' }
    ], '  Be brief ')).toEqual([
      { role: 'system', content: 'Be brief' },
      { role: 'user', content: 'q1' },
      { role: 'user', content: 'q2' }
    ])
  })

  test('optional numbers are bounded', () => {
    expect(parseOptionalNumber('', 0, 2)).toBeUndefined()
    expect(parseOptionalNumber('0.7', 0, 2)).toBe(0.7)
    expect(parseOptionalNumber('3', 0, 2)).toBeUndefined()
    expect(parseOptionalNumber('12.9', 1, 100, true)).toBe(12)
  })

  test('line reader joins chunks split mid-line', async () => {
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of ['data: a\nda', 'ta: b\n', 'data: c']) controller.enqueue(encoder.encode(chunk))
        controller.close()
      }
    })
    const lines: string[] = []
    for await (const line of readLines(body)) lines.push(line)
    expect(lines).toEqual(['data: a', 'data: b', 'data: c'])
  })
})
