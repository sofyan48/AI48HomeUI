import { describe, expect, test } from 'bun:test'
import {
  normalizeQuotaEntry,
  quotaDisplayWindows,
  quotaHistorical,
  quotaWindowLabel,
  resolveQuotaPreviewEntry,
  xaiOnDemandState,
  xaiProductWindows,
} from '../composables/upstreamQuota'

const base = {
  credential_id: 'credential-1',
  provider: 'xai',
  credential_type: 'oauth',
  collection_status: 'partial',
  source: 'response_header',
  error: null,
  freshness: 'fresh',
  observed_at: '2026-11-11T10:00:00Z',
  expires_at: '2026-11-11T10:30:00Z',
  last_attempt_at: '2026-11-11T10:00:00Z',
  window_count: 3,
  primary_windows: [],
  windows: [],
}

describe('upstream quota normalization and previews', () => {
  test('error-free response-header partial snapshots normalize to success', () => {
    expect(normalizeQuotaEntry(base).collection_status).toBe('success')
    expect(normalizeQuotaEntry({ ...base, error: { code: 'UPSTREAM_UNAVAILABLE' } }).collection_status).toBe('partial')
  })

  test('retained windows are historical and do not enable xAI on-demand', () => {
    const quota = normalizeQuotaEntry({
      ...base,
      collection_status: 'success',
      source: 'active_probe',
      primary_windows: [{ id: 'xai-on-demand', observed_at: '2026-11-11T09:00:00Z', remaining_ratio: 1 }],
    })
    expect(quotaHistorical(quota)).toBe(false)
    expect(xaiOnDemandState(quota)).toBe('unknown')
  })

  test('xAI and Devin previews use reported windows only', () => {
    const xai = { ...base, primary_windows: [{ id: 'xai-weekly-usage' }, { id: 'xai-product-grok', scope_id: 'xai-product-usage' }, { id: 'xai-on-demand' }] }
    expect(quotaDisplayWindows(xai).map(window => window.id)).toEqual(['xai-weekly-usage', 'xai-on-demand'])
    expect(xaiProductWindows(xai)).toHaveLength(1)
    expect(quotaWindowLabel({ id: 'devin-daily', period_unit: 'day', period_value: 1 }, 'devin')).toBe('Daily')
  })

  test('stored detail does not replace a newer list snapshot', () => {
    const entry = { ...base, observed_at: '2026-11-11T10:00:00Z' }
    const detail = { credential: { ...entry, observed_at: '2026-11-11T09:00:00Z' }, windows: [{ id: 'old' }] }
    expect(resolveQuotaPreviewEntry(entry, detail)).toBe(entry)
  })
})
