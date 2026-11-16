import { ref, type Ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import type { useAdminI18n } from '~/composables/useAdminI18n'
import { apiErrorMessage } from '~/composables/usage/format'
import type { UsageRequestScope } from '~/composables/usage/useUsageRequestScope'

type Options = {
  t: ReturnType<typeof useAdminI18n>['t']
  fetchAPI: <T = unknown>(path: string, options?: Record<string, any>) => Promise<T>
  supports: (name: string, fallback?: boolean) => boolean
  scope: UsageRequestScope
  insightQuery: Ref<string>
  errorMessage: Ref<string>
}

/** Full ranking dialog state (`/usage/aggregates` grouped by the selected dimension). */
export function useUsageRanking({ t, fetchAPI, supports, scope, insightQuery, errorMessage }: Options) {
  let version = 0
  const rankingOpen = ref(false), rankingLoading = useWorkspaceState('admin:usage:rankingLoading', () => (false)), rankingItems = useWorkspaceState<any[]>('admin:usage:rankingItems', () => ([])), rankingGroup = ref('user'), rankingMetric = ref('total_amount'), rankingLimit = ref(10)

  const loadRanking = async () => {
    if (!supports('usage_aggregates')) return
    const current = ++version
    rankingLoading.value = true
    try { const response = await fetchAPI<any>(`/usage/aggregates?${insightQuery.value}`, { query: { group_by: rankingGroup.value, metric: rankingMetric.value, limit: rankingLimit.value }, signal: scope.controller.signal }); if (!scope.disposed && current === version) rankingItems.value = response?.items || [] }
    catch (error) { if (!scope.disposed && current === version) errorMessage.value = apiErrorMessage(error, t('usage.err.ranking')) }
    finally { if (!scope.disposed && current === version) rankingLoading.value = false }
  }
  const openRanking = async (group: string) => { rankingGroup.value = group; rankingOpen.value = true; await loadRanking() }

  return {
    rankingOpen,
    rankingLoading,
    rankingItems,
    rankingGroup,
    rankingMetric,
    rankingLimit,
    loadRanking,
    openRanking,
    invalidate: () => { version++ }
  }
}
