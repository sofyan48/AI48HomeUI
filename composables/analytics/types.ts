export interface AnalyticsMetrics {
  requests: number
  input_tokens: number
  output_tokens: number
  cache_tokens: number
  billed_amount: number
  base_amount: number
  unpriced_requests: number
}

export interface AnalyticsDay extends AnalyticsMetrics { date: string }
export interface AnalyticsRow extends AnalyticsMetrics { name: string; id: string }
export interface UserAnalytics {
  from: string
  to: string
  timezone: 'UTC'
  source: 'billing_charge'
  model: string
  api_key_id: number | null
  summary: AnalyticsMetrics
  daily: AnalyticsDay[]
  per_model: (AnalyticsMetrics & { model: string })[]
  per_key: (AnalyticsMetrics & { api_key_id: number | null })[]
}

export interface AnalyticsFilters { from: string; to: string; model: string; api_key_id: string }

export function defaultAnalyticsFilters(now = new Date()): AnalyticsFilters {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return { from: new Date(end.getTime() - 30 * 86400000).toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), model: '', api_key_id: '' }
}

export function validateRange(filters: AnalyticsFilters): 'invalid' | 'long' | null {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  if (!validDate(filters.from) || !validDate(filters.to)) return 'invalid'
  const duration = Date.parse(filters.to) - Date.parse(filters.from)
  if (duration <= 0) return 'invalid'
  return duration > 366 * 86400000 ? 'long' : null
}

// Quote every field; neutralize spreadsheet formulas in untrusted labels.
export function csvCell(value: string | number | null): string {
  let text = value === null ? '' : String(value)
  if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}

export function analyticsCSV(data: UserAnalytics, group: 'daily' | 'models' | 'keys'): string {
  const metrics = ['requests', 'input_tokens', 'output_tokens', 'cache_tokens', 'billed_amount', 'base_amount', 'unpriced_requests'] as const
  const dimension = group === 'daily' ? 'date' : group === 'models' ? 'model' : 'api_key_id'
  const rows = group === 'daily' ? data.daily.map(row => [row.date, row] as const)
    : group === 'models' ? data.per_model.map(row => [row.model, row] as const)
      : data.per_key.map(row => [row.api_key_id, row] as const)
  const header = ['from_inclusive_utc', 'to_exclusive_utc', 'source', dimension, ...metrics]
  return '\uFEFF' + [header.map(csvCell).join(','), ...rows.map(([id, row]) =>
    [data.from, data.to, data.source, id, ...metrics.map(key => row[key])].map(csvCell).join(','))].join('\r\n') + '\r\n'
}
