<template>
      <AdminBillingFilterBar v-model:filters="overviewFilters" v-model:preset="overviewPreset" :range-options="rangeOptions" :user-options="userSearchOptions" :provider-options="providerSearchOptions" :model-options="modelSearchOptions" :loading="overviewLoading" @range="selectRange('overview', $event)" @apply="applyOverviewFilters" @reset="resetOverviewFilters" />

      <template v-if="overview">
        <section class="ledger" :aria-label="t('billing.overview.summaryLabel')">
          <div class="ledger__total">
            <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]"><UIcon name="i-tabler-receipt" class="size-3.5" />{{ t('billing.overview.chargedInRange') }}</p>
            <p class="ledger__amount">{{ financeMetrics[0].value }}</p>
            <p class="font-mono text-[11px] text-[var(--ui-text-muted)]">{{ overviewRange.from || t('billing.overview.allTime') }} → {{ overviewRange.to || t('billing.overview.now') }} · {{ overviewRange.timezone || savedReportTimezone }}</p>
          </div>
          <dl class="ledger__lines">
            <div v-for="metric in financeMetrics.slice(1)" :key="metric.label" class="ledger__line">
              <dt class="inline-flex items-center gap-2 text-sm text-[var(--ui-text-toned)]"><UIcon :name="metric.icon" class="size-4" :class="metric.tone === 'emerald' ? 'text-emerald-500' : metric.tone === 'amber' ? 'text-amber-500' : 'text-blue-500'" />{{ metric.label }}</dt>
              <span class="ledger__dots" aria-hidden="true" />
              <dd class="font-mono text-sm font-semibold tabular-nums text-[var(--ui-text-highlighted)]" :title="metric.value">{{ metric.tone === 'emerald' ? '+' : metric.tone === 'amber' ? '−' : '' }}{{ metric.value }}</dd>
            </div>
          </dl>
        </section>
        <dl class="flex flex-wrap gap-2" :aria-label="t('billing.overview.usageLabel')">
          <div v-for="metric in usageMetrics" :key="metric.label" class="inline-flex items-baseline gap-1.5 rounded-full border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] px-3 py-1 text-xs"><dt class="text-[var(--ui-text-muted)]">{{ metric.label }}</dt><dd class="font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ metric.value }}</dd></div>
        </dl>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section class="app-surface min-w-0 overflow-hidden xl:col-span-2" aria-labelledby="billing-daily">
            <header class="flex items-baseline justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-3">
              <h2 id="billing-daily" class="text-sm font-semibold">{{ t('billing.overview.dailyCharges') }}</h2>
              <span class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ overviewRange.from || t('billing.overview.allTime') }} – {{ overviewRange.to || t('billing.overview.now') }} · {{ overviewRange.timezone || savedReportTimezone }}</span>
            </header>
            <div v-if="dailyTrend.length" class="max-h-96 overflow-y-auto">
              <div v-for="point in dailyTrend" :key="point.date" class="grid grid-cols-[6.5rem_minmax(0,1fr)_7rem_6rem] items-center gap-4 border-b border-[var(--ui-border)] px-4 py-2 text-sm last:border-b-0 hover:bg-[var(--ui-bg-elevated)]/60">
                <span class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ point.date }}</span>
                <div class="h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]/50"><div class="h-full rounded-full bg-[var(--ui-primary)]" :style="{ width: `${trendWidth(point.charge_amount)}%` }" /></div>
                <span class="text-right font-medium tabular-nums">{{ formatCredits(point.charge_amount) }}</span>
                <span class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('billing.overview.requestsShort', { count: formatNumber(point.request_count) }) }}</span>
              </div>
            </div>
            <p v-else class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.overview.noCharges') }}</p>
          </section>

          <section class="app-surface min-w-0 overflow-hidden" aria-labelledby="billing-top-users">
            <header class="border-b border-[var(--ui-border)] px-4 py-3"><h2 id="billing-top-users" class="text-sm font-semibold">{{ t('billing.overview.topConsumers') }}</h2></header>
            <ol v-if="topUsers.length" class="max-h-96 overflow-y-auto">
              <li v-for="(item, index) in topUsers" :key="item.id || item.label" class="flex items-center gap-3 border-b border-[var(--ui-border)] px-4 py-2 last:border-b-0">
                <span class="w-5 shrink-0 text-right text-xs tabular-nums text-[var(--ui-text-dimmed)]">{{ index + 1 }}</span>
                <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ item.label || t('billing.userNumber', { id: item.id }) }}</p><p class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('billing.overview.requestCount', { count: formatNumber(item.request_count) }) }}</p></div>
                <span class="text-sm font-semibold tabular-nums">{{ formatCredits(item.amount) }}</span>
              </li>
            </ol>
            <p v-else class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.overview.noUserCharges') }}</p>
          </section>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section v-for="group in rankingGroups" :key="group.title" class="app-surface min-w-0 overflow-hidden" :aria-label="group.title">
            <header class="border-b border-[var(--ui-border)] px-4 py-3"><h2 class="text-sm font-semibold">{{ group.title }}</h2></header>
            <ul v-if="group.items.length" class="max-h-80 overflow-y-auto">
              <li v-for="item in group.items" :key="item.id || item.label" class="relative flex items-center justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-2 text-sm last:border-b-0">
                <span class="absolute inset-y-0 left-0 bg-[var(--ui-primary)]/10" :style="{ width: `${share(item.amount, group.items)}%` }" aria-hidden="true" />
                <span class="relative min-w-0 truncate" :title="item.label">{{ item.label }}</span>
                <span class="relative shrink-0 font-medium tabular-nums">{{ formatCredits(item.amount) }}</span>
              </li>
            </ul>
            <p v-else class="py-10 text-center text-sm text-[var(--ui-text-muted)]">{{ group.empty }}</p>
          </section>
        </div>
      </template>
      <div v-else-if="overviewLoading" class="grid gap-4"><USkeleton class="h-32 w-full" /><USkeleton class="h-72 w-full" /></div>
      <p v-else-if="!pageError" class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.overview.empty') }}</p>
</template>
<style scoped>
/* Billing signature: receipt-style ledger with a perforated edge and dotted leaders. */
.ledger {
  position: relative;
  display: grid;
  gap: 1rem 2rem;
  padding: 1.125rem 1.375rem 1.375rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.875rem;
  background:
    radial-gradient(ellipse 60% 140% at 0% 0%, color-mix(in oklch, var(--page-accent) 12%, transparent), transparent 70%),
    var(--admin-panel-bg);
  box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
.ledger::after {
  position: absolute;
  inset-inline: 1rem;
  bottom: 0.5rem;
  height: 0.375rem;
  background: radial-gradient(circle, var(--admin-workspace-bg) 0.1875rem, transparent 0.21rem) 0 50% / 0.75rem 0.375rem repeat-x;
  content: '';
  opacity: 0.9;
}
@media (min-width: 64rem) { .ledger { grid-template-columns: minmax(16rem, 0.9fr) minmax(0, 1.4fr); align-items: center; } }
.ledger__amount { margin-block: 0.125rem 0.25rem; font-family: var(--admin-display-font); font-size: 2.25rem; line-height: 2.75rem; font-weight: 800; letter-spacing: -0.035em; color: var(--ui-text-highlighted); font-variant-numeric: tabular-nums; }
.ledger__lines { display: grid; gap: 0.5rem; }
.ledger__line { display: flex; min-width: 0; align-items: baseline; gap: 0.625rem; }
.ledger__dots { min-width: 1rem; flex: 1; border-bottom: 2px dotted var(--ui-border-accented); transform: translateY(-0.25rem); }
</style>

<script setup lang="ts">
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, overviewFilters, overviewPreset, rangeOptions, userSearchOptions, providerSearchOptions, modelSearchOptions, overviewLoading, selectRange, applyOverviewFilters, resetOverviewFilters, overview, financeMetrics, overviewRange, savedReportTimezone, usageMetrics, dailyTrend, trendWidth, formatCredits, formatNumber, topUsers, rankingGroups, share, pageError } = useBillingWorkspace()
</script>
