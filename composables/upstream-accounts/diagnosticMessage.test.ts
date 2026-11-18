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

  test('extracts complete messages from truncated health response bodies', () => {
    expect(diagnosticMessage('{"error":{"type":"usage_limit_reached","message":"The usage limit has been reached","plan_type":"team","resets_at":1794984881'))
      .toBe('The usage limit has been reached')
    expect(diagnosticMessage('{ "error": { "code": 403, "message": "This service has been disabled. Please submit an appeal.", "status"'))
      .toBe('This service has been disabled. Please submit an appeal.')
    expect(diagnosticMessage('{"error":{"message":"Try \\"again\\".\\nLater.","details":'))
      .toBe('Try "again".\nLater.')
  })

  test('uses status when available and hides unrecognized JSON payloads', () => {
    expect(diagnosticMessage('{"error":{"status":"RESOURCE_EXHAUSTED"}}')).toBe('RESOURCE_EXHAUSTED')
    expect(diagnosticMessage('{"details":[]}')).toBe('')
    expect(diagnosticMessage('[]')).toBe('')
  })
})
