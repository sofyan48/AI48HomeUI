<template>
  <AppCard :ui="{ body: 'p-0' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ t('logs.view.application') }}</h2>
        <p class="text-xs text-[var(--ui-text-muted)]" :title="t('logs.desc.application')">{{ t('logs.applicationSummary', { count: formatNumber(applicationTotal) }) }}</p>
        <div class="mt-3 flex gap-2">
          <AppButton color="neutral" variant="outline" :aria-pressed="applicationMode === 'pages'" :disabled="clearingLogs" @click="changeApplicationMode('pages')">{{ t('logs.modePages') }}</AppButton>
          <AppButton color="neutral" variant="outline" :aria-pressed="applicationMode === 'tail'" :disabled="clearingLogs" @click="changeApplicationMode('tail')">{{ t('logs.modeTail') }}</AppButton>
        </div>
      </div>
    </template>

    <ApplicationLogTail v-if="applicationMode === 'tail'"
      :rows="tail.rows.value" :following="tail.following.value" :pending-count="tail.pending.value.length"
      :busy="tail.busy.value || applicationLoading" :can-load-older="tail.canLoadOlder.value"
      :disabled="applicationLoading || applicationCursorExpired || applicationSearchUnsupported || clearingLogs"
      :truncated="tail.truncated.value" @following="tail.setFollowing" @accept="tail.accept"
      @older="loadOlderApplicationTail" @detail="selectedApplicationLog = $event" />
    <AppTable v-else :columns="applicationColumns" :data="applicationLogs" :loading="applicationLoading" :number-offset="(applicationPage - 1) * applicationPageSize">
      <template #empty>
        <LogsEmptyState icon="i-tabler-terminal-2" :message="t('logs.applicationEmpty')" />
      </template>
      <template #timestamp-cell="{ row }">
        <div class="min-w-36">
          <p class="font-medium">{{ formatDateTime(rowValue(row).timestamp) }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('logs.storedAt', { time: formatDateTime(rowValue(row).created_at) }) }}</p>
        </div>
      </template>
      <template #level-cell="{ row }">
        <PortalBadge :color="levelColor(rowValue(row).level)" variant="subtle" size="sm">
          {{ rowValue(row).level || t('common.unknown') }}
        </PortalBadge>
      </template>
      <template #line-cell="{ row }">
        <p class="max-w-3xl whitespace-pre-wrap break-words font-mono text-xs">{{ rowValue(row).line || '—' }}</p>
      </template>
      <template #source-cell="{ row }">
        <div class="min-w-32 font-mono text-xs">
          <p>{{ rowValue(row).home_ip || t('logs.unknownHome') }}</p>
          <p class="text-[var(--ui-text-muted)]">{{ rowValue(row).client_ip || t('logs.noClientIp') }}</p>
        </div>
      </template>
      <template #request_id-cell="{ row }">
        <span class="font-mono text-xs">{{ rowValue(row).request_id || '—' }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end"><AdminTableAction action="view" :label="t('logs.viewLogDetails')" @click="selectedApplicationLog = rowValue(row)" /></div>
      </template>
    </AppTable>

    <LogsTablePager v-if="applicationMode === 'pages'" :page="applicationPage" :total="applicationTotal" :page-size="applicationPageSize" :loading="applicationLoading" :disabled="applicationCursorExpired || !applicationAnchorId || clearingLogs" @previous="changeApplicationPage(-1)" @next="changeApplicationPage(1)" />
  </AppCard>
</template>

<script setup lang="ts">
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import ApplicationLogTail from '~/components/admin/logs/ApplicationLogTail.vue'
import LogsEmptyState from '~/components/admin/logs/LogsEmptyState.vue'
import LogsTablePager from '~/components/admin/logs/LogsTablePager.vue'
import { useLogsPage } from '~/composables/logs/useLogsPage'

const {
  t, rowValue, levelColor, formatNumber, formatDateTime, tail, applicationMode, applicationTotal, applicationLogs,
  applicationLoading, applicationPage, applicationPageSize, applicationAnchorId, applicationCursorExpired,
  applicationSearchUnsupported, clearingLogs, selectedApplicationLog,
  changeApplicationMode, changeApplicationPage, loadOlderApplicationTail,
} = useLogsPage()

const applicationColumns = computed(() => [
  { accessorKey: 'timestamp', header: t('logs.col.time') },
  { accessorKey: 'level', header: t('logs.level') },
  { accessorKey: 'line', header: t('logs.col.logLine') },
  { accessorKey: 'source', header: t('logs.col.homeClient') },
  { accessorKey: 'request_id', header: t('logs.requestId') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])
</script>
