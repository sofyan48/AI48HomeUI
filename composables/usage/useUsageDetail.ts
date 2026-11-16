import { ref, type Ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import type { useAdminI18n } from '~/composables/useAdminI18n'
import { apiErrorMessage } from '~/composables/usage/format'

type Options = {
  t: ReturnType<typeof useAdminI18n>['t']
  fetchAPI: <T = unknown>(path: string, options?: Record<string, any>) => Promise<T>
  errorMessage: Ref<string>
}

/** Usage record detail dialog: loads one record with payload/log context and downloads its log. */
export function useUsageDetail({ t, fetchAPI, errorMessage }: Options) {
  const detailOpen = ref(false)
  const detailLoading = useWorkspaceState('admin:usage:detailLoading', () => (false))
  const selectedDetail = useWorkspaceState<any>('admin:usage:selectedDetail', () => (null))
  const downloadingLog = useWorkspaceState('admin:usage:downloadingLog', () => (false))

  const openDetail = async (record: any) => {
    if (!record?.id) return
    detailOpen.value = true
    detailLoading.value = true
    selectedDetail.value = null
    errorMessage.value = ''
    try {
      selectedDetail.value = await fetchAPI<any>(`/usage/records/${encodeURIComponent(record.id)}?include_payload=true&include_logs=true`)
    } catch (error) {
      errorMessage.value = apiErrorMessage(error, t('usage.err.detail'))
      detailOpen.value = false
    } finally {
      detailLoading.value = false
    }
  }

  const downloadDetailLog = async () => {
    const log = selectedDetail.value?.related?.request_log
    if (!log?.download_url) return
    downloadingLog.value = true
    errorMessage.value = ''
    try {
      const blob = await fetchAPI<Blob>(log.download_url, { responseType: 'blob' })
      const objectURL = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectURL
      anchor.download = `${log.request_id || selectedDetail.value?.record?.request_id || 'request'}.log`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectURL)
    } catch (error) {
      errorMessage.value = apiErrorMessage(error, t('usage.err.download'))
    } finally {
      downloadingLog.value = false
    }
  }

  return { detailOpen, detailLoading, selectedDetail, downloadingLog, openDetail, downloadDetailLog }
}
