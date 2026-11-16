import { computed, inject, onMounted, onScopeDispose, provide, ref, watch, type InjectionKey } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { useApi } from '~/composables/useApi'
import { useCapabilities } from '~/composables/useCapabilities'
import { useDataSync } from '~/composables/useDataSync'
import { useUsageRefresh } from '~/composables/useUsageRefresh'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { apiErrorMessage, useUsageFormat } from '~/composables/usage/format'
import { defaultFilters, useUsageFilters } from '~/composables/usage/useUsageFilters'
import { useUsageOverview } from '~/composables/usage/useUsageOverview'
import { useUsageCredentials } from '~/composables/usage/useUsageCredentials'
import { useUsageRanking } from '~/composables/usage/useUsageRanking'
import { useUsageDetail } from '~/composables/usage/useUsageDetail'
import { dateRangeError } from '~/composables/dateRange'
import { useUsagePresentation } from '~/composables/usage/useUsagePresentation'
import { createUsageRequestScope } from '~/composables/usage/useUsageRequestScope'

/**
 * Shared state for the admin usage page (/admin/usage).
 *
 * The page calls `provideUsagePage()` once; sections and dialogs call `useUsagePage()`.
 * Every `admin:usage:*` workspace ref is created here exactly once, so children never call
 * `useWorkspaceState` for these keys themselves.
 */
function createUsagePage() {
  const { t } = useAdminI18n()
  const api = useApi()
  const fetchAPI = <T = unknown>(path: string, options?: Record<string, any>) => api.fetchAPI<T>(path, options)
  const { token } = api
  const { supports, capabilities, refreshCapabilities } = useCapabilities()
  const format = useUsageFormat()
  const scope = createUsageRequestScope()

  const capabilitiesReady = ref(false)
  const legacyRecords = computed(() => (capabilities.value.request_events ?? capabilities.value.requestEvents) === false)
  const route = useRoute()
  const router = useRouter()
  const activeView = computed(() => route.query.view === 'requests' ? 'requests' : 'overview')
  const usageTabs = computed(() => [{ label: t('usage.tab.overview'), value: 'overview' }, { label: t('usage.tab.requests'), value: 'requests' }])
  const setView = async (view: any) => { await router.replace({ query: { ...route.query, view } }) }
  const isActive = () => activeView.value === 'overview'

  const errorMessage = useWorkspaceState('admin:usage:errorMessage', () => (''))
  const filterState = useUsageFilters(t)
  const { rangePreset, appliedPreset, filters, appliedFilters, showAdvancedFilters, insightQuery, buildCommonParams } = filterState
  const overview = useUsageOverview({ fetchAPI, supports, scope, appliedFilters, buildCommonParams })
  const detail = useUsageDetail({ t, fetchAPI, errorMessage })
  const ranking = useUsageRanking({ t, fetchAPI, supports, scope, insightQuery, errorMessage })
  const credentials = useUsageCredentials({ t, fetchAPI, supports, scope, insightQuery, isActive })
  const { credentialPage, credentialsLoading } = credentials
  const presentation = useUsagePresentation(t, format, overview)
  const page = ref(1)
  const sort = ref('timestamp_desc')

  const applyFilters = async () => {
    const error = dateRangeError(filters.value.from, filters.value.to)
    if (error) { errorMessage.value = format.dateErrorText(error); return }
    appliedFilters.value = { ...filters.value }
    appliedPreset.value = rangePreset.value
    credentialPage.value = 1
    page.value = 1
    await refreshAll()
  }

  const refreshAll = async (automatic = false) => {
    if (activeView.value !== 'overview' || scope.disposed) return
    errorMessage.value = ''
    const version = overview.version() + 1
    try {
      await Promise.all([overview.loadOverview(), ...(!automatic || credentialPage.value === 1 ? [credentials.loadCredentialUsage()] : [])])
    } catch (error) {
      if (!scope.disposed && version === overview.version()) errorMessage.value = apiErrorMessage(error, t('usage.err.overview'))
    }
  }

  const refreshEligible = computed(() => capabilitiesReady.value && activeView.value === 'overview' && !detail.detailOpen.value && !ranking.rankingOpen.value && !['yesterday', 'custom'].includes(appliedPreset.value) && !overview.loading.value && !credentialsLoading.value)
  const { enabled: autoRefresh, status: refreshStatus } = useUsageRefresh(refreshEligible, () => refreshAll(true))
  // useUsageRefresh reports English status text; map it for display.
  const refreshStatusText = computed(() => {
    const status = refreshStatus.value
    if (status === 'Automatic refresh off') return t('usage.refresh.off')
    if (status === 'Paused while offline') return t('usage.refresh.offline')
    if (status === 'Paused while hidden') return t('usage.refresh.hidden')
    if (status === 'Paused for this view, range, or open details') return t('usage.refresh.ineligible')
    const every = /^Refresh every (\d+)s$/.exec(status)
    return every ? t('usage.refresh.every', { seconds: every[1] }) : status
  })

  const resetFilters = async () => {
    rangePreset.value = '7d'
    appliedPreset.value = '7d'
    credentialPage.value = 1
    filters.value = defaultFilters()
    appliedFilters.value = defaultFilters()
    sort.value = 'timestamp_desc'
    showAdvancedFilters.value = false
    page.value = 1
    await refreshAll()
  }

  const invalidateAll = () => { overview.invalidate(); credentials.invalidate(); ranking.invalidate() }

  watch(activeView, () => { if (capabilitiesReady.value) void refreshAll() })
  watch(token, async () => {
    invalidateAll()
    scope.controller.abort(); scope.controller = new AbortController()
    credentials.reset()
    overview.overviewLoading.value = false; ranking.rankingLoading.value = false
    detail.detailOpen.value = false; ranking.rankingOpen.value = false; capabilitiesReady.value = false
    await refreshCapabilities().catch(() => {})
    if (!scope.disposed) { capabilitiesReady.value = true; void refreshAll() }
  })
  useDataSync('admin:usage:sync', () => refreshAll())
  onMounted(async () => { await refreshCapabilities().catch(() => {}); if (!scope.disposed) { capabilitiesReady.value = true; await refreshAll() } })
  onScopeDispose(() => { scope.disposed = true; invalidateAll(); scope.controller.abort() })

  return {
    t,
    supports,
    format,
    capabilitiesReady,
    legacyRecords,
    activeView,
    usageTabs,
    setView,
    errorMessage,
    ...filterState,
    overview,
    credentials,
    ranking,
    detail,
    refreshAll,
    autoRefresh,
    refreshStatusText,
    resetFilters,
    applyFilters,
    presentation
  }
}

export type UsagePage = ReturnType<typeof createUsagePage>

const usagePageKey: InjectionKey<UsagePage> = Symbol('usage-page')

export function provideUsagePage() {
  const page = createUsagePage()
  provide(usagePageKey, page)
  return page
}

export function useUsagePage() {
  const page = inject(usagePageKey)
  if (!page) throw new Error('useUsagePage() must be called inside a component under pages/admin/usage.vue')
  return page
}
