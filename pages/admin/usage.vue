<template>
  <div class="space-y-4">
    <AppPanelTabs :model-value="activeView" :items="usageTabs" :label="t('usage.tabsLabel')" @update:model-value="setView" />

    <template v-if="activeView === 'requests'">
      <AdminUsageLegacyRecords v-if="legacyRecords" />
      <AdminRequestRecords v-else-if="capabilitiesReady" />
      <p v-else role="status" class="text-sm text-[var(--ui-text-muted)]">{{ t('usage.checkingCapabilities') }}</p>
    </template>

    <template v-else>
    <div
      v-if="errorMessage"
      class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
    >
      {{ errorMessage }}
    </div>

    <UAlert v-if="!supports('usage_overview')" color="warning" variant="subtle" :title="t('usage.overviewUnavailable')" />
    <form class="admin-toolbar" :aria-label="t('usage.filtersLabel')" @submit.prevent="applyFilters">
      <div class="flex flex-wrap items-end gap-2">
        <UFormField :label="t('usage.timeRange')" class="w-full sm:w-44">
          <USelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-full" @update:model-value="selectRange" />
        </UFormField>
        <template v-if="rangePreset === 'custom'">
          <UFormField :label="t('usage.startDate')" class="w-full sm:w-40"><AppDateInput v-model="filters.from" type="date" :max="filters.to" class="w-full" /></UFormField>
          <UFormField :label="t('usage.endDate')" class="w-full sm:w-40"><AppDateInput v-model="filters.to" type="date" :min="filters.from" class="w-full" /></UFormField>
        </template>
        <UFormField :label="t('common.provider')" class="w-full sm:w-48">
          <UInputMenu v-model="filters.provider" :items="providerSuggestions" create-item @create="filters.provider = $event.trim()" :placeholder="t('usage.allProviders')" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.model')" class="w-full sm:w-56">
          <UInputMenu v-model="filters.model" :items="modelSuggestions" create-item @create="filters.model = $event.trim()" :placeholder="t('usage.allModels')" class="w-full" />
        </UFormField>
        <AppButton type="button" color="neutral" :variant="showAdvancedFilters ? 'soft' : 'ghost'" icon="i-tabler-dots-vertical" :aria-label="showAdvancedFilters ? t('usage.hideAdvanced') : t('usage.showAdvanced')" :title="showAdvancedFilters ? t('usage.hideAdvanced') : t('usage.advancedFilters')" :aria-expanded="showAdvancedFilters" @click="showAdvancedFilters = !showAdvancedFilters" />
        <AppButton type="submit" color="primary" icon="i-tabler-filter" :loading="loading">{{ t('common.apply') }}</AppButton>
        <AppButton type="button" color="neutral" variant="ghost" @click="resetFilters">{{ t('common.reset') }}</AppButton>
        <div class="ml-auto flex items-center gap-2 self-center">
          <label class="inline-flex items-center gap-2 text-xs text-[var(--ui-text-muted)]"><USwitch v-model="autoRefresh" size="sm" :aria-label="t('usage.autoRefreshLabel')" /><span role="status" :title="t('usage.attributionPauses')">{{ refreshStatusText }}</span></label>
          <AppButton color="neutral" variant="outline" icon="i-tabler-refresh" :loading="loading" :aria-label="t('usage.refreshOverview')" @click="refreshAll()" />
        </div>
      </div>
      <div v-if="showAdvancedFilters" class="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--ui-border)] pt-3">
        <UFormField :label="t('usage.credentialType')" class="w-full sm:w-44"><USelect :model-value="filters.credentialType || allOptionValue" @update:model-value="filters.credentialType = $event === allOptionValue ? '' : $event" :items="credentialTypeOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
        <UFormField :label="t('usage.homeNode')" class="w-full sm:w-44"><UInput v-model="filters.homeIp" :placeholder="t('usage.homeIp')" class="w-full" /></UFormField>
        <UFormField :label="t('usage.endpoint')" class="w-full sm:w-56"><UInput v-model="filters.endpoint" :placeholder="t('usage.endpoint')" class="w-full" /></UFormField>
      </div>
      <p class="mt-2 truncate text-xs text-[var(--ui-text-muted)]" :title="overviewScopeLabel"><UIcon name="i-tabler-filter" class="mr-1 inline size-3.5 align-[-2px]" />{{ overviewScopeLabel }}</p>
    </form>

    <section class="meter" :aria-label="t('usage.summaryLabel')" :aria-busy="loading && !overview">
      <div class="meter__lead">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">{{ t('usage.tokensProcessed') }}</p>
        <p class="meter__total">{{ chartMetrics[0].value }}</p>
        <div v-if="tokenRibbon.length" class="meter__ribbon" role="img" :aria-label="tokenRibbon.map(part => `${part.label} ${part.percent}%`).join(', ')">
          <span v-for="part in tokenRibbon" :key="part.label" :style="{ flexGrow: part.value, background: part.color }" :title="`${part.label} · ${part.percent}%`" />
        </div>
        <div v-if="tokenRibbon.length" class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--ui-text-muted)]">
          <span v-for="part in tokenRibbon" :key="part.label" class="inline-flex items-center gap-1"><span class="size-2 rounded-sm" :style="{ background: part.color }" />{{ part.label }} {{ part.percent }}%</span>
        </div>
        <p v-else class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ chartMetrics[0].detail }}</p>
      </div>
      <AdminStatGrid class="meter__side" :label="t('usage.detailsLabel')" :items="chartMetrics.slice(1)" :columns="3" :loading="loading && !overview" />
    </section>

    <div class="grid items-start gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
      <AppCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div><h2 class="text-sm font-semibold">{{ t('usage.tokenTrendTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.tokenTrendDesc') }}</p></div>
              <div class="flex items-center gap-2">
                <div class="inline-flex rounded-lg bg-[var(--ui-bg-muted)] p-1" role="group" :aria-label="t('usage.chartOverlay')">
                  <AppButton v-for="option in chartOverlayOptions" :key="option.value" size="sm" color="neutral" :variant="chartOverlay === option.value ? 'solid' : 'ghost'" @click="chartOverlay = option.value">{{ option.label }}</AppButton>
                </div>
                <UBadge v-if="overviewTokenBreakdown" :color="tokenQualityColor(overviewTokenBreakdown.quality)" variant="subtle">{{ qualityLabel(overviewTokenBreakdown.quality) }}</UBadge>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="series in tokenSeriesLegend" :key="series.label" class="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-bg-muted)] px-2.5 py-1 text-xs font-medium">
                <span class="size-2.5 rounded-full" :style="{ backgroundColor: series.color }" />{{ series.label }}
              </span>
            </div>
          </div>
        </template>
        <div class="p-4"><AdminUsageTokenChart :points="trend" :overlay="chartOverlayValues" :overlay-type="chartOverlay" /></div>
      </AppCard>
      <AppCard :ui="{ body: 'p-0' }">
        <template #header><div><h2 class="text-sm font-semibold">{{ t('usage.costBreakdown') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.costTotal', { amount: formatAmount(totals.total_amount, totals.currency), rate: formatAmount(totals.blended_cost_per_1m_tokens, totals.currency) }) }}</p></div></template>
        <div v-if="costBreakdown.length" class="divide-y divide-[var(--ui-border-muted)] px-4"><div v-for="item in costBreakdown" :key="item.category" class="py-3"><div class="flex items-center justify-between gap-3 text-sm"><div><p class="font-medium">{{ item.category }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.costItemTokens', { tokens: formatCompactNumber(item.tokens), basis: item.billing_basis || t('usage.unknownBasis') }) }}</p></div><span class="whitespace-nowrap font-medium">{{ formatAmount(item.amount, totals.currency) }}</span></div><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]"><div class="h-full rounded-full bg-[var(--ui-primary)]" :style="{ width: `${Math.max(0, Math.min(100, Number(item.percentage) * 100))}%` }" /></div></div></div><p v-else class="p-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.noCostBreakdown') }}</p>
      </AppCard>
    </div>

    <div class="grid gap-3 lg:grid-cols-3">
      <AppCard v-for="ranking in rankingCards" :key="ranking.key" :ui="{ body: 'p-0' }"><template #header><div class="flex items-center justify-between"><h2 class="text-sm font-semibold">{{ ranking.label }}</h2><AppButton size="xs" color="neutral" variant="ghost" @click="openRanking(ranking.key)">{{ t('usage.viewAll') }}</AppButton></div></template><ol v-if="ranking.items.length" class="divide-y divide-[var(--ui-border-muted)]"><li v-for="(item, index) in ranking.items" :key="item.id || item.label" class="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-4 py-3"><span class="text-xs font-semibold text-[var(--ui-text-muted)]">{{ index + 1 }}</span><div class="min-w-0"><p class="truncate text-sm font-medium">{{ item.label || item.id || t('common.unknown') }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.requestCount', { count: formatNumber(item.request_count) }) }}</p></div><span class="whitespace-nowrap text-sm font-semibold">{{ formatAmount(item.total_amount, item.currency || totals.currency) }}</span><div class="col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]" aria-hidden="true"><div class="h-full rounded-full bg-[var(--ui-primary)]" :style="{ width: `${rankingShare(item, ranking.items)}%` }" /></div></li></ol><p v-else class="px-4 py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.noRanking') }}</p></AppCard>
    </div>

    <section>
      <AppCard :ui="{ body: 'p-0' }">
      <div class="flex items-center justify-between border-b border-[var(--ui-border)] px-4 py-3"><div><h2 class="text-sm font-semibold">{{ t('usage.credUsageTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.credUsageDesc') }}</p></div><AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-refresh" :aria-label="t('usage.refreshCredUsage')" :loading="credentialsLoading" :disabled="!canAttribute" @click="loadCredentialUsage" /></div>
      <UAlert v-if="!canAttribute" color="warning" variant="subtle" :title="t('usage.credAttributionUnavailable')" />
      <UAlert v-if="credentialError" color="error" variant="subtle" :description="credentialError" />
      <div class="flex flex-wrap items-end gap-3 border-b border-[var(--ui-border)] bg-[var(--admin-control-bg)] px-4 py-2.5">
        <UFormField :label="t('usage.sortMetric')"><USelect v-model="credentialMetric" :items="rankingMetricOptions" value-key="value" label-key="label" class="w-44" /></UFormField>
        <UFormField :label="t('usage.direction')"><USelect v-model="credentialDirection" :items="[{ label: t('usage.descending'), value: 'desc' }, { label: t('usage.ascending'), value: 'asc' }]" value-key="value" label-key="label" class="w-36" /></UFormField>
        <UFormField :label="t('usage.rows')"><USelect v-model="credentialLimit" :items="[10, 20, 50, 100]" class="w-24" /></UFormField>
      </div>
      <AppTable :columns="credentialColumns" :data="credentialUsage" :loading="credentialsLoading" :number-offset="(credentialPage - 1) * credentialLimit" class="min-w-[980px]"><template #credential-cell="{ row }"><div class="min-w-48"><p class="truncate text-sm font-medium">{{ rowValue(row).label || rowValue(row).id || t('usage.unknownCredential') }}</p><p class="truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).id }}</p></div></template><template #provider-cell="{ row }"><span class="text-sm">{{ rowValue(row).metadata?.provider || t('common.unknown') }}</span></template><template #status-cell="{ row }"><div><UBadge :color="Number(rowValue(row).error_rate) > 0.05 ? 'warning' : 'success'" variant="subtle">{{ t('usage.successRate', { rate: formatPercent(rowValue(row).success_rate) }) }}</UBadge><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('usage.failedCount', { count: formatNumber(rowValue(row).failed_count) }) }}</p></div></template><template #requests-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).request_count) }}</span></template><template #tokens-cell="{ row }"><span class="tabular-nums">{{ formatCompactNumber(rowValue(row).total_tokens) }}</span></template><template #cost-cell="{ row }"><span class="whitespace-nowrap">{{ formatAmount(rowValue(row).total_amount, rowValue(row).currency || totals.currency) }}</span></template><template #lastUsed-cell="{ row }"><span class="whitespace-nowrap text-xs text-[var(--ui-text-muted)]">{{ formatDateTime(rowValue(row).last_used_at) }}</span></template><template #empty><div class="py-10 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.noCredUsage') }}</div></template></AppTable>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ui-border)] px-4 py-3 text-xs text-[var(--ui-text-muted)]">
        <span class="tabular-nums">{{ t('usage.credPageSummary', { page: credentialPage, total: credentialPages, count: formatNumber(credentialTotal) }) }}</span>
        <div class="flex gap-2"><AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-chevron-left" :disabled="credentialsLoading || credentialPage <= 1 || !canAttribute" @click="credentialPage--">{{ t('common.previous') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" trailing-icon="i-tabler-chevron-right" :disabled="credentialsLoading || credentialPage >= credentialPages || !canAttribute" @click="credentialPage++">{{ t('common.next') }}</AppButton></div>
      </div>
      </AppCard>
    </section>
    <AdminUsageInsights :common-query="insightQuery" />

    <AppModal v-model:open="rankingOpen" :title="t('usage.rankingTitle')" :description="t('usage.rankingDesc')" :ui="{ content: 'sm:max-w-6xl' }"><template #body><div class="space-y-4"><div class="grid gap-3 sm:grid-cols-3"><UFormField :label="t('usage.groupBy')"><USelect v-model="rankingGroup" :items="rankingGroupOptions" value-key="value" label-key="label" class="w-full" @update:model-value="loadRanking" /></UFormField><UFormField :label="t('usage.metric')"><USelect v-model="rankingMetric" :items="rankingMetricOptions" value-key="value" label-key="label" class="w-full" @update:model-value="loadRanking" /></UFormField><UFormField :label="t('usage.rows')"><USelect v-model="rankingLimit" :items="rankingLimitOptions" value-key="value" label-key="label" class="w-full" @update:model-value="loadRanking" /></UFormField></div><AppCard :ui="{ body: 'p-0' }"><AppTable :columns="rankingColumns" :data="rankingItems" :loading="rankingLoading" class="min-w-[980px]"><template #rank-cell="{ row }"><span class="app-table-number">{{ rankingItems.indexOf(rowValue(row)) + 1 }}</span></template><template #name-cell="{ row }"><div class="min-w-48"><p class="truncate font-medium">{{ rowValue(row).label || rowValue(row).id || t('common.unknown') }}</p><p class="truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).id }}</p></div></template><template #amount-cell="{ row }">{{ formatAmount(rowValue(row).total_amount, rowValue(row).currency || totals.currency) }}</template><template #requests-cell="{ row }">{{ formatNumber(rowValue(row).request_count) }}</template><template #tokens-cell="{ row }">{{ formatCompactNumber(rowValue(row).total_tokens) }}</template><template #success-cell="{ row }">{{ formatPercent(rowValue(row).success_rate) }}</template><template #cache-cell="{ row }">{{ formatPercent(rowValue(row).cache_rate) }}</template><template #latency-cell="{ row }">{{ formatMilliseconds(rowValue(row).avg_latency_ms) }}</template></AppTable></AppCard></div></template></AppModal>

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
  </div>
</template>

<script setup>
import { dateRangeError } from '~/composables/dateRange'
import { readTelemetryChoice, saveTelemetryChoice, usageRanges } from '~/composables/requestTelemetry'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
const { t, intlLocale } = useAdminI18n()
const { fetchAPI, token } = useApi()
const { supports, capabilities, refreshCapabilities } = useCapabilities()
const capabilitiesReady = ref(false)
const legacyRecords = computed(() => (capabilities.value.request_events ?? capabilities.value.requestEvents) === false)
const attributionUnavailable = ref(false)
const canAttribute = computed(() => supports('usage_aggregates') && !attributionUnavailable.value)
const credentialPage = ref(1), credentialLimit = ref(20), credentialMetric = ref('request_count'), credentialDirection = ref('desc')
const credentialTotal = ref(0), credentialError = ref('')
const credentialPages = computed(() => Math.max(1, Math.ceil(credentialTotal.value / credentialLimit.value)))
let overviewVersion = 0, credentialVersion = 0, rankingVersion = 0
let requestController = new AbortController()
let disposed = false
const route = useRoute()
const router = useRouter()
const allOptionValue = '__all__'
const activeView = computed(() => route.query.view === 'requests' ? 'requests' : 'overview')
const usageTabs = computed(() => [{ label: t('usage.tab.overview'), value: 'overview' }, { label: t('usage.tab.requests'), value: 'requests' }])
const setView = async (view) => { await router.replace({ query: { ...route.query, view } }) }

const pageSize = ref(50)
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'


const dateInputValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const datesForRange = (preset) => {
  const to = new Date()
  const from = new Date(to)
  if (preset === 'all') return { from: '', to: '' }
  if (preset === 'yesterday') {
    from.setDate(to.getDate() - 1)
    return { from: dateInputValue(from), to: dateInputValue(from) }
  }
  if (preset === 'month') from.setDate(1)
  if (preset === '7d') from.setDate(to.getDate() - 6)
  if (preset === '30d') from.setDate(to.getDate() - 29)
  return { from: dateInputValue(from), to: dateInputValue(to) }
}

const rangeOptions = computed(() => [
  { label: t('common.today'), value: 'today' },
  { label: t('usage.range.yesterday'), value: 'yesterday' },
  { label: t('common.last7d'), value: '7d' },
  { label: t('common.last30d'), value: '30d' },
  { label: t('usage.range.month'), value: 'month' },
  { label: t('usage.range.all'), value: 'all' },
  { label: t('common.custom'), value: 'custom' },
])
const rangePreset = ref(readTelemetryChoice('cpahome:usage:range', '7d', usageRanges))
watch(rangePreset, value => saveTelemetryChoice('cpahome:usage:range', value, usageRanges))
const showAdvancedFilters = ref(false)
const credentialTypeOptions = computed(() => [{ label: t('usage.allCredentialTypes'), value: allOptionValue }, { label: 'OAuth', value: 'oauth' }, { label: t('usage.providerApiKey'), value: 'provider_api_key' }, { label: t('usage.fileAuth'), value: 'file_auth' }, { label: 'Vertex', value: 'vertex' }, { label: t('common.unknown'), value: 'unknown' }])
const defaultFilters = () => ({
  ...datesForRange('7d'),
  provider: '',
  model: '',
  status: '',
  statusCode: '',
  requestId: '',
  user: '',
  clientKey: '',
  credentialId: '',
  credentialType: '',
  endpoint: '',
  homeIp: '',
  cpaNode: '',
  search: '',
})

const filters = ref({ ...defaultFilters(), ...datesForRange(rangePreset.value) })
const appliedFilters = ref({ ...filters.value })
const sort = ref('timestamp_desc')
const page = ref(1)
const overview = useWorkspaceState('admin:usage:overview', () => (null))
const recordsResponse = useWorkspaceState('admin:usage:recordsResponse', () => (null))
const overviewLoading = useWorkspaceState('admin:usage:overviewLoading', () => (false))
const recordsLoading = useWorkspaceState('admin:usage:recordsLoading', () => (false))
const errorMessage = useWorkspaceState('admin:usage:errorMessage', () => (''))
const detailOpen = ref(false)
const detailLoading = useWorkspaceState('admin:usage:detailLoading', () => (false))
const selectedDetail = useWorkspaceState('admin:usage:selectedDetail', () => (null))
const downloadingLog = useWorkspaceState('admin:usage:downloadingLog', () => (false))
const chartOverlay = ref('requests')
const chartOverlayOptions = computed(() => [{ label: t('common.requests'), value: 'requests' }, { label: t('usage.spend'), value: 'spend' }])
const rankingOpen = ref(false), rankingLoading = useWorkspaceState('admin:usage:rankingLoading', () => (false)), rankingItems = useWorkspaceState('admin:usage:rankingItems', () => ([])), rankingGroup = ref('user'), rankingMetric = ref('total_amount'), rankingLimit = ref(10)
const credentialUsage = useWorkspaceState('admin:usage:credentialUsage', () => ([])), credentialsLoading = useWorkspaceState('admin:usage:credentialsLoading', () => (false))

const statusOptions = [
  { label: 'All statuses', value: allOptionValue },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
]

const pageSizeOptions = [25, 50, 100, 200].map(value => ({ label: `${value} / page`, value }))

const sortOptions = [
  { label: 'Newest first', value: 'timestamp_desc' },
  { label: 'Oldest first', value: 'timestamp_asc' },
  { label: 'Most tokens', value: 'tokens_desc' },
  { label: 'Highest latency', value: 'latency_desc' },
  { label: 'Highest cost', value: 'cost_desc' },
  { label: 'Failures first', value: 'failed_first' },
]

const recordColumns = [
  { accessorKey: 'timestamp', header: 'Request' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'model', header: 'Provider / Model' },
  { accessorKey: 'tokens', header: 'Tokens' },
  { accessorKey: 'performance', header: 'Performance' },
  { accessorKey: 'client', header: 'Client / Node' },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
]

const loading = computed(() => overviewLoading.value || recordsLoading.value)
const totals = computed(() => overview.value?.totals || {})
const live = computed(() => overview.value?.live || {})
const trend = computed(() => Array.isArray(overview.value?.trend) ? overview.value.trend : [])
const overviewRange = computed(() => overview.value?.range || {})
const overviewTokenBreakdown = computed(() => totals.value?.token_breakdown || null)
const overviewTokenBuckets = computed(() => overviewTokenBreakdown.value ? [
  { label: t('usage.tok.inputUncached'), value: overviewTokenBreakdown.value.input?.uncached_tokens },
  { label: t('usage.tok.cacheRead'), value: overviewTokenBreakdown.value.input?.cache_read_tokens },
  { label: t('usage.tok.cacheWrite'), value: overviewTokenBreakdown.value.input?.cache_write_tokens },
  { label: t('usage.tok.outputNonReasoning'), value: overviewTokenBreakdown.value.output?.non_reasoning_tokens },
  { label: t('usage.tok.outputReasoning'), value: overviewTokenBreakdown.value.output?.reasoning_tokens },
  { label: t('usage.tok.unclassified'), value: overviewTokenBreakdown.value.unclassified_tokens }
] : [])
const costBreakdown = computed(() => Array.isArray(overview.value?.cost_breakdown) ? overview.value.cost_breakdown : [])
const top = computed(() => overview.value?.top || {})
const chartMetrics = computed(() => [
  { label: t('usage.totalTokens'), value: formatCompactNumber(totals.value.total_tokens), detail: t('usage.tokensInOut', { input: formatCompactNumber(totals.value.input_tokens), output: formatCompactNumber(totals.value.output_tokens) }), icon: 'i-tabler-database', tone: 'violet', points: trend.value.map(point => Number(point.total_tokens) || 0) },
  { label: t('usage.spend'), value: formatAmount(totals.value.total_amount, totals.value.currency), detail: t('usage.perMillion', { amount: formatAmount(totals.value.blended_cost_per_1m_tokens, totals.value.currency) }), icon: 'i-tabler-wallet', tone: 'emerald', points: trend.value.map(point => Number(point.total_amount) || 0) },
  { label: t('common.requests'), value: formatNumber(totals.value.request_count), detail: t('usage.requestsDetail', { ok: formatNumber(totals.value.success_count), failed: formatNumber(totals.value.failed_count), rate: formatPercent(totals.value.error_rate) }), icon: 'i-tabler-bolt', tone: 'blue', points: trend.value.map(point => Number(point.request_count) || 0) },
  { label: t('usage.liveThroughput'), value: t('usage.rpm', { value: formatDecimal(live.value.rpm) }), detail: t('usage.throughputDetail', { tpm: formatCompactNumber(live.value.tpm), latency: formatMilliseconds(live.value.p50_latency_ms) }), icon: 'i-tabler-activity-heartbeat', tone: 'amber' }
])
function rankingShare(item, items) {
  const max = Math.max(0, ...items.map(entry => Number(entry.total_amount) || 0))
  return max > 0 ? Math.max(3, Math.round(((Number(item.total_amount) || 0) / max) * 100)) : 0
}
// Ribbon of canonical token categories; colours follow the chart legend.
const tokenRibbon = computed(() => {
  const colors = ['#8b5cf6', '#3b82f6', '#d946ef', '#10b981', '#f59e0b', '#a1a1aa']
  const labels = [t('usage.tok.uncachedInput'), t('usage.tok.cacheRead'), t('usage.tok.cacheWrite'), t('usage.tok.regularOutput'), t('usage.tok.reasoning'), t('usage.tok.unclassified')]
  const values = overviewTokenBuckets.value.map(bucket => Number(bucket.value) || 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  if (!total) return []
  return values.map((value, index) => ({ label: labels[index], value, color: colors[index], percent: Math.round((value / total) * 100) })).filter(part => part.value > 0)
})
const tokenSeriesLegend = computed(() => [
  { label: t('usage.tok.uncachedInput'), color: '#8b5cf6' }, { label: t('usage.tok.cacheRead'), color: '#3b82f6' }, { label: t('usage.tok.cacheWrite'), color: '#d946ef' },
  { label: t('usage.tok.regularOutput'), color: '#10b981' }, { label: t('usage.tok.reasoning'), color: '#f59e0b' }, { label: t('usage.tok.unclassified'), color: '#a1a1aa' }
])
const rankingCards = computed(() => [
  { key: 'user', label: t('usage.userRanking'), items: Array.isArray(top.value.users) ? top.value.users.slice(0, 3) : [] },
  { key: 'model', label: t('usage.modelRanking'), items: Array.isArray(top.value.models) ? top.value.models.slice(0, 3) : [] },
  { key: 'client_key', label: t('usage.clientKeyRanking'), items: Array.isArray(top.value.client_keys) ? top.value.client_keys.slice(0, 3) : [] }
])
const chartOverlayValues = computed(() => chartOverlay.value === 'requests' ? trend.value.map(point => Number(point.request_count) || 0) : chartOverlay.value === 'spend' ? trend.value.map(point => Number(point.total_amount) || 0) : [])
const rankingGroupOptions = computed(() => [{ label: t('common.user'), value: 'user' }, { label: t('common.model'), value: 'model' }, { label: t('usage.clientKey'), value: 'client_key' }, { label: t('usage.execCredential'), value: 'credential' }, { label: t('common.provider'), value: 'provider' }, { label: t('usage.endpoint'), value: 'endpoint' }, { label: t('usage.homeNode'), value: 'home_ip' }, { label: t('usage.executor'), value: 'executor_type' }])
const rankingMetricOptions = computed(() => [{ label: t('usage.spend'), value: 'total_amount' }, { label: t('common.requests'), value: 'request_count' }, { label: t('usage.totalTokens'), value: 'total_tokens' }, { label: t('usage.failures'), value: 'failed_count' }, { label: t('usage.avgLatency'), value: 'avg_latency_ms' }, { label: t('usage.p95Latency'), value: 'p95_latency_ms' }])
const rankingLimitOptions = computed(() => [{ label: t('usage.top', { count: 10 }), value: 10 }, { label: t('usage.top', { count: 50 }), value: 50 }])
const rankingColumns = computed(() => [{ accessorKey: 'rank', header: t('usage.col.no'), meta: { class: { th: 'app-table-number-head', td: 'app-table-number-cell' } } }, { accessorKey: 'name', header: t('common.name') }, { accessorKey: 'amount', header: t('usage.spend') }, { accessorKey: 'requests', header: t('common.requests') }, { accessorKey: 'tokens', header: t('common.tokens') }, { accessorKey: 'success', header: t('common.success') }, { accessorKey: 'cache', header: t('usage.col.cacheRate') }, { accessorKey: 'latency', header: t('usage.col.avgLatency') }])
const credentialColumns = computed(() => [{ accessorKey: 'credential', header: t('usage.credential') }, { accessorKey: 'provider', header: t('common.provider') }, { accessorKey: 'status', header: t('common.status') }, { accessorKey: 'requests', header: t('common.requests') }, { accessorKey: 'tokens', header: t('common.tokens') }, { accessorKey: 'cost', header: t('usage.col.cost') }, { accessorKey: 'lastUsed', header: t('usage.col.lastUsed') }])
const records = computed(() => Array.isArray(recordsResponse.value?.items) ? recordsResponse.value.items : [])
const providerSuggestions = computed(() => [...new Set(records.value.map(item => item.provider).filter(Boolean))].sort())
const modelSuggestions = computed(() => [...new Set(records.value.map(item => item.model).filter(Boolean))].sort())
const recordsTotal = computed(() => Number(recordsResponse.value?.total) || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(recordsTotal.value / pageSize.value)))
const pageStart = computed(() => recordsTotal.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, recordsTotal.value))
const overviewScopeLabel = computed(() => {
  const source = appliedFilters.value
  const range = source.from || source.to ? `${source.from || t('common.last24h')} – ${source.to || t('usage.scope.now')}` : t('usage.scope.defaultRange')
  const extras = [
    source.provider && t('usage.scope.provider', { value: source.provider }),
    source.model && t('usage.scope.model', { value: source.model }),
    source.endpoint && t('usage.scope.endpoint', { value: source.endpoint }),
    source.homeIp && t('usage.scope.homeIp', { value: source.homeIp }),
    source.credentialType && t('usage.scope.credential', { value: source.credentialType }),
  ].filter(Boolean)
  return [range, ...extras].join(' · ')
})
const recordScopeLabel = computed(() => {
  const source = appliedFilters.value
  const extras = [
    source.status && `Status: ${source.status}`,
    source.statusCode && `HTTP: ${source.statusCode}`,
    source.requestId && `Request ID: ${source.requestId}`,
    source.user && `User: ${source.user}`,
    source.clientKey && 'Client key filtered',
    source.credentialId && `Credential ID: ${source.credentialId}`,
    source.cpaNode && `CPA node: ${source.cpaNode}`,
    source.search && `Search: ${source.search}`,
  ].filter(Boolean)
  return extras.length ? `Records-only: ${extras.join(' · ')}` : 'No records-only filters'
})


const buildCommonParams = (source) => {
  const params = new URLSearchParams()
  if (source.from) params.set('from', source.from)
  if (source.to) params.set('to', source.to)
  if (timezone) params.set('timezone', timezone)
  if (source.provider.trim()) params.set('provider', source.provider.trim())
  if (source.model.trim()) params.set('model', source.model.trim())
  if (source.endpoint.trim()) params.set('endpoint', source.endpoint.trim())
  if (source.homeIp.trim()) params.set('home_ip', source.homeIp.trim())
  if (source.credentialType.trim()) params.set('credential_type', source.credentialType.trim())
  return params
}

const buildRecordParams = (source) => {
  const params = buildCommonParams(source)
  for (const [field, value] of Object.entries({
    status: source.status, status_code: source.statusCode, request_id: source.requestId,
    user: source.user, client_key: source.clientKey, credential_id: source.credentialId,
    cpa_node: source.cpaNode, search: source.search,
  })) {
    if (String(value).trim()) params.set(field, String(value).trim())
  }
  params.set('sort', sort.value)
  return params
}

const insightQuery = computed(() => buildCommonParams(appliedFilters.value).toString())


const selectRange = (preset) => {
  if (preset !== 'custom') Object.assign(filters.value, datesForRange(preset))
}

const loadOverview = async () => {
  if (!supports('usage_overview')) return
  const version = ++overviewVersion
  overviewLoading.value = true
  try {
    const params = buildCommonParams(appliedFilters.value)
    params.set('interval', 'auto')
    const result = await fetchAPI(`/usage/overview?${params.toString()}`, { signal: requestController.signal })
    if (!disposed && version === overviewVersion) overview.value = result
  } finally {
    if (!disposed && version === overviewVersion) overviewLoading.value = false
  }
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const params = buildRecordParams(appliedFilters.value)
    params.set('limit', String(pageSize.value))
    params.set('offset', String((page.value - 1) * pageSize.value))
    recordsResponse.value = await fetchAPI(`/usage/records?${params.toString()}`)
  } finally {
    recordsLoading.value = false
  }
}

const loadRanking = async () => {
  if (!supports('usage_aggregates')) return
  const version = ++rankingVersion
  rankingLoading.value = true
  try { const response = await fetchAPI(`/usage/aggregates?${insightQuery.value}`, { query: { group_by: rankingGroup.value, metric: rankingMetric.value, limit: rankingLimit.value }, signal: requestController.signal }); if (!disposed && version === rankingVersion) rankingItems.value = response?.items || [] }
  catch (error) { if (!disposed && version === rankingVersion) errorMessage.value = apiErrorMessage(error, t('usage.err.ranking')) }
  finally { if (!disposed && version === rankingVersion) rankingLoading.value = false }
}
const openRanking = async (group) => { rankingGroup.value = group; rankingOpen.value = true; await loadRanking() }
const loadCredentialUsage = async () => {
  if (!canAttribute.value) return
  const version = ++credentialVersion
  credentialsLoading.value = true
  credentialError.value = ''
  try {
    const response = await fetchAPI(`/usage/aggregates?${insightQuery.value}`, { query: { group_by: 'credential', metric: credentialMetric.value, direction: credentialDirection.value, limit: credentialLimit.value, offset: (credentialPage.value - 1) * credentialLimit.value }, signal: requestController.signal })
    if (disposed || version !== credentialVersion) return
    credentialTotal.value = Number(response?.total) || 0
    if (credentialPage.value > credentialPages.value) { credentialPage.value = credentialPages.value; return }
    credentialUsage.value = response?.items || []
  } catch (error) {
    if (disposed || version !== credentialVersion) return
    if ([404, 405, 501].includes(error?.statusCode)) { attributionUnavailable.value = true; credentialUsage.value = [] }
    else credentialError.value = apiErrorMessage(error, t('usage.err.credUsage'))
  } finally { if (!disposed && version === credentialVersion) credentialsLoading.value = false }
}

const refreshAll = async (automatic = false) => {
  if (activeView.value !== 'overview' || disposed) return
  errorMessage.value = ''
  const version = overviewVersion + 1
  try {
    await Promise.all([loadOverview(), ...(!automatic || credentialPage.value === 1 ? [loadCredentialUsage()] : [])])
  } catch (error) {
    if (!disposed && version === overviewVersion) errorMessage.value = apiErrorMessage(error, t('usage.err.overview'))
  }
}
const appliedPreset = ref(rangePreset.value)
const refreshEligible = computed(() => capabilitiesReady.value && activeView.value === 'overview' && !detailOpen.value && !rankingOpen.value && !['yesterday', 'custom'].includes(appliedPreset.value) && !loading.value && !credentialsLoading.value)
const { enabled: autoRefresh, status: refreshStatus } = useUsageRefresh(refreshEligible, () => refreshAll(true))
// useUsageRefresh reports English status text; map it for display.
const refreshStatusText = computed(() => {
  const status = refreshStatus.value
  if (status === 'Automatic refresh off') return t('usage.refresh.off')
  if (status === 'Paused while offline') return t('usage.refresh.offline')
  if (status === 'Paused while hidden') return t('usage.refresh.hidden')
  if (status === 'Paused for this view, range, or open details') return t('usage.refresh.ineligible')
  const every = /^Refresh every (\d+)s$/.exec(status)
  return every ? t('usage.refresh.every', { seconds: every[1] }) : status
})

const changeRecordsView = async () => {
  page.value = 1
  await loadRecordsSafely()
}

const applyFilters = async () => {
  const error = dateRangeError(filters.value.from, filters.value.to)
  if (error) { errorMessage.value = dateErrorText(error); return }
  appliedFilters.value = { ...filters.value }
  appliedPreset.value = rangePreset.value
  credentialPage.value = 1
  page.value = 1
  await refreshAll()
}

const resetFilters = async () => {
  rangePreset.value = '7d'
  appliedPreset.value = '7d'
  credentialPage.value = 1
  filters.value = defaultFilters()
  appliedFilters.value = defaultFilters()
  sort.value = 'timestamp_desc'
  showAdvancedFilters.value = false
  page.value = 1
  await refreshAll()
}

const previousPage = async () => {
  if (page.value <= 1) return
  page.value -= 1
  await loadRecordsSafely()
}

const nextPage = async () => {
  if (page.value >= totalPages.value) return
  page.value += 1
  await loadRecordsSafely()
}

const loadRecordsSafely = async () => {
  errorMessage.value = ''
  try {
    await loadRecords()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('usage.err.records'))
  }
}

const openDetail = async (record) => {
  if (!record?.id) return
  detailOpen.value = true
  detailLoading.value = true
  selectedDetail.value = null
  errorMessage.value = ''
  try {
    selectedDetail.value = await fetchAPI(`/usage/records/${encodeURIComponent(record.id)}?include_payload=true&include_logs=true`)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('usage.err.detail'))
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

const downloadDetailLog = async () => {
  const log = selectedDetail.value?.related?.request_log
  if (!log?.download_url) return
  downloadingLog.value = true
  errorMessage.value = ''
  try {
    const blob = await fetchAPI(log.download_url, { responseType: 'blob' })
    const objectURL = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectURL
    anchor.download = `${log.request_id || selectedDetail.value?.record?.request_id || 'request'}.log`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectURL)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('usage.err.download'))
  } finally {
    downloadingLog.value = false
  }
}

const rowValue = (row) => row?.original || row

const formatNumber = (value) => new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
const formatCompactNumber = (value) => new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)
const formatDecimal = (value) => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2 }).format(Number(value) || 0)
const formatPercent = (value) => `${new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 1 }).format((Number(value) || 0) * 100)}%`
const formatMilliseconds = (value) => value === null || value === undefined ? '—' : `${formatNumber(value)} ms`
const formatTPS = value => value === null || value === undefined ? '—' : `${formatDecimal(value)} tok/s`
const qualityLabel = quality => quality === 'complete' ? t('usage.quality.complete') : quality === 'partial' ? t('usage.quality.partial') : quality ? quality : t('usage.quality.unknown')
const tokenQualityColor = quality => quality === 'complete' ? 'success' : quality === 'partial' ? 'warning' : 'neutral'
const activityColor = status => status === 'healthy' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : status === 'unavailable' ? 'bg-red-500' : 'bg-[var(--ui-bg-muted)]'
const credentialDetail = credential => credential ? [credential.credential_type, credential.provider, credential.source, credential.status, credential.api_key_preview].filter(Boolean).join(' · ') : t('common.unknown')
const balanceChange = billing => billing?.balance_before == null && billing?.balance_after == null ? '—' : `${formatAmount(billing.balance_before, billing.currency)} → ${formatAmount(billing.balance_after, billing.currency)}`
const formatDuration = (seconds) => {
  const value = Number(seconds) || 0
  if (value >= 3600) return `${formatDecimal(value / 3600)}h`
  if (value >= 60) return `${formatDecimal(value / 60)}m`
  return `${value}s`
}
const formatDateTime = (value) => value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const formatTrendTime = (value) => value ? new Intl.DateTimeFormat(intlLocale.value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—'
const formatRange = (from, to) => from && to ? `${formatDateTime(from)} – ${formatDateTime(to)}` : 'Selected range'
const formatAmount = (amount, currency) => amount === null || amount === undefined ? '—' : `${formatDecimal(amount)} ${currency || t('usage.credits')}`
const formatBoolean = (value) => value === null || value === undefined ? '—' : value ? t('common.yes') : t('common.no')
const formatHost = (host, port) => host ? `${host}${port ? `:${port}` : ''}` : '—'

// dateRangeError returns English; map its known messages for display.
const dateErrorText = message => message.startsWith('Enter a valid date and time') ? t('usage.dateTimeInvalid') : message.startsWith('Enter a valid date') ? t('usage.dateInvalid') : message.startsWith('Start must be') ? t('usage.rangeInverted') : message
const apiErrorMessage = (error, fallback) => error?.data?.message || error?.data?.error || error?.message || fallback

watch([credentialMetric, credentialDirection, credentialLimit], () => { if (credentialPage.value !== 1) credentialPage.value = 1; else if (activeView.value === 'overview') void loadCredentialUsage() })
watch(credentialPage, () => { if (activeView.value === 'overview') void loadCredentialUsage() })
watch(activeView, () => { if (capabilitiesReady.value) void refreshAll() })
watch(token, async () => {
  overviewVersion++; credentialVersion++; rankingVersion++
  requestController.abort(); requestController = new AbortController()
  attributionUnavailable.value = false; credentialTotal.value = 0; credentialError.value = ''
  overviewLoading.value = false; credentialsLoading.value = false; rankingLoading.value = false
  detailOpen.value = false; rankingOpen.value = false; capabilitiesReady.value = false
  await refreshCapabilities().catch(() => {})
  if (!disposed) { capabilitiesReady.value = true; void refreshAll() }
})
useDataSync('admin:usage:sync', () => refreshAll())
onMounted(async () => { await refreshCapabilities().catch(() => {}); if (!disposed) { capabilitiesReady.value = true; await refreshAll() } })
onScopeDispose(() => { disposed = true; overviewVersion++; credentialVersion++; rankingVersion++; requestController.abort() })
</script>

<style scoped>
/* Usage signature: token meter card with category ribbon, next to separate KPI cards. */
.meter { display: grid; gap: 0.75rem; }
@media (min-width: 64rem) { .meter { grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); align-items: stretch; } }
.meter__lead {
  padding: 1rem 1.125rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.875rem;
  background:
    radial-gradient(ellipse 90% 120% at 0% 0%, color-mix(in oklch, var(--page-accent) 14%, transparent), transparent 70%),
    var(--admin-panel-bg);
  box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
.meter__total { margin-top: 0.125rem; font-family: var(--admin-display-font); font-size: 1.75rem; line-height: 2.25rem; font-weight: 800; letter-spacing: -0.03em; color: var(--ui-text-highlighted); font-variant-numeric: tabular-nums; }
.meter__ribbon { display: flex; height: 0.5rem; gap: 2px; margin-top: 0.625rem; overflow: hidden; border-radius: 9999px; }
.meter__ribbon > span { flex-basis: 0; min-width: 3px; }
.meter__side { align-content: stretch; }
</style>
