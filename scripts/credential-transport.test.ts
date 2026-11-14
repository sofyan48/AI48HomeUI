import { describe, expect, test } from 'bun:test'
import { credentialInFlight, credentialWebsocketState, credentialUsingAPI, supportsCredentialUsingAPI, supportsCredentialWebsockets } from '../composables/credentialTransport'

describe('credential transport states', () => {
  test('distinguishes unsupported, unknown, off, and on WebSocket states', () => {
    expect(credentialWebsocketState({ provider: 'claude' })).toBe('unsupported')
    expect(credentialWebsocketState({ provider: 'xai' })).toBe('unknown')
    expect(credentialWebsocketState({ provider: 'xai', websockets: false })).toBe('off')
    expect(credentialWebsocketState({ provider: 'xai', websockets: true })).toBe('on')
    expect(supportsCredentialWebsockets({ provider: 'codex-api-key' })).toBe(true)
  })
  test('xAI using_api is independent from WebSockets', () => {
    expect(supportsCredentialUsingAPI({ provider: 'xai' })).toBe(true)
    expect(credentialUsingAPI({ provider: 'xai', using_api: 'true' })).toBe(true)
  })
  test('in-flight states disclose missing and incomplete observations', () => {
    expect(credentialInFlight({}).state).toBe('Unknown observation')
    expect(credentialInFlight({ in_flight: 2 }, { coverage_complete: false }).state).toBe('Incomplete observation')
    expect(credentialInFlight({ in_flight: 2 }).value).toBe('2')
  })
})
