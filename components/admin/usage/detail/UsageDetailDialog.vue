<script setup lang="ts">
import { useUsagePage } from '~/composables/usage/useUsagePage'
import { formatHost, tokenQualityColor } from '~/composables/usage/format'

const { t, detail, format } = useUsagePage()
const { detailOpen, detailLoading, selectedDetail, downloadingLog, downloadDetailLog } = detail
const { formatDateTime, formatMilliseconds, formatTPS, formatNumber, formatAmount, credentialDetail, balanceChange, qualityLabel, formatBoolean } = format
</script>

<template>
  <AppModal v-model:open="detailOpen" :title="t('usage.detail.title')" :description="t('usage.detail.desc')">
    <template #body>
      <div v-if="detailLoading" class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.detail.loading') }}</div>
      <div v-else-if="selectedDetail" class="space-y-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem :label="t('usage.detail.requestId')" :value="selectedDetail.record?.request_id" mono />
          <DetailItem :label="t('usage.detail.upstreamRequestId')" :value="selectedDetail.record?.upstream_request_id" mono />
          <DetailItem :label="t('usage.detail.timestamp')" :value="formatDateTime(selectedDetail.record?.timestamp)" />
          <DetailItem :label="t('usage.detail.providerModel')" :value="`${selectedDetail.record?.provider || t('common.unknown')} / ${selectedDetail.record?.model || t('common.unknown')}`" />
          <DetailItem :label="t('usage.endpoint')" :value="selectedDetail.record?.endpoint" mono />
          <DetailItem :label="t('usage.detail.originalModel')" :value="selectedDetail.record?.original_model" />
          <DetailItem :label="t('usage.detail.eventSource')" :value="`${selectedDetail.record?.event_type || t('common.unknown')} / ${selectedDetail.record?.source || t('common.unknown')}`" />
          <DetailItem :label="t('usage.detail.tierReasoning')" :value="`${selectedDetail.record?.service_tier || t('common.default')} / ${selectedDetail.record?.reasoning_effort || t('common.default')}`" />
          <DetailItem :label="t('common.status')" :value="`${selectedDetail.record?.status || t('common.unknown')}${selectedDetail.record?.status_code ? ` (${selectedDetail.record.status_code})` : ''}`" />
          <DetailItem :label="t('usage.detail.latency')" :value="formatMilliseconds(selectedDetail.record?.performance?.latency_ms)" />
          <DetailItem :label="t('usage.detail.ttftThroughput')" :value="`${formatMilliseconds(selectedDetail.record?.performance?.ttft_ms)} / ${formatTPS(selectedDetail.record?.performance?.tps)}`" />
          <DetailItem :label="t('usage.totalTokens')" :value="formatNumber(selectedDetail.record?.tokens?.total_tokens)" />
          <DetailItem :label="t('usage.detail.charge')" :value="formatAmount(selectedDetail.record?.billing?.amount, selectedDetail.record?.billing?.currency)" />
          <DetailItem :label="t('common.user')" :value="selectedDetail.record?.client?.username || t('usage.detail.unattributed')" />
          <DetailItem :label="t('usage.clientKey')" :value="selectedDetail.record?.client?.api_key_label || selectedDetail.record?.client?.api_key_masked || t('usage.detail.unattributed')" />
          <DetailItem :label="t('usage.detail.clientIp')" :value="selectedDetail.record?.client?.client_ip" mono />
          <DetailItem :label="t('usage.detail.session')" :value="selectedDetail.record?.session_id" mono />
          <DetailItem :label="t('usage.detail.parentRoot')" :value="[selectedDetail.record?.parent_session_id, selectedDetail.record?.root_session_id].filter(Boolean).join(' / ')" mono />
          <DetailItem :label="t('usage.credential')" :value="selectedDetail.record?.credential?.label || selectedDetail.record?.credential?.credential_id || t('common.unknown')" />
          <DetailItem :label="t('usage.detail.credentialDetails')" :value="credentialDetail(selectedDetail.record?.credential)" />
          <DetailItem :label="t('usage.detail.home')" :value="formatHost(selectedDetail.record?.runtime?.home_ip, selectedDetail.record?.runtime?.home_port)" mono />
          <DetailItem :label="t('usage.cpaNode')" :value="selectedDetail.record?.runtime?.cpa_label || formatHost(selectedDetail.record?.runtime?.cpa_ip, selectedDetail.record?.runtime?.cpa_port)" mono />
        </div>

        <div v-if="selectedDetail.record?.token_breakdown" class="rounded-lg border border-[var(--ui-border)] p-4">
          <div class="flex items-center justify-between gap-3"><p class="text-sm font-semibold">{{ t('usage.detail.tokenAccounting') }}</p><UBadge :color="tokenQualityColor(selectedDetail.record.token_breakdown.quality)" variant="subtle">{{ qualityLabel(selectedDetail.record.token_breakdown.quality) }}</UBadge></div>
          <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailItem :label="t('usage.tok.inputUncached')" :value="formatNumber(selectedDetail.record.token_breakdown.input?.uncached_tokens)" />
            <DetailItem :label="t('usage.tok.cacheRead')" :value="formatNumber(selectedDetail.record.token_breakdown.input?.cache_read_tokens)" />
            <DetailItem :label="t('usage.tok.cacheWrite')" :value="formatNumber(selectedDetail.record.token_breakdown.input?.cache_write_tokens)" />
            <DetailItem :label="t('usage.tok.outputNonReasoning')" :value="formatNumber(selectedDetail.record.token_breakdown.output?.non_reasoning_tokens)" />
            <DetailItem :label="t('usage.tok.outputReasoning')" :value="formatNumber(selectedDetail.record.token_breakdown.output?.reasoning_tokens)" />
            <DetailItem :label="t('usage.tok.unclassified')" :value="formatNumber(selectedDetail.record.token_breakdown.unclassified_tokens)" />
            <DetailItem :label="t('usage.detail.schema')" :value="selectedDetail.record.token_breakdown.schema_version" />
            <DetailItem :label="t('usage.detail.canonicalTotal')" :value="formatNumber(selectedDetail.record.token_breakdown.total_tokens)" />
          </div>
        </div>

        <div v-if="selectedDetail.record?.billing" class="rounded-lg border border-[var(--ui-border)] p-4">
          <p class="mb-3 text-sm font-semibold">{{ t('usage.detail.billing') }}</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem :label="t('usage.detail.chargeId')" :value="selectedDetail.record.billing.charge_id" mono />
            <DetailItem :label="t('usage.detail.basis')" :value="selectedDetail.record.billing.billing_basis" />
            <DetailItem :label="t('usage.detail.priceRule')" :value="selectedDetail.record.billing.matched_price_rule" mono />
            <DetailItem :label="t('usage.detail.balanceChange')" :value="balanceChange(selectedDetail.record.billing)" />
          </div>
        </div>

        <div v-if="selectedDetail.record?.error" class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p class="text-sm font-semibold text-red-600 dark:text-red-400">{{ t('usage.detail.requestError') }}</p>
          <p class="mt-1 whitespace-pre-wrap text-sm">{{ selectedDetail.record.error.message || selectedDetail.record.error.body_preview || t('usage.detail.noErrorDetails') }}</p>
        </div>

        <div v-if="selectedDetail.payload_summary" class="rounded-lg border border-[var(--ui-border)] p-4">
          <p class="mb-3 text-sm font-semibold">{{ t('usage.detail.payload') }}</p>
          <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <DetailItem :label="t('usage.detail.method')" :value="selectedDetail.payload_summary.method" />
            <DetailItem :label="t('usage.detail.streaming')" :value="formatBoolean(selectedDetail.payload_summary.stream)" />
            <DetailItem :label="t('usage.detail.messages')" :value="formatNumber(selectedDetail.payload_summary.message_count)" />
            <DetailItem :label="t('usage.detail.tools')" :value="formatNumber(selectedDetail.payload_summary.tool_count)" />
          </div>
        </div>

        <div v-if="selectedDetail.log_excerpt?.length" class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-4">
          <p class="mb-3 text-sm font-semibold">{{ t('usage.detail.logExcerpt') }}</p>
          <pre class="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{{ selectedDetail.log_excerpt.join('\n') }}</pre>
        </div>
        <div v-if="selectedDetail.related?.request_log?.download_url" class="flex justify-end">
          <AppButton color="neutral" variant="outline" icon="i-tabler-download" :loading="downloadingLog" @click="downloadDetailLog">{{ t('usage.detail.downloadLog') }}</AppButton>
        </div>
      </div>
      <div v-else class="py-10 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.detail.unavailable') }}</div>
    </template>
  </AppModal>
</template>
