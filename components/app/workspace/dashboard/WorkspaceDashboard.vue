<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalProgress from '~/components/app/general/PortalProgress.vue'
import { Empty, EmptyDescription, EmptyHeader } from '~/components/ui/empty'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import AppLimitReset from './LimitReset.vue'
import ConnectionGuide from './ConnectionGuide.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceDashboard } from '~/composables/workspace/useWorkspaceDashboard'
import { dashboardExperience } from '~/composables/workspace/experience'
import { useWorkspaceBilling } from '~/composables/workspace/useWorkspaceBilling'
import { useWorkspaceFormat } from '~/composables/workspace/common'

const { t } = usePortalI18n()
const { currentUser: user, capabilities } = useUserApi()
const { activePeriodWindows, periodWindowLabel, periodWindowRatio, periodWindowColor, formatPercent, limitAlert, dashboardStatusLine, loadPeriodLimits } = useWorkspaceDashboard()
const { monthOverview, billingLoading, billingError, rangeOptions, rangePreset, rangeFrom, rangeTo, appliedRange, dashboardUsageMetrics, dashboardTopModels, loadBilling, selectRange, applyBillingRange } = useWorkspaceBilling()
const { formatCredits, formatDate, formatNumber } = useWorkspaceFormat()
// New users get the connection guide first; returning users see balance and usage first.
// While month data loads the returning layout is used, since most visits come from active users.
const experience = computed(() => dashboardExperience(monthOverview.value, billingLoading.value))
const isNewUser = computed(() => experience.value === 'new')
const guideOpen = ref(false)
</script>

<template>
  <div class="dashboard-bento" :class="isNewUser ? 'dashboard-bento--new' : 'dashboard-bento--active'" :data-experience="experience">
    <AppCard class="dashboard-greeting" aria-labelledby="dashboard-title" :ui="{ body: 'flex flex-wrap items-center justify-between gap-4' }">
      <div class="min-w-0">
        <h1 id="dashboard-title" class="break-words font-bold tracking-tight text-[var(--ui-text-highlighted)]">{{ user?.username ? t('ws.dashboard.welcomeUser', { name: user.username }) : t('ws.dashboard.welcome') }}</h1>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ dashboardStatusLine }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <AppButton v-if="!isNewUser" to="/app/api-keys" icon="i-tabler-key" color="neutral" variant="outline" size="sm">{{ t('shell.nav.apiKeys') }}</AppButton>
        <AppButton to="/app/balance" icon="i-tabler-wallet" color="primary" variant="solid" size="sm">{{ t('shell.nav.balance') }}</AppButton>
      </div>
    </AppCard>

    <!-- New users: the connection guide leads, fully expanded. -->
    <ConnectionGuide v-if="isNewUser" />

    <!-- What the user can still spend. -->
    <section class="dashboard-credits" aria-labelledby="credits-title">
      <div class="flex items-center justify-between gap-3">
        <h2 id="credits-title" class="flex items-center gap-2 text-sm font-semibold text-[var(--ui-text-highlighted)]"><span class="dashboard-balance-icon"><AppIcon name="i-tabler-wallet" class="size-4" aria-hidden="true" /></span>{{ t('ws.dashboard.creditsTitle') }}</h2>
        <PortalBadge v-if="limitAlert" :color="limitAlert.color" variant="subtle" class="rounded-full">{{ limitAlert.label }}</PortalBadge>
      </div>
      <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('ws.dashboard.availableCredits') }}</p>
          <p class="dashboard-balance-value mt-1 break-all font-bold tabular-nums tracking-tight text-[var(--ui-text-highlighted)]">{{ user ? formatCredits(user.credits) : '—' }}</p>
        </div>
        <AppButton to="/app/balance" size="sm" icon="i-tabler-plus" color="success" variant="soft" class="rounded-full">{{ t('ws.dashboard.topUp') }}</AppButton>
      </div>

      <div class="dashboard-limit-list mt-5" :aria-label="t('ws.dashboard.periodLimits')">
        <p class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('ws.dashboard.spendingLimits') }}</p>
        <template v-if="activePeriodWindows.length">
          <div v-for="window in activePeriodWindows" :key="window.id" class="dashboard-limit min-w-0">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold">{{ periodWindowLabel(window.id) }}</p>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums" :class="periodWindowColor(window)">{{ formatPercent(periodWindowRatio(window)) }}</span>
            </div>
            <PortalProgress class="period-progress-track mt-2" :model-value="periodWindowRatio(window) * 100" :color="periodWindowRatio(window) >= 1 ? 'error' : periodWindowRatio(window) >= 0.8 ? 'warning' : 'primary'" min-visible :aria-label="t('ws.dashboard.limitUsed', { label: periodWindowLabel(window.id) })" :aria-valuenow="Math.round(periodWindowRatio(window) * 100)" />
            <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-[var(--ui-text-muted)]">
              <span><strong class="font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ formatCredits(window.remaining) }}</strong> {{ t('ws.dashboard.leftOf', { limit: formatCredits(window.limit) }) }}</span>
              <span v-if="window.reset_at" class="text-[var(--ui-text-dimmed)]">{{ t('ws.dashboard.resets', { date: formatDate(window.reset_at) }) }}</span>
            </div>
          </div>
        </template>
        <Empty v-else class="items-start rounded-xl border border-border px-3 py-3 text-left md:p-3"><EmptyHeader class="items-start text-left"><EmptyDescription class="text-xs">{{ t('ws.dashboard.noLimits') }}</EmptyDescription></EmptyHeader></Empty>
      </div>
      <AppLimitReset class="mt-auto" @reset="loadPeriodLimits" />
    </section>

    <!-- Single place for activity numbers. -->
    <AppCard class="dashboard-panel dashboard-usage min-w-0" :ui="{ header: 'px-4 pt-4 pb-3', body: 'flex flex-1 flex-col gap-3 px-4 pt-0 pb-4' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="dashboard-usage-emblem" aria-hidden="true"><AppIcon name="i-tabler-chart-bar" class="size-5" /></span>
            <div class="min-w-0">
              <h2 class="text-sm font-semibold">{{ t('ws.dashboard.usage') }}</h2>
              <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ui-text-muted)]">
                <span>{{ appliedRange.from === appliedRange.to ? appliedRange.from : `${appliedRange.from} – ${appliedRange.to}` }}</span>
                <span v-if="monthOverview && !billingLoading">· {{ t('ws.dashboard.creditsThisMonth', { amount: formatCredits(monthOverview.total_charge_amount ?? monthOverview.month_spend) }) }}</span>
              </p>
            </div>
          </div>
          <form class="dashboard-usage-controls flex flex-wrap items-center gap-2" @submit.prevent="applyBillingRange">
            <PortalSelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-36" :aria-label="t('ws.dashboard.timeRange')" @update:model-value="selectRange" />
            <template v-if="rangePreset === 'custom'">
              <PortalInput v-model="rangeFrom" type="date" :aria-label="t('ws.dashboard.fromUtc')" />
              <PortalInput v-model="rangeTo" type="date" :aria-label="t('ws.dashboard.toUtc')" />
              <AppButton type="submit" :loading="billingLoading">{{ t('ws.dashboard.apply') }}</AppButton>
            </template>
            <AppButton type="button" color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="billingLoading" :aria-label="t('ws.dashboard.refreshUsage')" :title="t('ws.dashboard.refreshUsage')" @click="loadBilling" />
            <AppButton v-if="capabilities.analytics === true" to="/app/analytics" color="primary" variant="solid" size="sm" trailing-icon="i-tabler-arrow-right">{{ t('ws.dashboard.details') }}</AppButton>
          </form>
        </div>
      </template>
      <dl class="dashboard-usage-strip" :aria-busy="billingLoading">
        <div v-for="(metric, index) in dashboardUsageMetrics" :key="metric.label" class="dashboard-usage-item" :class="{ 'dashboard-usage-item--featured': index === 0 }">
          <dt class="flex min-w-0 items-center justify-between gap-2 text-xs font-medium text-[var(--ui-text-muted)]">
            <span>{{ metric.label }}</span>
            <span class="dashboard-usage-metric-icon" aria-hidden="true"><AppIcon :name="metric.icon" class="size-4" /></span>
          </dt>
          <dd class="dashboard-usage-value mt-1.5 break-words text-2xl font-bold tabular-nums tracking-tight text-[var(--ui-text-highlighted)]">
            <PortalSkeleton v-if="billingLoading" class="h-7 w-20 max-w-full rounded-md" />
            <template v-else>{{ metric.value }}</template>
          </dd>
        </div>
      </dl>

      <!-- Top models for the selected range; fills the card when it sits beside credits. -->
      <section class="dashboard-models" aria-labelledby="dashboard-models-title" :aria-busy="billingLoading">
        <div class="flex items-center justify-between gap-2">
          <h3 id="dashboard-models-title" class="flex items-center gap-2 text-xs font-medium text-[var(--ui-text-muted)]"><AppIcon name="i-tabler-stack-2" class="size-4" aria-hidden="true" />{{ t('ws.dashboard.topModels') }}</h3>
          <NuxtLink to="/app/balance" class="dashboard-models-link text-xs font-medium">{{ t('ws.dashboard.viewBilling') }}</NuxtLink>
        </div>
        <ol v-if="billingLoading && !dashboardTopModels.length" class="dashboard-model-list">
          <li v-for="index in 3" :key="index"><PortalSkeleton class="h-9 w-full rounded-md" /></li>
        </ol>
        <ol v-else-if="dashboardTopModels.length" class="dashboard-model-list">
          <li v-for="model in dashboardTopModels" :key="model.id || model.label" class="dashboard-model">
            <div class="flex items-baseline justify-between gap-3">
              <p class="min-w-0 truncate font-mono text-sm text-[var(--ui-text-highlighted)]" :title="model.label || model.id">{{ model.label || model.id || t('ws.billing.unknownModel') }}</p>
              <span class="shrink-0 text-sm font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ formatCredits(model.amount) }}</span>
            </div>
            <div class="mt-1.5 flex items-center gap-2">
              <span class="dashboard-model-bar" role="img" :aria-label="t('ws.dashboard.modelShare', { share: formatPercent(model.share) })"><span :style="{ width: `${Math.max(2, model.share * 100)}%` }" /></span>
              <span class="shrink-0 text-[11px] tabular-nums text-[var(--ui-text-muted)]">{{ t('ws.billing.modelRequests', { count: formatNumber(model.request_count) }) }}</span>
            </div>
          </li>
        </ol>
        <p v-else class="dashboard-models-empty">{{ t('ws.billing.noModelCharges') }}</p>
      </section>

      <PortalAlert v-if="billingError" color="error" variant="subtle" :title="t('ws.dashboard.usageError')" :description="billingError" />
    </AppCard>

    <!-- Returning users: the guide stays available, collapsed below their numbers. -->
    <ConnectionGuide v-if="!isNewUser" v-model:open="guideOpen" collapsible class="dashboard-guide" />
  </div>
</template>

<style scoped>
/* New users: guide + credits, then usage. Returning users: credits + usage, then the collapsed guide. */
.dashboard-bento {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}
.dashboard-bento > * { min-width: 0; }

.dashboard-greeting h1 { font-size: 1.5rem; font-weight: 600; line-height: 1.35; letter-spacing: -0.015em; }
.dashboard-credits {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border-radius: var(--user-panel-radius);
  box-shadow: var(--user-panel-shadow);
}
.dashboard-credits {
  border: 1px solid var(--user-panel-border);
  background: var(--user-panel-bg);
}
.dashboard-balance-icon {
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background: var(--user-inset-bg);
  color: var(--ui-text-muted);
}
.dashboard-balance-value { font-size: 2rem; font-weight: 600; line-height: 1.2; }
.dashboard-limit-list { display: grid; gap: 0.5rem; }
.dashboard-limit {
  padding-block: 0.75rem;
  border-top: 1px solid var(--ui-border);
}
.dashboard-credits :deep(.limit-reset) { margin-top: 1rem; padding-block: 1rem 0; border-top: 1px solid var(--ui-border); }
.user-dashboard .dashboard-icon {
  color: var(--ui-text-muted);
  background: var(--user-inset-bg);
}
.user-dashboard .dashboard-panel :deep([data-slot="header"]) { border-bottom: 0; }
.user-dashboard .dashboard-panel:not(.dashboard-usage) :deep([data-slot="header"]) { padding-bottom: 0.25rem; }
.user-dashboard .dashboard-panel h2 { font-size: 0.9375rem; letter-spacing: -0.01em; }
.dashboard-usage :deep([data-slot="header"]) { padding-bottom: 0.75rem; }
.dashboard-usage-emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid color-mix(in oklch, var(--ui-primary) 20%, var(--ui-border));
  border-radius: 0.875rem;
  color: var(--ui-primary);
  background: color-mix(in oklch, var(--ui-primary) 9%, var(--user-panel-bg));
}
.dashboard-usage-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}
.dashboard-usage-item {
  min-width: 0;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.625rem;
  background: var(--user-inset-bg);
}
.dashboard-usage-item--featured {
  border-color: color-mix(in oklch, var(--ui-primary) 28%, var(--ui-border));
  background: radial-gradient(ellipse at top right, color-mix(in oklch, var(--ui-primary) 12%, transparent), transparent 75%), var(--user-inset-bg);
}
.dashboard-usage-metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
  color: var(--ui-text-muted);
  background: var(--user-panel-bg);
}
.dashboard-usage-item--featured .dashboard-usage-metric-icon {
  color: var(--ui-primary);
  border-color: color-mix(in oklch, var(--ui-primary) 20%, var(--ui-border));
  background: color-mix(in oklch, var(--ui-primary) 8%, var(--user-panel-bg));
}
.dashboard-usage-item--featured .dashboard-usage-value { color: var(--ui-primary); }
.dashboard-models {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.625rem;
  background: var(--user-inset-bg);
}
.dashboard-models-link { color: var(--ui-primary); }
.dashboard-models-link:hover { text-decoration: underline; }
.dashboard-models-link:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; border-radius: 0.25rem; }
.dashboard-model-list { display: grid; gap: 0.75rem; }
.dashboard-model { min-width: 0; }
.dashboard-model-bar {
  height: 0.3125rem;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--ui-text-muted) 16%, var(--ui-bg));
}
.dashboard-model-bar > span { display: block; height: 100%; border-radius: inherit; background: var(--ui-primary); }
.dashboard-models-empty {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-height: 4rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  text-align: center;
}
@media (max-width: 639px) {
  .dashboard-usage-controls { width: 100%; }
  .dashboard-usage-item { padding: 0.625rem 0.75rem; }
  .dashboard-usage-value { font-size: 1.5rem; }
}
@media (min-width: 768px) {
  .dashboard-usage-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }

}
@media (min-width: 1024px) {
  .dashboard-bento { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .dashboard-bento > .dashboard-greeting,
  .dashboard-bento > .dashboard-guide,
  .dashboard-bento--new > .dashboard-usage { grid-column: 1 / -1; }
  .dashboard-bento--new > :deep(.dashboard-connect) { grid-column: span 7; }
  .dashboard-bento > .dashboard-credits { grid-column: span 5; }
  /* Returning users: usage sits beside credits, so its four metrics wrap into two columns. */
  .dashboard-bento--active > .dashboard-usage { grid-column: span 7; }
  .dashboard-bento--active .dashboard-usage-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.period-progress-track {
  background: color-mix(in oklch, var(--ui-text-muted) 16%, var(--ui-bg));
}
</style>
