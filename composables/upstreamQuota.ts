/** Optional translator (e.g. useAdminI18n().t); omitted callers keep the English defaults. */
export type QuotaTranslator = (key: any, params?: Record<string, string | number | null | undefined>) => string

export type QuotaCollectionEntry = {
  credential_id: string
  provider?: string
  credential_type?: string
  credential_status?: string
  collection_status?: string
  last_attempt_at?: string | null
  source?: string | null
  quota_status?: string
  error?: { code?: string; message?: string } | null
  [key: string]: unknown
}

/** Normalize Home's raw snake_case quota DTO without inventing provider data. */
export function normalizeQuotaEntry<T extends QuotaCollectionEntry>(entry: T): T {
  const source = entry.source || null
  const hasError = Boolean(entry.error?.code || entry.error?.message)
  return {
    ...entry,
    // Error-free response-header snapshots are complete observations even
    // though Home marks them partial to distinguish them from an active probe.
    collection_status:
      entry.collection_status === 'partial' && source === 'response_header' && !hasError
        ? 'success'
        : entry.collection_status,
  }
}

export function normalizeQuotaEntries<T extends QuotaCollectionEntry>(entries: T[]): T[] {
  return entries.map(normalizeQuotaEntry)
}

export function isRetainedQuotaWindow(
  snapshot: { observed_at?: string | null } | null | undefined,
  window: { observed_at?: string | null } | null | undefined,
): boolean {
  const snapshotAt = Date.parse(snapshot?.observed_at || '')
  const windowAt = Date.parse(window?.observed_at || '')
  return Number.isFinite(snapshotAt) && Number.isFinite(windowAt) && windowAt < snapshotAt
}

export function xaiProductWindows(quota: { primary_windows?: any[]; windows?: any[] }): any[] {
  const seen = new Set<string>()
  return [...(quota.primary_windows || []), ...(quota.windows || [])].filter((window) => {
    const id = String(window?.id || '')
    const scope = String(window?.scope_id || '').toLowerCase()
    if (!(scope === 'xai-product-usage' || id.toLowerCase().startsWith('xai-product-')) || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function xaiOnDemandState(quota: any): 'enabled' | 'disabled' | 'unknown' {
  const expires = Date.parse(quota?.expires_at || '')
  if (quota?.freshness !== 'fresh' || (Number.isFinite(expires) && expires <= Date.now())) return 'unknown'
  const windows = [...(quota?.primary_windows || []), ...(quota?.windows || [])]
  const onDemand = windows.find((window) => window?.id === 'xai-on-demand')
  if (onDemand) return isRetainedQuotaWindow(quota, onDemand) ? 'unknown' : 'enabled'
  if (quota?.source === 'response_header') return 'unknown'
  const observedEmpty = quota?.source === 'active_probe' && quota?.window_count === 0 && Number.isFinite(Date.parse(quota?.observed_at || ''))
  return quota?.collection_status === 'success' && (windows.length > 0 || observedEmpty)
    ? 'disabled'
    : 'unknown'
}

export function quotaCollectionSettled(entry: QuotaCollectionEntry, baseline: QuotaCollectionEntry): boolean {
  if (entry.provider !== baseline.provider || entry.credential_type !== baseline.credential_type) return false
  if (!['success', 'partial', 'failed'].includes(entry.collection_status || '')) return false
  const attempt = Date.parse(entry.last_attempt_at || '')
  const previous = Date.parse(baseline.last_attempt_at || '')
  if (!Number.isFinite(attempt)) return false
  // A probe already leased before POST can settle without changing its attempt timestamp.
  const newer = !baseline.last_attempt_at || (Number.isFinite(previous) && attempt > previous)
  const existing = baseline.collection_status === 'collecting' && entry.last_attempt_at === baseline.last_attempt_at
  return (newer || existing) && (entry.collection_status === 'failed' || entry.source === 'active_probe' || entry.source === 'mixed')
}

export function credentialWeightPatch(raw: string, unset: boolean): number | null {
  if (unset) return null
  const text = String(raw).trim()
  if (!/^-?\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) > 1_000_000) {
    throw new Error('Weight must be an integer no greater than 1,000,000. Use Unset to clear it.')
  }
  return Number(text) <= 0 ? 0 : Number(text)
}

type QuotaWindow = {
  id: string
  unit?: string
  currency?: string | null
  is_unlimited?: boolean
  isUnlimited?: boolean
  observed_at?: string | null
  remaining_ratio?: number | null
  period_unit?: string | null
  period_value?: number | null
  label?: string | null
  scope_id?: string | null
}

export function normalizeQuotaDetail(detail: any): any {
  if (!detail?.credential) return detail
  const collection = detail.collection || {}
  const credential = normalizeQuotaEntry({
    ...detail.credential,
    collection_status: detail.credential.collection_status ?? collection.status,
    source: detail.credential.source ?? collection.source,
    freshness: detail.credential.freshness ?? collection.freshness,
    observed_at: detail.credential.observed_at ?? collection.observed_at,
    expires_at: detail.credential.expires_at ?? collection.expires_at,
    last_attempt_at: detail.credential.last_attempt_at ?? collection.last_attempt_at,
    windows: detail.windows ?? detail.credential.windows ?? [],
    error: detail.credential.error ?? collection.error,
  })
  return { ...detail, credential, collection: { ...collection, status: credential.collection_status, error: credential.error } }
}

export function quotaWindowAmount(value: number | null | undefined, window: QuotaWindow, locale?: string): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const amount = Number(value).toLocaleString(locale, { maximumFractionDigits: 2 })
  if (window.unit === 'percentage') return `${amount}%`
  return window.currency ? `${amount} ${window.currency}` : amount
}

export function quotaDisplayWindows<T extends QuotaWindow>(quota: { provider?: string; primary_windows?: T[]; windows?: T[] }): T[] {
  const primary = quota.primary_windows || []
  const windows = [...new Map([...primary, ...(quota.windows || [])].map(window => [window.id, window])).values()]
  if (!['xai', 'grok'].includes(String(quota.provider).toLowerCase())) return (primary.length ? primary : windows).slice(0, 2)
  // Product shares are a breakdown of the same allowance, never extra quotas.
  const ordered = ['xai-weekly-usage', 'xai-monthly-spend', 'xai-on-demand']
    .flatMap(id => { const window = windows.find(entry => entry.id === id); return window ? [window] : [] })
  return ordered.slice(0, 2)
}

export function quotaPreviewWindows(quota: any): any[] {
  const provider = String(quota.provider || '').trim().toLowerCase()
  if (['xai', 'grok', 'devin'].includes(provider)) return quotaDisplayWindows(quota)
  const windows = [...new Map<string, any>([...(quota.primary_windows || []), ...(quota.windows || [])].map(window => [window.id, window])).values()]
  const grouped = provider === 'antigravity'
    ? windows.filter(window => ['gemini', 'third-party'].includes(window.scope_id)) : windows
  if (provider !== 'antigravity' && grouped.some(window => !window.scope || window.scope === 'unknown')) return quotaDisplayWindows(quota)
  const family = (window: any) => `${window.scope}:${window.scope_id || (window.scope === 'model' ? window.label || window.id : '')}`
  const families = [...new Set(grouped.map(family))].slice(0, 2)
  const period = (window: any) => window.period_unit === 'minute' && window.period_value % 60 === 0 ? `hour:${window.period_value / 60}` : `${window.period_unit}:${window.period_value}`
  // Only periods actually reported by Home are eligible, including Antigravity.
  const periods = [...new Set(grouped.filter(window => window.period_value > 0 && window.period_unit !== 'unknown').map(period))]
    .sort((left, right) => (left === 'hour:5' ? 0 : left === 'week:1' ? 1 : 2) - (right === 'hour:5' ? 0 : right === 'week:1' ? 1 : 2)).slice(0, 2)
  if (!periods.length) return provider === 'antigravity' ? grouped.slice(0, 2) : quotaDisplayWindows(quota)
  return families.flatMap(id => periods.flatMap(key => { const window = grouped.find(window => family(window) === id && period(window) === key); return window ? [window] : [] }))
}

export function quotaHistorical(quota: any, now = Date.now()): boolean {
  const expires = Date.parse(quota?.expires_at || '')
  return Boolean(quota?.observed_at && (quota?.freshness !== 'fresh' || (Number.isFinite(expires) && expires <= now)))
}

const quotaUnitKeys: Record<string, string> = { minute: 'quota.unit.minute', hour: 'quota.unit.hour', day: 'quota.unit.day', week: 'quota.unit.week', month: 'quota.unit.month', year: 'quota.unit.year' }

export function quotaWindowLabel(window: any, provider?: string, t?: QuotaTranslator): string {
  const formatPeriod = (value: number, unit: string) => t
    ? t('quota.period', { value, unit: quotaUnitKeys[unit] ? t(quotaUnitKeys[unit]) : unit })
    : `${value} ${unit}`
  const period = window.period_unit === 'minute' && window.period_value % 60 === 0
    ? formatPeriod(window.period_value / 60, 'hour') : window.period_unit && window.period_unit !== 'unknown' && window.period_value
      ? formatPeriod(window.period_value, window.period_unit) : ''
  if (provider === 'devin') {
    if (window.id === 'devin-daily') return t ? t('quota.window.daily') : 'Daily'
    if (window.id === 'devin-weekly') return t ? t('quota.window.weekly') : 'Weekly'
  }
  const identity = window.label || window.scope_id || window.id
  return period ? `${identity} · ${period}` : identity
}

export function quotaWindowRatio(window: any): number | null {
  if (window.remaining_ratio == null || !Number.isFinite(Number(window.remaining_ratio))) return null
  return Math.max(0, Math.min(1, Number(window.remaining_ratio)))
}

export function quotaProductUsed(window: any, t?: QuotaTranslator): string {
  const value = window.used ?? (window.used_ratio == null ? null : Number(window.used_ratio) * 100)
  if (value == null || !Number.isFinite(Number(value))) return t ? t('quota.productUnknown') : 'Unknown usage'
  const percent = Math.round(Math.max(0, Math.min(100, Number(value))))
  return t ? t('quota.productUsed', { percent }) : `${percent}% used`
}

export function needsQuotaPreviewDetail(entry: any): boolean {
  return entry?.quota_status !== 'unsupported' && entry?.window_count > new Set([...(entry?.primary_windows || []), ...(entry?.windows || [])].map(window => window.id)).size
}

// Never attach stored windows to a different identity or an older snapshot.
export function resolveQuotaPreviewEntry(entry: any, detail: any): any {
  const candidate = normalizeQuotaDetail(detail)?.credential
  if (!candidate || candidate.credential_id !== entry.credential_id || candidate.provider !== entry.provider || candidate.credential_type !== entry.credential_type) return entry
  for (const field of ['observed_at', 'last_attempt_at']) {
    if (entry[field] && (!Number.isFinite(Date.parse(candidate[field] || '')) || Date.parse(candidate[field]) < Date.parse(entry[field]))) return entry
  }
  if (entry.last_attempt_at === candidate.last_attempt_at && entry.collection_status !== 'collecting' && candidate.collection_status === 'collecting') return entry
  const same = entry.observed_at === candidate.observed_at && entry.last_attempt_at === candidate.last_attempt_at
  return { ...(same && entry.collection_status !== 'collecting' ? entry : normalizeQuotaEntry(candidate)), windows: candidate.windows, reset_credits: detail.reset_credits, freshness: same && (entry.freshness === 'stale' || candidate.freshness === 'stale') ? 'stale' : candidate.freshness }
}

export function quotaCollectionMessage(error: { code?: string; message?: string; upstream_status_code?: number } | null | undefined, t?: QuotaTranslator): string {
  if (error?.code === 'DCA_TOKEN_UNAVAILABLE') return t ? t('quota.error.dcaToken') : 'Meta quota requires DCA authorization. Reauthorize this Meta account and collect quota again.'
  if (error?.code === 'AUTH_TOKEN_UNAVAILABLE') return t ? t('quota.error.authToken') : 'Credential access token is unavailable. Check credential authorization before collecting again.'
  if (error?.code === 'UPSTREAM_CLIENT_OUTDATED' || error?.upstream_status_code === 426) return t ? t('quota.error.clientOutdated') : 'The upstream quota endpoint requires a newer client version. Update Home before retrying.'
  return error?.message || (t ? t('quota.error.collectionFailed') : 'Quota collection failed.')
}

export function isQuotaAttention(quota: any): boolean {
  if (!quota) return false
  const entry = normalizeQuotaEntry(quota)
  return entry.quota_status !== 'healthy' || entry.freshness !== 'fresh' || quotaHistorical(entry) || entry.collection_status === 'partial' || entry.collection_status === 'failed'
}
