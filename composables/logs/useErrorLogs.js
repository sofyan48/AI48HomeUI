import { computed, ref, watch } from 'vue'

/** Error log files for the admin logs page; filtered and paged on the client. */
export function useErrorLogs({ fetchAPI, useWorkspaceState, pageSize }) {
  const errorLogPageSize = computed(() => pageSize.value)
  const errorLogsResponse = useWorkspaceState('admin:logs:errorLogsResponse', () => (null))
  const errorLogsLoading = useWorkspaceState('admin:logs:errorLogsLoading', () => (false))
  const errorLogsPage = ref(1)
  const errorLogSearch = ref('')

  const errorLogs = computed(() => Array.isArray(errorLogsResponse.value?.files) ? errorLogsResponse.value.files : [])
  const filteredErrorLogs = computed(() => {
    const query = errorLogSearch.value.trim().toLowerCase()
    return query ? errorLogs.value.filter(item => String(item.name || '').toLowerCase().includes(query)) : errorLogs.value
  })
  const pagedErrorLogs = computed(() => filteredErrorLogs.value.slice((errorLogsPage.value - 1) * errorLogPageSize.value, errorLogsPage.value * errorLogPageSize.value))

  const loadErrorLogs = async () => {
    errorLogsLoading.value = true
    try {
      errorLogsResponse.value = await fetchAPI('/observability/logs/errors')
      const pages = Math.max(1, Math.ceil(filteredErrorLogs.value.length / errorLogPageSize.value))
      if (errorLogsPage.value > pages) errorLogsPage.value = pages
    } finally {
      errorLogsLoading.value = false
    }
  }

  const changeErrorLogsPage = (delta) => {
    const next = errorLogsPage.value + delta
    const pages = Math.max(1, Math.ceil(filteredErrorLogs.value.length / errorLogPageSize.value))
    if (next < 1 || next > pages) return
    errorLogsPage.value = next
  }

  watch(errorLogSearch, () => { errorLogsPage.value = 1 })

  return {
    errorLogPageSize,
    errorLogsLoading,
    errorLogsPage,
    errorLogSearch,
    filteredErrorLogs,
    pagedErrorLogs,
    loadErrorLogs,
    changeErrorLogsPage,
  }
}
