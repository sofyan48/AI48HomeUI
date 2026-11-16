<template>
  <div class="space-y-4">
    <PortalAlert
      v-if="pageError || liveError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('requests.unavailable')"
      :description="pageError || liveError"
    />

    <PortalAlert v-if="capabilityError" color="warning" variant="subtle" :title="t('usage.capsUnavailable')" :description="t('requests.capsDesc')" />
    <PortalAlert v-if="!canExport" color="warning" variant="subtle" :title="t('requests.exportUnavailable')" :description="t('requests.exportUnsupported')" />

    <form class="admin-toolbar" :aria-label="t('requests.filtersLabel')" @submit.prevent="applyFilters">
      <div class="flex flex-wrap items-center gap-2">
        <div class="w-full sm:w-96"><div class="flex"><AdminSelect v-model="searchField" :items="searchFieldOptions" value-key="value" label-key="label" class="w-36 shrink-0 [&_button]:rounded-r-none" /><AdminInput v-model="filters.search" icon="i-tabler-search" :placeholder="t('requests.searchPlaceholder')" class="min-w-0 flex-1 [&_input]:rounded-l-none" /></div></div>
        <AdminSelect v-model="timeRange" :items="timeRangeOptions" value-key="value" label-key="label" class="w-40" icon="i-tabler-calendar" :aria-label="t('usage.timeRange')" @update:model-value="applyTimeRange" />
        <AdminSelect :model-value="filters.status || allOptionValue" @update:model-value="setSelectFilter('status', $event)" :items="statusOptions" value-key="value" label-key="label" class="w-36" icon="i-tabler-circle-dot" :aria-label="t('common.status')" />
        <AdminSelectMenu :model-value="filters.provider || allOptionValue" @update:model-value="setSelectFilter('provider', $event)" :items="providerOptions" value-key="value" label-key="label" class="w-44" icon="i-tabler-cloud" :aria-label="t('common.provider')" />
        <AdminSelectMenu :model-value="filters.model || allOptionValue" @update:model-value="setSelectFilter('model', $event)" :items="modelOptions" value-key="value" label-key="label" class="w-52" icon="i-tabler-box" :aria-label="t('common.model')" />
        <AppButton type="button" color="neutral" :variant="advancedOpen ? 'soft' : 'ghost'" icon="i-tabler-dots-vertical" :aria-label="advancedOpen ? t('usage.hideAdvanced') : t('usage.showAdvanced')" :title="advancedOpen ? t('usage.hideAdvanced') : t('usage.advancedFilters')" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen" />
        <AppButton type="button" color="neutral" variant="ghost" @click="resetFilters">{{ t('common.reset') }}</AppButton>
        <AppButton type="submit" icon="i-tabler-filter" :loading="loading">{{ t('common.apply') }}</AppButton>
        <span class="mx-1 hidden h-5 w-px bg-[var(--ui-border)] lg:block" aria-hidden="true" />
        <div class="flex items-center gap-1.5 lg:ml-auto"><div class="flex items-center gap-2 rounded-full border border-[var(--ui-border)] px-2.5 py-1"><AdminSwitch v-model="liveRefresh" size="sm" /><span class="text-xs">{{ t('requests.live') }}</span><AdminSelect v-if="liveRefresh" v-model="refreshSeconds" :items="refreshOptions" value-key="value" label-key="label" size="sm" class="w-24" /></div><AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-download" :disabled="exporting || !canExport" @click="exportOpen = true" :aria-label="t('requests.exportLabel')" :title="t('requests.exportTitle')" /></div>
      </div>
      <div v-if="timeRange === 'custom'" class="mt-2.5 flex flex-wrap items-start gap-2 border-t border-[var(--ui-border)] pt-2.5"><AdminField :label="t('requests.startTime')" class="w-full sm:w-64"><AppDateInput v-model="filters.from" type="datetime-local" :max="filters.to" class="w-full" /></AdminField><AdminField :label="t('requests.endTime')" class="w-full sm:w-64"><AppDateInput v-model="filters.to" type="datetime-local" :min="filters.from" class="w-full" /></AdminField></div>

      <div v-if="advancedOpen" class="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--ui-border)] pt-2.5">
        <AdminSelect :model-value="filters.event_type || allOptionValue" @update:model-value="setSelectFilter('event_type', $event)" :items="eventTypeOptions" value-key="value" label-key="label" class="w-40" icon="i-tabler-category" :aria-label="t('requests.eventType')" />
        <AdminSelectMenu :model-value="filters.home_ip || allOptionValue" @update:model-value="setSelectFilter('home_ip', $event)" :items="homeOptions" value-key="value" label-key="label" class="w-44" icon="i-tabler-server" :aria-label="t('usage.homeNode')" />
        <AdminSelectMenu :model-value="filters.cpa_node || allOptionValue" @update:model-value="setSelectFilter('cpa_node', $event)" :items="cpaOptions" value-key="value" label-key="label" class="w-44" icon="i-tabler-server-2" :aria-label="t('usage.cpaNode')" />
        <AdminSelect :model-value="filters.status_code || allOptionValue" @update:model-value="setSelectFilter('status_code', $event)" :items="statusCodeOptions" value-key="value" label-key="label" class="w-36" icon="i-tabler-hash" :aria-label="t('requests.httpStatus')" />
        <AdminSelect v-model="sort" :items="sortOptions" value-key="value" label-key="label" class="w-44" icon="i-tabler-arrows-sort" :aria-label="t('requests.sort')" />
        <div class="flex items-center gap-1"><AdminInput v-model="filters.min_latency_ms" type="number" min="0" :placeholder="t('requests.minMs')" class="w-28" :aria-label="t('requests.minLatency')" /><span class="text-xs text-[var(--ui-text-dimmed)]">–</span><AdminInput v-model="filters.max_latency_ms" type="number" min="0" :placeholder="t('requests.maxMs')" class="w-28" :aria-label="t('requests.maxLatency')" /></div>
      </div>
      <p class="mt-2 text-[11px] text-[var(--ui-text-muted)]">{{ t('requests.timezone', { timezone }) }}</p>
    </form>

    <AppCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5"><h2 class="text-sm font-semibold">{{ t('requests.title') }}</h2><span class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('requests.rangeOf', { from: pageStart, to: pageEnd, total: formatNumber(total) }) }}</span></div>
          <div class="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-columns">{{ t('requests.columns') }} <span class="tabular-nums text-[var(--ui-text-muted)]">{{ visibleColumnKeys.length - 1 }}/{{ columnDefinitions.length - 1 }}</span></AppButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem v-for="item in columnMenuItems" :key="item.label" :checked="item.checked" :disabled="item.disabled" @update:checked="item.onUpdateChecked" @select="item.onSelect">
                  {{ item.label }}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-arrows-horizontal" :aria-label="t('requests.autoFit')" :title="t('requests.autoFit')" @click="autoFitColumns" />
            <AppButton v-if="pendingNewEvents" size="sm" color="primary" variant="soft" :loading="loading" @click="refreshEvents">
              {{ pendingNewEvents === 1 ? t('requests.showNewOne', { count: formatNumber(pendingNewEvents) }) : t('requests.showNewMany', { count: formatNumber(pendingNewEvents) }) }}
            </AppButton>
            <PortalBadge v-if="liveRefresh" color="success" variant="subtle"><span class="mr-1 inline-block size-1.5 rounded-full bg-current" />{{ t('requests.live') }}</PortalBadge>
          </div>
        </div>
      </template>
      <AppTable :columns="columns" :data="events" :loading="loading" :number-offset="(page - 1) * pageSize" :style="tableStyle" class="[&_table]:table-fixed [&_td]:overflow-hidden">
        <template v-for="column in columns.filter(column => column.accessorKey !== 'actions')" :key="column.accessorKey" #[`${column.accessorKey}-header`]>
          <span class="block truncate pr-2">{{ columnHeader(column) }}</span>
          <span role="separator" tabindex="0" aria-orientation="vertical" :aria-label="t('requests.resizeColumn', { column: columnHeader(column) })" :aria-valuenow="columnWidth(column.accessorKey)" :aria-valuemin="column.accessorKey === 'status' ? 96 : 120" :aria-valuemax="640" class="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none border-r border-[var(--ui-border)] focus-visible:outline-2 focus-visible:outline-[var(--ui-primary)]" @pointerdown.stop="resizeColumn($event, column.accessorKey)" @dblclick.stop.prevent="autoFitColumn(column.accessorKey)" @keydown="resizeColumnWithKeyboard($event, column.accessorKey)" />
        </template>
        <template #timestamp-cell="{ row }"><div class="w-full min-w-0 overflow-hidden"><p class="text-sm font-medium">{{ formatDateTime(rowValue(row).timestamp) }}</p></div></template>
        <template #event-cell="{ row }"><div class="w-full min-w-0 space-y-1 overflow-hidden"><div class="flex min-w-0 items-center gap-1.5"><PortalBadge color="neutral" variant="subtle" size="sm" class="max-w-full truncate font-medium">{{ eventTypeLabel(rowValue(row)) }}</PortalBadge><span v-if="rowValue(row).stream != null" class="shrink-0 text-[10px] text-[var(--ui-text-muted)]">{{ rowValue(row).stream ? t('requests.stream') : t('requests.standard') }}</span></div><p class="truncate font-mono text-[11px] text-[var(--ui-text-muted)]" :title="eventEndpoint(rowValue(row))">{{ eventEndpoint(rowValue(row)) }}</p><p class="truncate text-[11px] text-[var(--ui-text-muted)]" :title="executorLabel(rowValue(row).executor_type)">{{ executorLabel(rowValue(row).executor_type) || t('requests.defaultExecutor') }}</p></div></template>
        <template #status-cell="{ row }"><div class="w-full min-w-0 overflow-hidden"><PortalBadge :color="statusColor(rowValue(row))" variant="subtle" class="font-mono tabular-nums" :title="statusLabel(rowValue(row))">{{ statusCode(rowValue(row)) || statusLabel(rowValue(row)) }}</PortalBadge><p v-if="rowValue(row).upstream_status_code && rowValue(row).upstream_status_code !== rowValue(row).status_code" class="mt-1 truncate text-[11px] text-[var(--ui-text-muted)]">{{ t('requests.upstreamCode', { code: rowValue(row).upstream_status_code }) }}</p></div></template>
        <template #model-cell="{ row }"><div class="w-full min-w-0 overflow-hidden" :title="[rowValue(row).model_alias || rowValue(row).original_model, rowValue(row).service_tier, rowValue(row).reasoning_effort].filter(Boolean).join(' · ') || undefined"><p class="truncate font-medium">{{ rowValue(row).model || t('requests.unknownModel') }}</p><p class="truncate text-[11px] text-[var(--ui-text-muted)]">{{ [rowValue(row).provider, rowValue(row).service_tier, rowValue(row).reasoning_effort].filter(Boolean).join(' · ') || '—' }}</p></div></template>
        <template #runtime-cell="{ row }"><div class="w-full min-w-0 overflow-hidden"><p class="truncate text-sm">{{ rowValue(row).runtime?.home_id || rowValue(row).runtime?.home_ip || t('requests.unknownHome') }}</p><p class="truncate text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).runtime?.cpa_label || rowValue(row).runtime?.cpa_node_id || rowValue(row).runtime?.cpa_ip || t('requests.unknownCpa') }}</p></div></template>
        <template #client-cell="{ row }"><div class="w-full min-w-0 overflow-hidden"><p class="truncate text-sm">{{ rowValue(row).client?.username || t('usage.detail.unattributed') }}</p><p class="truncate text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).client?.client_key_label || rowValue(row).client?.client_key_masked || t('requests.noClientKey') }}</p></div></template>
        <template #credential-cell="{ row }"><div class="w-full min-w-0 overflow-hidden"><p class="truncate text-sm">{{ rowValue(row).credential?.label || rowValue(row).credential?.credential_id || t('common.unknown') }}</p><p class="truncate text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).credential?.auth_index || rowValue(row).credential?.credential_type || t('requests.noAuthIndex') }}</p></div></template>
        <template #tokens-cell="{ row }"><div class="w-full min-w-0 overflow-hidden text-sm tabular-nums" :title="cacheRate(rowValue(row)) ? t('requests.cacheTitle', { rate: cacheRate(rowValue(row)) }) : undefined"><p class="flex items-baseline gap-1.5"><span class="font-semibold">{{ formatCompactNumber(rowValue(row).tokens?.total_tokens) }}</span><span v-if="cacheRate(rowValue(row))" class="rounded bg-[color-mix(in_oklch,var(--color-blue-500)_12%,transparent)] px-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">{{ t('requests.cacheBadge', { rate: cacheRate(rowValue(row)) }) }}</span></p><p class="truncate text-[11px] text-[var(--ui-text-muted)]">{{ t('requests.inOut', { input: formatCompactNumber(rowValue(row).tokens?.input_tokens), output: formatCompactNumber(rowValue(row).tokens?.output_tokens) }) }}</p></div></template>
        <template #latency-cell="{ row }"><div class="w-full min-w-0 overflow-hidden text-sm tabular-nums" :title="t('requests.ttft', { value: formatMilliseconds(rowValue(row).performance?.ttft_ms) })"><p class="truncate">{{ formatMilliseconds(rowValue(row).performance?.latency_ms) }}</p><p v-if="rowValue(row).performance?.ttft_ms != null" class="truncate text-[11px] text-[var(--ui-text-muted)]">{{ t('requests.ttft', { value: formatMilliseconds(rowValue(row).performance?.ttft_ms) }) }}</p></div></template>
        <template #cost-cell="{ row }"><div class="w-full min-w-0 overflow-hidden text-right text-sm tabular-nums"><Tooltip :disabled="!requestCostRows(rowValue(row).billing).length"><TooltipTrigger as-child><span tabindex="0" class="block truncate font-medium" :aria-label="t('requests.costBreakdownLabel')">{{ formatTableAmount(rowValue(row).billing?.amount, rowValue(row).billing?.currency) }}</span></TooltipTrigger><TooltipContent side="left"><dl class="min-w-56 space-y-2 p-2"><div v-for="item in requestCostRows(rowValue(row).billing)" :key="item.label" class="flex justify-between gap-6 text-xs"><dt>{{ costRowLabel(item.label) }}</dt><dd class="font-medium tabular-nums">{{ item.value }}</dd></div></dl></TooltipContent></Tooltip><p class="truncate text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).billing?.currency || t('usage.credits') }}</p></div></template>
        <template #request-cell="{ row }"><div class="w-full min-w-0 overflow-hidden"><p class="truncate font-mono text-xs">{{ rowValue(row).request_id || rowValue(row).id }}</p><p class="truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).upstream_request_id || t('requests.noUpstreamId') }}</p></div></template>
        <template #actions-cell="{ row }"><div class="flex justify-end gap-1"><AdminTableAction v-if="rowValue(row).related?.request_log?.download_url" action="download" :label="t('requests.downloadLog')" :loading="downloadingId === rowValue(row).request_id" @click="downloadRequestLog(rowValue(row).related.request_log.download_url, rowValue(row).request_id)" /><AdminTableAction action="view" :label="t('requests.viewEvent')" @click="openDetail(rowValue(row))" /></div></template>
        <template #empty><div class="flex flex-col items-center justify-center py-8 text-center"><AppIcon name="i-tabler-list" class="mb-3 size-8 text-[var(--ui-text-muted)]" /><p class="font-medium">{{ t('requests.empty') }}</p><p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('requests.emptyHint') }}</p></div></template>
      </AppTable>
      <div class="flex flex-col gap-3 border-t border-[var(--ui-border)] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-3">
                  <p class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('common.pageOf', { page, total: totalPages }) }}</p>
                  <AdminSelect :model-value="pageSize" :items="[...requestPageSizes]" size="sm" :aria-label="t('requests.rowsPerPage')" class="w-24" :disabled="loading" @update:model-value="changePageSize" />
                </div>
        <div class="flex items-center gap-2"><AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-chevron-left" :disabled="page <= 1 || loading" @click="changePage(-1)">{{ t('common.previous') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" trailing-icon="i-tabler-chevron-right" :disabled="page >= totalPages || loading" @click="changePage(1)">{{ t('common.next') }}</AppButton></div>
      </div>
    </AppCard>

    <AdminUsageSessionTree />

    <AdminRequestRecordDetail
      v-model:open="detailOpen"
      :detail="selectedDetail"
      :loading="detailLoading"
      :downloading="Boolean(downloadingId)"
      :download-error="detailDownloadError"
      :has-previous="selectedIndex > 0"
      :has-next="selectedIndex >= 0 && selectedIndex < events.length - 1"
      @download="downloadRequestLog"
      @navigate="navigateDetail"
    />

    <AppModal v-model:open="exportOpen" :title="t('requests.exportModalTitle')" :description="t('requests.exportModalDesc')">
      <template #body>
        <div class="space-y-5">
          <AdminField :label="t('requests.format')"><AdminSelect v-model="exportFormat" :items="exportOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
          <PortalAlert color="info" variant="subtle" icon="i-tabler-shield-check" :title="t('requests.redactedTitle')" :description="t('requests.redactedDesc')" />
          <div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" @click="exportOpen = false">{{ t('common.cancel') }}</AppButton><AppButton icon="i-tabler-download" :loading="exporting" :disabled="exporting || !canExport" @click="exportEvents">{{ t('requests.download', { format: exportFormat.toUpperCase() }) }}</AppButton></div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AppIcon from '~/components/AppIcon.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import AdminUsageSessionTree from '~/components/admin/usage/UsageSessionTree.vue'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import AdminRequestRecordDetail from '~/components/admin/usage/RequestRecordDetail.vue'
import { dateRangeError } from '~/composables/dateRange'
import { readTelemetryChoice, saveTelemetryChoice, requestRanges, requestSorts, requestCostRows, toolUsageEntries, requestCacheRate, requestColumnDefaults, requestColumnsHiddenByDefault, normalizeRequestColumnWidths, estimateRequestColumnWidths, clampRequestColumnWidth, requestPageSizes, normalizeRequestPageSize, readRequestPreference, saveRequestPreference, normalizeRequestColumnVisibility, visibleRequestColumns } from '~/composables/requestTelemetry'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
const { t, intlLocale } = useAdminI18n()
const { fetchAPI, token } = useApi()
const { supports, error: capabilityError, refreshCapabilities } = useCapabilities()
const exportUnavailable = ref(false)
const canExport = computed(() => supports('request_event_export') && !exportUnavailable.value)
let exportController = new AbortController()
let exportVersion = 0
const allOptionValue = '__all__'
const pageSizeKey = 'cpahome:request-events:page-size'
const pageSize = ref(readRequestPreference(pageSizeKey, normalizeRequestPageSize))
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const rowValue = row => row?.original ?? row
const toInputDateTime = date => {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const defaultFilters = () => ({
  from: toInputDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000)), to: '', event_type: '', status: '', status_code: '', search: '', provider: '', model: '', home_ip: '', cpa_node: '', credential_type: '', request_id: '', session_id: '', root_session_id: '', user: '', client_key: '', credential_id: '', auth_index: '', executor_type: '', endpoint: '', min_latency_ms: '', max_latency_ms: '', min_amount: '', max_amount: ''
})

const filters = ref(defaultFilters())
const appliedFilters = ref({ ...filters.value })
const searchField = ref('all')
const appliedSearchField = ref('all')
const timeRange = ref(readTelemetryChoice('cpahome:request-events:range', '24h', requestRanges))
const sort = ref(readTelemetryChoice('cpahome:request-events:sort', 'timestamp_desc', requestSorts))
const page = ref(1)
const response = useWorkspaceState('admin:request-records:response', () => (null))
const filterOptions = useWorkspaceState('admin:request-records:filterOptions', () => (null))
const loading = useWorkspaceState('admin:request-records:loading', () => (false))
const pageError = useWorkspaceState('admin:request-records:pageError', () => (''))
const liveError = useWorkspaceState('admin:request-records:liveError', () => (''))
const pendingNewEvents = useWorkspaceState('admin:request-records:pendingNewEvents', () => (0))
let requestVersion = 0
let polling = false
let disposed = false
const advancedOpen = ref(false)
const lastUpdated = useWorkspaceState('admin:request-records:lastUpdated', () => (null))
const liveRefresh = ref(false)
const refreshSeconds = ref('15')
let refreshTimer = null
const detailOpen = ref(false)
const detailLoading = useWorkspaceState('admin:request-records:detailLoading', () => (false))
const selectedDetail = useWorkspaceState('admin:request-records:selectedDetail', () => (null))
const detailDownloadError = ref('')
const selectedDetailId = ref('')
const downloadingId = useWorkspaceState('admin:request-records:downloadingId', () => (''))
const exportOpen = ref(false)
const exportFormat = ref('csv')
const exporting = useWorkspaceState('admin:request-records:exporting', () => (false))

const statusOptions = computed(() => [{ label: t('usage.allStatuses'), value: allOptionValue }, { label: t('common.success'), value: 'success' }, { label: t('common.failed'), value: 'failed' }])
const searchFieldOptions = computed(() => [{ label: t('requests.allFields'), value: 'all' }, { label: t('requests.col.requestId'), value: 'request_id' }, { label: t('common.user'), value: 'user' }, { label: t('usage.clientKey'), value: 'client_key' }, { label: t('usage.credential'), value: 'credential' }])
const timeRangeOptions = computed(() => [{ label: t('usage.range.4h'), value: '4h' }, { label: t('usage.range.12h'), value: '12h' }, { label: t('common.last24h'), value: '24h' }, { label: t('common.today'), value: 'today' }, { label: t('usage.range.yesterday'), value: 'yesterday' }, { label: t('common.last7d'), value: '7d' }, { label: t('common.last30d'), value: '30d' }, { label: t('usage.range.90d'), value: '90d' }, { label: t('usage.range.custom'), value: 'custom' }])
const sortOptions = computed(() => [
  { label: t('requests.sort.newest'), value: 'timestamp_desc' }, { label: t('requests.sort.oldest'), value: 'timestamp_asc' }, { label: t('requests.sort.mostTokens'), value: 'tokens_desc' }, { label: t('requests.sort.fewestTokens'), value: 'tokens_asc' }, { label: t('requests.sort.highestLatency'), value: 'latency_desc' }, { label: t('requests.sort.lowestLatency'), value: 'latency_asc' }, { label: t('requests.sort.highestCost'), value: 'cost_desc' }, { label: t('requests.sort.lowestCost'), value: 'cost_asc' }, { label: t('requests.sort.failuresFirst'), value: 'failed_first' }
])
const refreshOptions = [{ label: '5s', value: '5' }, { label: '15s', value: '15' }, { label: '30s', value: '30' }, { label: '60s', value: '60' }]
const exportOptions = computed(() => [{ label: t('requests.csv'), value: 'csv' }, { label: t('requests.jsonl'), value: 'jsonl' }])
const columnDefinitions = [
  { accessorKey: 'timestamp', header: 'Time', meta: { class: { th: 'w-36', td: 'w-36 max-w-36' } } },
  { accessorKey: 'event', header: 'Event', meta: { class: { th: 'w-56', td: 'w-56 max-w-56' } } },
  { accessorKey: 'status', header: 'Status', meta: { class: { th: 'w-24', td: 'w-24 max-w-24' } } },
  { accessorKey: 'model', header: 'Model', meta: { class: { th: 'w-52', td: 'w-52 max-w-52' } } },
  { accessorKey: 'runtime', header: 'Home node', meta: { class: { th: 'w-44', td: 'w-44 max-w-44' } } },
  { accessorKey: 'client', header: 'User', meta: { class: { th: 'w-44', td: 'w-44 max-w-44' } } },
  { accessorKey: 'credential', header: 'Credential', meta: { class: { th: 'w-44', td: 'w-44 max-w-44' } } },
  { accessorKey: 'tokens', header: 'Tokens', meta: { class: { th: 'w-48', td: 'w-48 max-w-48' } } },
  { accessorKey: 'latency', header: 'Latency', meta: { class: { th: 'w-32', td: 'w-32 max-w-32' } } },
  { accessorKey: 'cost', header: 'Cost', meta: { class: { th: 'w-28', td: 'w-28 max-w-28' } } },
  { accessorKey: 'request', header: 'Request ID', meta: { class: { th: 'w-48', td: 'w-48 max-w-48' } } },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head w-24', td: 'table-action-cell w-24' } } }
]
// columnDefinitions keeps English headers as fallbacks; display text is translated at render time.
function columnHeader(column) {
  switch (column.accessorKey) {
    case 'timestamp': return t('requests.col.time')
    case 'event': return t('requests.col.event')
    case 'status': return t('common.status')
    case 'model': return t('common.model')
    case 'runtime': return t('usage.homeNode')
    case 'client': return t('common.user')
    case 'credential': return t('usage.credential')
    case 'tokens': return t('common.tokens')
    case 'latency': return t('requests.col.latency')
    case 'cost': return t('usage.col.cost')
    case 'request': return t('requests.col.requestId')
    default: return column.header
  }
}
const events = computed(() => Array.isArray(response.value?.items) ? response.value.items : [])
const columnWidthsKey = 'cpahome:request-events:column-widths'
const columnWidths = ref(readRequestPreference(columnWidthsKey, normalizeRequestColumnWidths))
const columnVisibilityKey = 'cpahome:request-events:columns'
const columnVisibility = ref(readRequestPreference(columnVisibilityKey, normalizeRequestColumnVisibility))
const visibleColumnKeys = computed(() => visibleRequestColumns(columnVisibility.value))
function setColumnVisible(key, visible) {
  if (key === 'timestamp' || key === 'actions' || typeof visible !== 'boolean') return
  const next = { ...columnVisibility.value }
  // Store only deviations from each column's default visibility.
  if (visible === !requestColumnsHiddenByDefault.has(key)) delete next[key]
  else next[key] = visible
  columnVisibility.value = normalizeRequestColumnVisibility(next)
  saveRequestPreference(columnVisibilityKey, columnVisibility.value, normalizeRequestColumnVisibility)
}
const columnMenuItems = computed(() => columnDefinitions.filter(column => column.accessorKey !== 'actions').map(column => ({
  label: columnHeader(column), type: 'checkbox', checked: visibleColumnKeys.value.includes(column.accessorKey), disabled: column.accessorKey === 'timestamp',
  onUpdateChecked: checked => setColumnVisible(column.accessorKey, checked),
  onSelect: event => event.preventDefault()
})))
const autoWidths = computed(() => estimateRequestColumnWidths(events.value))
const columnWidth = key => columnWidths.value[key] ?? autoWidths.value[key] ?? requestColumnDefaults[key]
const columns = computed(() => columnDefinitions.filter(column => visibleColumnKeys.value.includes(column.accessorKey)).map(column => ({ ...column, header: columnHeader(column), meta: { class: { th: column.accessorKey === 'actions' ? 'table-action-head' : 'relative', td: column.accessorKey === 'actions' ? 'table-action-cell' : '' }, style: { th: { width: `${columnWidth(column.accessorKey)}px` }, td: { maxWidth: `${columnWidth(column.accessorKey)}px` } } } })))
// +44px for the shared row-number column added by AppTable.
// Columns keep their measured widths, but the table never ends short of the card:
// min-width 100% spreads spare space across columns; wider tables still scroll.
const tableStyle = computed(() => ({ width: `${visibleColumnKeys.value.reduce((sum, key) => sum + columnWidth(key), 0) + 44}px`, minWidth: '100%' }))
function persistColumnWidths() { saveRequestPreference(columnWidthsKey, columnWidths.value, normalizeRequestColumnWidths) }
function autoFitColumn(key) { const next = { ...columnWidths.value }; delete next[key]; columnWidths.value = next; persistColumnWidths() }
function autoFitColumns() { columnWidths.value = {}; persistColumnWidths() }
let stopColumnResize = () => {}
function resizeColumn(event, key) {
  if (event.button !== 0) return
  stopColumnResize()
  event.preventDefault()
  const startX = event.clientX
  const startWidth = event.currentTarget.closest('th')?.getBoundingClientRect().width || columnWidth(key)
  const cursor = document.body.style.cursor, userSelect = document.body.style.userSelect
  const move = next => { columnWidths.value = { ...columnWidths.value, [key]: clampRequestColumnWidth(key, startWidth + next.clientX - startX) } }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
    window.removeEventListener('blur', stop)
    document.body.style.cursor = cursor
    document.body.style.userSelect = userSelect
    persistColumnWidths()
    stopColumnResize = () => {}
  }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
  window.addEventListener('pointercancel', stop)
  window.addEventListener('blur', stop)
  stopColumnResize = stop
}
function resizeColumnWithKeyboard(event, key) {
  if (event.key === 'Home' || event.key === 'Enter') { event.preventDefault(); autoFitColumn(key); return }
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  columnWidths.value = { ...columnWidths.value, [key]: clampRequestColumnWidth(key, columnWidth(key) + (event.key === 'ArrowRight' ? 16 : -16)) }
  persistColumnWidths()
}
const total = computed(() => Number(response.value?.total) || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageStart = computed(() => total.value ? ((page.value - 1) * pageSize.value) + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, total.value))
const visibleFailures = computed(() => events.value.filter(event => event.failed).length)
const visibleTokens = computed(() => events.value.reduce((sum, event) => sum + (Number(event.tokens?.total_tokens) || 0), 0))
const optionList = (key, label) => [{ label, value: allOptionValue }, ...(Array.isArray(filterOptions.value?.[key]) ? filterOptions.value[key] : []).filter(value => value !== '' && value != null).map(value => ({ label: value, value }))]
const setSelectFilter = (field, value) => { filters.value[field] = value === allOptionValue ? '' : value }
const eventTypeOptions = computed(() => optionList('event_types', t('requests.allEventTypes')))
const providerOptions = computed(() => optionList('providers', t('usage.allProviders')))
const modelOptions = computed(() => optionList('models', t('usage.allModels')))
const homeOptions = computed(() => optionList('home_ips', t('requests.allHomeNodes')))
const cpaOptions = computed(() => optionList('cpa_nodes', t('requests.allCpaNodes')))
const statusCodeOptions = computed(() => optionList('status_codes', t('requests.allStatusCodes')))

function buildQuery(source = appliedFilters.value, includePagination = true) {
  const query = { timezone, sort: sort.value }
  for (const [key, value] of Object.entries(source)) {
    if (value === '' || value == null) continue
    if (key === 'from' || key === 'to') query[key] = new Date(value).toISOString()
    else if (key === 'search' && appliedSearchField.value !== 'all') query[appliedSearchField.value] = value
    else query[key] = value
  }
  if (includePagination) { query.limit = pageSize.value; query.offset = (page.value - 1) * pageSize.value }
  return query
}
async function loadEvents(version) {
  const result = await fetchAPI('/request-events', { query: buildQuery() })
  if (disposed || version !== requestVersion) return
  response.value = result
  pendingNewEvents.value = 0
  lastUpdated.value = new Date()
  pageError.value = ''
  liveError.value = ''
}
async function loadFilterOptions(version) {
  const result = await fetchAPI('/request-events/filter-options', { query: buildQuery(appliedFilters.value, false) })
  if (!disposed && version === requestVersion) filterOptions.value = result
}
async function refreshEvents() {
  const version = ++requestVersion
  loading.value = true
  pageError.value = ''
  try {
    await Promise.all([loadEvents(version), loadFilterOptions(version)])
  } catch (error) {
    if (!disposed && version === requestVersion) pageError.value = errorMessage(error, t('requests.err.load'))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
function applyTimeRange(value) {
  if (value === 'custom') return
  const now = new Date()
  const start = new Date(now)
  if (value === 'today') start.setHours(0, 0, 0, 0)
  else if (value === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); now.setDate(now.getDate() - 1); now.setHours(23, 59, 0, 0) }
  else { const hours = value === '4h' ? 4 : value === '12h' ? 12 : value === '24h' ? 24 : value === '7d' ? 168 : value === '30d' ? 720 : 2160; start.setTime(now.getTime() - hours * 60 * 60 * 1000) }
  filters.value.from = toInputDateTime(start)
  filters.value.to = value === 'yesterday' ? toInputDateTime(now) : ''
}
async function applyFilters() { const error = dateRangeError(filters.value.from, filters.value.to, 'datetime-local'); if (error) { pageError.value = dateErrorText(error); return }; appliedSearchField.value = searchField.value; appliedFilters.value = { ...filters.value }; page.value = 1; pendingNewEvents.value = 0; await refreshEvents() }
async function resetFilters() { filters.value = defaultFilters(); appliedFilters.value = { ...filters.value }; searchField.value = 'all'; appliedSearchField.value = 'all'; timeRange.value = '24h'; advancedOpen.value = false; sort.value = 'timestamp_desc'; page.value = 1; pendingNewEvents.value = 0; await refreshEvents() }
async function changePageSize(value) {
  if (!requestPageSizes.includes(value) || value === pageSize.value) return
  pageSize.value = value
  saveRequestPreference(pageSizeKey, value, normalizeRequestPageSize)
  page.value = 1
  pendingNewEvents.value = 0
  await refreshEvents()
}
async function changePage(delta) {
  const next = page.value + delta
  if (next < 1 || next > totalPages.value) return
  page.value = next
  await refreshEvents()
}
async function pollEvents() {
  if (polling || loading.value || detailOpen.value || exportOpen.value || !response.value) return
  const version = requestVersion
  polling = true
  try {
    const result = await fetchAPI('/request-events', { query: { ...buildQuery(appliedFilters.value, false), limit: 1, offset: 0 } })
    if (disposed || version !== requestVersion || !liveRefresh.value) return
    pendingNewEvents.value = Math.max(0, (Number(result?.total) || 0) - total.value)
    liveError.value = ''
  } catch (error) {
    if (!disposed && version === requestVersion && liveRefresh.value) liveError.value = errorMessage(error, t('requests.err.live'))
  } finally { polling = false }
}
const selectedIndex = computed(() => events.value.findIndex(event => event.id === selectedDetailId.value))
function navigateDetail(direction) {
  const next = events.value[selectedIndex.value + direction]
  if (next) openDetail(next)
}
async function openDetail(event) {
  if (!event?.id) return
  selectedDetailId.value = event.id
  pageError.value = ''
  detailOpen.value = true
  detailLoading.value = true
  selectedDetail.value = null
  detailDownloadError.value = ''
  try { selectedDetail.value = await fetchAPI(`/request-events/${encodeURIComponent(event.id)}`, { query: { include_payload: true, include_logs: true } }); pageError.value = '' } catch (error) { detailOpen.value = false; pageError.value = errorMessage(error, t('requests.err.detail')) } finally { detailLoading.value = false }
}
async function downloadRequestLog(downloadUrl, requestId) {
  if (!downloadUrl || downloadingId.value) return
  detailDownloadError.value = ''
  downloadingId.value = requestId || downloadUrl
  try { const blob = await fetchAPI(downloadUrl, { responseType: 'blob' }); downloadBlob(blob, `${requestId || 'request'}.log`) } catch (error) { pageError.value = errorMessage(error, t('usage.err.download')); detailDownloadError.value = pageError.value } finally { downloadingId.value = '' }
}
async function exportEvents() {
  if (exporting.value || !canExport.value) return
  const version = ++exportVersion
  const format = exportFormat.value
  exporting.value = true
  pageError.value = ''
  try {
    const blob = await fetchAPI('/request-events/export', { query: { ...buildQuery(appliedFilters.value, false), format }, responseType: 'blob', signal: exportController.signal })
    if (disposed || version !== exportVersion) return
    downloadBlob(blob, `request-events.${format}`)
    exportOpen.value = false
  } catch (error) {
    if (disposed || version !== exportVersion) return
    if ([404, 405, 501].includes(error?.statusCode)) { exportUnavailable.value = true; exportOpen.value = false }
    else pageError.value = errorMessage(error, t('requests.err.export'))
  } finally { if (!disposed && version === exportVersion) exporting.value = false }
}
function downloadBlob(blob, filename) { const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(objectUrl) }
function scheduleRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
  if (!liveRefresh.value) { liveError.value = ''; return }
  refreshTimer = setInterval(pollEvents, Number(refreshSeconds.value) * 1000)
}
function formatNumber(value) { return new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0) }
function formatCompactNumber(value) { return new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0) }
function formatDecimal(value) { return new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2 }).format(Number(value) || 0) }
function formatMilliseconds(value) { return value == null ? '—' : `${formatNumber(value)} ms` }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value)) : '—' }
function formatAmount(amount, currency) { return amount == null ? '—' : `${formatDecimal(amount)} ${currency || t('usage.credits')}` }
function formatTableAmount(amount, currency) { return amount == null ? '—' : `${formatDecimal(amount)}${currency && currency.toLowerCase() !== 'credits' ? ` ${currency}` : ''}` }
function statusCode(event) { return event?.status_code || event?.error?.status_code || event?.upstream_status_code || '' }
function statusLabel(event) { return event?.status || (event?.failed ? t('common.failed') : t('common.success')) }
function statusColor(event) { const code = Number(statusCode(event)); return event?.failed || code >= 400 ? 'error' : code >= 200 && code < 400 ? 'success' : 'neutral' }
function executorLabel(value) { return value ? String(value).trim().replace(/Executor$/i, '') : '' }
function eventTypeLabel(event) { return String(event?.event_type || 'completion').replaceAll('_', ' ').replace(/\b\w/g, value => value.toUpperCase()) }
function eventEndpoint(event) { return event?.endpoint || event?.payload_summary?.method || t('requests.modelRequest') }
function cacheTokens(event) { const value = Number(event?.tokens?.cache_read_tokens ?? event?.tokens?.cached_tokens); return value > 0 ? formatCompactNumber(value) : '' }
const cacheRate = requestCacheRate
function toolCount(event) { return toolUsageEntries(event?.tool_usage).reduce((sum, [, value]) => sum + Number(value), 0) }
function errorMessage(error, fallback = t('requests.err.unexpected')) { return error?.data?.message || error?.data?.error || error?.message || fallback }
// dateRangeError returns English; map its known messages for display.
function dateErrorText(message) { return message.startsWith('Enter a valid date and time') ? t('usage.dateTimeInvalid') : message.startsWith('Enter a valid date') ? t('usage.dateInvalid') : message.startsWith('Start must be') ? t('usage.rangeInverted') : message }
// requestCostRows (requestTelemetry) emits English labels such as 'Output (15)'; translate the base label and keep the suffix.
function costRowLabel(label) {
  const match = /^(.*?)( \(.*\))?$/.exec(String(label || ''))
  const base = match?.[1] || '', suffix = match?.[2] || ''
  const translated = {
    Total: t('requests.cost.total'), Input: t('requests.cost.input'), Output: t('requests.cost.output'), 'Cache read': t('usage.tok.cacheRead'), 'Cached text': t('requests.cost.cachedText'), 'Cache write': t('usage.tok.cacheWrite'),
    'Image input': t('requests.cost.imageInput'), 'Audio input': t('requests.cost.audioInput'), 'Video input': t('requests.cost.videoInput'), 'File input': t('requests.cost.fileInput'),
    'Image output': t('requests.cost.imageOutput'), 'Audio output': t('requests.cost.audioOutput'), 'Video output': t('requests.cost.videoOutput'),
    'Image cache read': t('requests.cost.imageCacheRead'), 'Audio cache read': t('requests.cost.audioCacheRead'), 'Cache write 30m': t('requests.cost.cacheWrite30m'), 'Cache write 1h': t('requests.cost.cacheWrite1h'), 'Cache write 12h': t('requests.cost.cacheWrite12h'),
    'Web search': t('requests.cost.webSearch'), 'Web search query': t('requests.cost.webSearchQuery'), 'Web fetch': t('requests.cost.webFetch'), 'X search': t('requests.cost.xSearch'), 'Code execution': t('requests.cost.codeExecution'),
    'File search': t('requests.cost.fileSearch'), 'Document search': t('requests.cost.documentSearch'), 'Sources used': t('requests.cost.sourcesUsed'), 'Server tools': t('requests.cost.serverTools'),
    'Request fee': t('requests.cost.requestFee'), 'Effort multiplier': t('requests.cost.effortMultiplier'), 'Billing multiplier': t('requests.cost.billingMultiplier')
  }[base]
  return translated ? `${translated}${suffix}` : label
}

watch([liveRefresh, refreshSeconds], scheduleRefresh)
watch(timeRange, value => saveTelemetryChoice('cpahome:request-events:range', value, requestRanges))
watch(sort, async value => { saveTelemetryChoice('cpahome:request-events:sort', value, requestSorts); page.value = 1; pendingNewEvents.value = 0; await refreshEvents() })
useDataSync('admin:request-records:sync', refreshEvents)
watch(token, () => {
  exportVersion++
  exportController.abort()
  exportController = new AbortController()
  exportUnavailable.value = false
  exportOpen.value = false
  exporting.value = false
})
onMounted(() => {
  if (timeRange.value !== '24h') {
    applyTimeRange(timeRange.value)
    appliedFilters.value = { ...filters.value }
  }
  void refreshCapabilities().catch(() => {})
  void refreshEvents()
})
onBeforeUnmount(() => { stopColumnResize(); disposed = true; exportVersion++; exportController.abort(); requestVersion++; loading.value = false; if (refreshTimer) clearInterval(refreshTimer) })
</script>
