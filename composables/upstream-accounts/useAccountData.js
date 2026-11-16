import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
import { normalizeQuotaEntry } from '~/composables/upstreamQuota'

// Credential list, in-flight summary and quota summary loading, plus the shared refresh.
export function useAccountData(ctx) {
  const { t, fetchAPI, token, supports, props, emit, quotaCollection, message, unavailable, credentialRoute } = ctx
  const pageError = useWorkspaceState('admin:upstream-accounts:pageError', () => (''))
  const selectedIDs = ref(new Set())
  const snapshotsAvailable = ref(true)
  const snapshotsSupported = computed(() => supports('credential_in_flight_snapshots', false) && snapshotsAvailable.value)

  const flightError = useWorkspaceState('admin:upstream-accounts:flightError', () => (''))
  async function loadData() {
    pageError.value = ''
    try {
      return await fetchAPI(credentialRoute(''))
    } catch (error) {
      pageError.value = message(error)
      return { files: [] }
    }
  }
  const { data: authData, pending, refresh: refreshCredentialsData } = useStoreData('admin:upstream-accounts:management-credentials', loadData, { lazy: true, default: () => ({ files: [] }) })
  let flightRequest = 0
  onBeforeUnmount(() => { flightRequest++ })
  async function loadFlight() {
    const requestID = ++flightRequest
    const requestToken = token.value
    flightError.value = ''
    if (!snapshotsSupported.value) return { items: [] }
    try { return await fetchAPI('/credentials/in-flight/summary') }
    catch (error) {
      if (requestID === flightRequest && requestToken === token.value && snapshotsSupported.value) {
        if (unavailable(error)) snapshotsAvailable.value = false
        flightError.value = unavailable(error) ? t('cred.conc.snapshotsUnavailable') : message(error)
      }
      return { items: [] }
    }
  }
  const { data: flightData, refresh: refreshFlightData } = useStoreData('admin:upstream-accounts:management-credentials-flight', loadFlight, { lazy: true, default: () => ({ items: [] }), watch: [snapshotsSupported] })
  async function refreshData(notify = true) {
    try {
      await refreshCredentialsData()
      void refreshFlightData()
      void refreshQuotaSummary()
      if (notify) emit('changed')
    } finally { selectedIDs.value = new Set() }
  }
  watch(() => props.syncRequest, () => { void refreshData(false) })
  const credentials = computed(() => {
    const data = authData.value
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.files)) return data.files
    if (Array.isArray(data?.credentials)) return data.credentials
    return Array.isArray(data?.items) ? data.items : []
  })
  const credentialIDs = computed(() => credentials.value.map(item => item.id).filter(Boolean).join(','))
  const quotaError = useWorkspaceState('admin:upstream-accounts:quotaError', () => (''))
  async function loadQuotaSummary() {
    quotaError.value = ''
    const ids = credentialIDs.value.split(',').filter(Boolean)
    if (!ids.length) return []
    try {
      const batches = []
      for (let start = 0; start < ids.length; start += 200) {
        const result = await fetchAPI('/quota/credentials', { query: { ids: ids.slice(start, start + 200).join(','), limit: 200 } })
        batches.push(...(result.items || []).map(normalizeQuotaEntry))
      }
      return batches.map(normalizeQuotaEntry)
    } catch (error) { quotaError.value = message(error); return [] }
  }
  const { data: quotaSummary, pending: quotaPending, refresh: refreshQuotaSummary } = useStoreData('admin:upstream-accounts:management-account-quota', loadQuotaSummary, { lazy: true, default: () => [], watch: [credentialIDs] })
  const quotaByID = computed(() => new Map((quotaSummary.value || []).map(item => [item.credential_id, item])))
  watch(quotaCollection.revision, () => { void refreshQuotaSummary() })

  const flightItems = computed(() => Array.isArray(flightData.value?.items) ? flightData.value.items : [])
  const flightByID = computed(() => new Map(flightItems.value.map(item => [item.credential_id, item])))
  const concurrency = item => flightByID.value.get(item.id) || {}

  return {
    pageError, flightError, selectedIDs, snapshotsAvailable, snapshotsSupported, pending, refreshData, credentials,
    quotaError, quotaPending, refreshQuotaSummary, quotaByID, concurrency
  }
}
