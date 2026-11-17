<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '~/components/AppCard.vue'
import AppEmptyState from '~/components/AppEmptyState.vue'
import PortalProgress from '~/components/app/general/PortalProgress.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import type { AnalyticsMetrics, AnalyticsRow } from '~/composables/analytics/types'

const props = defineProps<{ title: string; rows: AnalyticsRow[] }>()
const { t, intlLocale } = usePortalI18n()
const numberFormat = computed(() => new Intl.NumberFormat(intlLocale.value))
const amountFormat = computed(() => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 8 }))
const formatNumber = (value: number) => numberFormat.value.format(value)
const formatAmount = (value: number) => amountFormat.value.format(value)
const tokenSeries = computed(() => [
  { key: 'input_tokens' as const, label: t('analytics.input') },
  { key: 'output_tokens' as const, label: t('analytics.output') },
  { key: 'cache_tokens' as const, label: t('analytics.cache') },
])
// A shared token scale compares counters without summing overlapping cache usage.
const tokenMax = computed(() => Math.max(0, ...props.rows.flatMap(row => tokenSeries.value.map(series => row[series.key]))))
const billedMax = computed(() => Math.max(0, ...props.rows.map(row => row.billed_amount)))
const percent = (value: number, max: number) => max > 0 ? Math.max(0, value) / max * 100 : 0
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
const tableData = computed(() => props.rows.map(row => ({
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
  <AppCard>
    <template #header>
      <h2 class="text-sm font-semibold">{{ title }}</h2>
      <p class="mt-1 text-xs text-muted-foreground">{{ t('analytics.unitNote') }}</p>
    </template>
    <AppEmptyState v-if="!rows.length" :text="t('analytics.empty')" />
    <div v-else class="flex min-w-0 flex-col gap-5">
      <ul class="m-0 grid min-w-0 list-none gap-5 p-0 lg:grid-cols-2" :aria-label="title">
        <li v-for="row in rows" :key="row.id" class="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 class="min-w-0 break-all text-sm font-medium" :title="row.name || row.id">{{ row.name || row.id }}</h3>
            <span class="text-xs tabular-nums text-muted-foreground">{{ t('analytics.requests') }}: {{ formatNumber(row.requests) }}</span>
          </div>
          <div v-for="series in tokenSeries" :key="series.key" class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between gap-3 text-xs">
              <span class="text-muted-foreground">{{ series.label }}</span>
              <span class="tabular-nums">{{ formatNumber(row[series.key]) }}</span>
            </div>
            <PortalProgress
              :model-value="percent(row[series.key], tokenMax)"
              :aria-label="`${row.name || row.id} · ${series.label}`"
              :aria-valuetext="formatNumber(row[series.key])"
              :title="`${series.label}: ${formatNumber(row[series.key])}`"
              class="h-2"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between gap-3 text-xs">
              <span class="text-muted-foreground">{{ t('analytics.billed') }}</span>
              <span class="tabular-nums">{{ formatAmount(row.billed_amount) }}</span>
            </div>
            <PortalProgress
              :model-value="percent(row.billed_amount, billedMax)"
              :aria-label="`${row.name || row.id} · ${t('analytics.billed')}`"
              :aria-valuetext="formatAmount(row.billed_amount)"
              :title="`${t('analytics.billed')}: ${formatAmount(row.billed_amount)}`"
              class="h-2"
            />
          </div>
        </li>
      </ul>
      <PortalTable :data="tableData" :columns="columns" :numbered="false" :aria-label="title" />
    </div>
  </AppCard>
</template>
