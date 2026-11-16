<template>
  <AppCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold">{{ t('logs.view.events') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]" :title="t('logs.desc.events')">{{ t('logs.eventsSummary', { count: formatNumber(eventsTotal) }) }}</p>
        </div>
        <USelect v-model="eventSort" :items="eventSortOptions" value-key="value" label-key="label" class="w-full sm:w-52" @update:model-value="applyFilters" />
      </div>
    </template>

    <AppTable :columns="eventColumns" :data="events" :loading="eventsLoading" :number-offset="(eventsPage - 1) * pageSize">
      <template #empty>
        <LogsEmptyState icon="i-tabler-list" :message="t('logs.eventsEmpty')" />
      </template>
      <template #timestamp-cell="{ row }">
        <div class="min-w-36">
          <p class="font-medium">{{ formatDateTime(rowValue(row).timestamp) }}</p>
          <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).request_id || rowValue(row).id }}</p>
        </div>
      </template>
      <template #status-cell="{ row }">
        <div class="space-y-1">
          <UBadge :color="rowValue(row).failed ? 'error' : 'success'" variant="subtle" size="sm">
            {{ rowValue(row).failed ? t('common.failed') : t('common.success') }}
          </UBadge>
          <p v-if="rowValue(row).status_code" class="text-xs text-[var(--ui-text-muted)]">HTTP {{ rowValue(row).status_code }}</p>
        </div>
      </template>
      <template #model-cell="{ row }">
        <div class="min-w-36">
          <p class="font-medium">{{ rowValue(row).model || t('logs.unknownModel') }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).provider || t('logs.unknownProvider') }} · {{ rowValue(row).event_type || 'completion' }}</p>
        </div>
      </template>
      <template #client-cell="{ row }">
        <div class="min-w-32">
          <p class="text-sm">{{ rowValue(row).client?.username || rowValue(row).client?.client_key_label || t('logs.unattributed') }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).runtime?.cpa_label || rowValue(row).runtime?.home_id || t('logs.unknownNode') }}</p>
        </div>
      </template>
      <template #tokens-cell="{ row }">
        <div class="min-w-24 tabular-nums">
          <p class="font-semibold">{{ formatNumber(rowValue(row).tokens?.total_tokens) }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ formatMilliseconds(rowValue(row).performance?.latency_ms) }}</p>
        </div>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <AdminTableAction
            v-if="rowValue(row).related?.request_log?.download_url"
            action="download"
            :label="t('logs.downloadRequestLog')"
            :loading="downloadingId === rowValue(row).request_id"
            @click="downloadRequestLog(rowValue(row).related.request_log.download_url, rowValue(row).request_id)"
          />
          <AdminTableAction action="view" :label="t('logs.viewEventDetails')" @click="openEventDetail(rowValue(row))" />
        </div>
      </template>
    </AppTable>

    <LogsTablePager :page="eventsPage" :total="eventsTotal" :page-size="pageSize" :loading="eventsLoading" @previous="changeEventsPage(-1)" @next="changeEventsPage(1)" />
  </AppCard>
</template>

<script setup lang="ts">
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import LogsEmptyState from '~/components/admin/logs/LogsEmptyState.vue'
import LogsTablePager from '~/components/admin/logs/LogsTablePager.vue'
import { useLogsPage } from '~/composables/logs/useLogsPage'

const {
  t, rowValue, formatNumber, formatDateTime, formatMilliseconds, pageSize, eventSort, events, eventsTotal, eventsLoading,
  eventsPage, downloadingId, applyFilters, downloadRequestLog, openEventDetail, changeEventsPage,
} = useLogsPage()

const eventSortOptions = computed(() => [
  { label: t('logs.sort.newest'), value: 'timestamp_desc' },
  { label: t('logs.sort.oldest'), value: 'timestamp_asc' },
  { label: t('logs.sort.latency'), value: 'latency_desc' },
  { label: t('logs.sort.tokens'), value: 'tokens_desc' },
  { label: t('logs.sort.cost'), value: 'cost_desc' },
  { label: t('logs.sort.failures'), value: 'failed_first' },
])

const eventColumns = computed(() => [
  { accessorKey: 'timestamp', header: t('logs.col.request') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'model', header: t('logs.providerModel') },
  { accessorKey: 'client', header: t('logs.col.clientNode') },
  { accessorKey: 'tokens', header: t('logs.col.tokensLatency') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])
</script>
