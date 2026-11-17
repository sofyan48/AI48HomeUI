import { describe, expect, test } from 'bun:test'
import { diagnosticMessage } from './diagnosticMessage'

describe('diagnosticMessage', () => {
  test('extracts provider error messages without rendering raw metadata', () => {
    expect(diagnosticMessage(JSON.stringify({ error: { code: 429, message: 'Quota reached. Resets in 4h23m52s.', details: [{ internal: 'metadata' }] } })))
      .toBe('Quota reached. Resets in 4h23m52s.')
    expect(diagnosticMessage('{"message":"Unavailable"}')).toBe('Unavailable')
  })

  test('preserves plain messages and tolerates invalid JSON', () => {
    expect(diagnosticMessage(' Refresh failed ')).toBe('Refresh failed')
    expect(diagnosticMessage('{invalid')).toBe('{invalid')
    expect(diagnosticMessage(null)).toBe('')
  })

  test('uses status when available and hides unrecognized JSON payloads', () => {
    expect(diagnosticMessage('{"error":{"status":"RESOURCE_EXHAUSTED"}}')).toBe('RESOURCE_EXHAUSTED')
    expect(diagnosticMessage('{"details":[]}')).toBe('')
    expect(diagnosticMessage('[]')).toBe('')
  })
})
