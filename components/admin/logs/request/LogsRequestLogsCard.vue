<template>
  <AppCard :ui="{ body: 'p-0' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ t('logs.view.requestLogs') }}</h2>
        <p class="text-xs text-[var(--ui-text-muted)]" :title="t('logs.desc.requestLogs')">{{ t('logs.requestLogsSummary', { count: formatNumber(requestLogsTotal) }) }}</p>
      </div>
    </template>

    <AppTable :columns="requestLogColumns" :data="requestLogs" :loading="requestLogsLoading" :number-offset="(requestLogsPage - 1) * pageSize">
      <template #empty>
        <LogsEmptyState icon="i-tabler-file-search" :message="t('logs.requestLogsEmpty')" />
      </template>
      <template #timestamp-cell="{ row }">
        <div class="min-w-36">
          <p class="font-medium">{{ formatDateTime(rowValue(row).timestamp) }}</p>
          <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).request_id || t('logs.noRequestId') }}</p>
        </div>
      </template>
      <template #file_name-cell="{ row }">
        <div class="min-w-40">
          <p class="font-mono text-xs">{{ rowValue(row).file_name || t('logs.remoteFile') }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ formatBytes(rowValue(row).size_bytes) }}</p>
        </div>
      </template>
      <template #model-cell="{ row }">
        <div class="min-w-36">
          <p class="font-medium">{{ rowValue(row).model || t('logs.unknownModel') }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).provider || t('logs.unknownProvider') }} · {{ rowValue(row).status || t('common.unknown') }}</p>
        </div>
      </template>
      <template #home_ip-cell="{ row }">
        <span class="font-mono text-xs">{{ formatHost(rowValue(row).home_ip, rowValue(row).home_port) }}</span>
      </template>
      <template #available-cell="{ row }">
        <PortalBadge :color="rowValue(row).available ? 'success' : 'neutral'" variant="subtle" size="sm">
          {{ rowValue(row).available ? t('logs.available') : t('logs.unavailable') }}
        </PortalBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <AdminTableAction
            action="download"
            :label="t('logs.downloadRequestLog')"
            :disabled="!rowValue(row).download_url"
            :loading="downloadingId === rowValue(row).request_id"
            @click="downloadRequestLog(rowValue(row).download_url, rowValue(row).request_id)"
          />
        </div>
      </template>
    </AppTable>

    <LogsTablePager :page="requestLogsPage" :total="requestLogsTotal" :page-size="pageSize" :loading="requestLogsLoading" @previous="changeRequestLogsPage(-1)" @next="changeRequestLogsPage(1)" />
  </AppCard>
</template>

<script setup lang="ts">
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import LogsEmptyState from '~/components/admin/logs/LogsEmptyState.vue'
import LogsTablePager from '~/components/admin/logs/LogsTablePager.vue'
import { useLogsPage } from '~/composables/logs/useLogsPage'

const {
  t, rowValue, formatNumber, formatDateTime, formatBytes, formatHost, pageSize, requestLogs, requestLogsTotal,
  requestLogsLoading, requestLogsPage, downloadingId, downloadRequestLog, changeRequestLogsPage,
} = useLogsPage()

const requestLogColumns = computed(() => [
  { accessorKey: 'timestamp', header: t('logs.col.request') },
  { accessorKey: 'file_name', header: t('logs.col.file') },
  { accessorKey: 'model', header: t('logs.providerModel') },
  { accessorKey: 'home_ip', header: t('logs.col.home') },
  { accessorKey: 'available', header: t('logs.col.availability') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])
</script>
