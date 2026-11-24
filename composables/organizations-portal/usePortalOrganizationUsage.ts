import { ref } from 'vue'

export interface PortalOrgUsageMetrics {
  requests: number
  input_tokens: number
  output_tokens: number
  cache_tokens: number
  billed_amount: number
}

export interface PortalOrgUsage {
  summary: PortalOrgUsageMetrics
  daily: Array<PortalOrgUsageMetrics & { date: string }>
  per_model: Array<PortalOrgUsageMetrics & { model: string }>
}

/** Preserve the complete daily range supplied by portal analytics, including empty days. */
export function portalOrganizationDailyTrend(daily: PortalOrgUsage['daily']) {
  return daily.map(day => ({
    date: day.date, amount: day.billed_amount, requests: day.requests,
  }))
}

type Fetch = <T>(path: string, options?: Record<string, unknown>) => Promise<T>

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const metrics = (raw: Record<string, unknown> | undefined): PortalOrgUsageMetrics => ({
  requests: num(raw?.requests), input_tokens: num(raw?.input_tokens), output_tokens: num(raw?.output_tokens),
  cache_tokens: num(raw?.cache_tokens), billed_amount: num(raw?.billed_amount),
})

export function normalizePortalOrgUsage(raw: unknown): PortalOrgUsage {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rows = (value: unknown) => (Array.isArray(value) ? value as Record<string, unknown>[] : [])
  return {
    summary: metrics(source.summary as Record<string, unknown>),
    daily: rows(source.daily).map(row => ({ ...metrics(row), date: String(row.date ?? '') })),
    per_model: rows(source.per_model).map(row => ({ ...metrics(row), model: String(row.model ?? '') }))
      .sort((left, right) => right.billed_amount - left.billed_amount),
  }
}

/** `/organizations/:id/analytics`: owners get the whole organization, members only their own charges. */
export function usePortalOrganizationUsage(fetchAPI: Fetch) {
  const usage = ref<PortalOrgUsage | null>(null)
  const loading = ref(false)
  const unavailable = ref(false)
  let version = 0

  async function load(orgId: number, days: number) {
    const current = ++version
    loading.value = true
    unavailable.value = false
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    const pad = (value: number) => String(value).padStart(2, '0')
    const query = { from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}` }
    try {
      const response = await fetchAPI<unknown>(`/organizations/${orgId}/analytics`, { query })
      if (current === version) usage.value = normalizePortalOrgUsage(response)
    } catch {
      // Older Home builds have no organization analytics; hide the summary instead of failing the tab.
      if (current === version) { usage.value = null; unavailable.value = true }
    } finally {
      if (current === version) loading.value = false
    }
  }

  return { usage, loading, unavailable, load, invalidate: () => { version++ } }
}
