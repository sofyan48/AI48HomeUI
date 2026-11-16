import { apiErrorMessage, validErrorLogName } from './format.js'

const saveBlob = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

/** Request-log and error-log file downloads for the admin logs page. */
export function useLogDownloads({ fetchAPI, t, useWorkspaceState, errorMessage }) {
  const downloadingId = useWorkspaceState('admin:logs:downloadingId', () => (''))

  const downloadRequestLog = async (downloadUrl, requestId) => {
    if (!downloadUrl) return
    downloadingId.value = requestId || downloadUrl
    errorMessage.value = ''
    try {
      const blob = await fetchAPI(downloadUrl, { responseType: 'blob' })
      saveBlob(blob, `${requestId || 'request'}.log`)
    } catch (error) {
      errorMessage.value = apiErrorMessage(error, t('logs.downloadRequestFailed'))
    } finally {
      downloadingId.value = ''
    }
  }

  const downloadErrorLog = async (name) => {
    if (!validErrorLogName(name)) {
      errorMessage.value = t('logs.invalidErrorLogName')
      return
    }
    downloadingId.value = name
    errorMessage.value = ''
    try {
      const blob = await fetchAPI(`/observability/logs/errors/${encodeURIComponent(name)}`, { responseType: 'blob' })
      saveBlob(blob, name)
    } catch (error) {
      errorMessage.value = apiErrorMessage(error, t('logs.downloadErrorFailed'))
    } finally {
      downloadingId.value = ''
    }
  }

  return { downloadingId, downloadRequestLog, downloadErrorLog }
}
