import { computed, ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'

// Connectivity test dialog: sends one GET through the credential via /requests/api-call.
export function useConnectivity({ t, fetchAPI, message }) {
  const connectivityOpen = ref(false)
  const connectivityTarget = ref(null)
  const connectivityURL = ref('')
  const connectivityError = useWorkspaceState('admin:upstream-accounts:connectivityError', () => (''))
  const connectivityResult = useWorkspaceState('admin:upstream-accounts:connectivityResult', () => (null))
  const testingConnectivity = useWorkspaceState('admin:upstream-accounts:testingConnectivity', () => (false))
  const connectivityBody = computed(() => {
    const body = connectivityResult.value?.body || ''
    try { return JSON.stringify(JSON.parse(body), null, 2) } catch { return body }
  })

  function openConnectivity(item) {
    connectivityTarget.value = item
    connectivityURL.value = ''
    connectivityError.value = ''
    connectivityResult.value = null
    connectivityOpen.value = true
  }
  async function runConnectivity() {
    const authIndex = connectivityTarget.value?.auth_index || connectivityTarget.value?.id
    const url = connectivityURL.value.trim()
    if (!authIndex || !/^https?:\/\/[^\s/]+/i.test(url)) {
      connectivityError.value = t('cred.conn.invalid')
      return
    }
    testingConnectivity.value = true
    connectivityError.value = ''
    connectivityResult.value = null
    try {
      connectivityResult.value = await fetchAPI('/requests/api-call', {
        method: 'POST',
        body: { auth_index: authIndex, method: 'GET', url, header: { Authorization: 'Bearer $TOKEN$', Accept: 'application/json' }, data: '' }
      })
      if (connectivityResult.value.status_code < 200 || connectivityResult.value.status_code >= 300) {
        connectivityError.value = t('cred.conn.httpStatus', { status: connectivityResult.value.status_code ?? t('common.unknown') })
      }
    } catch (error) { connectivityError.value = message(error) }
    finally { testingConnectivity.value = false }
  }

  return { connectivityOpen, connectivityTarget, connectivityURL, connectivityError, connectivityResult, testingConnectivity, connectivityBody, openConnectivity, runConnectivity }
}
