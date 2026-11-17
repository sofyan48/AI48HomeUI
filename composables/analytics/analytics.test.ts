import { describe, expect, test } from 'bun:test'
import { analyticsCSV, analyticsKeyChoices, csvCell, defaultAnalyticsFilters, validateRange, type UserAnalytics } from './types'

const metrics = { requests: 2, input_tokens: 20, output_tokens: 8, cache_tokens: 10, billed_amount: 0.01234567, base_amount: 0.02, unpriced_requests: 1 }
const data: UserAnalytics = {
  from: '2026-11-01T00:00:00Z', to: '2026-11-03T00:00:00Z', timezone: 'UTC', source: 'billing_charge', model: '', api_key_id: null,
  summary: metrics, daily: [{ ...metrics, date: '2026-11-01' }],
  per_model: [{ ...metrics, model: '=HYPERLINK("https://example.test")' }],
  per_key: [{ ...metrics, api_key_id: 42 }, { ...metrics, api_key_id: null }],
}

describe('user analytics helpers', () => {
  test('key selector retains only owned key IDs and names, never secrets', () => {
    expect(analyticsKeyChoices({ api_keys: [
      { id: 7, display_name: ' Work ', api_key: 'secret' },
      { id: 2, display_name: null },
      { id: 0 }, { id: '9' }, null,
    ] })).toEqual([{ id: 2, name: '' }, { id: 7, name: 'Work' }])
    expect(analyticsKeyChoices({ items: [{ id: 3, display_name: 'Personal' }] })).toEqual([{ id: 3, name: 'Personal' }])
    expect(analyticsKeyChoices(null)).toEqual([])
  })
  test('defaults to 30 UTC dates including today, exclusive end', () => {
    expect(defaultAnalyticsFilters(new Date('2026-11-17T23:20:00-05:00'))).toEqual({ from: '2026-10-20', to: '2026-11-19', model: '', api_key_id: '' })
  })
  test('validates exclusive boundaries, leap dates, and max range', () => {
    const filters = { ...defaultAnalyticsFilters(), from: '2026-11-01', to: '2026-11-01' }
    expect(validateRange(filters)).toBe('invalid')
    expect(validateRange({ ...filters, from: '2026-02-30', to: '2026-03-02' })).toBe('invalid')
    expect(validateRange({ ...filters, from: '2024-02-29', to: '2024-03-01' })).toBeNull()
    expect(validateRange({ ...filters, from: '2025-01-01', to: '2026-01-03' })).toBe('long')
  })
  test('quotes commas, quotes, newlines and neutralizes formulas', () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"')
    for (const name of ['=1+1', '+123', '-1', '@SUM(1)', '\t=1']) expect(csvCell(name)).toStartWith('"\'')
    expect(csvCell(-1)).toBe('"-1"')
  })
  test('exports complete groups with full precision and source range', () => {
    const models = analyticsCSV(data, 'models')
    expect(models).toStartWith('\uFEFF"from_inclusive_utc"')
    expect(models).toContain('"\'=HYPERLINK(""https://example.test"")"')
    expect(models).toContain('"0.01234567"')
    expect(models).toContain('"billing_charge"')
    expect(analyticsCSV(data, 'daily')).toContain('"2026-11-01"')
    const keys = analyticsCSV(data, 'keys')
    expect(keys).toContain('"api_key_id"')
    expect(keys).toContain('"42"')
    expect(keys.split('\r\n')).toHaveLength(4)
  })
})
