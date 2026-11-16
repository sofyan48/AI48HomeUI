import { computed } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import type { UsageFilters } from '~/composables/usage/useUsageFilters'
import type { UsageRequestScope } from '~/composables/usage/useUsageRequestScope'

type Options = {
  fetchAPI: <T = unknown>(path: string, options?: Record<string, any>) => Promise<T>
  supports: (name: string, fallback?: boolean) => boolean
  scope: UsageRequestScope
  appliedFilters: { value: UsageFilters }
  buildCommonParams: (source: UsageFilters) => URLSearchParams
}

/** `/usage/overview` snapshot: totals, trend, cost breakdown and top lists for the applied filters. */
export function useUsageOverview({ fetchAPI, supports, scope, appliedFilters, buildCommonParams }: Options) {
  let version = 0
  const overview = useWorkspaceState<any>('admin:usage:overview', () => (null))
  const recordsResponse = useWorkspaceState<any>('admin:usage:recordsResponse', () => (null))
  const overviewLoading = useWorkspaceState('admin:usage:overviewLoading', () => (false))
  const recordsLoading = useWorkspaceState('admin:usage:recordsLoading', () => (false))

  const loading = computed(() => overviewLoading.value || recordsLoading.value)
  const totals = computed<Record<string, any>>(() => overview.value?.totals || {})
  const live = computed<Record<string, any>>(() => overview.value?.live || {})
  const trend = computed<any[]>(() => Array.isArray(overview.value?.trend) ? overview.value.trend : [])
  const tokenBreakdown = computed(() => totals.value?.token_breakdown || null)
  const costBreakdown = computed<any[]>(() => Array.isArray(overview.value?.cost_breakdown) ? overview.value.cost_breakdown : [])
  const top = computed<Record<string, any>>(() => overview.value?.top || {})
  const records = computed<any[]>(() => Array.isArray(recordsResponse.value?.items) ? recordsResponse.value.items : [])
  const providerSuggestions = computed(() => [...new Set(records.value.map(item => item.provider).filter(Boolean))].sort())
  const modelSuggestions = computed(() => [...new Set(records.value.map(item => item.model).filter(Boolean))].sort())

  const loadOverview = async () => {
    if (!supports('usage_overview')) return
    const current = ++version
    overviewLoading.value = true
    try {
      const params = buildCommonParams(appliedFilters.value)
      params.set('interval', 'auto')
      const result = await fetchAPI<any>(`/usage/overview?${params.toString()}`, { signal: scope.controller.signal })
      if (!scope.disposed && current === version) overview.value = result
    } finally {
      if (!scope.disposed && current === version) overviewLoading.value = false
    }
  }

  return {
    overview,
    overviewLoading,
    loading,
    totals,
    live,
    trend,
    tokenBreakdown,
    costBreakdown,
    top,
    providerSuggestions,
    modelSuggestions,
    loadOverview,
    version: () => version,
    invalidate: () => { version++ }
  }
}
