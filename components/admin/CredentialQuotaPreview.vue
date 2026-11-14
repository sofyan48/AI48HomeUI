<template>
  <div ref="root" class="min-w-44 max-w-80 space-y-1 text-left">
    <template v-if="entry">
      <p v-if="entry.plan?.name" class="text-xs font-medium" :title="entry.plan.expires_at ? `Plan ends ${formatDate(entry.plan.expires_at)}` : undefined">{{ entry.plan.name }}</p>
      <div class="flex flex-wrap gap-1">
        <UBadge :color="quotaHistorical(entry) ? 'neutral' : color(entry.quota_status)" variant="subtle">{{ entry.quota_status || 'unknown' }}</UBadge>
        <UBadge color="neutral" variant="subtle">{{ entry.freshness || 'never' }}</UBadge>
        <UBadge v-if="entry.collection_status" :color="entry.collection_status === 'partial' || entry.collection_status === 'failed' ? 'warning' : 'neutral'" variant="subtle">{{ entry.collection_status }}</UBadge>
      </div>
      <p v-if="quotaHistorical(entry)" class="text-xs text-amber-500">Historical observation, not current availability</p>
      <p v-if="entry.error" class="text-xs text-amber-500">{{ quotaCollectionMessage(entry.error) }}</p>
      <div v-for="window in windows" :key="window.id" class="space-y-0.5">
        <div class="grid grid-cols-[minmax(0,1.5fr)_minmax(2.5rem,1fr)_2.5rem] items-center gap-2 text-[11px]">
          <span class="truncate" :title="quotaWindowLabel(window, entry.provider)">{{ quotaWindowLabel(window, entry.provider) }}</span>
          <div class="h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]" role="progressbar" :aria-label="`${quotaWindowLabel(window, entry.provider)} remaining`" :aria-valuenow="percent(window) ?? undefined" :aria-valuetext="percent(window) == null ? 'Unknown remaining' : undefined" :aria-valuemin="0" :aria-valuemax="100">
            <div v-if="percent(window) != null" class="h-full rounded-full" :class="quotaHistorical(entry) ? 'bg-[var(--ui-text-muted)]' : 'bg-[var(--ui-primary)]'" :style="{ width: `${percent(window)}%` }" />
          </div>
          <span class="text-right tabular-nums text-[var(--ui-text-muted)]">{{ window.is_unlimited ?? window.isUnlimited ? '∞' : percent(window) == null ? '—' : `${percent(window)}%` }}</span>
        </div>
        <p v-if="isRetainedQuotaWindow(entry, window)" class="text-[11px] text-amber-500">Retained · observed {{ formatDate(window.observed_at) }}</p>
      </div>
      <template v-if="isXai">
        <p class="text-xs text-[var(--ui-text-muted)]">On-demand: {{ xaiOnDemandState(entry) }}</p>
        <p v-if="products.length" tabindex="0" class="text-xs text-[var(--ui-text-muted)]" :title="productSummary" :aria-label="productSummary">{{ products.length }} shared product usage breakdown(s)</p>
      </template>
      <p v-if="hiddenCount" class="text-xs text-[var(--ui-text-muted)]">+{{ hiddenCount }} window(s) in details</p>
      <p v-if="hiddenRisk" class="text-xs text-amber-500">{{ entry.quota_status }} quota exists outside this preview</p>
      <p v-if="loading || failed" role="status" class="text-xs text-[var(--ui-text-muted)]">{{ loading ? 'Reading stored quota detail…' : 'Stored detail unavailable; showing list snapshot.' }}</p>
      <p v-if="entry.observed_at" class="text-[11px] text-[var(--ui-text-muted)]">Observed {{ formatDate(entry.observed_at) }}</p>
    </template>
    <span v-else class="text-xs text-[var(--ui-text-muted)]">{{ pending ? 'Loading…' : readError ? 'Quota read unavailable' : 'No quota record returned' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useApi } from '~/composables/useApi'
import { useCapabilities } from '~/composables/useCapabilities'
import { normalizeQuotaEntry, needsQuotaPreviewDetail, resolveQuotaPreviewEntry, quotaPreviewWindows, quotaHistorical, quotaCollectionMessage, quotaProductUsed, quotaWindowLabel, quotaWindowRatio, isRetainedQuotaWindow, xaiOnDemandState, xaiProductWindows } from '~/composables/upstreamQuota'
import { withQuotaPreviewSlot } from '../../composables/quotaPreviewQueue'

const props = defineProps<{ quota?: any; pending?: boolean; readError?: string }>()
const { fetchAPI, token, resolveUrl } = useApi()
const { supports } = useCapabilities()
const root = ref<HTMLElement | null>(null)
const visible = ref(false)
const detail = ref<any>(null)
const loading = ref(false)
const failed = ref(false)
const entry = computed(() => props.quota ? resolveQuotaPreviewEntry(normalizeQuotaEntry(props.quota), detail.value) : null)
const windows = computed(() => entry.value ? quotaPreviewWindows(entry.value) : [])
const isXai = computed(() => ['xai', 'grok'].includes(entry.value?.provider))
const products = computed(() => isXai.value ? xaiProductWindows(entry.value) : [])
const productSummary = computed(() => ['Products share one allowance, not separate quotas.', ...products.value.map(window => `${window.label || window.id}: ${quotaProductUsed(window)}${isRetainedQuotaWindow(entry.value, window) ? ` (retained, ${formatDate(window.observed_at)})` : ''}`)].join('\n'))
const hiddenCount = computed(() => Math.max(0, Number(entry.value?.window_count || 0) - windows.value.length))
const hiddenRisk = computed(() => ['low', 'exhausted'].includes(entry.value?.quota_status) && !windows.value.some((window: any) => window.status === entry.value.quota_status || window.status === 'exhausted'))
const version = computed(() => JSON.stringify([token.value, resolveUrl('/quota/credentials'), props.quota?.credential_id, props.quota?.provider, props.quota?.credential_type, props.quota?.observed_at, props.quota?.last_attempt_at, props.quota?.collection_status]))
let observer: IntersectionObserver | undefined
let controller: AbortController | undefined
let generation = 0
let requestedVersion = ''
function cancel() { generation++; controller?.abort(); loading.value = false }
onMounted(() => {
  if (!root.value) return
  if (typeof IntersectionObserver === 'undefined') { visible.value = true; return }
  observer = new IntersectionObserver(([value]) => { visible.value = Boolean(value?.isIntersecting) })
  observer.observe(root.value)
})
watch(version, () => { cancel(); detail.value = null; failed.value = false; requestedVersion = '' }, { flush: 'sync' })
watch([visible, version], async () => {
  if (!visible.value || !props.quota || !needsQuotaPreviewDetail(entry.value) || !supports('quota_snapshot_details', true) || requestedVersion === version.value) return
  cancel()
  const request = generation
  const currentVersion = version.value
  requestedVersion = currentVersion
  const signal = (controller = new AbortController()).signal
  loading.value = true
  try {
    const response = await withQuotaPreviewSlot(signal, () => fetchAPI(`/quota/credentials/${encodeURIComponent(props.quota.credential_id)}`, { signal }))
    if (request === generation && currentVersion === version.value) detail.value = response
  } catch {
    if (request === generation && !signal.aborted) failed.value = true
  } finally { if (request === generation) loading.value = false }
}, { immediate: true })
onScopeDispose(() => { cancel(); observer?.disconnect() })
const percent = (window: any) => { const ratio = quotaWindowRatio(window); return ratio == null ? null : Math.round(ratio * 100) }
const color = (status: string) => status === 'healthy' ? 'success' : status === 'low' ? 'warning' : ['exhausted', 'error'].includes(status) ? 'error' : 'neutral'
function formatDate(value: string | null | undefined) { if (!value) return 'Unknown time'; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unknown time' }
</script>
