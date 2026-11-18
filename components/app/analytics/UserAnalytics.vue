<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '~/components/AppCard.vue'
import AppButton from '~/components/AppButton.vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import { FieldGroup } from '~/components/ui/field'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import AnalyticsTrend from './AnalyticsTrend.vue'
import AnalyticsBreakdown from './AnalyticsBreakdown.vue'
import { useUserAnalytics } from '~/composables/analytics/useUserAnalytics'

const {
  t, filters, filterError, unsupported, result, pending, error, errorMessage, timezone,
  refresh, applyFilters, download, modelOptions, keyOptions, modelRows, keyRows,
} = useUserAnalytics()
const { intlLocale } = usePortalI18n()
const numberFormat = computed(() => new Intl.NumberFormat(intlLocale.value))
const compactFormat = computed(() => new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }))
const amountFormat = computed(() => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 8 }))
// Four headline figures; the remaining summary fields ride along as their details.
const summary = computed(() => {
  const totals = result.value?.summary
  if (!totals) return []
  return [
    { label: t('analytics.summary.billed'), value: amountFormat.value.format(totals.billed_amount), detail: t('analytics.baseDetail', { amount: amountFormat.value.format(totals.base_amount) }), icon: 'i-tabler-coins', featured: true },
    { label: t('analytics.summary.requests'), value: numberFormat.value.format(totals.requests), detail: t('analytics.unpricedDetail', { count: numberFormat.value.format(totals.unpriced_requests) }), icon: 'i-tabler-arrows-exchange', warn: totals.unpriced_requests > 0 },
    { label: t('analytics.summary.inputTokens'), value: compactFormat.value.format(totals.input_tokens), detail: t('analytics.cacheDetail', { count: compactFormat.value.format(totals.cache_tokens) }), icon: 'i-tabler-arrow-bar-to-right', title: numberFormat.value.format(totals.input_tokens) },
    { label: t('analytics.summary.outputTokens'), value: compactFormat.value.format(totals.output_tokens), detail: '', icon: 'i-tabler-arrow-bar-to-left', title: numberFormat.value.format(totals.output_tokens) },
  ]
})
const exports = computed(() => [
  { group: 'daily' as const, label: t('analytics.csvDaily') },
  { group: 'models' as const, label: t('analytics.csvModels') },
  { group: 'keys' as const, label: t('analytics.csvKeys') },
])
// Refreshes keep the previous result on screen; only the first load shows placeholders.
const initialLoading = computed(() => pending.value && !result.value)
</script>

<template>
  <div class="analytics-page flex min-w-0 flex-col gap-4 py-3">
    <PortalAlert v-if="unsupported" color="warning" :description="t('analytics.unsupported')" />
    <PortalAlert v-else-if="error" color="error" :title="t('analytics.loadFailed')" :description="errorMessage" />

    <AppCard :ui="{ body: 'flex flex-col gap-3 p-3 sm:p-4' }">
      <form @submit.prevent="applyFilters">
        <FieldGroup class="analytics-filters grid min-w-0 gap-3">
          <PortalField :label="t('analytics.from', { timezone })" required>
            <PortalInput v-model="filters.from" type="date" required :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <PortalField :label="t('analytics.to', { timezone })" required>
            <PortalInput v-model="filters.to" type="date" required :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <PortalField :label="t('analytics.model')">
            <PortalSelect v-model="filters.model" :items="modelOptions" :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <PortalField :label="t('analytics.key')">
            <PortalSelect v-model="filters.api_key_id" :items="keyOptions" :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <div class="analytics-filter-actions flex items-end gap-2">
            <AppButton type="submit" icon="i-tabler-filter" :loading="pending" :disabled="pending || unsupported" class="flex-1 sm:flex-none">{{ t('analytics.apply') }}</AppButton>
            <AppButton type="button" icon="i-tabler-refresh" color="neutral" variant="outline" :loading="pending" :disabled="unsupported" :aria-label="t('analytics.refresh')" :title="t('analytics.refresh')" @click="refresh" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <AppButton type="button" icon="i-tabler-download" color="neutral" variant="outline" :disabled="!result || pending" :aria-label="t('analytics.export')" :title="t('analytics.export')" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuItem v-for="item in exports" :key="item.group" @select="download(item.group)">
                    <AppIcon name="i-tabler-file-download" aria-hidden="true" />{{ item.label }}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </FieldGroup>
      </form>
      <PortalAlert v-if="filterError" color="error" :description="filterError" />
      <p class="flex items-start gap-1.5 text-xs text-muted-foreground"><AppIcon name="i-tabler-info-circle" class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{{ t('analytics.scopeNote') }}</p>
    </AppCard>

    <template v-if="initialLoading">
      <div class="analytics-summary grid gap-3" :aria-label="t('analytics.loading')" role="status">
        <PortalSkeleton v-for="index in 4" :key="index" class="h-24 w-full rounded-lg" />
      </div>
      <PortalSkeleton class="h-72 w-full rounded-lg" />
    </template>
    <div v-else-if="result" class="flex min-w-0 flex-col gap-4 transition-opacity motion-reduce:transition-none" :class="{ 'opacity-60': pending }" :aria-busy="pending">
      <section :aria-label="t('analytics.title')" class="flex min-w-0 flex-col gap-2">
        <p class="text-xs text-muted-foreground">
          <time :datetime="result.from">{{ result.from.slice(0, 10) }}</time>
          → <time :datetime="result.to">{{ result.to.slice(0, 10) }}</time> · {{ result.timezone }}
        </p>
        <dl class="analytics-summary grid gap-3">
          <div v-for="metric in summary" :key="metric.label" class="analytics-metric" :class="{ 'analytics-metric--featured': metric.featured }">
            <dt class="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <span class="truncate">{{ metric.label }}</span>
              <AppIcon :name="metric.icon" class="analytics-metric-icon size-4 shrink-0" aria-hidden="true" />
            </dt>
            <dd class="analytics-metric-value mt-2 truncate font-semibold tabular-nums" :title="metric.title || metric.value">{{ metric.value }}</dd>
            <dd v-if="metric.detail" class="mt-1 truncate text-xs tabular-nums" :class="metric.warn ? 'text-[var(--ui-warning)]' : 'text-muted-foreground'">{{ metric.detail }}</dd>
          </div>
        </dl>
      </section>
      <AnalyticsTrend :daily="result.daily" :timezone="result.timezone" />
      <div class="grid min-w-0 gap-4 xl:grid-cols-2">
        <AnalyticsBreakdown :title="t('analytics.byModel')" icon="i-tabler-stack-2" :rows="modelRows" />
        <AnalyticsBreakdown :title="t('analytics.byKey')" icon="i-tabler-key" :rows="keyRows" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-filters { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.analytics-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 640px) {
  .analytics-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analytics-filter-actions { grid-column: 1 / -1; justify-content: flex-end; }
}
@media (min-width: 1024px) {
  .analytics-summary { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (min-width: 1280px) {
  .analytics-filters { grid-template-columns: repeat(4, minmax(0, 1fr)) auto; }
  .analytics-filter-actions { grid-column: auto; }
}
.analytics-metric {
  min-width: 0;
  padding: 0.875rem 1rem;
  border: 1px solid var(--user-panel-border, var(--ui-border));
  border-radius: var(--user-panel-radius, 0.5rem);
  background: var(--user-panel-bg, var(--ui-bg));
}
.analytics-metric--featured { border-color: color-mix(in oklch, var(--ui-primary) 30%, var(--ui-border)); }
.analytics-metric-icon { color: var(--ui-text-muted); }
.analytics-metric--featured .analytics-metric-icon { color: var(--ui-primary); }
.analytics-metric-value { font-size: 1.5rem; line-height: 2rem; letter-spacing: -0.015em; color: var(--ui-text-highlighted); }
.analytics-metric--featured .analytics-metric-value { color: var(--ui-primary); }
@media (max-width: 639px) {
  .analytics-metric { padding: 0.75rem; }
  .analytics-metric-value { font-size: 1.25rem; line-height: 1.75rem; }
}
</style>
