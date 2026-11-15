<template>
  <div class="space-y-4">
    <AppPanelTabs :model-value="activeView" :items="views" :label="t('logs.viewsLabel')" @update:model-value="switchView" />

    <div
      v-if="errorMessage"
      class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
    >
      {{ errorMessage }}
    </div>

    <div v-if="activeView === 'application' && applicationError" role="alert" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      <p>{{ applicationError }}</p>
      <AppButton v-if="applicationCursorExpired" class="mt-2" color="neutral" variant="outline" :loading="applicationLoading" @click="restartApplicationLogs">{{ t('logs.restartLatest') }}</AppButton>
    </div>
    <div v-if="activeView === 'application' && applicationSearchUnsupported" role="status" class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      {{ t('logs.searchUnsupported') }}
    </div>
    <div v-if="activeView === 'application' && applicationResponse && !applicationAnchorId && applicationTotal > 0" role="status" class="text-sm text-[var(--ui-text-muted)]">
      {{ t('logs.anchorMissing') }}
    </div>
    <div v-if="activeView === 'application' && applicationMode === 'pages' && liveRefresh && applicationPage > 1" role="status" class="text-sm text-[var(--ui-text-muted)]">
      {{ t('logs.livePaused') }}
    </div>

    <form class="admin-toolbar log-filters" :aria-label="t('logs.filtersLabel')" @submit.prevent="applyFilters">
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="activeView === 'error-logs'">
          <UInput v-model="errorLogSearch" icon="i-tabler-search" :placeholder="t('logs.filenamePlaceholder')" :aria-label="t('logs.filename')" class="w-full sm:w-80" />
        </template>
        <template v-else-if="activeView !== 'application'">
          <UInput v-model="requestFilters.search" icon="i-tabler-search" :placeholder="activeView === 'events' ? t('logs.searchEventsPlaceholder') : t('logs.searchRequestLogsPlaceholder')" :aria-label="t('common.search')" class="w-full sm:w-72" />
          <USelect :model-value="requestFilters.status || allOptionValue" :items="requestStatusOptions" value-key="value" label-key="label" icon="i-tabler-circle-dot" :aria-label="t('common.status')" class="w-36" @update:model-value="requestFilters.status = $event === allOptionValue ? '' : $event" />
          <div class="log-filters__range">
            <UInput v-model="requestFilters.from" type="date" :max="requestFilters.to || undefined" :aria-label="t('logs.fromDate')" variant="none" class="w-36" />
            <span aria-hidden="true">→</span>
            <UInput v-model="requestFilters.to" type="date" :min="requestFilters.from || undefined" :aria-label="t('logs.toDate')" variant="none" class="w-36" />
          </div>
        </template>
        <template v-else>
          <UInput v-model="applicationFilters.search" icon="i-tabler-search" :placeholder="t('logs.searchContentPlaceholder')" :aria-label="t('logs.searchContent')" class="w-full sm:w-72" />
          <USelect :model-value="applicationFilters.level || allOptionValue" :items="levelOptions" value-key="value" label-key="label" icon="i-tabler-stack-2" :aria-label="t('logs.level')" class="w-36" @update:model-value="applicationFilters.level = $event === allOptionValue ? '' : $event" />
          <div class="log-filters__range">
            <UInput v-model="applicationFilters.after" type="datetime-local" :max="applicationFilters.before || undefined" :aria-label="t('logs.after')" variant="none" class="w-48" />
            <span aria-hidden="true">→</span>
            <UInput v-model="applicationFilters.before" type="datetime-local" :min="applicationFilters.after || undefined" :aria-label="t('logs.before')" variant="none" class="w-48" />
          </div>
        </template>

        <UChip v-if="activeView !== 'error-logs'" :show="advancedLogFilterCount > 0 && !showAdvancedLogFilters" size="sm" inset>
          <AppButton
            type="button"
            color="neutral"
            :variant="showAdvancedLogFilters ? 'soft' : 'ghost'"
            icon="i-tabler-dots-vertical"
            :aria-label="showAdvancedLogFilters ? t('logs.hideAdvanced') : t('logs.showAdvanced')"
            :title="advancedLogFilterCount ? t('logs.advancedActive', { count: advancedLogFilterCount }) : t('logs.advancedFilters')"
            :aria-expanded="showAdvancedLogFilters"
            @click="showAdvancedLogFilters = !showAdvancedLogFilters"
          />
        </UChip>
        <AppButton type="button" color="neutral" variant="ghost" @click="resetFilters">{{ t('common.reset') }}</AppButton>
        <AppButton type="submit" icon="i-tabler-filter" :loading="loading">{{ t('common.apply') }}</AppButton>

        <span class="mx-1 hidden h-5 w-px bg-[var(--ui-border)] lg:block" aria-hidden="true" />

        <div class="flex items-center gap-1.5 lg:ml-auto">
          <USelect v-model="pageSize" :items="pageSizeOptions" value-key="value" label-key="label" :aria-label="t('logs.pageSize')" class="w-28" @update:model-value="resetPages" />
          <AppButton :color="liveRefresh ? 'primary' : 'neutral'" :variant="liveRefresh ? 'soft' : 'ghost'" :icon="liveRefresh ? 'i-tabler-broadcast' : 'i-tabler-broadcast-off'" :aria-pressed="liveRefresh" :title="liveRefresh ? t('logs.liveOn') : t('logs.liveOff')" @click="liveRefresh = !liveRefresh">{{ t('logs.live') }}</AppButton>
          <AppButton color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="loading" :aria-label="t('common.refresh')" :title="t('common.refresh')" @click="refreshActive" />
          <AppButton
            v-if="activeView === 'application'"
            color="error"
            variant="ghost"
            icon="i-tabler-trash"
            :disabled="applicationTotal === 0"
            :aria-label="t('logs.clearApplicationLogs')"
            :title="t('logs.clearApplicationLogs')"
            @click="clearConfirmOpen = true"
          />
        </div>
      </div>

      <div v-if="showAdvancedLogFilters && activeView !== 'error-logs'" class="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--ui-border)] pt-2.5">
        <template v-if="activeView !== 'application'">
          <UInput v-model="requestFilters.provider" icon="i-tabler-cloud" :placeholder="t('logs.providerPlaceholder')" :aria-label="t('common.provider')" class="w-full sm:w-52" />
          <UInput v-model="requestFilters.model" icon="i-tabler-box" :placeholder="t('logs.modelPlaceholder')" :aria-label="t('common.model')" class="w-full sm:w-60" />
        </template>
        <template v-else>
          <UInput v-model="applicationFilters.home_ip" icon="i-tabler-server" :placeholder="t('logs.homeIp')" :aria-label="t('logs.homeIp')" class="w-full sm:w-44" />
          <UInput v-model="applicationFilters.client_ip" icon="i-tabler-device-desktop" :placeholder="t('logs.clientIp')" :aria-label="t('logs.clientIp')" class="w-full sm:w-44" />
          <UInput v-model="applicationFilters.request_id" icon="i-tabler-hash" :placeholder="t('logs.requestIdPlaceholder')" :aria-label="t('logs.requestId')" class="w-full sm:w-64" />
        </template>
      </div>
    </form>

    <AppCard v-if="activeView === 'events'" :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold">{{ t('logs.view.events') }}</h2>
            <p class="text-xs text-[var(--ui-text-muted)]" :title="activeDescription">{{ t('logs.eventsSummary', { count: formatNumber(eventsTotal) }) }}</p>
          </div>
          <USelect v-model="eventSort" :items="eventSortOptions" value-key="value" label-key="label" class="w-full sm:w-52" @update:model-value="applyFilters" />
        </div>
      </template>

      <AppTable :columns="eventColumns" :data="events" :loading="eventsLoading" :number-offset="(eventsPage - 1) * pageSize">
        <template #empty>
          <EmptyState icon="i-tabler-list" :message="t('logs.eventsEmpty')" />
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

      <TablePager :page="eventsPage" :total="eventsTotal" :page-size="pageSize" :loading="eventsLoading" @previous="changeEventsPage(-1)" @next="changeEventsPage(1)" />
    </AppCard>

    <AppCard v-else-if="activeView === 'request-logs'" :ui="{ body: 'p-0' }">
      <template #header>
        <div>
          <h2 class="font-semibold">{{ t('logs.view.requestLogs') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]" :title="activeDescription">{{ t('logs.requestLogsSummary', { count: formatNumber(requestLogsTotal) }) }}</p>
        </div>
      </template>

      <AppTable :columns="requestLogColumns" :data="requestLogs" :loading="requestLogsLoading" :number-offset="(requestLogsPage - 1) * pageSize">
        <template #empty>
          <EmptyState icon="i-tabler-file-search" :message="t('logs.requestLogsEmpty')" />
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
          <UBadge :color="rowValue(row).available ? 'success' : 'neutral'" variant="subtle" size="sm">
            {{ rowValue(row).available ? t('logs.available') : t('logs.unavailable') }}
          </UBadge>
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

      <TablePager :page="requestLogsPage" :total="requestLogsTotal" :page-size="pageSize" :loading="requestLogsLoading" @previous="changeRequestLogsPage(-1)" @next="changeRequestLogsPage(1)" />
    </AppCard>

    <AppCard v-else-if="activeView === 'error-logs'" :ui="{ body: 'p-0' }">
      <template #header>
        <div>
          <h2 class="font-semibold">{{ t('logs.errorLogsTitle') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('logs.errorLogsSummary', { count: formatNumber(filteredErrorLogs.length) }) }}</p>
        </div>
      </template>
      <AppTable :columns="errorLogColumns" :data="pagedErrorLogs" :loading="errorLogsLoading" :number-offset="(errorLogsPage - 1) * errorLogPageSize">
        <template #empty><EmptyState icon="i-tabler-file-search" :message="t('logs.errorLogsEmpty')" /></template>
        <template #modified-cell="{ row }">{{ formatDateTime(Number(rowValue(row).modified) * 1000) }}</template>
        <template #size-cell="{ row }">{{ formatBytes(rowValue(row).size) }}</template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end"><AdminTableAction action="download" :label="t('logs.downloadErrorLog')"
            :disabled="!validErrorLogName(rowValue(row).name)" :loading="downloadingId === rowValue(row).name"
            @click="downloadErrorLog(rowValue(row).name)" /></div>
        </template>
      </AppTable>
      <TablePager :page="errorLogsPage" :total="filteredErrorLogs.length" :page-size="errorLogPageSize" :loading="errorLogsLoading" @previous="changeErrorLogsPage(-1)" @next="changeErrorLogsPage(1)" />
    </AppCard>

    <AppCard v-else :ui="{ body: 'p-0' }">
      <template #header>
        <div>
          <h2 class="font-semibold">{{ t('logs.view.application') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]" :title="activeDescription">{{ t('logs.applicationSummary', { count: formatNumber(applicationTotal) }) }}</p>
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
          <EmptyState icon="i-tabler-terminal-2" :message="t('logs.applicationEmpty')" />
        </template>
        <template #timestamp-cell="{ row }">
          <div class="min-w-36">
            <p class="font-medium">{{ formatDateTime(rowValue(row).timestamp) }}</p>
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('logs.storedAt', { time: formatDateTime(rowValue(row).created_at) }) }}</p>
          </div>
        </template>
        <template #level-cell="{ row }">
          <UBadge :color="levelColor(rowValue(row).level)" variant="subtle" size="sm">
            {{ rowValue(row).level || t('common.unknown') }}
          </UBadge>
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

      <TablePager v-if="applicationMode === 'pages'" :page="applicationPage" :total="applicationTotal" :page-size="applicationPageSize" :loading="applicationLoading" :disabled="applicationCursorExpired || !applicationAnchorId || clearingLogs" @previous="changeApplicationPage(-1)" @next="changeApplicationPage(1)" />
    </AppCard>

    <AppModal v-model:open="eventDetailOpen" :title="t('logs.eventDetailTitle')" :description="t('logs.eventDetailDescription')">
      <template #body>
        <div v-if="eventDetailLoading" class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('logs.eventDetailLoading') }}</div>
        <div v-else-if="selectedEvent" class="space-y-5">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem :label="t('logs.eventId')" :value="selectedEvent.event?.id" mono />
            <DetailItem :label="t('logs.requestId')" :value="selectedEvent.event?.request_id" mono />
            <DetailItem :label="t('logs.timestamp')" :value="formatDateTime(selectedEvent.event?.timestamp)" />
            <DetailItem :label="t('logs.eventType')" :value="selectedEvent.event?.event_type" />
            <DetailItem :label="t('logs.providerModel')" :value="`${selectedEvent.event?.provider || t('common.unknown')} / ${selectedEvent.event?.model || t('common.unknown')}`" />
            <DetailItem :label="t('logs.endpoint')" :value="selectedEvent.event?.endpoint" mono />
            <DetailItem :label="t('common.status')" :value="`${selectedEvent.event?.status || t('common.unknown')}${selectedEvent.event?.status_code ? ` (${selectedEvent.event.status_code})` : ''}`" />
            <DetailItem :label="t('logs.latency')" :value="formatMilliseconds(selectedEvent.event?.performance?.latency_ms)" />
            <DetailItem :label="t('logs.totalTokens')" :value="formatNumber(selectedEvent.event?.tokens?.total_tokens)" />
            <DetailItem :label="t('logs.charge')" :value="formatAmount(selectedEvent.event?.billing?.amount, selectedEvent.event?.billing?.currency)" />
            <DetailItem :label="t('logs.userKey')" :value="selectedEvent.event?.client?.username || selectedEvent.event?.client?.client_key_label || t('logs.unattributed')" />
            <DetailItem :label="t('logs.credential')" :value="selectedEvent.event?.credential?.label || selectedEvent.event?.credential?.credential_id || t('common.unknown')" />
          </div>

          <div v-if="hasEventError" class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p class="text-sm font-semibold text-red-600 dark:text-red-400">{{ t('logs.requestError') }}</p>
            <p class="mt-1 whitespace-pre-wrap text-sm">{{ selectedEvent.event.error.message || selectedEvent.event.error.reason || selectedEvent.event.error.body_preview }}</p>
          </div>

          <div v-if="selectedEvent.payload_summary" class="rounded-lg border border-[var(--ui-border)] p-4">
            <p class="mb-3 text-sm font-semibold">{{ t('logs.payloadSummary') }}</p>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailItem :label="t('logs.method')" :value="selectedEvent.payload_summary.method" />
              <DetailItem :label="t('logs.streaming')" :value="formatBoolean(selectedEvent.payload_summary.stream)" />
              <DetailItem :label="t('logs.messages')" :value="formatNumber(selectedEvent.payload_summary.message_count)" />
              <DetailItem :label="t('logs.tools')" :value="formatNumber(selectedEvent.payload_summary.tool_count)" />
            </div>
          </div>

          <div v-if="selectedEvent.log_excerpt?.length" class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-4">
            <p class="mb-3 text-sm font-semibold">{{ t('logs.logExcerpt') }}</p>
            <pre class="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{{ selectedEvent.log_excerpt.join('\n') }}</pre>
          </div>

          <div v-if="selectedEvent.event?.related?.request_log?.download_url" class="flex justify-end">
            <AppButton
              color="neutral"
              variant="outline"
              icon="i-tabler-download"
              :loading="downloadingId === selectedEvent.event.request_id"
              @click="downloadRequestLog(selectedEvent.event.related.request_log.download_url, selectedEvent.event.request_id)"
            >
              {{ t('logs.downloadRequestLog') }}
            </AppButton>
          </div>
        </div>
      </template>
    </AppModal>

    <AppModal :open="!!selectedApplicationLog" :title="t('logs.appDetailTitle')" :description="t('logs.appDetailDescription')" @update:open="closeApplicationDetail">
      <template #body>
        <div v-if="selectedApplicationLog" class="space-y-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem :label="t('logs.timestamp')" :value="formatDateTime(selectedApplicationLog.timestamp)" />
            <DetailItem :label="t('logs.stored')" :value="formatDateTime(selectedApplicationLog.created_at)" />
            <DetailItem :label="t('logs.level')" :value="selectedApplicationLog.level" />
            <DetailItem :label="t('logs.homeIp')" :value="selectedApplicationLog.home_ip" mono />
            <DetailItem :label="t('logs.clientIp')" :value="selectedApplicationLog.client_ip" mono />
            <DetailItem :label="t('logs.requestId')" :value="selectedApplicationLog.request_id" mono />
          </div>
          <pre class="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--ui-bg-muted)] p-4 text-xs">{{ selectedApplicationLog.line }}</pre>
        </div>
      </template>
    </AppModal>

    <AppModal v-model:open="clearConfirmOpen" :title="t('logs.clearTitle')" :description="t('logs.clearDescription')">
      <template #body>
        <div class="space-y-5">
          <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
            {{ t('logs.clearWarning', { count: formatNumber(applicationTotal) }) }}
          </div>
          <div class="flex justify-end gap-3">
            <AppButton color="neutral" variant="ghost" @click="clearConfirmOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton color="error" icon="i-tabler-trash" :loading="clearingLogs" @click="clearApplicationLogs">
              {{ t('logs.clearAll') }}
            </AppButton>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { dateRangeError, isDateInputValid } from '~/composables/dateRange'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import { useApplicationLogTail } from '~/composables/useApplicationLogTail'
import ApplicationLogTail from '~/components/admin/ApplicationLogTail.vue'
const { fetchAPI, token } = useApi()
const { t, intlLocale } = useAdminI18n()
const allOptionValue = '__all__'

const pageSize = ref(50)
const pageSizeOptions = computed(() => [25, 50, 100, 200].map(value => ({ label: t('logs.perPage', { count: value }), value })))
const applicationPageSize = computed(() => pageSize.value)
const errorLogPageSize = computed(() => pageSize.value)
const liveRefresh = ref(false)
let liveRefreshTimer = null
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const today = new Date()
const sevenDaysAgo = new Date(today)
sevenDaysAgo.setDate(today.getDate() - 6)

const dateInputValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultRequestFilters = () => ({
  from: dateInputValue(sevenDaysAgo),
  to: dateInputValue(today),
  provider: '',
  model: '',
  status: '',
  search: '',
})

const defaultApplicationFilters = () => ({
  search: '',
  after: '',
  before: '',
  level: '',
  home_ip: '',
  client_ip: '',
  request_id: '',
})

const showAdvancedLogFilters = ref(false)
// Count secondary filters so a collapsed row still signals that something is applied.
const advancedLogFilterCount = computed(() => activeView.value === 'application'
  ? ['home_ip', 'client_ip', 'request_id'].filter(key => String(applicationFilters.value[key] || '').trim()).length
  : ['provider', 'model'].filter(key => String(requestFilters.value[key] || '').trim()).length)
const views = computed(() => [
  { value: 'events', label: t('logs.view.events'), icon: 'i-tabler-list' },
  { value: 'request-logs', label: t('logs.view.requestLogs'), icon: 'i-tabler-file-download' },
  { value: 'error-logs', label: t('logs.view.errorLogs'), icon: 'i-tabler-alert-triangle' },
  { value: 'application', label: t('logs.view.application'), icon: 'i-tabler-terminal-2' },
])

const activeView = ref('events')
const requestFilters = ref(defaultRequestFilters())
const appliedRequestFilters = ref(defaultRequestFilters())
const applicationFilters = ref(defaultApplicationFilters())
const appliedApplicationFilters = ref(defaultApplicationFilters())
const eventSort = ref('timestamp_desc')
const errorMessage = useWorkspaceState('admin:logs:errorMessage', () => (''))
const downloadingId = useWorkspaceState('admin:logs:downloadingId', () => (''))

const eventsResponse = useWorkspaceState('admin:logs:eventsResponse', () => (null))
const requestLogsResponse = useWorkspaceState('admin:logs:requestLogsResponse', () => (null))
const applicationResponse = useWorkspaceState('admin:logs:applicationResponse', () => (null))
const errorLogsResponse = useWorkspaceState('admin:logs:errorLogsResponse', () => (null))
const eventsLoading = useWorkspaceState('admin:logs:eventsLoading', () => (false))
const requestLogsLoading = useWorkspaceState('admin:logs:requestLogsLoading', () => (false))
const applicationLoading = useWorkspaceState('admin:logs:applicationLoading', () => (false))
const errorLogsLoading = useWorkspaceState('admin:logs:errorLogsLoading', () => (false))
const eventsPage = ref(1)
const requestLogsPage = ref(1)
const applicationPage = ref(1)
const applicationAnchorId = ref(null)
const applicationError = ref('')
const applicationCursorExpired = ref(false)
const applicationMode = ref('pages')
const tail = useApplicationLogTail({
  fetchAPI,
  params: () => buildApplicationParams(),
  limit: () => applicationPageSize.value,
  onError: error => setApplicationError(error),
})
let applicationGeneration = 0
let applicationController = null
let refreshGeneration = 0
const cancelApplicationLoad = () => {
  tail.cancel()
  applicationGeneration += 1
  applicationController?.abort()
  applicationController = null
  applicationLoading.value = false
}
const resetApplicationPagination = () => {
  cancelApplicationLoad()
  applicationPage.value = 1
  applicationAnchorId.value = null
  applicationResponse.value = null
  tail.reset()
  applicationError.value = ''
  applicationCursorExpired.value = false
  selectedApplicationLog.value = null
}
const errorLogsPage = ref(1)
const errorLogSearch = ref('')

const eventDetailOpen = ref(false)
const eventDetailLoading = useWorkspaceState('admin:logs:eventDetailLoading', () => (false))
const selectedEvent = useWorkspaceState('admin:logs:selectedEvent', () => (null))
const selectedApplicationLog = ref(null)
const clearConfirmOpen = ref(false)
const clearingLogs = useWorkspaceState('admin:logs:clearingLogs', () => (false))

const requestStatusOptions = computed(() => [
  { label: t('logs.allStatuses'), value: allOptionValue },
  { label: t('common.success'), value: 'success' },
  { label: t('common.failed'), value: 'failed' },
])

const levelOptions = computed(() => [
  { label: t('logs.allLevels'), value: allOptionValue },
  { label: t('logs.levelDebug'), value: 'debug' },
  { label: t('logs.levelInfo'), value: 'info' },
  { label: t('logs.levelWarn'), value: 'warn' },
  { label: t('logs.levelError'), value: 'error' },
])

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

const errorLogColumns = computed(() => [
  { accessorKey: 'name', header: t('logs.col.file') },
  { accessorKey: 'modified', header: t('logs.col.modified') },
  { accessorKey: 'size', header: t('logs.col.size') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])

const requestLogColumns = computed(() => [
  { accessorKey: 'timestamp', header: t('logs.col.request') },
  { accessorKey: 'file_name', header: t('logs.col.file') },
  { accessorKey: 'model', header: t('logs.providerModel') },
  { accessorKey: 'home_ip', header: t('logs.col.home') },
  { accessorKey: 'available', header: t('logs.col.availability') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const applicationColumns = computed(() => [
  { accessorKey: 'timestamp', header: t('logs.col.time') },
  { accessorKey: 'level', header: t('logs.level') },
  { accessorKey: 'line', header: t('logs.col.logLine') },
  { accessorKey: 'source', header: t('logs.col.homeClient') },
  { accessorKey: 'request_id', header: t('logs.requestId') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])

const loading = computed(() => {
  if (activeView.value === 'events') return eventsLoading.value
  if (activeView.value === 'request-logs') return requestLogsLoading.value
  if (activeView.value === 'error-logs') return errorLogsLoading.value
  return applicationLoading.value
})

const events = computed(() => Array.isArray(eventsResponse.value?.items) ? eventsResponse.value.items : [])
const eventsTotal = computed(() => Number(eventsResponse.value?.total) || 0)
const requestLogs = computed(() => Array.isArray(requestLogsResponse.value?.items) ? requestLogsResponse.value.items : [])
const requestLogsTotal = computed(() => Number(requestLogsResponse.value?.total) || 0)
const applicationLogs = computed(() => Array.isArray(applicationResponse.value?.logs) ? applicationResponse.value.logs : [])
const applicationTotal = computed(() => Number(applicationResponse.value?.total) || 0)
const applicationSearchUnsupported = computed(() => Boolean(applicationResponse.value) && appliedApplicationFilters.value.search.trim() !== '' && applicationResponse.value.search !== appliedApplicationFilters.value.search.trim())
const errorLogs = computed(() => Array.isArray(errorLogsResponse.value?.files) ? errorLogsResponse.value.files : [])
const filteredErrorLogs = computed(() => {
  const query = errorLogSearch.value.trim().toLowerCase()
  return query ? errorLogs.value.filter(item => String(item.name || '').toLowerCase().includes(query)) : errorLogs.value
})
const pagedErrorLogs = computed(() => filteredErrorLogs.value.slice((errorLogsPage.value - 1) * errorLogPageSize.value, errorLogsPage.value * errorLogPageSize.value))
const hasEventError = computed(() => {
  const error = selectedEvent.value?.event?.error
  return Boolean(error?.message || error?.reason || error?.body_preview)
})

const activeDescription = computed(() => {
  if (activeView.value === 'events') return t('logs.desc.events')
  if (activeView.value === 'request-logs') return t('logs.desc.requestLogs')
  if (activeView.value === 'error-logs') return t('logs.desc.errorLogs')
  return t('logs.desc.application')
})

const buildRequestParams = () => {
  const source = appliedRequestFilters.value
  const params = new URLSearchParams()
  if (source.from) params.set('from', source.from)
  if (source.to) params.set('to', source.to)
  if (timezone) params.set('timezone', timezone)
  if (source.provider.trim()) params.set('provider', source.provider.trim())
  if (source.model.trim()) params.set('model', source.model.trim())
  if (source.status) params.set('status', source.status)
  if (source.search.trim()) params.set('search', source.search.trim())
  return params
}

const loadEvents = async () => {
  eventsLoading.value = true
  try {
    const params = buildRequestParams()
    params.set('limit', String(pageSize.value))
    params.set('offset', String((eventsPage.value - 1) * pageSize.value))
    params.set('sort', eventSort.value)
    eventsResponse.value = await fetchAPI(`/request-events?${params.toString()}`)
  } finally {
    eventsLoading.value = false
  }
}

const loadRequestLogs = async () => {
  requestLogsLoading.value = true
  try {
    const params = buildRequestParams()
    params.set('limit', String(pageSize.value))
    params.set('offset', String((requestLogsPage.value - 1) * pageSize.value))
    requestLogsResponse.value = await fetchAPI(`/request-logs?${params.toString()}`)
  } finally {
    requestLogsLoading.value = false
  }
}

const loadErrorLogs = async () => {
  errorLogsLoading.value = true
  try {
    errorLogsResponse.value = await fetchAPI('/observability/logs/errors')
    const pages = Math.max(1, Math.ceil(filteredErrorLogs.value.length / errorLogPageSize.value))
    if (errorLogsPage.value > pages) errorLogsPage.value = pages
  } finally {
    errorLogsLoading.value = false
  }
}

const buildApplicationParams = () => {
  const source = appliedApplicationFilters.value
  const params = new URLSearchParams()
  if (source.search.trim()) params.set('search', source.search.trim())
  if (source.after) params.set('after', new Date(source.after).toISOString())
  if (source.before) params.set('before', new Date(source.before).toISOString())
  if (source.level) params.set('level', source.level)
  if (source.home_ip.trim()) params.set('home_ip', source.home_ip.trim())
  if (source.client_ip.trim()) params.set('client_ip', source.client_ip.trim())
  if (source.request_id.trim()) params.set('request_id', source.request_id.trim())
  return params
}
const setApplicationError = error => {
  applicationCursorExpired.value = error?.statusCode === 409 && error?.data?.error === 'log_cursor_expired'
  applicationError.value = applicationCursorExpired.value
    ? t('logs.cursorExpired')
    : tailSearchUnsupportedError(error) ? t('logs.tailSearchUnsupported') : apiErrorMessage(error, t('logs.loadApplicationFailed'))
}
// useApplicationLogTail reports missing search support with a fixed English message; show it translated.
const tailSearchUnsupportedError = error => error instanceof Error && !error.data && String(error.message).startsWith('This Home version did not confirm server-side search support.')
const changeApplicationMode = async mode => {
  applicationMode.value = mode
  await restartApplicationLogs()
}
const pollApplicationTail = async () => {
  if (applicationCursorExpired.value || applicationSearchUnsupported.value || applicationLoading.value || clearingLogs.value || selectedApplicationLog.value || clearConfirmOpen.value) return
  applicationError.value = ''
  await tail.poll()
}
const loadOlderApplicationTail = async () => {
  if (applicationCursorExpired.value || applicationSearchUnsupported.value || clearingLogs.value) return
  applicationError.value = ''
  await tail.loadOlder()
}
const loadApplicationLogs = async (page = applicationPage.value) => {
  cancelApplicationLoad()
  if (clearingLogs.value || applicationCursorExpired.value) return
  const generation = applicationGeneration
  const controller = new AbortController()
  applicationController = controller
  applicationLoading.value = true
  applicationError.value = ''
  try {
    const params = buildApplicationParams()
    params.set('limit', String(applicationPageSize.value))
    params.set('offset', String((page - 1) * applicationPageSize.value))
    if (applicationAnchorId.value) params.set('anchor_id', String(applicationAnchorId.value))
    const response = await fetchAPI(`/observability/logs?${params.toString()}`, { signal: controller.signal })
    if (generation !== applicationGeneration || controller.signal.aborted) return
    // The ingestion ceiling can be outside this page and must come from the server.
    const anchor = response?.anchor_id
    if (anchor !== undefined && Number.isSafeInteger(Number(anchor)) && Number(anchor) > 0) {
      applicationAnchorId.value = anchor
    }
    applicationResponse.value = response
    applicationPage.value = page
    if (applicationMode.value === 'tail') tail.seed(response)
  } catch (error) {
    if (generation !== applicationGeneration || controller.signal.aborted) return
    setApplicationError(error)
  } finally {
    if (generation === applicationGeneration) {
      applicationLoading.value = false
      applicationController = null
    }
  }
}

const restartApplicationLogs = async () => {
  resetApplicationPagination()
  await loadApplicationLogs()
}

const refreshActive = async () => {
  const generation = ++refreshGeneration
  errorMessage.value = ''
  try {
    if (activeView.value === 'events') await loadEvents()
    else if (activeView.value === 'request-logs') await loadRequestLogs()
    else if (activeView.value === 'error-logs') await loadErrorLogs()
    else await restartApplicationLogs()
  } catch (error) {
    if (generation === refreshGeneration) errorMessage.value = apiErrorMessage(error, t('logs.loadFailed'))
  }
}

const switchView = async (view) => {
  if (activeView.value === view) return
  if (activeView.value === 'application') cancelApplicationLoad()
  activeView.value = view
  await refreshActive()
}

const applyFilters = async () => {
  const range = activeView.value === 'application'
    ? [applicationFilters.value.after, applicationFilters.value.before, 'datetime-local']
    : [requestFilters.value.from, requestFilters.value.to, 'date']
  const error = activeView.value === 'error-logs' ? '' : dateRangeError(...range)
  if (error) { errorMessage.value = dateRangeMessage(...range); return }
  if (activeView.value === 'application') {
    appliedApplicationFilters.value = { ...applicationFilters.value }
    resetApplicationPagination()
  } else if (activeView.value === 'error-logs') {
    errorLogsPage.value = 1
  } else {
    appliedRequestFilters.value = { ...requestFilters.value }
    eventsPage.value = 1
    requestLogsPage.value = 1
  }
  await refreshActive()
}

// dateRangeError returns English; pick the matching translated message from the same validation.
const dateRangeMessage = (from, to, type) => isDateInputValid(from, type) && isDateInputValid(to, type)
  ? t('logs.dateOrder')
  : type === 'date' ? t('logs.dateInvalid') : t('logs.dateTimeInvalid')

const resetFilters = async () => {
  if (activeView.value === 'application') {
    applicationFilters.value = defaultApplicationFilters()
    appliedApplicationFilters.value = defaultApplicationFilters()
    resetApplicationPagination()
  } else if (activeView.value === 'error-logs') {
    errorLogSearch.value = ''
    errorLogsPage.value = 1
  } else {
    requestFilters.value = defaultRequestFilters()
    appliedRequestFilters.value = defaultRequestFilters()
    eventSort.value = 'timestamp_desc'
    eventsPage.value = 1
    requestLogsPage.value = 1
  }
  await refreshActive()
}

const changeEventsPage = async (delta) => {
  const next = eventsPage.value + delta
  const pages = Math.max(1, Math.ceil(eventsTotal.value / pageSize.value))
  if (next < 1 || next > pages) return
  eventsPage.value = next
  await refreshActive()
}

const changeRequestLogsPage = async (delta) => {
  const next = requestLogsPage.value + delta
  const pages = Math.max(1, Math.ceil(requestLogsTotal.value / pageSize.value))
  if (next < 1 || next > pages) return
  requestLogsPage.value = next
  await refreshActive()
}

const changeApplicationPage = async (delta) => {
  if (applicationLoading.value || clearingLogs.value || applicationCursorExpired.value || !applicationAnchorId.value) return
  const next = applicationPage.value + delta
  const pages = Math.max(1, Math.ceil(applicationTotal.value / applicationPageSize.value))
  if (next < 1 || next > pages) return
  await loadApplicationLogs(next)
}

const changeErrorLogsPage = (delta) => {
  const next = errorLogsPage.value + delta
  const pages = Math.max(1, Math.ceil(filteredErrorLogs.value.length / errorLogPageSize.value))
  if (next < 1 || next > pages) return
  errorLogsPage.value = next
}

const resetPages = async () => {
  eventsPage.value = 1
  requestLogsPage.value = 1
  resetApplicationPagination()
  errorLogsPage.value = 1
  await refreshActive()
}

const closeApplicationDetail = (open) => {
  if (!open) selectedApplicationLog.value = null
}

const validErrorLogName = name => /^error-[^/\\]+\.log$/.test(String(name || ''))

const openEventDetail = async (event) => {
  if (!event?.id) return
  eventDetailOpen.value = true
  eventDetailLoading.value = true
  selectedEvent.value = null
  errorMessage.value = ''
  try {
    selectedEvent.value = await fetchAPI(`/request-events/${encodeURIComponent(event.id)}?include_payload=true&include_logs=true&include_related=true`)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('logs.loadEventFailed'))
    eventDetailOpen.value = false
  } finally {
    eventDetailLoading.value = false
  }
}

const downloadRequestLog = async (downloadUrl, requestId) => {
  if (!downloadUrl) return
  downloadingId.value = requestId || downloadUrl
  errorMessage.value = ''
  try {
    const blob = await fetchAPI(downloadUrl, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${requestId || 'request'}.log`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('logs.downloadRequestFailed'))
  } finally {
    downloadingId.value = ''
  }
}

const downloadErrorLog = async (name) => {
  if (!validErrorLogName(name)) {
    errorMessage.value = t('logs.invalidErrorLogName')
    return
  }
  downloadingId.value = name
  errorMessage.value = ''
  try {
    const blob = await fetchAPI(`/observability/logs/errors/${encodeURIComponent(name)}`, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('logs.downloadErrorFailed'))
  } finally {
    downloadingId.value = ''
  }
}

const clearApplicationLogs = async () => {
  clearingLogs.value = true
  cancelApplicationLoad()
  errorMessage.value = ''
  try {
    await fetchAPI('/observability/logs', { method: 'DELETE' })
    clearConfirmOpen.value = false
    resetApplicationPagination()
    clearingLogs.value = false
    if (activeView.value === 'application') await loadApplicationLogs()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('logs.clearFailed'))
  } finally {
    clearingLogs.value = false
  }
}

const rowValue = (row) => row?.original || row
const formatNumber = (value) => new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
const formatDateTime = (value) => value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const formatMilliseconds = (value) => value === null || value === undefined ? '—' : `${formatNumber(value)} ms`
const formatHost = (host, port) => host ? `${host}${port ? `:${port}` : ''}` : '—'
const formatAmount = (amount, currency) => amount === null || amount === undefined ? '—' : `${new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 4 }).format(Number(amount))} ${currency || t('logs.credits')}`
const formatBoolean = (value) => value === null || value === undefined ? '—' : value ? t('common.yes') : t('common.no')
const formatBytes = (value) => {
  if (value === null || value === undefined) return t('logs.sizeUnavailable')
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return t('logs.sizeUnavailable')
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
const levelColor = (level) => {
  switch (String(level || '').toLowerCase()) {
    case 'error': return 'error'
    case 'warn':
    case 'warning': return 'warning'
    case 'info': return 'primary'
    default: return 'neutral'
  }
}
const apiErrorMessage = (error, fallback) => error?.data?.message || error?.data?.error || error?.message || fallback

watch(errorLogSearch, () => { errorLogsPage.value = 1 })
watch(liveRefresh, enabled => {
  if (liveRefreshTimer) clearInterval(liveRefreshTimer)
  liveRefreshTimer = enabled ? setInterval(() => {
    if (loading.value || clearingLogs.value) return
    if (activeView.value === 'application') {
      if (applicationMode.value === 'tail') { void pollApplicationTail(); return }
      if (applicationPage.value > 1 || applicationCursorExpired.value) return
    }
    void refreshActive()
  }, 15_000) : null
})
watch(token, () => {
  refreshGeneration += 1
  resetApplicationPagination()
  if (activeView.value === 'application') void loadApplicationLogs()
}, { flush: 'sync' })
useDataSync('admin:logs:sync', refreshActive)
onMounted(refreshActive)
onBeforeUnmount(() => {
  refreshGeneration += 1
  cancelApplicationLoad()
  if (liveRefreshTimer) clearInterval(liveRefreshTimer)
})
</script>

<script>
export default {
  components: {
    EmptyState: {
      props: { icon: String, message: String },
      template: `
        <div class="flex flex-col items-center justify-center py-12">
          <UIcon :name="icon" class="mb-3 size-8 text-[var(--ui-text-muted)]" />
          <span class="text-sm text-[var(--ui-text-muted)]">{{ message }}</span>
        </div>
      `,
    },
    DetailItem: {
      props: {
        label: String,
        value: [String, Number],
        mono: Boolean,
      },
      template: `
        <div class="min-w-0">
          <dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ label }}</dt>
          <dd class="mt-1 break-words text-sm" :class="mono ? 'font-mono text-xs' : ''">{{ value === null || value === undefined || value === '' ? '—' : value }}</dd>
        </div>
      `,
    },
    TablePager: {
      props: {
        page: Number,
        total: Number,
        pageSize: Number,
        loading: Boolean,
        disabled: Boolean,
      },
      emits: ['previous', 'next'],
      setup() {
        const { t, intlLocale } = useAdminI18n()
        return { t, intlLocale }
      },
      computed: {
        pages() { return Math.max(1, Math.ceil((this.total || 0) / (this.pageSize || 1))) },
        start() { return this.total === 0 ? 0 : ((this.page - 1) * this.pageSize) + 1 },
        end() { return Math.min(this.page * this.pageSize, this.total || 0) },
      },
      methods: {
        formatted(value) { return new Intl.NumberFormat(this.intlLocale).format(Number(value) || 0) },
      },
      template: `
        <div class="flex flex-col gap-3 border-t border-[var(--ui-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('common.showing', { from: start, to: end, total: formatted(total) }) }}</p>
          <div class="flex items-center gap-2">
            <AppButton size="sm" color="neutral" variant="outline" :disabled="page <= 1 || loading || disabled" @click="$emit('previous')">{{ t('common.previous') }}</AppButton>
            <span class="min-w-20 text-center text-sm">{{ t('common.pageOf', { page, total: pages }) }}</span>
            <AppButton size="sm" color="neutral" variant="outline" :disabled="page >= pages || loading || disabled" @click="$emit('next')">{{ t('common.next') }}</AppButton>
          </div>
        </div>
      `,
    },
  },
}
</script>

<style scoped>
/* Runtime logs filter bar: one label-free row like Billing; date range shares one control. */
.log-filters { padding: 0.625rem 0.75rem; }
.log-filters__range {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding-inline: 0.25rem;
  border: 1px solid var(--ui-border-accented);
  border-radius: var(--admin-control-radius);
  background: var(--admin-control-bg);
  color: var(--ui-text-dimmed);
  font-size: 0.75rem;
}
.log-filters__range:focus-within { border-color: var(--ui-primary); }
.log-filters__range :deep(input) { min-height: calc(var(--admin-control-height) - 2px) !important; }
</style>
