<template>
  <section class="space-y-4">
    <PortalAlert color="info" variant="subtle" :title="t('usage.legacy.title')" :description="t('usage.legacy.desc')" />
    <PortalAlert v-if="error" color="error" variant="subtle" :description="error" />
    <PortalAlert v-if="!available('usage_records')" color="warning" variant="subtle" :title="t('usage.legacy.unavailable')" />
    <AppCard>
      <form class="space-y-3" @submit.prevent="apply">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminField :label="t('common.from')"><AppDateInput v-model="filters.from" type="datetime-local" :max="filters.to" class="w-full" /></AdminField>
          <AdminField :label="t('common.to')"><AppDateInput v-model="filters.to" type="datetime-local" :min="filters.from" class="w-full" /></AdminField>
          <AdminField v-for="field in fields" :key="field.key" :label="fieldLabel(field.key)">
                      <AdminSearchSelect v-if="field.key === 'provider' || field.key === 'model'" :model-value="filters[field.key]" :items="choiceOptions(field.key)" :placeholder="field.key === 'provider' ? t('usage.allProviders') : t('usage.allModels')" :aria-label="fieldLabel(field.key)" :clear-label="t('common.reset')" :empty-text="t('common.noResults')" class="w-full" @update:model-value="filters[field.key] = String($event ?? '')" />
                      <AdminInput v-else v-model="filters[field.key]" class="w-full" />
                    </AdminField>
          <AdminField v-if="organizationScope.supported.value" :label="t('organizations.scope.organization')" class="sm:col-span-2"><OrganizationScopeFilter v-model:organization="filters.user_id" v-model:member="filters.actor_user_id" :scope="organizationScope" organization-class="w-full sm:flex-1" member-class="w-full sm:flex-1" class="sm:w-full sm:flex-nowrap" /></AdminField>
          <AdminField :label="t('common.status')"><AdminSelect v-model="filters.status" :items="statusOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
          <AdminField :label="t('requests.sort')"><AdminSelect v-model="sort" :items="sortOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
          <AdminField :label="t('usage.rows')"><AdminSelect v-model="limit" :items="[25, 50, 100, 200]" class="w-full" /></AdminField>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppButton type="submit" :loading="loading" :disabled="!available('usage_records')">{{ t('usage.legacy.applyFilters') }}</AppButton>
          <AppButton color="neutral" variant="ghost" @click="reset">{{ t('common.reset') }}</AppButton>
          <AdminSelect v-model="exportFormat" :aria-label="t('usage.legacy.exportFormat')" :items="['csv', 'jsonl']" class="w-28" />
          <AppButton color="neutral" variant="outline" icon="i-tabler-download" :loading="exporting" :disabled="exporting || !available('usage_export')" @click="exportRecords">{{ t('usage.legacy.export') }}</AppButton>
        </div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.legacy.timezoneHint', { timezone }) }}</p>
        <p v-if="!available('usage_export')" class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.legacy.exportUnavailable') }}</p>
        <p v-if="!available('usage_record_details')" class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.legacy.detailsUnavailable') }}</p>
      </form>
    </AppCard>
    <AppCard :ui="{ body: 'p-0' }">
      <AppTable :columns="columns" :data="items" :loading="loading" :number-offset="(page - 1) * limit" class="min-w-[960px]">
        <template #request-cell="{ row }"><p class="font-mono text-xs">{{ value(row).request_id || value(row).id }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ date(value(row).timestamp) }}</p></template>
        <template #model-cell="{ row }"><p>{{ value(row).model || t('requests.unknownModel') }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ value(row).provider || t('usage.legacy.unknownProvider') }} · {{ value(row).endpoint }}</p></template>
        <template #status-cell="{ row }"><PortalBadge :color="value(row).failed ? 'error' : 'success'" variant="subtle">{{ value(row).status || (value(row).failed ? t('common.failed') : t('common.success')) }}</PortalBadge></template>
        <template #tokens-cell="{ row }">{{ number(value(row).tokens?.total_tokens) }}</template>
        <template #latency-cell="{ row }">{{ value(row).performance?.latency_ms == null ? '—' : `${number(value(row).performance.latency_ms)} ms` }}</template>
        <template #cost-cell="{ row }">{{ value(row).billing?.amount ?? '—' }} {{ value(row).billing?.currency || '' }}</template>
        <template #actions-cell="{ row }"><AdminTableAction v-if="available('usage_record_details')" action="view" :label="t('usage.legacy.view')" @click="openDetail(value(row))" /></template>
        <template #empty><p class="py-10 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.legacy.empty') }}</p></template>
      </AppTable>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ui-border)] px-4 py-3">
        <span class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.legacy.pageSummary', { page, total: pages, count: number(total) }) }}</span>
        <div class="flex gap-2"><AppButton size="sm" color="neutral" variant="outline" :disabled="loading || page <= 1" @click="page--">{{ t('common.previous') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" :disabled="loading || page >= pages" @click="page++">{{ t('common.next') }}</AppButton></div>
      </div>
    </AppCard>
    <AdminRequestRecordDetail v-model:open="detailOpen" :detail="detail" :loading="detailLoading" :downloading="downloading" :download-error="downloadError" @download="downloadLog" />
  </section>
</template>

<script setup lang="ts">
import AdminSearchSelect from '~/components/admin/general/controls/AdminSearchSelect.vue'
import OrganizationScopeFilter from '~/components/admin/general/OrganizationScopeFilter.vue'
import { useUsagePage } from '~/composables/usage/useUsagePage'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import AdminRequestRecordDetail from '~/components/admin/usage/RequestRecordDetail.vue'
import { dateRangeError } from '~/composables/dateRange'
import { useDataSync } from '~/composables/useDataSync'
const { fetchAPI, token } = useApi()
const { supports } = useCapabilities()
const { t, intlLocale } = useAdminI18n()
const unavailable = ref<string[]>([])
const available = (feature: string) => supports(feature) && !unavailable.value.includes(feature)
const fields = [
  { key: 'search', label: 'Search' }, { key: 'request_id', label: 'Request ID' },
  { key: 'provider', label: 'Provider' }, { key: 'model', label: 'Model' },
  { key: 'user', label: 'User' }, { key: 'client_key', label: 'Client key' },
  { key: 'credential_id', label: 'Credential ID' }, { key: 'endpoint', label: 'Endpoint' },
  { key: 'home_ip', label: 'Home IP' }, { key: 'cpa_node', label: 'CPA node' }
]
function fieldLabel(key: string) {
  switch (key) {
    case 'search': return t('common.search')
    case 'request_id': return t('requests.col.requestId')
    case 'provider': return t('common.provider')
    case 'model': return t('common.model')
    case 'user': return t('common.user')
    case 'client_key': return t('usage.clientKey')
    case 'credential_id': return t('usage.credentialId')
    case 'endpoint': return t('usage.endpoint')
    case 'home_ip': return t('usage.homeIp')
    case 'cpa_node': return t('usage.cpaNode')
    default: return key
  }
}
const { organizationScope, appliedFilters: overviewScope, overview: { providerSuggestions, modelSuggestions } } = useUsagePage()
const defaults = (): Record<string, string> => ({ from: '', to: '', status: '__all__', user_id: '', actor_user_id: '', ...Object.fromEntries(fields.map(field => [field.key, ''])) })
const scoped = (): Record<string, string> => ({ ...defaults(), user_id: overviewScope.value.organization, actor_user_id: overviewScope.value.organization ? overviewScope.value.member : '' })
const filters = ref(scoped()), applied = ref(scoped())
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const sort = ref('timestamp_desc'), limit = ref(50), page = ref(1)
const sortOptions = computed(() => [
  [t('requests.sort.newest'), 'timestamp_desc'], [t('requests.sort.oldest'), 'timestamp_asc'], [t('requests.sort.mostTokens'), 'tokens_desc'], [t('requests.sort.fewestTokens'), 'tokens_asc'],
  [t('requests.sort.highestCost'), 'cost_desc'], [t('requests.sort.lowestCost'), 'cost_asc'], [t('requests.sort.highestLatency'), 'latency_desc'], [t('requests.sort.lowestLatency'), 'latency_asc'], [t('requests.sort.failuresFirst'), 'failed_first']
].map(([label, value]) => ({ label, value })))
const statusOptions = computed(() => [{ label: t('usage.allStatuses'), value: '__all__' }, { label: t('common.success'), value: 'success' }, { label: t('common.failed'), value: 'failed' }])
const columnHeaders = (): Record<string, string> => ({ request: t('requests.detail.groupRequest'), model: t('common.model'), status: t('common.status'), tokens: t('common.tokens'), latency: t('requests.col.latency'), cost: t('usage.col.cost'), actions: '' })
const columns = computed(() => ['request', 'model', 'status', 'tokens', 'latency', 'cost', 'actions'].map(key => ({ accessorKey: key, header: columnHeaders()[key] })))
const response = ref<any>(null), loading = ref(false), error = ref('')
const items = computed(() => response.value?.items || [])
function choiceOptions(field: 'provider' | 'model') {
  const suggestions = field === 'provider' ? providerSuggestions.value : modelSuggestions.value
  const values = [...new Set<string>([...suggestions, ...items.value.map((item: Record<string, string>) => item[field]), filters.value[field]].filter(Boolean))].sort()
  return [{ label: field === 'provider' ? t('usage.allProviders') : t('usage.allModels'), value: '' }, ...values.map(value => ({ label: value, value }))]
}
const total = computed(() => Number(response.value?.total) || 0)
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const exportFormat = ref('csv'), exporting = ref(false)
const detailOpen = ref(false), detailLoading = ref(false), detail = ref<any>(null)
const downloading = ref(false), downloadError = ref('')
let controller = new AbortController(), version = 0, detailVersion = 0, generation = 0, disposed = false
const value = (row: any) => row?.original || row
const number = (input: unknown) => new Intl.NumberFormat(intlLocale.value).format(Number(input) || 0)
const date = (input: string) => input ? new Date(input).toLocaleString(intlLocale.value) : '—'
function query(paginated = true) {
  const result: Record<string, string | number> = { timezone, sort: sort.value }
  for (const [key, input] of Object.entries(applied.value)) {
    if (!input.trim() || input === '__all__') continue
    result[key] = key === 'from' || key === 'to' ? new Date(input).toISOString() : input.trim()
  }
  if (paginated) { result.limit = limit.value; result.offset = (page.value - 1) * limit.value }
  return result
}
function failure(cause: any, feature: string) {
  if ([404, 405, 501].includes(cause?.statusCode)) { unavailable.value = [...new Set([...unavailable.value, feature])]; return }
  error.value = cause?.message || t('usage.legacy.loadFailed')
}
async function load() {
  if (!available('usage_records') || disposed) return
  const current = ++version
  loading.value = true; error.value = ''
  try {
    const result = await fetchAPI('/usage/records', { query: query(), signal: controller.signal })
    if (disposed || current !== version) return
    response.value = result
    if (page.value > pages.value) page.value = pages.value
  } catch (cause) { if (!disposed && current === version) failure(cause, 'usage_records') }
  finally { if (!disposed && current === version) loading.value = false }
}
function apply() { const invalid = dateRangeError(filters.value.from, filters.value.to, 'datetime-local'); if (invalid) { error.value = invalid.startsWith('Enter a valid date and time') ? t('usage.dateTimeInvalid') : invalid.startsWith('Start must be') ? t('usage.rangeInverted') : invalid; return }; applied.value = { ...filters.value }; if (page.value !== 1) page.value = 1; else void load() }
function reset() { filters.value = defaults(); apply() }
async function openDetail(record: any) {
  const current = ++detailVersion
  detailOpen.value = true; detailLoading.value = true; detail.value = null; downloadError.value = ''
  try {
    const result = await fetchAPI<any>(`/usage/records/${encodeURIComponent(record.id)}`, { query: { include_payload: true, include_logs: true }, signal: controller.signal })
    if (disposed || current !== detailVersion) return
    // Legacy client names differ from request-event names; reuse the redacted detail view.
    const client = result.record?.client || {}
    detail.value = { ...result, event: { ...result.record, client: { ...client, client_key_id: client.api_key_id, client_key_label: client.api_key_label, client_key_masked: client.api_key_masked }, related: result.related } }
  } catch (cause) { if (!disposed && current === detailVersion) { failure(cause, 'usage_record_details'); detailOpen.value = false } }
  finally { if (!disposed && current === detailVersion) detailLoading.value = false }
}
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
}
async function exportRecords() {
  if (exporting.value || !available('usage_export')) return
  const current = generation, format = exportFormat.value
  exporting.value = true; error.value = ''
  try {
    const blob = await fetchAPI<Blob>('/usage/export', { query: { ...query(false), format }, responseType: 'blob', signal: controller.signal })
    if (!disposed && current === generation) save(blob, `usage-records.${format}`)
  } catch (cause) { if (!disposed && current === generation) failure(cause, 'usage_export') }
  finally { if (!disposed && current === generation) exporting.value = false }
}
async function downloadLog(url: string, requestId: string) {
  if (downloading.value) return
  const current = generation
  downloading.value = true; downloadError.value = ''
  try { const blob = await fetchAPI<Blob>(url, { responseType: 'blob', signal: controller.signal }); if (!disposed && current === generation) save(blob, `${requestId || 'request'}.log`) }
  catch (cause: any) { if (!disposed && current === generation) downloadError.value = cause?.message || t('usage.legacy.downloadFailed') }
  finally { if (!disposed && current === generation) downloading.value = false }
}
watch([sort, limit], () => { if (page.value !== 1) page.value = 1; else void load() })
watch(page, () => void load())
watch(token, () => {
  generation++; version++; detailVersion++; controller.abort(); controller = new AbortController()
  unavailable.value = []; response.value = null; detail.value = null; detailOpen.value = false
  loading.value = false; exporting.value = false; detailLoading.value = false; downloading.value = false
  void load()
})
useDataSync('admin:usage-legacy:sync', load)
onMounted(load)
onScopeDispose(() => { disposed = true; generation++; version++; detailVersion++; controller.abort() })
</script>
