<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '~/components/AppCard.vue'
import AppEmptyState from '~/components/AppEmptyState.vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import type { AnalyticsDay, AnalyticsMetrics } from '~/composables/analytics/types'

const props = defineProps<{ daily: AnalyticsDay[]; timezone: string }>()
const { t, intlLocale } = usePortalI18n()
const numberFormat = computed(() => new Intl.NumberFormat(intlLocale.value))
const amountFormat = computed(() => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 8 }))
// Axis labels have about 50 units of room; keep them to four significant digits.
const axisFormat = computed(() => new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumSignificantDigits: 4 }))
// Daily buckets are calendar dates in the response timezone, not instants to shift.
const dateFormat = computed(() => new Intl.DateTimeFormat(intlLocale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' }))
const days = computed(() => [...props.daily].sort((a, b) => a.date.localeCompare(b.date)))
const formatNumber = (value: number) => numberFormat.value.format(value)
const formatAmount = (value: number) => amountFormat.value.format(value)
function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  return Number.isNaN(date.getTime()) ? value : dateFormat.value.format(date)
}
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
  { accessorKey: 'date', header: t('analytics.date', { timezone: props.timezone }) },
  ...metricColumns.value.map(column => ({ ...column, meta: { class: { th: 'text-right', td: 'text-right tabular-nums whitespace-nowrap' } } })),
])
const tableData = computed(() => days.value.map(day => ({
  date: day.date,
  ...Object.fromEntries(metricColumns.value.map(column => [
    column.accessorKey,
    column.accessorKey.endsWith('_amount')
      ? formatAmount(day[column.accessorKey as keyof AnalyticsMetrics])
      : formatNumber(day[column.accessorKey as keyof AnalyticsMetrics]),
  ])),
})))
const panels = computed(() => [
  { title: t('analytics.requestTrend'), icon: 'i-tabler-arrows-exchange', amount: false, series: [{ key: 'requests' as const, label: t('analytics.requests'), secondary: false }] },
  { title: t('analytics.costTrend'), icon: 'i-tabler-coins', amount: true, series: [
    { key: 'billed_amount' as const, label: t('analytics.billed'), secondary: false },
    { key: 'base_amount' as const, label: t('analytics.base'), secondary: true },
  ] },
].map(panel => ({
  ...panel,
  max: Math.max(0, ...days.value.flatMap(day => panel.series.map(series => day[series.key]))),
  // Headline total of the primary series for the whole range.
  total: days.value.reduce((sum, day) => sum + (Number(day[panel.series[0]!.key]) || 0), 0),
})))
const x = (index: number) => days.value.length === 1 ? 330 : 60 + index * 540 / (days.value.length - 1)
const y = (value: number, max: number) => 180 - (max > 0 ? Math.max(0, value) / max : 0) * 150
function points(key: keyof AnalyticsMetrics, max: number) {
  return days.value.map((day, index) => `${x(index)},${y(day[key], max)}`).join(' ')
}
const ticks = computed(() => [...new Set([0, Math.floor((days.value.length - 1) / 2), days.value.length - 1])].filter(index => index >= 0))
function details(day: AnalyticsDay) {
  return [day.date, ...metricColumns.value.map(column => `${column.header}: ${column.accessorKey.endsWith('_amount') ? formatAmount(day[column.accessorKey as keyof AnalyticsMetrics]) : formatNumber(day[column.accessorKey as keyof AnalyticsMetrics])}`)].join('\n')
}
</script>

<template>
  <AppCard v-if="!daily.length">
    <template #header>
      <h2 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-activity" class="size-4 text-muted-foreground" aria-hidden="true" />{{ t('analytics.trend.title') }}</h2>
    </template>
    <AppEmptyState icon="i-tabler-activity" :text="t('analytics.empty')" />
  </AppCard>
  <div v-else class="flex min-w-0 flex-col gap-4">
    <div class="grid min-w-0 gap-4 xl:grid-cols-2">
      <AppCard v-for="panel in panels" :key="panel.title" class="min-w-0" :ui="{ body: 'p-3 sm:p-4' }">
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div class="min-w-0">
              <h2 class="flex items-center gap-2 text-sm font-semibold"><AppIcon :name="panel.icon" class="size-4 text-muted-foreground" aria-hidden="true" />{{ panel.title }}</h2>
              <p class="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[var(--ui-text-highlighted)]">{{ panel.amount ? formatAmount(panel.total) : formatNumber(panel.total) }}</p>
              <p class="text-xs tabular-nums text-muted-foreground">{{ t('analytics.days', { days: daily.length }) }}</p>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
              <span v-for="series in panel.series" :key="series.key" class="flex items-center gap-2">
                <svg width="20" height="8" aria-hidden="true" class="text-primary">
                  <line x1="0" y1="4" x2="20" y2="4" stroke="currentColor" stroke-width="2" :stroke-dasharray="series.secondary ? '4 3' : undefined" />
                </svg>
                {{ series.label }}
              </span>
            </div>
          </div>
        </template>
          <svg viewBox="0 0 640 220" role="img" :aria-label="`${panel.title} (${timezone})`" class="w-full text-primary">
            <title>{{ panel.title }} ({{ timezone }})</title>
            <g v-for="fraction in [0, 0.5, 1]" :key="fraction">
              <line x1="60" x2="600" :y1="y(panel.max * fraction, panel.max)" :y2="y(panel.max * fraction, panel.max)" class="stroke-border" />
              <text x="52" :y="y(panel.max * fraction, panel.max) + 4" text-anchor="end" class="fill-muted-foreground text-[10px]">{{ panel.amount ? axisFormat.format(panel.max * fraction) : axisFormat.format(Math.round(panel.max * fraction)) }}</text>
            </g>
            <g v-for="series in panel.series" :key="series.key">
              <polyline :points="points(series.key, panel.max)" fill="none" stroke="currentColor" stroke-width="2" :stroke-dasharray="series.secondary ? '6 4' : undefined" />
              <circle v-for="(day, index) in days" :key="day.date" :cx="x(index)" :cy="y(day[series.key], panel.max)" :r="days.length > 31 ? 2.5 : 4" :fill="series.secondary ? 'var(--background)' : 'currentColor'" stroke="currentColor" stroke-width="2">
                <title>{{ details(day) }}</title>
              </circle>
            </g>
            <text v-for="index in ticks" :key="index" :x="x(index)" y="207" text-anchor="middle" class="fill-muted-foreground text-[11px]">{{ formatDate(days[index]!.date) }}</text>
          </svg>
      </AppCard>
    </div>
    <AppCard class="min-w-0" :ui="{ body: 'p-3 sm:p-4' }">
      <details class="min-w-0">
        <summary class="analytics-disclosure"><AppIcon name="i-tabler-list" class="size-4 text-muted-foreground" aria-hidden="true" />{{ t('analytics.trend.title') }} · {{ t('analytics.showTable') }}<AppIcon name="i-tabler-chevron-down" class="analytics-disclosure-chevron ml-auto size-4 text-muted-foreground" aria-hidden="true" /></summary>
        <PortalTable class="mt-3" :data="tableData" :columns="columns" :numbered="false" :aria-label="t('analytics.trend.title')" />
      </details>
    </AppCard>
  </div>
</template>

<style scoped>
.analytics-disclosure {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem;
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
