<template>
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
</template>

<script setup lang="ts">
import DetailItem from '~/components/admin/general/DetailItem.vue'
import { useLogsPage } from '~/composables/logs/useLogsPage'

const {
  t, formatNumber, formatDateTime, formatMilliseconds, formatAmount, formatBoolean, eventDetailOpen, eventDetailLoading,
  selectedEvent, hasEventError, downloadingId, downloadRequestLog,
} = useLogsPage()
</script>
