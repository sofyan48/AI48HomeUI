import { describe, expect, test } from 'bun:test'
import {
  normalizeQuotaEntry,
  normalizeQuotaDetail,
  isRetainedQuotaWindow,
  isQuotaAttention,
  quotaPreviewWindows,
  quotaCollectionSettled,
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
  expires_at: '2099-11-11T10:30:00Z',
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

  test('detail normalization joins collection facts and full windows before resolving xAI state', () => {
    const detail = normalizeQuotaDetail({
      credential: { credential_id: 'xai', provider: 'xai', window_count: 1 },
      collection: { status: 'partial', source: 'response_header', freshness: 'fresh', observed_at: base.observed_at, expires_at: base.expires_at, error: null },
      windows: [{ id: 'xai-on-demand', observed_at: base.observed_at }],
    })
    expect(detail.collection.status).toBe('success')
    expect(detail.credential.windows).toHaveLength(1)
    expect(xaiOnDemandState(detail.credential)).toBe('enabled')
    expect(normalizeQuotaDetail({ ...detail, credential: { ...detail.credential, collection_status: 'partial', error: { code: 'UPSTREAM_UNAVAILABLE' } } }).collection.status).toBe('partial')
  })

  test('on-demand absence is unknown for passive, partial, failed, stale and expired reads', () => {
    const entry = { ...base, collection_status: 'success', source: 'active_probe', window_count: 0 }
    expect(xaiOnDemandState(entry)).toBe('disabled')
    for (const overrides of [{ source: 'response_header' }, { collection_status: 'partial' }, { collection_status: 'failed' }, { freshness: 'stale' }, { expires_at: '2000-01-01T00:00:00Z' }]) {
      expect(xaiOnDemandState({ ...entry, ...overrides })).toBe('unknown')
    }
  })

  test('clean passive observations do not need attention or settle an active collection', () => {
    const entry = { ...base, quota_status: 'healthy' }
    expect(isQuotaAttention(entry)).toBe(false)
    expect(isQuotaAttention({ ...entry, error: { code: 'UPSTREAM_UNAVAILABLE' } })).toBe(true)
    expect(quotaCollectionSettled({ ...entry, last_attempt_at: '2026-11-11T11:00:00Z' }, base)).toBe(false)
    expect(quotaCollectionSettled({ ...entry, source: 'active_probe', last_attempt_at: '2026-11-11T11:00:00Z' }, base)).toBe(true)
  })

  test('Antigravity previews include reported weekly windows without synthesizing missing cycles', () => {
    const window = (scope_id: string, period_unit: string) => ({ id: `${scope_id}-${period_unit}`, scope: 'model', scope_id, period_unit, period_value: period_unit === 'hour' ? 5 : 1 })
    const windows = [window('gemini', 'hour'), window('third-party', 'hour'), window('gemini', 'week'), window('third-party', 'week')]
    const entry = { ...base, provider: 'antigravity', primary_windows: windows.slice(0, 2), window_count: 4 }
    expect(quotaPreviewWindows(entry)).toHaveLength(2)
    expect(quotaPreviewWindows({ ...entry, windows }).map(window => window.id)).toEqual(['gemini-hour', 'gemini-week', 'third-party-hour', 'third-party-week'])
    expect(quotaPreviewWindows({ ...entry, primary_windows: windows.slice(2) }).map(window => window.period_unit)).toEqual(['week', 'week'])
    expect(quotaPreviewWindows({ ...entry, primary_windows: [windows[0], windows[3]] }).map(window => window.id)).toEqual(['gemini-hour', 'third-party-week'])
  })

  test('Codex previews keep account and Spark periods, not an unrelated third family', () => {
    const window = (scope: string, scope_id: string, period_unit: string) => ({ id: `${scope_id}-${period_unit}`, scope, scope_id, period_unit, period_value: period_unit === 'hour' ? 5 : 1 })
    const account = [window('account', 'codex', 'week'), window('account', 'codex', 'hour')]
    const spark = [window('model', 'codex_bengalfox', 'week'), window('model', 'codex_bengalfox', 'hour')]
    const entry = { provider: 'codex', primary_windows: [account[0], spark[0]], windows: [...account, ...spark, window('model', 'review', 'week')] }
    expect(quotaPreviewWindows(entry).map(window => window.id)).toEqual(['codex-hour', 'codex-week', 'codex_bengalfox-hour', 'codex_bengalfox-week'])
  })

  test('detail reconciliation preserves stale state, reset credits, and settled collection state', () => {
    const entry = { ...base, collection_status: 'success', freshness: 'stale' }
    const detail = { credential: { ...base, collection_status: 'success' }, windows: [{ id: 'full' }], reset_credits: { available_count: 2 } }
    expect(resolveQuotaPreviewEntry(entry, detail)).toMatchObject({ freshness: 'stale', reset_credits: { available_count: 2 }, windows: [{ id: 'full' }] })
    expect(resolveQuotaPreviewEntry(entry, { ...detail, credential: { ...detail.credential, collection_status: 'collecting' } })).toBe(entry)
  })

  test('retained markers require valid older observation times', () => {
    expect(isRetainedQuotaWindow(base, { observed_at: '2026-11-11T09:00:00Z' })).toBe(true)
    expect(isRetainedQuotaWindow(base, { observed_at: base.observed_at })).toBe(false)
    expect(isRetainedQuotaWindow(base, { observed_at: 'invalid' })).toBe(false)
  })

  test('stored detail does not replace a newer list snapshot', () => {
    const entry = { ...base, observed_at: '2026-11-11T10:00:00Z' }
    const detail = { credential: { ...entry, observed_at: '2026-11-11T09:00:00Z' }, windows: [{ id: 'old' }] }
    expect(resolveQuotaPreviewEntry(entry, detail)).toBe(entry)
  })
})
