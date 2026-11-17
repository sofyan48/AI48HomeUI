import { computed, ref } from 'vue'
import { useApplicationLogTail } from '../useApplicationLogTail'
import { apiErrorMessage } from './format'
import { buildApplicationParams, defaultApplicationFilters } from './filters'
import type { ApplicationLog, ApplicationLogMode, ApplicationLogsResponse, LogActionDependencies, LogApiError, LogRecordId, LogsView, PagedLogsDependencies } from './types'
import type { Ref } from 'vue'

/**
 * Application log state for the admin logs page: offset pages anchored to a server ceiling,
 * the live tail, cursor-expiry handling and clearing. Dependencies are injected so the
 * cursor/tail logic can run outside Nuxt (see scripts/logs-tail.test.mjs).
 */
export function useApplicationLogs({ fetchAPI, t, useWorkspaceState, pageSize, activeView, errorMessage }: LogActionDependencies & PagedLogsDependencies & { activeView: Readonly<Ref<LogsView>> }) {
  const applicationPageSize = computed(() => pageSize.value)
  const applicationFilters = ref(defaultApplicationFilters())
  const appliedApplicationFilters = ref(defaultApplicationFilters())
  const applicationResponse = useWorkspaceState<ApplicationLogsResponse | null>('admin:logs:applicationResponse', () => (null))
  const applicationLoading = useWorkspaceState('admin:logs:applicationLoading', () => (false))
  const clearingLogs = useWorkspaceState('admin:logs:clearingLogs', () => (false))
  const applicationPage = ref(1)
  const applicationAnchorId = ref<LogRecordId | null>(null)
  const applicationError = ref('')
  const applicationCursorExpired = ref(false)
  const applicationMode = ref<ApplicationLogMode>('pages')
  const selectedApplicationLog = ref<ApplicationLog | null>(null)
  const clearConfirmOpen = ref(false)
  const tail = useApplicationLogTail({
    fetchAPI,
    params: () => buildApplicationParams(appliedApplicationFilters.value),
    limit: () => applicationPageSize.value,
    onError: error => setApplicationError(error),
  })
  let applicationGeneration = 0
  let applicationController: AbortController | null = null

  const applicationLogs = computed(() => Array.isArray(applicationResponse.value?.logs) ? applicationResponse.value.logs : [])
  const applicationTotal = computed(() => Number(applicationResponse.value?.total) || 0)
  const applicationSearchUnsupported = computed(() => Boolean(applicationResponse.value) && appliedApplicationFilters.value.search.trim() !== '' && applicationResponse.value!.search !== appliedApplicationFilters.value.search.trim())

  const cancelApplicationLoad = () => {
    tail.cancel()
    applicationGeneration += 1
    applicationController?.abort()
    applicationController = null
    applicationLoading.value = false
  }
  const resetApplicationPagination = () => {
    cancelApplicationLoad()
    applicationPage.value = 1
    applicationAnchorId.value = null
    applicationResponse.value = null
    tail.reset()
    applicationError.value = ''
    applicationCursorExpired.value = false
    selectedApplicationLog.value = null
  }
  const setApplicationError = (error: unknown) => {
    const apiError = error as LogApiError | null | undefined
    applicationCursorExpired.value = apiError?.statusCode === 409 && apiError?.data?.error === 'log_cursor_expired'
    applicationError.value = applicationCursorExpired.value
      ? t('logs.cursorExpired')
      : tailSearchUnsupportedError(error) ? t('logs.tailSearchUnsupported') : apiErrorMessage(error, t('logs.loadApplicationFailed'))
  }
  // useApplicationLogTail reports missing search support with a fixed English message; show it translated.
  const tailSearchUnsupportedError = (error: unknown) => error instanceof Error && !(error as LogApiError).data && String(error.message).startsWith('This Home version did not confirm server-side search support.')
  const changeApplicationMode = async (mode: ApplicationLogMode) => {
    applicationMode.value = mode
    await restartApplicationLogs()
  }
  const pollApplicationTail = async () => {
    if (applicationCursorExpired.value || applicationSearchUnsupported.value || applicationLoading.value || clearingLogs.value || selectedApplicationLog.value || clearConfirmOpen.value) return
    applicationError.value = ''
    await tail.poll()
  }
  const loadOlderApplicationTail = async () => {
    if (applicationCursorExpired.value || applicationSearchUnsupported.value || clearingLogs.value) return
    applicationError.value = ''
    await tail.loadOlder()
  }
  const loadApplicationLogs = async (page = applicationPage.value) => {
    cancelApplicationLoad()
    if (clearingLogs.value || applicationCursorExpired.value) return
    const generation = applicationGeneration
    const controller = new AbortController()
    applicationController = controller
    applicationLoading.value = true
    applicationError.value = ''
    try {
      const params = buildApplicationParams(appliedApplicationFilters.value)
      params.set('limit', String(applicationPageSize.value))
      params.set('offset', String((page - 1) * applicationPageSize.value))
      if (applicationAnchorId.value) params.set('anchor_id', String(applicationAnchorId.value))
      const response = await fetchAPI<ApplicationLogsResponse>(`/observability/logs?${params.toString()}`, { signal: controller.signal })
      if (generation !== applicationGeneration || controller.signal.aborted) return
      // The ingestion ceiling can be outside this page and must come from the server.
      const anchor = response?.anchor_id
      if (anchor !== undefined && Number.isSafeInteger(Number(anchor)) && Number(anchor) > 0) {
        applicationAnchorId.value = anchor
      }
      applicationResponse.value = response
      applicationPage.value = page
      if (applicationMode.value === 'tail') tail.seed(response)
    } catch (error) {
      if (generation !== applicationGeneration || controller.signal.aborted) return
      setApplicationError(error)
    } finally {
      if (generation === applicationGeneration) {
        applicationLoading.value = false
        applicationController = null
      }
    }
  }

  const restartApplicationLogs = async () => {
    resetApplicationPagination()
    await loadApplicationLogs()
  }

  const changeApplicationPage = async (delta: number) => {
    if (applicationLoading.value || clearingLogs.value || applicationCursorExpired.value || !applicationAnchorId.value) return
    const next = applicationPage.value + delta
    const pages = Math.max(1, Math.ceil(applicationTotal.value / applicationPageSize.value))
    if (next < 1 || next > pages) return
    await loadApplicationLogs(next)
  }

  const clearApplicationLogs = async () => {
    clearingLogs.value = true
    cancelApplicationLoad()
    errorMessage.value = ''
    try {
      await fetchAPI('/observability/logs', { method: 'DELETE' })
      clearConfirmOpen.value = false
      resetApplicationPagination()
      clearingLogs.value = false
      if (activeView.value === 'application') await loadApplicationLogs()
    } catch (error) {
      errorMessage.value = apiErrorMessage(error, t('logs.clearFailed'))
    } finally {
      clearingLogs.value = false
    }
  }

  return {
    applicationPageSize,
    applicationFilters,
    appliedApplicationFilters,
    applicationResponse,
    applicationLoading,
    clearingLogs,
    applicationPage,
    applicationAnchorId,
    applicationError,
    applicationCursorExpired,
    applicationMode,
    selectedApplicationLog,
    clearConfirmOpen,
    tail,
    applicationLogs,
    applicationTotal,
    applicationSearchUnsupported,
    cancelApplicationLoad,
    resetApplicationPagination,
    changeApplicationMode,
    pollApplicationTail,
    loadOlderApplicationTail,
    loadApplicationLogs,
    restartApplicationLogs,
    changeApplicationPage,
    clearApplicationLogs,
  }
}
