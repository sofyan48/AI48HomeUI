<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '~/components/AppCard.vue'
import AppEmptyState from '~/components/AppEmptyState.vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import type { AnalyticsMetrics, AnalyticsRow } from '~/composables/analytics/types'

const props = defineProps<{ title: string; icon?: string; rows: AnalyticsRow[] }>()
const { t, intlLocale } = usePortalI18n()
const numberFormat = computed(() => new Intl.NumberFormat(intlLocale.value))
const compactFormat = computed(() => new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }))
const amountFormat = computed(() => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 8 }))
const formatNumber = (value: number) => numberFormat.value.format(value)
const formatAmount = (value: number) => amountFormat.value.format(value)

// Ranked by billed amount, then requests, so the costliest entries lead the list.
const ranked = computed(() => [...props.rows].sort((a, b) => b.billed_amount - a.billed_amount || b.requests - a.requests))
const TOP_COUNT = 5
const top = computed(() => ranked.value.slice(0, TOP_COUNT))
const totalBilled = computed(() => props.rows.reduce((sum, row) => sum + Math.max(0, row.billed_amount), 0))
const totalRequests = computed(() => props.rows.reduce((sum, row) => sum + Math.max(0, row.requests), 0))
// Share of spend; falls back to share of requests when nothing in range was priced.
function share(row: AnalyticsRow) {
  if (totalBilled.value > 0) return Math.max(0, row.billed_amount) / totalBilled.value
  return totalRequests.value > 0 ? Math.max(0, row.requests) / totalRequests.value : 0
}
const percent = (value: number) => `${Math.round(value * 100)}%`

const metricColumns = computed(() => [
  { accessorKey: 'requests', header: t('analytics.requests') },
  { accessorKey: 'input_tokens', header: t('analytics.input') },
  { accessorKey: 'output_tokens', header: t('analytics.output') },
  { accessorKey: 'cache_tokens', header: t('analytics.cache') },
  { accessorKey: 'billed_amount', header: t('analytics.billed') },
  { accessorKey: 'base_amount', header: t('analytics.base') },
  { accessorKey: 'unpriced_requests', header: t('analytics.unpriced') },
])
const columns = computed(() => [
  { accessorKey: 'name', header: t('analytics.name'), meta: { class: { td: 'min-w-40 break-all' } } },
  ...metricColumns.value.map(column => ({ ...column, meta: { class: { th: 'text-right', td: 'text-right tabular-nums whitespace-nowrap' } } })),
])
const tableData = computed(() => ranked.value.map(row => ({
  name: row.name || row.id,
  ...Object.fromEntries(metricColumns.value.map(column => [
    column.accessorKey,
    column.accessorKey.endsWith('_amount')
      ? formatAmount(row[column.accessorKey as keyof AnalyticsMetrics])
      : formatNumber(row[column.accessorKey as keyof AnalyticsMetrics]),
  ])),
})))
</script>

<template>
  <AppCard class="min-w-0" :ui="{ body: 'flex min-w-0 flex-col gap-4' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="flex min-w-0 items-center gap-2 text-sm font-semibold"><AppIcon v-if="icon" :name="icon" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span class="truncate">{{ title }}</span></h2>
        <span v-if="rows.length" class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ t('analytics.entries', { count: formatNumber(rows.length) }) }}</span>
      </div>
    </template>
    <AppEmptyState v-if="!rows.length" :icon="icon" :text="t('analytics.empty')" />
    <template v-else>
      <ol class="m-0 flex list-none flex-col gap-3.5 p-0" :aria-label="title">
        <li v-for="row in top" :key="row.id" class="min-w-0">
          <div class="flex items-baseline justify-between gap-3">
            <p class="min-w-0 truncate font-mono text-sm text-[var(--ui-text-highlighted)]" :title="row.name || row.id">{{ row.name || row.id }}</p>
            <span class="shrink-0 text-sm font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ formatAmount(row.billed_amount) }}</span>
          </div>
          <div class="mt-1.5 flex items-center gap-3">
            <span class="analytics-share" role="img" :aria-label="t('analytics.share', { share: percent(share(row)) })"><span :style="{ width: `${Math.max(1.5, share(row) * 100)}%` }" /></span>
            <span class="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{{ percent(share(row)) }}</span>
          </div>
          <p class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
            <span>{{ t('analytics.requestCount', { count: formatNumber(row.requests) }) }}</span>
            <span :title="`${formatNumber(row.input_tokens)} / ${formatNumber(row.output_tokens)}`">{{ t('analytics.tokenSplit', { input: compactFormat.format(row.input_tokens), output: compactFormat.format(row.output_tokens) }) }}</span>
            <span v-if="row.unpriced_requests > 0" class="text-[var(--ui-warning)]">{{ t('analytics.unpricedDetail', { count: formatNumber(row.unpriced_requests) }) }}</span>
          </p>
        </li>
      </ol>
      <details class="min-w-0">
        <summary class="analytics-disclosure"><AppIcon name="i-tabler-list" class="size-4 text-muted-foreground" aria-hidden="true" />{{ rows.length > TOP_COUNT ? t('analytics.showAll', { count: formatNumber(rows.length) }) : t('analytics.showTable') }}<AppIcon name="i-tabler-chevron-down" class="analytics-disclosure-chevron ml-auto size-4 text-muted-foreground" aria-hidden="true" /></summary>
        <PortalTable class="mt-3" :data="tableData" :columns="columns" :numbered="false" :aria-label="title" />
      </details>
    </template>
  </AppCard>
</template>

<style scoped>
.analytics-share {
  height: 0.375rem;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--ui-text-muted) 16%, var(--ui-bg));
}
.analytics-share > span { display: block; height: 100%; border-radius: inherit; background: var(--ui-primary); }
.analytics-disclosure {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
  cursor: pointer;
  list-style: none;
  font-size: 0.8125rem;
  font-weight: 500;
}
.analytics-disclosure::-webkit-details-marker { display: none; }
.analytics-disclosure:hover { background: var(--ui-hover); }
.analytics-disclosure:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
.analytics-disclosure-chevron { transition: transform 150ms ease; }
details[open] .analytics-disclosure-chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .analytics-disclosure-chevron { transition: none; } }
</style>
