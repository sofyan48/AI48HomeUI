import { computed, ref } from 'vue'
import { buildRequestParams, createRequestFilterDefaults } from './filters'
import type { LogListResponse, PagedLogsDependencies, RequestEvent, RequestLog } from './types'

/**
 * Request events and request-log files for the admin logs page. Both views share the
 * request filters; `refresh` reloads whichever view is active.
 */
export function useRequestLogs({ fetchAPI, useWorkspaceState, pageSize, refresh }: PagedLogsDependencies & { refresh: () => Promise<void> }) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const defaultRequestFilters = createRequestFilterDefaults()
  const requestFilters = ref(defaultRequestFilters())
  const appliedRequestFilters = ref(defaultRequestFilters())
  const eventSort = ref('timestamp_desc')
  const eventsResponse = useWorkspaceState<LogListResponse<RequestEvent> | null>('admin:logs:eventsResponse', () => (null))
  const requestLogsResponse = useWorkspaceState<LogListResponse<RequestLog> | null>('admin:logs:requestLogsResponse', () => (null))
  const eventsLoading = useWorkspaceState('admin:logs:eventsLoading', () => (false))
  const requestLogsLoading = useWorkspaceState('admin:logs:requestLogsLoading', () => (false))
  const eventsPage = ref(1)
  const requestLogsPage = ref(1)

  const events = computed(() => Array.isArray(eventsResponse.value?.items) ? eventsResponse.value.items : [])
  const eventsTotal = computed(() => Number(eventsResponse.value?.total) || 0)
  const requestLogs = computed(() => Array.isArray(requestLogsResponse.value?.items) ? requestLogsResponse.value.items : [])
  const requestLogsTotal = computed(() => Number(requestLogsResponse.value?.total) || 0)

  const loadEvents = async () => {
    eventsLoading.value = true
    try {
      const params = buildRequestParams(appliedRequestFilters.value, timezone)
      params.set('limit', String(pageSize.value))
      params.set('offset', String((eventsPage.value - 1) * pageSize.value))
      params.set('sort', eventSort.value)
      eventsResponse.value = await fetchAPI<LogListResponse<RequestEvent>>(`/request-events?${params.toString()}`)
    } finally {
      eventsLoading.value = false
    }
  }

  const loadRequestLogs = async () => {
    requestLogsLoading.value = true
    try {
      const params = buildRequestParams(appliedRequestFilters.value, timezone)
      params.set('limit', String(pageSize.value))
      params.set('offset', String((requestLogsPage.value - 1) * pageSize.value))
      requestLogsResponse.value = await fetchAPI<LogListResponse<RequestLog>>(`/request-logs?${params.toString()}`)
    } finally {
      requestLogsLoading.value = false
    }
  }

  const changeEventsPage = async (delta: number) => {
    const next = eventsPage.value + delta
    const pages = Math.max(1, Math.ceil(eventsTotal.value / pageSize.value))
    if (next < 1 || next > pages) return
    eventsPage.value = next
    await refresh()
  }

  const changeRequestLogsPage = async (delta: number) => {
    const next = requestLogsPage.value + delta
    const pages = Math.max(1, Math.ceil(requestLogsTotal.value / pageSize.value))
    if (next < 1 || next > pages) return
    requestLogsPage.value = next
    await refresh()
  }

  return {
    defaultRequestFilters,
    requestFilters,
    appliedRequestFilters,
    eventSort,
    eventsLoading,
    requestLogsLoading,
    eventsPage,
    requestLogsPage,
    events,
    eventsTotal,
    requestLogs,
    requestLogsTotal,
    loadEvents,
    loadRequestLogs,
    changeEventsPage,
    changeRequestLogsPage,
  }
}
