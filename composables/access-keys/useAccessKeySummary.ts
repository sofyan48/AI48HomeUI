import { computed } from 'vue'
import type { AccessKeysState } from './useAccessKeys'

export function useAccessKeySummary({ t, resources, channelGroups, modelGroups }: AccessKeysState) {
  // Keys with neither credential nor model groups can reach every upstream and model.
  const keyCoverage = computed(() => {
    const total = resources.value.length
    const scoped = resources.value.filter(resource => resource.channelGroupIds.length || resource.modelGroupIds.length).length
    return { scoped, open: total - scoped, restricted: total ? Math.round((scoped / total) * 100) : 0 }
  })
  return computed(() => {
    const total = resources.value.length
    const owned = resources.value.filter(resource => resource.userId != null).length
    const credentialScoped = resources.value.filter(resource => resource.channelGroupIds.length).length
    const modelScoped = resources.value.filter(resource => resource.modelGroupIds.length).length
    const ratio = (value: number) => total ? value / total : 0
    return [
      { label: t('keys.title'), value: total, detail: t('keys.statUnrestricted', { count: keyCoverage.value.open }), icon: 'i-tabler-key', tone: 'violet', ratio: ratio(keyCoverage.value.scoped), warning: keyCoverage.value.open > 0 && keyCoverage.value.scoped === 0 },
      { label: t('keys.statAssigned'), value: owned, detail: t('keys.statUnassigned', { count: total - owned }), icon: 'i-tabler-user-check', tone: 'blue', ratio: ratio(owned) },
      { label: t('keys.statCredentialScoped'), value: credentialScoped, detail: t('keys.groupsAvailable', { count: channelGroups.value.length }), icon: 'i-tabler-route', tone: 'emerald', ratio: ratio(credentialScoped) },
      { label: t('keys.statModelScoped'), value: modelScoped, detail: t('keys.groupsAvailable', { count: modelGroups.value.length }), icon: 'i-tabler-box-multiple', tone: 'amber', ratio: ratio(modelScoped) },
    ]
  })
}
