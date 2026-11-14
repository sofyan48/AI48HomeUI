<template>
  <div ref="root" class="w-56 max-w-full space-y-1.5 text-left">
    <template v-if="entry">
      <!-- One status line: state, plan, age and a single notes indicator. -->
      <div class="flex min-w-0 items-center gap-1.5 text-xs">
        <span class="size-2 shrink-0 rounded-full" :class="statusDot" aria-hidden="true" />
        <span class="font-medium capitalize text-[var(--ui-text-highlighted)]">{{ statusLabel }}</span>
        <span v-if="entry.plan?.name" class="min-w-0 truncate text-[var(--ui-text-muted)]" :title="entry.plan.expires_at ? `${entry.plan.name} · ends ${formatDate(entry.plan.expires_at)}` : entry.plan.name">· {{ entry.plan.name }}</span>
        <span class="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-[var(--ui-text-muted)]">
          <UIcon v-if="loading" name="i-tabler-loader-2" class="size-3 animate-spin" aria-hidden="true" />
          <span v-if="entry.observed_at" :class="stale ? 'text-amber-600 dark:text-amber-400' : ''" :title="`Observed ${formatDate(entry.observed_at)}`">{{ relative(entry.observed_at) }}</span>
          <UIcon
            v-if="notes.length"
            name="i-tabler-info-circle"
            class="size-3.5 text-amber-500"
            tabindex="0"
            role="img"
            :title="notes.join('\n')"
            :aria-label="notes.join('. ')"
          />
        </span>
      </div>

      <!-- Up to two windows: label, remaining bar, percent and reset countdown. -->
      <div v-for="window in windows" :key="window.id" class="grid grid-cols-[minmax(0,1fr)_3rem_auto] items-center gap-2 text-[11px]" :title="windowTitle(window)">
        <span class="truncate text-[var(--ui-text-toned)]">{{ shortLabel(window) }}</span>
        <div class="h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]" role="progressbar" :aria-label="`${quotaWindowLabel(window, entry.provider)} remaining`" :aria-valuenow="percent(window) ?? undefined" :aria-valuetext="percent(window) == null ? 'Unknown remaining' : undefined" :aria-valuemin="0" :aria-valuemax="100">
          <div v-if="percent(window) != null" class="h-full rounded-full" :class="barColor(window)" :style="{ width: `${percent(window)}%` }" />
        </div>
        <span class="whitespace-nowrap text-right tabular-nums">
          <span class="font-medium text-[var(--ui-text-highlighted)]">{{ window.is_unlimited ?? window.isUnlimited ? '∞' : percent(window) == null ? '—' : `${percent(window)}%` }}</span>
          <span v-if="window.reset_at" class="text-[var(--ui-text-muted)]"> · {{ resetIn(window.reset_at) }}</span>
        </span>
      </div>
      <p v-if="hiddenCount" class="text-[11px] text-[var(--ui-text-muted)]">+{{ hiddenCount }} more in details</p>
      <p v-if="!windows.length && !hiddenCount" class="text-[11px] text-[var(--ui-text-muted)]">No quota windows reported</p>
    </template>
    <span v-else class="text-xs text-[var(--ui-text-muted)]">{{ pending ? 'Loading…' : readError ? 'Quota read unavailable' : 'No quota record' }}</span>
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
const historical = computed(() => entry.value ? quotaHistorical(entry.value) : false)
const stale = computed(() => historical.value || (entry.value?.freshness && entry.value.freshness !== 'fresh'))
const statusLabel = computed(() => historical.value ? 'Stale' : entry.value?.quota_status || 'unknown')
const statusDot = computed(() => {
  if (historical.value) return 'bg-zinc-400'
  const status = entry.value?.quota_status
  return status === 'healthy' ? 'bg-emerald-500' : status === 'low' ? 'bg-amber-500' : ['exhausted', 'error'].includes(status) ? 'bg-rose-500' : 'bg-zinc-400'
})
// Secondary signals live in one tooltip so the table row stays compact.
const notes = computed(() => {
  const value = entry.value
  if (!value) return []
  const list: string[] = []
  if (historical.value) list.push('Historical observation, not current availability')
  if (value.freshness && value.freshness !== 'fresh') list.push(`Freshness: ${value.freshness}`)
  if (['partial', 'failed'].includes(value.collection_status)) list.push(`Collection ${value.collection_status}`)
  if (value.error) list.push(quotaCollectionMessage(value.error))
  for (const window of windows.value) if (isRetainedQuotaWindow(value, window)) list.push(`${quotaWindowLabel(window, value.provider)} retained · observed ${formatDate(window.observed_at)}`)
  if (hiddenRisk.value) list.push(`${value.quota_status} quota exists outside this preview`)
  if (isXai.value) {
    list.push(`On-demand: ${xaiOnDemandState(value)}`)
    if (products.value.length) list.push(productSummary.value)
  }
  if (failed.value) list.push('Stored detail unavailable; showing list snapshot')
  return list
})
function shortLabel(window: any) {
  // Drop the repeated identity when only the period distinguishes windows.
  const label = quotaWindowLabel(window, entry.value?.provider)
  const parts = label.split(' · ')
  return windows.value.length > 1 && parts.length > 1 && new Set(windows.value.map((item: any) => quotaWindowLabel(item, entry.value?.provider).split(' · ')[0])).size === 1 ? parts[1] : label
}
function windowTitle(window: any) {
  const label = quotaWindowLabel(window, entry.value?.provider)
  return window.reset_at ? `${label} · resets ${formatDate(window.reset_at)}` : label
}
function barColor(window: any) {
  if (historical.value) return 'bg-[var(--ui-text-muted)]'
  const value = percent(window) ?? 0
  return value <= 10 ? 'bg-rose-500' : value <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
}
function relative(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return ''
  const minutes = Math.round((Date.now() - time) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / 1440)}d ago`
}
function resetIn(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return ''
  const minutes = Math.round((time - Date.now()) / 60000)
  if (minutes <= 0) return 'reset due'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim()
  return `${Math.round(minutes / 1440)}d`
}
function formatDate(value: string | null | undefined) { if (!value) return 'Unknown time'; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unknown time' }
</script>
