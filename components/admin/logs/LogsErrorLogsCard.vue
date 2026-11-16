<template>
  <AppCard :ui="{ body: 'p-0' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ t('logs.errorLogsTitle') }}</h2>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('logs.errorLogsSummary', { count: formatNumber(filteredErrorLogs.length) }) }}</p>
      </div>
    </template>
    <AppTable :columns="errorLogColumns" :data="pagedErrorLogs" :loading="errorLogsLoading" :number-offset="(errorLogsPage - 1) * errorLogPageSize">
      <template #empty><LogsEmptyState icon="i-tabler-file-search" :message="t('logs.errorLogsEmpty')" /></template>
      <template #modified-cell="{ row }">{{ formatDateTime(Number(rowValue(row).modified) * 1000) }}</template>
      <template #size-cell="{ row }">{{ formatBytes(rowValue(row).size) }}</template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end"><AdminTableAction action="download" :label="t('logs.downloadErrorLog')"
          :disabled="!validErrorLogName(rowValue(row).name)" :loading="downloadingId === rowValue(row).name"
          @click="downloadErrorLog(rowValue(row).name)" /></div>
      </template>
    </AppTable>
    <LogsTablePager :page="errorLogsPage" :total="filteredErrorLogs.length" :page-size="errorLogPageSize" :loading="errorLogsLoading" @previous="changeErrorLogsPage(-1)" @next="changeErrorLogsPage(1)" />
  </AppCard>
</template>

<script setup lang="ts">
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import LogsEmptyState from '~/components/admin/logs/LogsEmptyState.vue'
import LogsTablePager from '~/components/admin/logs/LogsTablePager.vue'
import { useLogsPage } from '~/composables/logs/useLogsPage'

const {
  t, rowValue, validErrorLogName, formatNumber, formatDateTime, formatBytes, filteredErrorLogs, pagedErrorLogs,
  errorLogsLoading, errorLogsPage, errorLogPageSize, downloadingId, downloadErrorLog, changeErrorLogsPage,
} = useLogsPage()

const errorLogColumns = computed(() => [
  { accessorKey: 'name', header: t('logs.col.file') },
  { accessorKey: 'modified', header: t('logs.col.modified') },
  { accessorKey: 'size', header: t('logs.col.size') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])
</script>
