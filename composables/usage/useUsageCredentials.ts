import { computed, ref, watch, type Ref } from 'vue'
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
  isActive: () => boolean
}

/** Paged per-credential usage aggregates (`/usage/aggregates?group_by=credential`). */
export function useUsageCredentials({ t, fetchAPI, supports, scope, insightQuery, isActive }: Options) {
  let version = 0
  const attributionUnavailable = ref(false)
  const canAttribute = computed(() => supports('usage_aggregates') && !attributionUnavailable.value)
  const credentialPage = ref(1), credentialLimit = ref(20), credentialMetric = ref('request_count'), credentialDirection = ref('desc')
  const credentialTotal = ref(0), credentialError = ref('')
  const credentialPages = computed(() => Math.max(1, Math.ceil(credentialTotal.value / credentialLimit.value)))
  const credentialUsage = useWorkspaceState<any[]>('admin:usage:credentialUsage', () => ([])), credentialsLoading = useWorkspaceState('admin:usage:credentialsLoading', () => (false))

  const loadCredentialUsage = async () => {
    if (!canAttribute.value) return
    const current = ++version
    credentialsLoading.value = true
    credentialError.value = ''
    try {
      const response = await fetchAPI<any>(`/usage/aggregates?${insightQuery.value}`, { query: { group_by: 'credential', metric: credentialMetric.value, direction: credentialDirection.value, limit: credentialLimit.value, offset: (credentialPage.value - 1) * credentialLimit.value }, signal: scope.controller.signal })
      if (scope.disposed || current !== version) return
      credentialTotal.value = Number(response?.total) || 0
      if (credentialPage.value > credentialPages.value) { credentialPage.value = credentialPages.value; return }
      credentialUsage.value = response?.items || []
    } catch (error: any) {
      if (scope.disposed || current !== version) return
      if ([404, 405, 501].includes(error?.statusCode)) { attributionUnavailable.value = true; credentialUsage.value = [] }
      else credentialError.value = apiErrorMessage(error, t('usage.err.credUsage'))
    } finally { if (!scope.disposed && current === version) credentialsLoading.value = false }
  }

  /** Forget attribution state after the management token changes. */
  const reset = () => {
    attributionUnavailable.value = false; credentialTotal.value = 0; credentialError.value = ''
    credentialsLoading.value = false
  }

  watch([credentialMetric, credentialDirection, credentialLimit], () => { if (credentialPage.value !== 1) credentialPage.value = 1; else if (isActive()) void loadCredentialUsage() })
  watch(credentialPage, () => { if (isActive()) void loadCredentialUsage() })

  return {
    canAttribute,
    credentialPage,
    credentialLimit,
    credentialMetric,
    credentialDirection,
    credentialTotal,
    credentialError,
    credentialPages,
    credentialUsage,
    credentialsLoading,
    loadCredentialUsage,
    reset,
    invalidate: () => { version++ }
  }
}
