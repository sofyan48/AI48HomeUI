<template>
  <div class="space-y-4">
    <div class="workbench-toolbar justify-between"><div><h2 class="font-semibold">{{ t('quota.title') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.subtitle') }}</p></div><div class="flex gap-2"><AppButton color="neutral" variant="outline" icon="i-tabler-refresh" :loading="pending" @click="refreshQuota">{{ t('common.refresh') }}</AppButton><AppButton icon="i-tabler-bolt" :loading="collectingAll" @click="collectAll">{{ t('quota.collectAll') }}</AppButton></div></div>
    <p v-if="collectingAll || collectingIDs.size || collectionNotice" role="status" class="text-sm text-[var(--ui-text-muted)]">{{ collectingAll || collectingIDs.size ? t('quota.waitingSettled') : collectionNotice }}</p>
    <UAlert v-if="pageError" color="error" variant="subtle" :title="t('quota.loadFailed')" :description="pageError" />
    <AdminStatGrid
      :label="t('quota.summary')"
      :columns="4"
      :items="[
        { label: t('quota.stat.credentials'), value: summary.total_credentials ?? total, detail: t('quota.stat.credentialsDetail'), icon: 'i-tabler-id-badge-2', tone: 'violet' },
        { label: t('quota.status.healthy'), value: summary.healthy ?? 0, detail: t('quota.stat.healthyDetail'), icon: 'i-tabler-circle-check', tone: 'emerald' },
        { label: t('quota.stat.lowExhausted'), value: (summary.low ?? 0) + (summary.exhausted ?? 0), detail: t('quota.stat.lowExhaustedDetail'), icon: 'i-tabler-battery-2', tone: 'amber', warning: (summary.low ?? 0) + (summary.exhausted ?? 0) > 0 },
        { label: t('quota.stat.staleNever'), value: (summary.stale ?? 0) + (summary.never ?? 0), detail: t('quota.stat.staleNeverDetail'), icon: 'i-tabler-clock-pause', tone: 'neutral' }
      ]"
    />
    <div class="workbench-toolbar grid lg:grid-cols-[1fr_220px_220px_auto]">
      <UInput v-model="search" icon="i-tabler-search" :placeholder="t('quota.searchPlaceholder')" @keyup.enter="applyFilters" />
      <USelectMenu v-model="provider" :items="providerOptions" value-key="value" label-key="label" :search-input="{ placeholder: t('quota.searchProviders') }" />
      <USelect v-model="quotaStatus" :items="statusOptions" value-key="value" label-key="label" />
      <AppButton color="neutral" variant="outline" @click="applyFilters">{{ t('quota.applyFilters') }}</AppButton>
    </div>
    <AppCard :ui="{ body: 'p-0' }">
      <AppTable :columns="columns" :data="items" :loading="pending" :number-offset="offset">
        <template #identity-cell="{ row }"><button class="min-w-0 text-left" @click="openDetail(value(row))"><p class="truncate font-medium text-primary-500 hover:underline">{{ value(row).label || value(row).credential_id }}</p><p class="mt-1 max-w-64 truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ value(row).credential_id }}</p></button></template>
        <template #provider-cell="{ row }"><div><UBadge color="neutral" variant="subtle">{{ value(row).provider }}</UBadge><p v-if="value(row).plan?.name" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ value(row).plan.name }}</p></div></template>
        <template #quota-cell="{ row }"><div><UBadge :color="statusColor(value(row).quota_status)" variant="subtle">{{ quotaStatusLabel(value(row).quota_status) }}</UBadge><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('quota.windowCount', { count: value(row).window_count || 0 }) }}</p><p v-if="quotaHistorical(value(row))" class="text-xs text-amber-500">{{ t('quota.retainedHistorical') }}</p></div></template>
        <template #collection-cell="{ row }"><div><UBadge :color="collectionColor(value(row).collection_status)" variant="subtle">{{ collectionLabel(value(row).collection_status) }}</UBadge><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ freshnessLabel(value(row).freshness) }} · {{ value(row).source || t('quota.noSource') }}</p><p v-if="value(row).source === 'response_header' && value(row).collection_status === 'success'" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.passiveHeader') }}</p></div></template>
        <template #observed-cell="{ row }"><div class="text-xs"><p>{{ formatDate(value(row).observed_at) }}</p><p v-if="value(row).earliest_reset_at" class="mt-1 text-[var(--ui-text-muted)]">{{ t('quota.resetAt', { date: formatDate(value(row).earliest_reset_at) }) }}</p><p v-if="value(row).plan?.expires_at" class="mt-1 text-[var(--ui-text-muted)]">{{ t('quota.planEnds', { date: formatDate(value(row).plan.expires_at) }) }}</p></div></template>
        <template #actions-cell="{ row }"><div class="flex justify-end gap-1"><AdminTableAction action="view" :label="t('quota.viewDetails')" @click="openDetail(value(row))" /><AdminTableAction action="refresh" :label="t('quota.collectOne')" :loading="collectingIDs.has(value(row).credential_id)" :disabled="collectingAll" @click="collectOne(value(row))" /></div></template>
        <template #empty><div class="py-8 text-center text-sm text-[var(--ui-text-muted)]">{{ t('quota.empty') }}</div></template>
      </AppTable>
    </AppCard>
    <div class="flex items-center justify-between"><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.showingCount', { count: items.length, total }) }}</p><div class="flex gap-2"><AppButton color="neutral" variant="outline" size="sm" :disabled="offset === 0" @click="previousPage">{{ t('common.previous') }}</AppButton><AppButton color="neutral" variant="outline" size="sm" :disabled="offset + limit >= total" @click="nextPage">{{ t('common.next') }}</AppButton></div></div>

    <AppModal v-model:open="detailOpen" :title="detail?.credential?.label || t('quota.detailsTitle')" :description="t('quota.detailsDescription')">
      <template #body><div class="space-y-5"><UAlert v-if="detailError" color="error" variant="subtle" :description="detailError"/><div v-if="detailLoading" class="py-12 text-center"><UIcon name="i-tabler-refresh" class="mx-auto size-6 animate-spin" /></div><template v-else-if="detail"><div class="grid gap-3 sm:grid-cols-3"><div class="rounded-lg bg-[var(--ui-bg-muted)] p-3"><p class="text-xs text-[var(--ui-text-muted)]">{{ t('common.provider') }}</p><p class="mt-1 font-medium">{{ detail.credential.provider }}</p></div><div class="rounded-lg bg-[var(--ui-bg-muted)] p-3"><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.label.quota') }}</p><p class="mt-1 font-medium">{{ quotaStatusLabel(detail.credential.quota_status) }}</p></div><div class="rounded-lg bg-[var(--ui-bg-muted)] p-3"><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.label.collection') }}</p><p class="mt-1 font-medium">{{ collectionLabel(detail.credential.collection_status) }}</p></div></div><p v-if="quotaHistorical(detail.credential)" class="text-xs text-amber-500">{{ t('quota.historical') }}</p><p v-if="detail.credential.plan?.expires_at" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.subscriptionEnds', { date: formatDate(detail.credential.plan.expires_at) }) }}</p><div class="space-y-3"><h3 class="font-semibold">{{ t('quota.windows') }}</h3><div v-for="window in detailWindows" :key="window.id" class="rounded-xl border border-[var(--ui-border)] p-4"><div class="flex items-start justify-between gap-3"><div><p class="font-medium">{{ quotaWindowLabel(window, detail.credential.provider, t) }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ window.scope }} · {{ window.mode }} · {{ window.unit }}</p><p v-if="isRetained(detail.credential, window)" class="text-xs text-amber-500">{{ t('quota.retainedFrom', { date: formatDate(window.observed_at) }) }}</p></div><UBadge :color="statusColor(window.status)" variant="subtle">{{ quotaStatusLabel(window.status) }}</UBadge></div><div class="mt-3 grid grid-cols-3 gap-2 text-sm"><div><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.used') }}</p><p>{{ metric(window.used, window.used_ratio, window) }}</p></div><div><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.remaining') }}</p><p>{{ window.is_unlimited ? t('quota.unlimited') : metric(window.remaining, window.remaining_ratio, window) }}</p></div><div><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.reset') }}</p><p>{{ formatDate(window.reset_at) }}</p></div></div></div><p v-if="!detail.windows?.length" class="text-sm text-[var(--ui-text-muted)]">{{ t('quota.noWindowsRecorded') }}</p></div><div v-if="['xai', 'grok'].includes(detail.credential.provider)" class="space-y-3"><h3 class="font-semibold">{{ t('quota.xaiStatus') }}</h3><p v-if="xaiProductWindows(detail.credential).length" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.sharedAllowance') }}</p><p>{{ t('quota.onDemandLabel') }} <span class="font-medium">{{ onDemandLabel(xaiOnDemandState(detail.credential)) }}</span></p><div v-for="window in xaiProductWindows(detail.credential)" :key="window.id" class="flex items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] p-3 text-sm"><div><p>{{ window.label || window.id.replace(/^xai-product-/, '') }}</p><p v-if="isRetained(detail.credential, window)" class="text-xs text-amber-500">{{ t('quota.retainedObserved', { date: formatDate(window.observed_at) }) }}</p></div><span class="tabular-nums">{{ quotaProductUsed(window, t) }}</span></div></div><div v-if="detail.reset_credits" class="space-y-3"><h3 class="font-semibold">{{ t('quota.resetCredits') }}</h3><p v-if="detail.credential.provider === 'claude'" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.claudeCreditsNote') }}</p><p class="text-sm">{{ t('quota.availableLabel') }} <span class="font-medium">{{ detail.reset_credits.available_count }}</span></p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.observedAt', { date: formatDate(detail.reset_credits.observed_at) }) }}</p><div v-for="(credit, index) in detail.reset_credits.credits || []" :key="index" class="flex items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] p-3 text-sm"><UBadge :color="statusColor(credit.status)" variant="subtle">{{ quotaStatusLabel(credit.status) }}</UBadge><span>{{ t('quota.expiresAt', { date: formatDate(credit.expires_at) }) }}</span></div><p v-if="detail.credential.provider !== 'claude' && !detail.reset_credits.credits?.length" class="text-sm text-[var(--ui-text-muted)]">{{ t('quota.noCreditExpiry') }}</p></div><UAlert v-if="detail.collection?.error" color="error" variant="subtle" :title="t('quota.collectionError')" :description="quotaCollectionMessage(detail.collection.error, t)"/></template></div></template>
    </AppModal>
  </div>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
import { normalizeQuotaEntries, normalizeQuotaDetail, isRetainedQuotaWindow, quotaCollectionMessage, quotaHistorical, quotaProductUsed, quotaWindowAmount, quotaWindowLabel, xaiOnDemandState, xaiProductWindows } from '~/composables/upstreamQuota'
import { useQuotaCollection } from '~/composables/useQuotaCollection'
const quotaCollection = useQuotaCollection()
const { collectingAll, collectingIDs } = quotaCollection
const { fetchAPI, token } = useApi()
const { t, intlLocale } = useAdminI18n()

const value = row => row?.original ?? row
const search = ref('')
const appliedSearch = ref('')
const ALL_FILTER = '__all__'
const provider = ref(ALL_FILTER)
const appliedProvider = ref('')
const quotaStatus = ref(ALL_FILTER)
const appliedQuotaStatus = ref('')
const offset = ref(0)
const limit = 50
const pageError = useWorkspaceState('admin:credential-quota:pageError', () => (''))
const collectionNotice = ref('')
const detailOpen = ref(false)
const detailLoading = useWorkspaceState('admin:credential-quota:detailLoading', () => (false))
const detailError = useWorkspaceState('admin:credential-quota:detailError', () => (''))
const detail = useWorkspaceState('admin:credential-quota:detail', () => (null))
const columns = computed(() => [{ accessorKey: 'identity', header: t('quota.col.credential') }, { accessorKey: 'provider', header: t('common.provider') }, { accessorKey: 'quota', header: t('quota.label.quota') }, { accessorKey: 'collection', header: t('quota.label.collection') }, { accessorKey: 'observed', header: t('quota.col.observed') }, { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }])
async function loadQuota() { pageError.value = ''; try { const result = await fetchAPI('/quota/credentials', { query: { limit, offset: offset.value, search: appliedSearch.value || undefined, provider: appliedProvider.value || undefined, quota_status: appliedQuotaStatus.value || undefined } }); return { ...result, items: normalizeQuotaEntries(result.items || []) } } catch (error) { pageError.value = message(error); return { items: [], total: 0 } } }
const { data, pending, refresh: refreshQuota } = useStoreData('admin:credential-quota:management-quota', loadQuota, { watch: [offset] })
const items = computed(() => Array.isArray(data.value?.items) ? data.value.items : [])
const total = computed(() => Number(data.value?.total || 0))
const summary = computed(() => data.value?.summary ?? data.value?.global_summary ?? {})
const providerOptions = computed(() => [{ label: t('quota.allProviders'), value: ALL_FILTER }, ...Array.from(new Set([...(data.value?.facets?.providers || []), ...items.value.map(item => item.provider)].map(item => typeof item === 'string' ? item : item?.value).filter(Boolean))).sort().map(value => ({ label: value, value }))])
const statusOptions = computed(() => [{ label: t('quota.allStates'), value: ALL_FILTER }, ...['healthy', 'low', 'exhausted', 'unknown', 'error', 'unsupported'].map(value => ({ label: quotaStatusLabel(value), value }))])
function quotaStatusLabel(status) {
  const labels = { healthy: t('quota.status.healthy'), low: t('quota.status.low'), exhausted: t('quota.status.exhausted'), unknown: t('quota.status.unknown'), error: t('quota.status.error'), unsupported: t('quota.status.unsupported'), available: t('quota.status.available') }
  return labels[status] || status
}
function collectionLabel(status) {
  const labels = { success: t('quota.collection.success'), partial: t('quota.collection.partial'), failed: t('quota.collection.failed'), collecting: t('quota.collection.collecting'), never: t('quota.collection.never') }
  return labels[status] || status
}
function freshnessLabel(value) {
  const labels = { fresh: t('quota.freshness.fresh'), stale: t('quota.freshness.stale'), never: t('quota.freshness.never'), expired: t('quota.freshness.expired') }
  return labels[value] || value
}
function onDemandLabel(value) { return value === 'enabled' ? t('common.enabled') : value === 'disabled' ? t('common.disabled') : t('common.unknown') }

function statusColor(status) { return status === 'healthy' || status === 'available' ? 'success' : status === 'low' ? 'warning' : status === 'exhausted' || status === 'error' ? 'error' : 'neutral' }
function collectionColor(status) { return status === 'success' ? 'success' : status === 'collecting' ? 'info' : status === 'failed' ? 'error' : status === 'partial' ? 'warning' : 'neutral' }
function formatDate(value) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(intlLocale.value) }
function metric(value, ratio, window) { if (value !== null && value !== undefined) return quotaWindowAmount(value, window, intlLocale.value); if (ratio !== null && ratio !== undefined) return `${Math.round(Number(ratio) * 100)}%`; return '—' }
const isRetained = isRetainedQuotaWindow
const detailWindows = computed(() => {
  const quota = detail.value?.credential
  const products = new Set(['xai', 'grok'].includes(quota?.provider) ? xaiProductWindows(quota).map(window => window.id) : [])
  return (detail.value?.windows || []).filter(window => !products.has(window.id))
})
async function applyFilters() { const onFirstPage = offset.value === 0; appliedSearch.value = search.value.trim(); appliedProvider.value = provider.value === ALL_FILTER ? '' : provider.value; appliedQuotaStatus.value = quotaStatus.value === ALL_FILTER ? '' : quotaStatus.value; offset.value = 0; if (onFirstPage) await refreshQuota() }
let detailRequest = 0
let detailController
const detailID = ref('')
watch(quotaCollection.revision, () => {
  void refreshQuota()
  const latest = quotaCollection.details.value[detailID.value]
  if (detailOpen.value && latest) detail.value = latest
})
async function collect(id) {
  const session = token.value
  collectionNotice.value = ''
  const result = await quotaCollection.collect(id)
  if (session !== token.value || !result) return
  collectionNotice.value = result.completion === 'pending' ? t('quota.notice.pending') : result.completion === 'settled' ? t('quota.notice.settledAll') : t('quota.notice.none')
}
async function collectAll() { await collect() }
async function collectOne(item) { await collect(item.credential_id) }
function cancelDetail() { detailRequest++; detailController?.abort(); detailLoading.value = false }
watch(detailOpen, open => { if (!open) cancelDetail() })
watch(token, () => { cancelDetail(); detailOpen.value = false; collectionNotice.value = '' }, { flush: 'sync' })
onScopeDispose(cancelDetail)
async function openDetail(item) {
  cancelDetail()
  const request = detailRequest
  const session = token.value
  detailID.value = item.credential_id
  detailController = new AbortController()
  const current = () => request === detailRequest && token.value === session && detailOpen.value
  detailOpen.value = true; detailLoading.value = true; detailError.value = ''; detail.value = null
  try {
    const response = await fetchAPI(`/quota/credentials/${encodeURIComponent(item.credential_id)}`, { signal: detailController.signal })
    if (current()) detail.value = normalizeQuotaDetail(response)
  } catch (error) { if (current()) detailError.value = message(error) }
  finally { if (current()) detailLoading.value = false }
}
function previousPage() { offset.value = Math.max(0, offset.value - limit) }
function nextPage() { offset.value += limit }
function message(error) { return error?.data?.message || error?.data?.error || error?.message || t('cred.err.unexpected') }
</script>
