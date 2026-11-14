export const requestRanges = ['4h', '12h', '24h', 'today', 'yesterday', '7d', '30d', '90d']
export const requestSorts = ['timestamp_desc', 'timestamp_asc', 'tokens_desc', 'tokens_asc', 'latency_desc', 'latency_asc', 'cost_desc', 'cost_asc', 'failed_first']
export const usageRanges = ['today', 'yesterday', '7d', '30d', 'month', 'all']

export function readTelemetryChoice(key: string, fallback: string, choices: readonly string[]) {
  try { const value = globalThis.localStorage?.getItem(key); return value && choices.includes(value) ? value : fallback } catch { return fallback }
}
export function saveTelemetryChoice(key: string, value: string, choices: readonly string[]) {
  if (!choices.includes(value)) return
  try { globalThis.localStorage?.setItem(key, value) } catch {}
}

export function toolUsageEntries(usage: Record<string, unknown> = {}) {
  return Object.entries(usage || {}).filter(([key, value]) => {
      if (key === 'num_sources_used' || key === 'numSourcesUsed') return false
      // Queries describe the same search when the provider also reports calls.
      if ((key === 'web_search_queries' || key === 'webSearchQueries') && Number(usage.web_search_calls ?? usage.webSearchCalls) > 0) return false
      return Number.isFinite(Number(value)) && Number(value) > 0
    })
}

export function requestCacheRate(event: any) {
  const input = Number(event?.tokens?.input_tokens) || 0
  const cached = Number(event?.tokens?.cache_read_tokens ?? event?.tokens?.cached_tokens) || 0
  return input > 0 && cached > 0 ? `${Math.round(Math.min(1, cached / input) * 100)}%` : ''
}

export function telemetryAmount(value: unknown, currency?: string) {
  return value == null || !Number.isFinite(Number(value)) ? '—' : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(Number(value))} ${currency || 'credits'}`
}

type CostItem = { tokens: number; cost: number }
const costLabels: Record<string, string> = {
  p: 'Input', c: 'Output', cr: 'Cache read', ct: 'Cached text', cw: 'Cache write', cc: 'Cache write',
  pi: 'Image input', pa: 'Audio input', pv: 'Video input', pf: 'File input', ci: 'Image output', ca: 'Audio output', cv: 'Video output',
  cri: 'Image cache read', cra: 'Audio cache read', cw30m: 'Cache write 30m', cw1h: 'Cache write 1h', cw12h: 'Cache write 12h',
  ws: 'Web search', wsq: 'Web search query', wf: 'Web fetch', xs: 'X search', ce: 'Code execution', fs: 'File search', ds: 'Document search', mcp: 'MCP', maps: 'Google Maps', src: 'Sources used', st: 'Server tools'
}
export function requestCostRows(billing: any): Array<{ label: string; value: string }> {
  if (billing?.amount == null) return []
  const rows = [{ label: 'Total', value: telemetryAmount(billing.amount, billing.currency) }]
  const breakdown = billing.cost_breakdown
  if (!breakdown || typeof breakdown !== 'object') return rows
  const merged: Record<string, CostItem> = {}
  for (const [rawKey, rawItem] of Object.entries(breakdown.items || {})) {
    if (!rawItem || typeof rawItem !== 'object') continue
    const item = rawItem as CostItem
    const key = rawKey === 'reasoning' ? 'output' : rawKey === 'expr:r' ? 'expr:c' : rawKey
    const previous = merged[key] || { tokens: 0, cost: 0 }
    merged[key] = { tokens: previous.tokens + (Number(item.tokens) || 0), cost: Number((previous.cost + (Number(item.cost) || 0)).toFixed(8)) }
  }
  for (const [key, item] of Object.entries(merged)) {
    if (key === 'expression' || ((key === 'expr:src' || key === 'expr:st') && item.cost <= 0)) continue
    if (key === 'expr:wsq' && (merged['expr:ws']?.tokens || 0) > 0 && item.cost <= 0) continue
    if (item.tokens <= 0 && item.cost <= 0) continue
    const name = key.replace(/^expr:/, '')
    const label = costLabels[name] || name.replaceAll('_', ' ').replace(/^./, value => value.toUpperCase())
    rows.push({ label: `${label}${item.tokens > 0 ? ` (${new Intl.NumberFormat().format(item.tokens)})` : ''}`, value: item.cost > 0 ? telemetryAmount(item.cost, billing.currency) : new Intl.NumberFormat().format(item.tokens) })
  }
  if (Number(breakdown.request) > 0) rows.push({ label: 'Request fee', value: telemetryAmount(breakdown.request, billing.currency) })
  if (Number(breakdown.reasoning_effort_multiplier) > 0 && Number(breakdown.reasoning_effort_multiplier) !== 1) rows.push({ label: `Effort multiplier${breakdown.reasoning_effort ? ` (${breakdown.reasoning_effort})` : ''}`, value: `×${breakdown.reasoning_effort_multiplier}` })
  if (Number(breakdown.billing_multiplier) > 0 && Number(breakdown.billing_multiplier) !== 1) rows.push({ label: 'Billing multiplier', value: `×${breakdown.billing_multiplier}` })
  return rows
}

export const requestPageSizes = [25, 50, 100, 200] as const
export function normalizeRequestPageSize(value: unknown): number {
  return typeof value === 'number' && requestPageSizes.includes(value as typeof requestPageSizes[number]) ? value : 50
}

// Version structured preferences so a future schema is not mistaken for today's overrides.
// Unversioned values are accepted for the existing width preference and normalized on read.
export function readRequestPreference<T>(key: string, normalize: (value: unknown) => T): T {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(key) || 'null')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.hasOwn(parsed, 'version')) {
      const stored = parsed as { version?: unknown; value?: unknown }
      return normalize(stored.version === 1 ? stored.value : undefined)
    }
    return normalize(parsed)
  } catch { return normalize(undefined) }
}
export function saveRequestPreference<T>(key: string, value: T, normalize: (value: unknown) => T) {
  try { globalThis.localStorage?.setItem(key, JSON.stringify({ version: 1, value: normalize(value) })) } catch {}
}

export const requestColumnDefaults: Record<string, number> = { timestamp: 152, event: 200, status: 96, model: 208, runtime: 168, client: 168, credential: 168, tokens: 168, latency: 112, cost: 120, request: 184, actions: 80 }
// Technical columns start hidden to keep the default table compact; users can enable them from the Columns menu.
export const requestColumnsHiddenByDefault = new Set(['runtime', 'credential', 'request'])
export function clampRequestColumnWidth(key: string, width: number) {
  return Math.round(Math.max(key === 'status' ? 96 : 120, Math.min(640, width)))
}
export function normalizeRequestColumnWidths(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, width]) => Object.hasOwn(requestColumnDefaults, key) && key !== 'actions' && typeof width === 'number' && Number.isFinite(width)).map(([key, width]) => [key, clampRequestColumnWidth(key, width as number)]))
}
export function normalizeRequestColumnVisibility(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, visible]) => Object.hasOwn(requestColumnDefaults, key) && key !== 'timestamp' && key !== 'actions' && typeof visible === 'boolean'))
}
export function visibleRequestColumns(overrides: Record<string, boolean>) {
  // Keep the identity and detail actions reachable even if stored data says otherwise.
  return Object.keys(requestColumnDefaults).filter(key => key === 'timestamp' || key === 'actions' || (requestColumnsHiddenByDefault.has(key) ? overrides[key] === true : overrides[key] !== false))
}
export function estimateRequestColumnWidths(events: any[]) {
  const widths = { ...requestColumnDefaults }
  // Bound measurement work to the current page; the longest displayed line wins.
  for (const event of events) {
    const values: Record<string, unknown[]> = {
      event: [event.endpoint, event.executor_type], model: [event.model, event.provider],
      runtime: [event.runtime?.home_id || event.runtime?.home_ip, event.runtime?.cpa_label || event.runtime?.cpa_node_id],
      client: [event.client?.username, event.client?.client_key_label || event.client?.client_key_masked],
      credential: [event.credential?.label || event.credential?.credential_id, event.credential?.credential_type], request: [event.request_id, event.session_id]
    }
    for (const [key, lines] of Object.entries(values)) widths[key] = Math.max(widths[key]!, clampRequestColumnWidth(key, Math.max(...lines.map(value => Array.from(String(value || '')).reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 14 : 7), 0))) + 40))
  }
  return widths
}
