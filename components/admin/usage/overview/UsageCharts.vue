<script setup lang="ts">
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminUsageTokenChart from '~/components/admin/usage/UsageTokenChart.vue'
import { useUsagePage } from '~/composables/usage/useUsagePage'
import { tokenQualityColor } from '~/composables/usage/format'

const { t, overview, presentation, format } = useUsagePage()
const { totals, trend, tokenBreakdown: overviewTokenBreakdown, costBreakdown } = overview
const { chartOverlay, chartOverlayOptions, chartOverlayValues, tokenSeriesLegend } = presentation
const { qualityLabel, formatAmount, formatCompactNumber } = format
</script>

<template>
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
              <PortalBadge v-if="overviewTokenBreakdown" :color="tokenQualityColor(overviewTokenBreakdown.quality)" variant="subtle">{{ qualityLabel(overviewTokenBreakdown.quality) }}</PortalBadge>
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
      <div v-if="costBreakdown.length" class="divide-y divide-[var(--ui-border-muted)] px-4">
        <div v-for="item in costBreakdown" :key="item.category" class="py-3">
          <div class="flex items-center justify-between gap-3 text-sm"><div><p class="font-medium">{{ item.category }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.costItemTokens', { tokens: formatCompactNumber(item.tokens), basis: item.billing_basis || t('usage.unknownBasis') }) }}</p></div><span class="whitespace-nowrap font-medium">{{ formatAmount(item.amount, totals.currency) }}</span></div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]"><div class="h-full rounded-full bg-[var(--ui-primary)]" :style="{ width: `${Math.max(0, Math.min(100, Number(item.percentage) * 100))}%` }" /></div>
        </div>
      </div>
      <p v-else class="p-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.noCostBreakdown') }}</p>
    </AppCard>
  </div>
</template>
