import { computed, ref } from 'vue'

export interface OrganizationUsageTopItem {
  id?: string | number | null
  label?: string
  amount: number
  request_count: number
}

export interface OrganizationUsageOverview {
  total_charge_amount: number
  request_count: number
  input_tokens: number
  output_tokens: number
  cache_tokens: number
  active_user_count: number
  daily_trend: Array<{ date: string, charge_amount: number, request_count: number }>
  top_users: OrganizationUsageTopItem[]
  /** Per-member ranking (actor_user_id); missing on older Home builds. */
  top_members: OrganizationUsageTopItem[]
  top_models: OrganizationUsageTopItem[]
  top_providers: OrganizationUsageTopItem[]
}

type Fetch = <T>(path: string, options?: Record<string, unknown>) => Promise<T>

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const list = (value: unknown): OrganizationUsageTopItem[] => Array.isArray(value)
  ? value.map(item => ({ id: item?.id ?? null, label: String(item?.label ?? ''), amount: num(item?.amount), request_count: num(item?.request_count) }))
  : []

/** Fill calendar dates without ledger entries so admin bars match the portal's complete range. */
export function fillOrganizationDailyTrend(
  points: OrganizationUsageOverview['daily_trend'], from: unknown, to: unknown,
): OrganizationUsageOverview['daily_trend'] {
  const parseDate = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN
    const timestamp = Date.parse(`${value}T00:00:00Z`)
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN
  }
  const start = parseDate(from)
  const end = parseDate(to)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return points
  const length = Math.floor((end - start) / 86400000) + 1
  // Keep an unbounded all-time query from allocating an oversized daily chart.
  if (length > 3660) return points
  const byDate = new Map(points.map(point => [point.date, point]))
  return Array.from({ length }, (_, index) => {
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10)
    return byDate.get(date) ?? { date, charge_amount: 0, request_count: 0 }
  })
}

export function normalizeOrganizationUsageOverview(raw: unknown): OrganizationUsageOverview {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    total_charge_amount: num(source.total_charge_amount),
    request_count: num(source.request_count),
    input_tokens: num(source.input_tokens),
    output_tokens: num(source.output_tokens),
    cache_tokens: num(source.cache_tokens),
    active_user_count: num(source.active_user_count),
    daily_trend: Array.isArray(source.daily_trend)
      ? source.daily_trend.map(point => ({ date: String(point?.date ?? ''), charge_amount: num(point?.charge_amount), request_count: num(point?.request_count) }))
      : [],
    top_users: list(source.top_users),
    top_members: list(source.top_members),
    top_models: list(source.top_models),
    top_providers: list(source.top_providers),
  }
}

/** Organization billing overview (admin `/billing/overview`) with a stale-response guard. */
export function useOrganizationUsageSummary(fetchAPI: Fetch) {
  const overview = ref<OrganizationUsageOverview | null>(null)
  const loading = ref(false)
  const error = ref('')
  let version = 0

  async function load(query: Record<string, string | number>, failedMessage: string) {
    const current = ++version
    loading.value = true
    error.value = ''
    try {
      const response = await fetchAPI<{ overview?: unknown }>('/billing/overview', { query })
      if (current === version) {
        const normalized = normalizeOrganizationUsageOverview(response?.overview)
        const raw = response?.overview as { range?: { from?: string, to?: string } } | undefined
        normalized.daily_trend = fillOrganizationDailyTrend(
          normalized.daily_trend, query.from ?? raw?.range?.from, query.to ?? raw?.range?.to,
        )
        overview.value = normalized
      }
    } catch (cause) {
      if (current === version) {
        overview.value = null
        error.value = cause instanceof Error && cause.message ? cause.message : failedMessage
      }
    } finally {
      if (current === version) loading.value = false
    }
  }

  const trendMax = computed(() => Math.max(0, ...(overview.value?.daily_trend || []).map(point => point.charge_amount)))

  return { overview, loading, error, trendMax, load, invalidate: () => { version++ } }
}
