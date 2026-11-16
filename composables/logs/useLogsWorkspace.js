import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { dateRangeError, isDateInputValid } from '~/composables/dateRange'
import { apiErrorMessage } from './format.js'
import { defaultApplicationFilters } from './filters.js'
import { useRequestLogs } from './useRequestLogs.js'
import { useErrorLogs } from './useErrorLogs.js'
import { useApplicationLogs } from './useApplicationLogs.js'
import { useEventDetail } from './useEventDetail.js'
import { useLogDownloads } from './useLogDownloads.js'

/**
 * Page-level orchestration for /admin/logs: the active view, shared page size, filter
 * apply/reset, live refresh and lifecycle. Created once by `provideLogsPage()`, which owns
 * every `admin:logs:*` workspace key through the feature composables below.
 */
export function createLogsWorkspace({ fetchAPI, token, t, useWorkspaceState, useDataSync }) {
  const pageSize = ref(50)
  const liveRefresh = ref(false)
  let liveRefreshTimer = null
  const activeView = ref('events')
  const showAdvancedLogFilters = ref(false)
  const errorMessage = useWorkspaceState('admin:logs:errorMessage', () => (''))
  let refreshGeneration = 0

  const request = useRequestLogs({ fetchAPI, useWorkspaceState, pageSize, refresh: () => refreshActive() })
  const errorLogs = useErrorLogs({ fetchAPI, useWorkspaceState, pageSize })
  const application = useApplicationLogs({ fetchAPI, t, useWorkspaceState, pageSize, activeView, errorMessage })
  const eventDetail = useEventDetail({ fetchAPI, t, useWorkspaceState, errorMessage })
  const downloads = useLogDownloads({ fetchAPI, t, useWorkspaceState, errorMessage })

  const { defaultRequestFilters, requestFilters, appliedRequestFilters, eventSort, eventsPage, requestLogsPage, eventsLoading, requestLogsLoading, loadEvents, loadRequestLogs } = request
  const { errorLogsPage, errorLogSearch, errorLogsLoading, loadErrorLogs } = errorLogs
  const { applicationFilters, appliedApplicationFilters, applicationLoading, applicationMode, applicationPage, applicationCursorExpired, clearingLogs, cancelApplicationLoad, resetApplicationPagination, loadApplicationLogs, restartApplicationLogs, pollApplicationTail } = application

  // Count secondary filters so a collapsed row still signals that something is applied.
  const advancedLogFilterCount = computed(() => activeView.value === 'application'
    ? ['home_ip', 'client_ip', 'request_id'].filter(key => String(applicationFilters.value[key] || '').trim()).length
    : ['provider', 'model'].filter(key => String(requestFilters.value[key] || '').trim()).length)

  const loading = computed(() => {
    if (activeView.value === 'events') return eventsLoading.value
    if (activeView.value === 'request-logs') return requestLogsLoading.value
    if (activeView.value === 'error-logs') return errorLogsLoading.value
    return applicationLoading.value
  })

  const refreshActive = async () => {
    const generation = ++refreshGeneration
    errorMessage.value = ''
    try {
      if (activeView.value === 'events') await loadEvents()
      else if (activeView.value === 'request-logs') await loadRequestLogs()
      else if (activeView.value === 'error-logs') await loadErrorLogs()
      else await restartApplicationLogs()
    } catch (error) {
      if (generation === refreshGeneration) errorMessage.value = apiErrorMessage(error, t('logs.loadFailed'))
    }
  }

  const switchView = async (view) => {
    if (activeView.value === view) return
    if (activeView.value === 'application') cancelApplicationLoad()
    activeView.value = view
    await refreshActive()
  }

  const applyFilters = async () => {
    const range = activeView.value === 'application'
      ? [applicationFilters.value.after, applicationFilters.value.before, 'datetime-local']
      : [requestFilters.value.from, requestFilters.value.to, 'date']
    const error = activeView.value === 'error-logs' ? '' : dateRangeError(...range)
    if (error) { errorMessage.value = dateRangeMessage(...range); return }
    if (activeView.value === 'application') {
      appliedApplicationFilters.value = { ...applicationFilters.value }
      resetApplicationPagination()
    } else if (activeView.value === 'error-logs') {
      errorLogsPage.value = 1
    } else {
      appliedRequestFilters.value = { ...requestFilters.value }
      eventsPage.value = 1
      requestLogsPage.value = 1
    }
    await refreshActive()
  }

  // dateRangeError returns English; pick the matching translated message from the same validation.
  const dateRangeMessage = (from, to, type) => isDateInputValid(from, type) && isDateInputValid(to, type)
    ? t('logs.dateOrder')
    : type === 'date' ? t('logs.dateInvalid') : t('logs.dateTimeInvalid')

  const resetFilters = async () => {
    if (activeView.value === 'application') {
      applicationFilters.value = defaultApplicationFilters()
      appliedApplicationFilters.value = defaultApplicationFilters()
      resetApplicationPagination()
    } else if (activeView.value === 'error-logs') {
      errorLogSearch.value = ''
      errorLogsPage.value = 1
    } else {
      requestFilters.value = defaultRequestFilters()
      appliedRequestFilters.value = defaultRequestFilters()
      eventSort.value = 'timestamp_desc'
      eventsPage.value = 1
      requestLogsPage.value = 1
    }
    await refreshActive()
  }

  const resetPages = async () => {
    eventsPage.value = 1
    requestLogsPage.value = 1
    resetApplicationPagination()
    errorLogsPage.value = 1
    await refreshActive()
  }

  watch(liveRefresh, enabled => {
    if (liveRefreshTimer) clearInterval(liveRefreshTimer)
    liveRefreshTimer = enabled ? setInterval(() => {
      if (loading.value || clearingLogs.value) return
      if (activeView.value === 'application') {
        if (applicationMode.value === 'tail') { void pollApplicationTail(); return }
        if (applicationPage.value > 1 || applicationCursorExpired.value) return
      }
      void refreshActive()
    }, 15_000) : null
  })
  watch(token, () => {
    refreshGeneration += 1
    resetApplicationPagination()
    if (activeView.value === 'application') void loadApplicationLogs()
  }, { flush: 'sync' })
  useDataSync('admin:logs:sync', refreshActive)
  onMounted(refreshActive)
  onBeforeUnmount(() => {
    refreshGeneration += 1
    cancelApplicationLoad()
    if (liveRefreshTimer) clearInterval(liveRefreshTimer)
  })

  return {
    ...request,
    ...errorLogs,
    ...application,
    ...eventDetail,
    ...downloads,
    pageSize,
    liveRefresh,
    activeView,
    showAdvancedLogFilters,
    errorMessage,
    advancedLogFilterCount,
    loading,
    refreshActive,
    switchView,
    applyFilters,
    resetFilters,
    resetPages,
  }
}
