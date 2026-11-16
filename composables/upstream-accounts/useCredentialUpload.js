import { computed, ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'

// Add-account dialog: JSON credential uploads (XHR with progress) and Vertex service-account import.
export function useCredentialUpload(ctx) {
  const { t, fetchAPI, resolveUrl, token, toast, message, credentialRoute, refreshData, busy } = ctx
  const fileInput = ref(null)
  const uploading = useWorkspaceState('admin:upstream-accounts:uploading', () => (false))
  const uploadResults = useWorkspaceState('admin:upstream-accounts:uploadResults', () => ([]))
  const failedUploads = computed(() => uploadResults.value.filter(result => result.status === 'error'))
  const uploadActive = computed(() => uploadResults.value.some(result => result.status === 'queued' || result.status === 'uploading'))
  let uploadID = 0

  function uploadErrorCode(error) {
    const text = message(error).toLowerCase()
    if ([401, 403].includes(error?.statusCode) || error?.code === 'auth') return 'unauthorized'
    if (error?.code === 'network') return 'network'
    if (error?.statusCode === 400 || text.includes('unsupported credential json')) return 'unsupported'
    return 'server'
  }
  function isRetryableUpload(item) { return item.status === 'error' && ['network', 'server'].includes(item.errorCode) }
  function uploadMessage(item) {
    const labels = { queued: t('cred.upload.queued'), uploading: t('cred.upload.uploading', { progress: item.progress }), success: t('cred.upload.uploaded'), notJson: t('cred.upload.notJson'), emptyFile: t('cred.upload.emptyFile'), invalidJson: t('cred.upload.invalidJson'), unauthorized: t('cred.upload.unauthorized'), network: t('cred.upload.network'), unsupported: t('cred.upload.unsupported'), server: t('cred.upload.server') }
    return labels[item.status === 'error' ? item.errorCode : item.status] || item.status
  }
  function uploadFile(item) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', resolveUrl(credentialRoute('')))
      xhr.setRequestHeader('Authorization', `Bearer ${token.value}`)
      xhr.upload.onprogress = event => { const ratio = event.lengthComputable && event.total > 0 ? event.loaded / event.total : 0; item.progress = Math.min(99, Math.max(0, Math.round(100 * ratio))) }
      xhr.onerror = () => reject(Object.assign(new Error('Network error'), { code: 'network' }))
      xhr.onload = () => {
        let response = {}
        try { response = JSON.parse(xhr.responseText || '{}') } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(response)
        else reject(Object.assign(new Error(response?.message || response?.error || xhr.statusText || 'Upload failed'), { statusCode: xhr.status }))
      }
      const body = new FormData(); body.append('file', item.file); xhr.send(body)
    })
  }
  async function validateUpload(item) {
    if (!/\.json$/i.test(item.file.name)) { item.status = 'error'; item.errorCode = 'notJson'; return false }
    if (!item.file.size) { item.status = 'error'; item.errorCode = 'emptyFile'; return false }
    try { JSON.parse(await item.file.text()) } catch { item.status = 'error'; item.errorCode = 'invalidJson'; return false }
    return true
  }
  async function runUploadItems(items, validate = true) {
    if (!items.length || uploading.value) return
    uploading.value = true
    if (validate) await Promise.all(items.map(validateUpload))
    const queue = items.filter(item => item.status === 'queued' || (!validate && isRetryableUpload(item)))
    let cursor = 0; let succeeded = 0
    async function worker() {
      while (cursor < queue.length) {
        const item = queue[cursor++]
        item.status = 'uploading'; item.progress = 0; item.resultName = null; item.errorCode = null
        try {
          const result = await uploadFile(item)
          item.status = 'success'; item.progress = 100; item.resultName = result?.files?.[0] || result?.name || item.file.name; succeeded++
        } catch (error) { item.status = 'error'; item.progress = 0; item.errorCode = uploadErrorCode(error) }
      }
    }
    try { await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker)); if (succeeded) await refreshData() }
    finally { uploading.value = false }
  }
  async function addUploadFiles(files) {
    const items = files.map(file => ({ id: `${Date.now()}-${++uploadID}`, file, status: 'queued', progress: 0, resultName: null, errorCode: null }))
    uploadResults.value.push(...items)
    await runUploadItems(items)
  }
  async function uploadFiles(event) { const files = Array.from(event.target.files || []); event.target.value = ''; await addUploadFiles(files) }
  async function retryUpload(item) { await runUploadItems([item], false) }
  async function retryFailedUploads() { await runUploadItems(failedUploads.value.filter(isRetryableUpload), false) }
  async function uploadDroppedFiles(event) { if (!uploadActive.value && !busy.value) await addUploadFiles(Array.from(event.dataTransfer?.files || [])) }

  const vertexFile = ref(null)
  const vertexResult = useWorkspaceState('admin:upstream-accounts:vertexResult', () => (null))
  const vertexLocation = ref('us-central1')
  const vertexError = ref('')
  const importingVertex = useWorkspaceState('admin:upstream-accounts:importingVertex', () => (false))
  async function importVertex() {
    if (importingVertex.value) return
    if (!vertexFile.value) { vertexError.value = t('cred.err.vertexFile'); return }
    importingVertex.value = true; vertexError.value = ''
    try {
      const body = new FormData()
      body.append('file', vertexFile.value)
      if (vertexLocation.value.trim()) body.append('location', vertexLocation.value.trim())
      vertexResult.value = await fetchAPI('/oauth/import', { method: 'POST', query: { provider: 'vertex' }, body })
      vertexFile.value = null
      await refreshData()
      toast.add({ title: t('cred.toast.vertexImported'), color: 'success' })
    } catch (error) { vertexError.value = message(error) }
    finally { importingVertex.value = false }
  }

  return {
    fileInput, uploading, uploadResults, failedUploads, uploadActive, isRetryableUpload, uploadMessage, uploadFiles,
    retryUpload, retryFailedUploads, uploadDroppedFiles, vertexFile, vertexResult, vertexLocation, vertexError,
    importingVertex, importVertex
  }
}
