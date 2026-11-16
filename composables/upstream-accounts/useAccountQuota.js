import { computed, ref, watch } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { normalizeQuotaDetail, quotaWindowAmount, xaiProductWindows } from '~/composables/upstreamQuota'

// Quota tab: per-credential quota detail, collection and window formatting.
export function useAccountQuota(ctx) {
  const { t, intlLocale, fetchAPI, token, quotaCollection, message, quotaWindowRatio, refreshQuotaSummary, detailsOpen, detailsTarget, currentGeneration, ownsDetails } = ctx
  const accountQuotaDetail = useWorkspaceState('admin:upstream-accounts:accountQuotaDetail', () => (null))
  const accountQuotaWindows = computed(() => {
    const quota = accountQuotaDetail.value?.credential
    const products = new Set(['xai', 'grok'].includes(quota?.provider) ? xaiProductWindows(quota).map(window => window.id) : [])
    return (accountQuotaDetail.value?.windows || []).filter(window => !products.has(window.id))
  })
  const accountQuotaError = useWorkspaceState('admin:upstream-accounts:accountQuotaError', () => (''))
  const accountQuotaLoading = useWorkspaceState('admin:upstream-accounts:accountQuotaLoading', () => (false))
  const accountQuotaCollecting = computed(() => quotaCollection.collectingAll.value || quotaCollection.collectingIDs.value.has(detailsTarget.value?.id))
  const accountQuotaNotice = ref('')

  function quotaWindowRemaining(window) {
    if (window.is_unlimited) return t('quota.unlimited')
    if (window.remaining != null) return t('quota.remainingAmount', { amount: `${quotaWindowAmount(window.remaining, window, intlLocale.value)}${window.limit != null ? ` / ${quotaWindowAmount(window.limit, window, intlLocale.value)}` : ''}` })
    const ratio = quotaWindowRatio(window)
    return ratio == null ? '—' : t('quota.remainingAmount', { amount: `${Math.round(ratio * 100)}%` })
  }
  async function refreshAccountQuota() {
    if (!detailsTarget.value) return
    const id = detailsTarget.value.id
    const generation = currentGeneration()
    const session = token.value
    const current = () => token.value === session && ownsDetails(id, generation)
    accountQuotaLoading.value = true
    accountQuotaError.value = ''
    try {
      const detail = await fetchAPI(`/quota/credentials/${encodeURIComponent(id)}`)
      if (current()) accountQuotaDetail.value = normalizeQuotaDetail(detail)
      await refreshQuotaSummary()
    } catch (error) { if (current()) accountQuotaError.value = message(error) }
    finally { if (current()) accountQuotaLoading.value = false }
  }
  watch(() => quotaCollection.details.value[detailsTarget.value?.id], detail => {
    if (detailsOpen.value && detail) accountQuotaDetail.value = detail
  })
  async function collectAccountQuota() {
    if (!detailsTarget.value || accountQuotaCollecting.value) return
    const id = detailsTarget.value.id
    const generation = currentGeneration()
    const session = token.value
    accountQuotaError.value = ''; accountQuotaNotice.value = ''
    const result = await quotaCollection.collect(id)
    if (session !== token.value || !ownsDetails(id, generation) || !result) return
    accountQuotaNotice.value = result.completion === 'pending' ? t('quota.notice.pending') : result.completion === 'settled' ? t('quota.notice.settledOne') : t('quota.notice.none')
  }

  return {
    accountQuotaDetail, accountQuotaWindows, accountQuotaError, accountQuotaLoading, accountQuotaCollecting, accountQuotaNotice,
    quotaWindowRemaining, refreshAccountQuota, collectAccountQuota
  }
}
