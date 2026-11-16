<template>
  <section :aria-label="t('dashboard.operatingMetrics')" class="grid grid-cols-1 content-start gap-3 sm:grid-cols-2">
    <NuxtLink
      v-for="card in cards"
      :key="card.label"
      :to="card.to"
      class="dashboard-metric"
      :class="[`dashboard-tone--${card.tone}`, { 'dashboard-metric--static': !card.to }]"
    >
      <div class="flex items-center gap-2.5">
        <span class="dashboard-metric-icon" aria-hidden="true"><UIcon :name="card.icon" class="size-[18px]" /></span>
        <h2 class="metric-label min-w-0 flex-1 truncate">{{ card.label }}</h2>
        <UIcon v-if="card.to" name="i-tabler-arrow-up-right" class="metric-link-icon" aria-hidden="true" />
      </div>
      <p class="metric-value">{{ card.value }}</p>
      <p class="metric-detail">{{ card.detail }}</p>
      <div class="mt-auto pt-2">
        <AdminUsageSparkline v-if="card.points && card.points.length > 1" :values="card.points" :label="t('dashboard.trendAria', { label: card.label })" class="metric-spark" />
        <div v-else-if="card.ratio != null" class="metric-bar" role="img" :aria-label="`${card.label}: ${Math.round(card.ratio * 100)}%`">
          <span :style="{ width: `${Math.min(100, Math.max(0, card.ratio * 100))}%` }" />
        </div>
      </div>
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
import AdminUsageSparkline from '~/components/admin/general/UsageSparkline.vue'
import { computed } from 'vue'
import { useDashboard } from '~/composables/dashboard/useDashboard'
import { useDashboardFormat } from '~/composables/dashboard/format'

type MetricCard = { label: string; value: string; detail: string; to?: string; icon: string; tone: string; points?: number[]; ratio?: number | null }

const { t } = useAdminI18n()
const { usage, clientKeys } = useDashboard()
const { formatNumber, formatCompact, formatPercent } = useDashboardFormat()

const cards = computed<MetricCard[]>(() => {
  const totals = usage.value?.totals
  const has = !!usage.value
  const trend: any[] = Array.isArray(usage.value?.trend) ? usage.value.trend : []
  const totalTokens = totals?.token_breakdown?.total_tokens
  const link = (to: string) => has ? to : undefined
  return [
    {
      label: t('dashboard.card.totalTokens'),
      value: has && totalTokens != null ? formatCompact(totalTokens) : '--',
      detail: has && totalTokens != null
        ? t('dashboard.card.acrossModels', { count: formatNumber(totals?.active_model_count || 0) })
        : t('dashboard.card.noUsage'),
      to: link('/admin/usage'),
      icon: 'i-tabler-coins',
      tone: 'violet',
      points: trend.map(point => Number(point.token_breakdown?.total_tokens ?? point.total_tokens) || 0)
    },
    {
      label: t('dashboard.card.totalRequests'),
      value: has ? formatNumber(totals?.request_count) : '--',
      detail: has ? t('dashboard.card.failedRequests', { count: formatNumber(totals?.failed_count) }) : t('dashboard.card.noRequests'),
      to: link('/admin/usage'),
      icon: 'i-tabler-arrows-exchange',
      tone: 'blue',
      points: trend.map(point => Number(point.request_count) || 0)
    },
    {
      label: t('dashboard.card.successRate'),
      value: has ? formatPercent(totals?.success_rate) : '--',
      detail: has ? t('dashboard.card.errorRate', { rate: formatPercent(totals?.error_rate) }) : t('dashboard.card.noSuccessRate'),
      to: link('/admin/diagnostics'),
      icon: 'i-tabler-circle-check',
      tone: 'emerald',
      ratio: has && totals?.success_rate != null ? Number(totals.success_rate) || 0 : null
    },
    {
      label: t('dashboard.card.activeKeys'),
      value: has ? formatNumber(totals?.active_client_key_count) : '--',
      detail: has ? t('dashboard.card.credentialsUsed', { count: formatNumber(totals?.active_credential_count) }) : t('dashboard.card.noActiveKeys'),
      to: link('/admin/usage'),
      icon: 'i-tabler-key',
      tone: 'amber',
      ratio: has && clientKeys.value.length ? Number(totals?.active_client_key_count || 0) / clientKeys.value.length : null
    }
  ]
})
</script>

<style scoped>
.dashboard-metric {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 0.875rem 1rem 0.9375rem;
  border: 1px solid var(--admin-panel-border, var(--ui-border));
  border-radius: 0.875rem;
  background: var(--admin-panel-bg, var(--ui-bg));
  box-shadow: var(--admin-panel-shadow);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.metric-label { font-size: 0.8125rem; line-height: 1.125rem; font-weight: 500; color: var(--ui-text-muted); }
.metric-value {
  margin-top: 0.625rem;
  font-size: 1.375rem;
  line-height: 1.75rem;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--ui-text-highlighted);
  font-variant-numeric: tabular-nums;
}
.metric-detail { margin-top: 0.125rem; font-size: 0.75rem; line-height: 1rem; color: var(--ui-text-dimmed); }
.metric-spark { height: 2.25rem; color: var(--dashboard-accent); }
.metric-bar {
  height: 0.375rem;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--dashboard-accent) 14%, var(--ui-bg-muted));
}
.metric-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in oklch, var(--dashboard-accent) 65%, transparent), var(--dashboard-accent));
}
.metric-link-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: var(--ui-text-dimmed);
  transition: color 160ms ease, transform 160ms ease;
}
.dashboard-metric:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
@media (hover: hover) {
  .dashboard-metric:not(.dashboard-metric--static):hover {
    transform: translateY(-2px);
    border-color: color-mix(in oklch, var(--dashboard-accent) 40%, var(--ui-border));
    box-shadow: 0 14px 30px -16px color-mix(in oklch, var(--dashboard-accent) 55%, transparent);
  }
  .dashboard-metric:hover .metric-link-icon { color: var(--dashboard-accent); transform: translate(2px, -2px); }
}
@media (prefers-reduced-motion: reduce) {
  .dashboard-metric, .metric-link-icon { transition: none; }
}
</style>
