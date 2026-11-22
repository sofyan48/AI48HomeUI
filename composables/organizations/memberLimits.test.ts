import { describe, expect, test } from 'bun:test'
import { enabledSpendWindows, emptyMemberLimits, memberLimitsBody, memberLimitsFromRecord, memberLimitsSummary, memberWindowModes } from './memberLimits'

describe('organization member limits', () => {
  test('5h has no calendar mode; longer windows do', () => {
    expect(memberWindowModes('5h')).toEqual(['sliding', 'first_use'])
    expect(memberWindowModes('7d')).toContain('calendar')
  })

  test('records hydrate drafts and fall back to sliding for legacy members', () => {
    const form = memberLimitsFromRecord({ limit_1d_credits: 5, limit_5h_credits: null, window_mode_7d: 'calendar', window_mode_5h: 'calendar' })
    expect(form['1d']).toEqual({ limit: '5', mode: 'sliding' })
    expect(form['7d'].mode).toBe('calendar')
    expect(form['5h']).toEqual({ limit: '', mode: 'sliding' })
  })

  test('body sends every window with null for empty limits', () => {
    const form = emptyMemberLimits()
    form['5h'] = { limit: '2', mode: 'first_use' }
    const result = memberLimitsBody(form)
    expect(result).toEqual({ ok: true, body: {
      limit_5h_credits: 2, window_mode_5h: 'first_use',
      limit_1d_credits: null, window_mode_1d: 'sliding',
      limit_7d_credits: null, window_mode_7d: 'sliding',
      limit_30d_credits: null, window_mode_30d: 'sliding',
    } })
  })

  test('invalid and over-cap limits are rejected before the request', () => {
    const form = emptyMemberLimits()
    form['1d'].limit = '-1'
    expect(memberLimitsBody(form)).toEqual({ ok: false, reason: 'invalid', window: '1d' })
    form['1d'].limit = '25'
    expect(memberLimitsBody(form, { limit_1d_credits: 20 })).toEqual({ ok: false, reason: 'exceeds', window: '1d', cap: 20 })
    form['1d'].limit = '20'
    expect(memberLimitsBody(form, { limit_1d_credits: 20 }).ok).toBe(true)
  })

  test('display omits disabled windows but keeps zero limits and unused first-use windows', () => {
    const windows = [
      { id: '5h', limit: null },
      { id: '1d', limit: 0 },
      { id: '7d', limit: 10, active: false, mode: 'first_use' },
      { id: '30d' },
    ]
    expect(enabledSpendWindows(windows)).toEqual([windows[1]!, windows[2]!])
    expect(enabledSpendWindows([{ limit: null }, {}])).toEqual([])
  })

  test('summary lists only enabled windows', () => {
    expect(memberLimitsSummary({ limit_5h_credits: 2, limit_30d_credits: 50, limit_1d_credits: null }, 'none')).toBe('5h 2 · 30d 50')
    expect(memberLimitsSummary({}, 'none')).toBe('none')
  })
})
