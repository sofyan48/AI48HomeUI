import { ref } from 'vue'

import type { AccountShared, AccountCredential } from './types'
import type { useAccountFields } from './useAccountFields'
import type { useAccountModels } from './useAccountModels'

// Recovery and Danger tabs: OAuth refresh, cooldown reset and credential download.
export function useAccountRecovery(ctx: AccountShared & ReturnType<typeof useAccountFields> & ReturnType<typeof useAccountModels>) {
  const {
    t, fetchAPI, supports, toast, message, unavailable, credentialRoute, refreshData, credentials, busy, savingFields,
    savingPolicy, credentialAction, detailsTarget, detailsTab, currentGeneration, ownsDetails, initializeFields, loadModels
  } = ctx
  const actionError = ref('')
  const refreshAvailable = ref(true)
  const cooldownAvailable = ref(true)

  async function runCredentialAction(action: 'refresh' | 'cooldown') {
    if (!detailsTarget.value || credentialAction.value || savingFields.value || savingPolicy.value || busy.value) return
    if (action === 'refresh' ? !refreshAvailable.value : !supports('credential_cooldown_reset', false) || !cooldownAvailable.value) return
    const item = detailsTarget.value
    const generation = currentGeneration()
    credentialAction.value = action; actionError.value = ''
    try {
      const result = action === 'refresh'
        ? await fetchAPI<{ auth?: unknown; cleared?: boolean }>('/credentials/refresh', { method: 'POST', body: { auth_index: item.id } })
        : await fetchAPI<{ auth?: unknown; cleared?: boolean }>(`/credentials/${encodeURIComponent(item.id)}/cooldown`, { method: 'DELETE' })
      if (action === 'refresh' && !result.auth) throw new Error(t('cred.err.noOAuthRefresh'))
      await refreshData()
      if (ownsDetails(item.id, generation)) {
        const updated = credentials.value.find(entry => entry.id === item.id)
        if (updated) { detailsTarget.value = updated; initializeFields(updated) }
        if (detailsTab.value === 'Models') await loadModels(detailsTarget.value)
      }
      toast.add({ title: action === 'refresh' ? t('cred.toast.refreshed') : result.cleared ? t('cred.toast.cooldownCleared') : t('cred.toast.noCooldown'), color: 'success' })
    } catch (error) {
      if (ownsDetails(item.id, generation)) {
        if (unavailable(error)) { if (action === 'refresh') refreshAvailable.value = false; else cooldownAvailable.value = false }
        actionError.value = unavailable(error) ? t('cred.err.actionUnavailable') : message(error)
      }
    } finally { credentialAction.value = '' }
  }
  async function downloadCredential(item: AccountCredential) {
    try {
      const blob = await fetchAPI<Blob>(credentialRoute('/download'), { query: { id: item.id }, responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = item.name || `${item.id}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) { toast.add({ title: t('cred.toast.downloadFailed'), description: message(error), color: 'error' }) }
  }

  return { actionError, refreshAvailable, cooldownAvailable, runCredentialAction, downloadCredential }
}
