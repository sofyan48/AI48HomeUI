import { onBeforeUnmount, watch } from 'vue'
import { credentialWebsocketState, supportsCredentialUsingAPI, credentialUsingAPI } from '~/composables/credentialTransport'

import type { AccountDetailsContext, AccountCredential } from './types'

// Opens the details slide-over, loads each tab on selection and guards against stale owners.
export function useAccountDetails(ws: AccountDetailsContext) {
  const { t, token, route, quotaByID, quotaStatusLabel, wsStateLabel, busy, savingFields, savingPolicy, credentialAction, credentials } = ws

  function overviewFields(item: AccountCredential) {
    const fallback = '—'
    const quotaStatus = quotaByID.value.get(item.id)?.quota_status
    return [
      [t('cred.field.provider'), item.provider], [t('cred.field.type'), item.type], [t('cred.field.source'), item.source],
      [t('cred.field.account'), item.account || item.email], [t('cred.field.authIndex'), item.auth_index || item.id],
      [t('cred.field.prefix'), item.prefix], [t('cred.field.proxyUrl'), item.proxy_url],
      [t('cred.field.priority'), item.priority], [t('cred.field.weight'), item.weight ?? t('cred.weightUnset')], [t('cred.field.requestRetries'), item['request-retry']],
      [t('cred.field.websockets'), wsStateLabel(credentialWebsocketState(item))],
      ...(supportsCredentialUsingAPI(item) ? [[t('cred.field.xaiApiMode'), credentialUsingAPI(item) ? t('common.enabled') : t('common.disabled')]] : []),
      [t('cred.field.cooling'), item['disable-cooling'] ? t('common.disabled') : t('common.enabled')],
      [t('cred.field.path'), item.path], [t('cred.field.size'), item.size], [t('cred.field.updatedAt'), item.mod_time || item.updated_at],
      [t('cred.field.lastRefresh'), item.last_refresh], [t('cred.field.note'), item.note],
      [t('cred.field.quotaStatus'), quotaStatus ? quotaStatusLabel(quotaStatus) : quotaStatus]
    ].map(([label, value]) => ({ label, value: value == null || value === '' ? fallback : String(value) }))
  }

  function cancelDetailRequests() { ws.bumpGeneration(); ws.cancelPolicyRequests(); ws.cancelModelsRequest() }
  watch(ws.detailsOpen, open => {
    if (!open) { cancelDetailRequests(); ws.loadingPolicy.value = false; ws.loadingConcurrency.value = false; ws.modelsLoading.value = false; ws.exclusionsLoading.value = false; ws.policy.value = null }
  })
  onBeforeUnmount(cancelDetailRequests)
  watch(token, () => { ws.bumpGeneration(); ws.detailsOpen.value = false; ws.accountQuotaNotice.value = '' }, { flush: 'sync' })

  async function showDetails(item: AccountCredential, section = 'Overview') {
    if (savingFields.value || savingPolicy.value || credentialAction.value) return
    cancelDetailRequests()
    ws.loadingPolicy.value = false; ws.loadingConcurrency.value = false; ws.modelsLoading.value = false
    ws.resetExclusions()
    ws.resetPolicyDraft()
    ws.modelStates.value = null; ws.modelStatesNotice.value = ''; ws.actionError.value = ''
    ws.detailsTarget.value = item

    ws.initializeFields(item)
    ws.detailsTab.value = section
    ws.accountQuotaDetail.value = null
    ws.accountQuotaError.value = ''; ws.accountQuotaNotice.value = ''
    ws.policy.value = null
    ws.policyError.value = ''
    ws.concurrencyState.value = null
    ws.flightDetails.value = null
    ws.credentialModels.value = []
    ws.modelScope.value = 'all'
    ws.modelsError.value = ''
    ws.detailsOpen.value = true
    await selectDetailSection(section)
  }
  async function selectDetailSection(section: string) {
    if (savingFields.value || savingPolicy.value || credentialAction.value) return
    ws.detailsTab.value = section
    if (section === 'Metadata') await Promise.all([ws.loadExclusions(), ws.policy.value ? Promise.resolve() : ws.loadPolicy()])
    if (section === 'Quota') await ws.refreshAccountQuota()
    if (section === 'Concurrency') {
      ws.concurrencyError.value = ''
      await Promise.all([ws.policy.value ? Promise.resolve() : ws.loadPolicy(), ws.loadConcurrency()])
    }
    if (section === 'Models') await ws.loadModels(ws.detailsTarget.value)
  }
  async function openAccountQuota(item: AccountCredential) {
    await showDetails(item, 'Quota')
  }

  let openedDeepLink = ''
  watch([() => route.query.credential, credentials], ([id, items]) => {
    if (id !== openedDeepLink && typeof id !== 'string') openedDeepLink = ''
    if (typeof id !== 'string' || !id || !items.length || id === openedDeepLink) return
    const item = items.find(entry => entry.id === id)
    if (item) { openedDeepLink = id; void showDetails(item, 'Concurrency') }
  }, { immediate: true })

  function credentialRowActions(item: AccountCredential) {
    return [
      { id: 'view', label: t('common.view'), ariaLabel: t('cred.action.view'), icon: 'i-tabler-eye', onSelect: () => showDetails(item) },
      { id: 'test', label: t('cred.action.test'), ariaLabel: t('cred.action.testAria'), icon: 'i-tabler-plug-connected', onSelect: () => ws.openConnectivity(item) },
      { id: 'download', label: t('cred.action.download'), ariaLabel: t('cred.action.downloadAria'), icon: 'i-tabler-download', disabled: busy.value, onSelect: () => ws.downloadCredential(item) },
      { id: 'delete', label: t('common.delete'), ariaLabel: t('cred.action.deleteAria'), icon: 'i-tabler-trash', destructive: true, disabled: busy.value, onSelect: () => ws.confirmDelete(item) }
    ]
  }

  return { overviewFields, showDetails, selectDetailSection, openAccountQuota, credentialRowActions }
}
