<script setup lang="ts">
import { useUsagePage } from '~/composables/usage/useUsagePage'
import { rowValue } from '~/composables/usage/format'

const { t, credentials, overview, presentation, format } = useUsagePage()
const { canAttribute, credentialPage, credentialLimit, credentialMetric, credentialDirection, credentialTotal, credentialError, credentialPages, credentialUsage, credentialsLoading, loadCredentialUsage } = credentials
const { totals } = overview
const { credentialColumns, rankingMetricOptions } = presentation
const { formatNumber, formatCompactNumber, formatPercent, formatAmount, formatDateTime } = format
</script>

<template>
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
      <AppTable :columns="credentialColumns" :data="credentialUsage" :loading="credentialsLoading" :number-offset="(credentialPage - 1) * credentialLimit" class="min-w-[980px]">
        <template #credential-cell="{ row }"><div class="min-w-48"><p class="truncate text-sm font-medium">{{ rowValue(row).label || rowValue(row).id || t('usage.unknownCredential') }}</p><p class="truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).id }}</p></div></template>
        <template #provider-cell="{ row }"><span class="text-sm">{{ rowValue(row).metadata?.provider || t('common.unknown') }}</span></template>
        <template #status-cell="{ row }"><div><UBadge :color="Number(rowValue(row).error_rate) > 0.05 ? 'warning' : 'success'" variant="subtle">{{ t('usage.successRate', { rate: formatPercent(rowValue(row).success_rate) }) }}</UBadge><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('usage.failedCount', { count: formatNumber(rowValue(row).failed_count) }) }}</p></div></template>
        <template #requests-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).request_count) }}</span></template>
        <template #tokens-cell="{ row }"><span class="tabular-nums">{{ formatCompactNumber(rowValue(row).total_tokens) }}</span></template>
        <template #cost-cell="{ row }"><span class="whitespace-nowrap">{{ formatAmount(rowValue(row).total_amount, rowValue(row).currency || totals.currency) }}</span></template>
        <template #lastUsed-cell="{ row }"><span class="whitespace-nowrap text-xs text-[var(--ui-text-muted)]">{{ formatDateTime(rowValue(row).last_used_at) }}</span></template>
        <template #empty><div class="py-10 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.noCredUsage') }}</div></template>
      </AppTable>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ui-border)] px-4 py-3 text-xs text-[var(--ui-text-muted)]">
        <span class="tabular-nums">{{ t('usage.credPageSummary', { page: credentialPage, total: credentialPages, count: formatNumber(credentialTotal) }) }}</span>
        <div class="flex gap-2"><AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-chevron-left" :disabled="credentialsLoading || credentialPage <= 1 || !canAttribute" @click="credentialPage--">{{ t('common.previous') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" trailing-icon="i-tabler-chevron-right" :disabled="credentialsLoading || credentialPage >= credentialPages || !canAttribute" @click="credentialPage++">{{ t('common.next') }}</AppButton></div>
      </div>
    </AppCard>
  </section>
</template>
