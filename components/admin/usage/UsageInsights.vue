<template>
  <section class="space-y-4">
    <div class="flex items-center gap-3 border-t border-[var(--ui-border)] pt-5">
      <span class="flex size-8 items-center justify-center rounded-lg bg-[var(--admin-selected)] text-[var(--ui-primary)]" aria-hidden="true"><AppIcon name="i-tabler-chart-dots-3" class="size-4" /></span>
      <div><h2 class="text-base font-semibold">{{ t('usage.insights.title') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.insights.desc') }}</p></div>
    </div>
    <PortalAlert v-if="capabilityError" color="warning" variant="subtle" :title="t('usage.capsUnavailable')" :description="t('usage.insights.capsDesc')" />
    <PortalAlert v-if="unavailableFeatures.length" color="warning" variant="subtle" :title="t('usage.insights.someUnavailable')" :description="unavailableFeatures.join(', ')" />
    <PortalAlert v-if="error" color="error" variant="subtle" :description="error" />
    <div class="app-surface flex flex-wrap items-center gap-3 px-3 py-2.5">
      <AdminSelect v-model="groupBy" :items="['model', 'provider', 'user', 'client_key', 'credential', 'endpoint', 'home_ip']" class="w-44" />
      <AdminSelect v-model="metric" :items="['request_count', 'total_tokens', 'total_amount', 'failed_count', 'avg_latency_ms', 'p95_latency_ms']" class="w-48" />
      <AppButton :loading="loading" :disabled="loading || !canLoadInsights" @click="refresh">{{ t('usage.insights.load') }}</AppButton>
      <span class="basis-full text-xs text-[var(--ui-text-muted)] xl:basis-auto xl:flex-1">{{ t('usage.insights.hint') }}</span>
    </div>
    <div class="grid gap-4 xl:grid-cols-2">
      <AppCard v-if="available('usage_aggregates')">
        <template #header><h3 class="font-semibold">{{ t('usage.insights.rankingBy', { group: groupBy }) }}</h3></template>
        <div v-for="item in aggregates?.items || []" :key="JSON.stringify(item)" class="flex justify-between gap-3 border-b border-[var(--ui-border)] py-2 text-sm">
          <span class="truncate">{{ item.label || item.name || item.id || item.key || t('common.unknown') }}</span>
          <span class="font-mono">{{ item[metric] ?? item.value ?? 0 }}</span>
        </div>
        <p v-if="!aggregates?.items?.length" class="text-sm text-[var(--ui-text-muted)]">{{ t('usage.noRanking') }}</p>
      </AppCard>
      <AppCard v-if="available('usage_realtime')">
        <template #header><h3 class="font-semibold">{{ t('usage.insights.realtime') }}</h3></template>
        <div v-if="realtime" class="space-y-4 text-sm">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.insights.groupedUpdated', { group: realtime.group_by, time: new Date(realtime.updated_at).toLocaleString(intlLocale) }) }}</p>
          <div v-if="latestVelocity" class="grid grid-cols-3 gap-2">
            <div><p class="text-[var(--ui-text-muted)]">{{ t('usage.insights.rpm') }}</p><p class="font-semibold">{{ latestVelocity.rpm }}</p></div>
            <div><p class="text-[var(--ui-text-muted)]">{{ t('usage.insights.tpm') }}</p><p class="font-semibold">{{ latestVelocity.tpm }}</p></div>
            <div><p class="text-[var(--ui-text-muted)]">{{ t('usage.insights.errorRate') }}</p><p class="font-semibold">{{ (latestVelocity.error_rate * 100).toFixed(1) }}%</p></div>
          </div>
          <p v-else class="text-[var(--ui-text-muted)]">{{ t('usage.insights.noVelocity') }}</p>
          <div v-if="realtime.current_usage?.length">
            <p class="font-medium">{{ t('usage.insights.currentUsage') }}</p>
            <div v-for="item in realtime.current_usage" :key="item.id" class="flex justify-between gap-2 border-b border-[var(--ui-border)] py-1">
              <span class="truncate">{{ item.label || item.id }}</span><span>{{ t('usage.requestCount', { count: item.request_count }) }}</span>
            </div>
          </div>
          <div v-if="realtime.latency_distribution?.length">
            <p class="font-medium">{{ t('usage.insights.latencyDist') }}</p>
            <div v-for="bucket in realtime.latency_distribution" :key="bucket.bucket" class="flex justify-between gap-2 py-1">
              <span>{{ bucket.bucket }}</span><span>{{ t('usage.requestCount', { count: bucket.request_count }) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-[var(--ui-text-muted)]">{{ t('usage.insights.loadHint') }}</p>
      </AppCard>
      <AppCard v-for="health in healthSections" :key="health.feature">
        <template #header><h3 class="font-semibold">{{ health.label }}</h3></template>
        <div v-for="item in health.items" :key="item.id" class="flex items-center justify-between gap-3 border-b border-[var(--ui-border)] py-2 text-sm">
          <span>{{ item.label || item.id }}</span><PortalBadge :color="item.status === 'healthy' ? 'success' : 'warning'" variant="subtle">{{ item.status }}</PortalBadge>
        </div>
        <p v-if="!health.items.length" class="text-sm text-[var(--ui-text-muted)]">{{ t('usage.insights.noHealth') }}</p>
      </AppCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AppIcon from '~/components/AppIcon.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
const props = defineProps<{ commonQuery: string }>()
const { t, intlLocale } = useAdminI18n()
const { fetchAPI, token } = useApi()
const { supports, error: capabilityError, refreshCapabilities } = useCapabilities()
const unavailable = ref<string[]>([])
const featureLabels = computed<Record<string, string>>(() => ({
  usage_aggregates: t('usage.insights.rankings'), usage_realtime: t('usage.insights.realtimeFeature'), usage_provider_health: t('usage.insights.providerHealth'),
  usage_credential_health: t('usage.insights.credentialHealth')
}))
const available = (feature: string) => supports(feature) && !unavailable.value.includes(feature)
const unavailableFeatures = computed(() => Object.entries(featureLabels.value).filter(([feature]) => !available(feature)).map(([, label]) => label))
const canLoadInsights = computed(() => ['usage_aggregates', 'usage_realtime', 'usage_provider_health', 'usage_credential_health'].some(available))
let controller = new AbortController()
let generation = 0
let disposed = false
onScopeDispose(() => { disposed = true; generation++; controller.abort() })
onMounted(() => { void refreshCapabilities().catch(() => {}) })
watch(token, () => { unavailable.value = []; invalidate(); void refreshCapabilities().catch(() => {}) })
function endpointUnavailable(cause: any) { return [404, 405, 501].includes(cause?.statusCode) }
async function optionalRequest<T>(feature: string, path: string, query?: Record<string, string | number>) {
  if (!available(feature)) return null
  const current = generation
  try { return await fetchAPI<T>(path, { query, signal: controller.signal }) }
  catch (cause: any) {
    if (disposed || current !== generation) return null
    if (endpointUnavailable(cause)) { unavailable.value = [...new Set([...unavailable.value, feature])]; return null }
    throw cause
  }
}
const groupBy = ref('model')
const metric = ref('request_count')
const loading = useWorkspaceState('admin:usage-insights:loading', () => (false))
const error = useWorkspaceState('admin:usage-insights:error', () => (''))
const aggregates = useWorkspaceState<any>('admin:usage-insights:aggregates', () => (null))
const realtime = useWorkspaceState<any>('admin:usage-insights:realtime', () => (null))
const providerHealth = useWorkspaceState<any>('admin:usage-insights:providerHealth', () => (null))
const credentialHealth = useWorkspaceState<any>('admin:usage-insights:credentialHealth', () => (null))
const latestVelocity = computed(() => realtime.value?.velocity?.at(-1))
const realtimeGroupBy = computed(() => ['model', 'provider', 'client_key', 'credential'].includes(groupBy.value) ? groupBy.value : 'model')
const healthSections = computed(() => [
  { feature: 'usage_provider_health', label: t('usage.insights.providerHealth'), items: providerHealth.value?.items || [] },
  { feature: 'usage_credential_health', label: t('usage.insights.credentialHealth'), items: credentialHealth.value?.items || [] }
].filter(section => available(section.feature)))
function invalidate() {
  generation++
  controller.abort()
  controller = new AbortController()
  loading.value = false
  error.value = ''
  aggregates.value = null
  realtime.value = null
  providerHealth.value = null
  credentialHealth.value = null
}
watch([() => props.commonQuery, groupBy, metric], invalidate)
async function refresh() {
  if (loading.value || !canLoadInsights.value) return
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const realtimeFilters = new URLSearchParams(props.commonQuery)
    realtimeFilters.delete('from')
    realtimeFilters.delete('to')
    const [ranking, snapshot, providers, credentials] = await Promise.all([
      optionalRequest('usage_aggregates', `/usage/aggregates?${props.commonQuery}`, { group_by: groupBy.value, metric: metric.value, limit: 20 }),
      optionalRequest('usage_realtime', `/usage/realtime?${realtimeFilters.toString()}`, { window_seconds: 900, bucket_seconds: 60, group_by: realtimeGroupBy.value }),
      optionalRequest('usage_provider_health', `/usage/health/providers?${props.commonQuery}`), optionalRequest('usage_credential_health', `/usage/health/credentials?${props.commonQuery}`)
    ])
    if (disposed || current !== generation) return
    aggregates.value = ranking
    realtime.value = snapshot
    providerHealth.value = providers
    credentialHealth.value = credentials
  } catch (cause: any) { if (!disposed && current === generation) error.value = cause?.message || t('usage.insights.loadFailed') }
  finally { if (!disposed && current === generation) loading.value = false }
}
</script>
