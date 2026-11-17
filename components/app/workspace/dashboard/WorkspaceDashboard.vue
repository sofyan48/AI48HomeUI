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
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceDashboard } from '~/composables/workspace/useWorkspaceDashboard'
import { useWorkspaceBilling } from '~/composables/workspace/useWorkspaceBilling'
import { useWorkspaceClipboard, useWorkspaceFormat } from '~/composables/workspace/common'

const { t } = usePortalI18n()
const { currentUser: user, capabilities, serverInfo } = useUserApi()
const { activePeriodWindows, curlExample, periodWindowLabel, periodWindowRatio, periodWindowColor, periodWindowBarColor, formatPercent, limitAlert, dashboardStatusLine, loadPeriodLimits } = useWorkspaceDashboard()
const { monthOverview, billingLoading, billingError, rangeOptions, rangePreset, rangeFrom, rangeTo, appliedRange, dashboardUsageMetrics, loadBilling, selectRange, applyBillingRange } = useWorkspaceBilling()
const { formatCredits, formatDate } = useWorkspaceFormat()
const copyText = useWorkspaceClipboard()
</script>

<template>
  <div class="dashboard-bento">
    <AppCard class="dashboard-greeting" aria-labelledby="dashboard-title" :ui="{ body: 'flex flex-wrap items-center justify-between gap-4' }">
      <div class="min-w-0">
        <h1 id="dashboard-title" class="break-words font-bold tracking-tight text-[var(--ui-text-highlighted)]">{{ user?.username ? t('ws.dashboard.welcomeUser', { name: user.username }) : t('ws.dashboard.welcome') }}</h1>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ dashboardStatusLine }}</p>
      </div>
      <AppButton to="/app/balance" icon="i-tabler-wallet" color="primary" variant="solid" size="sm">{{ t('shell.nav.balance') }}</AppButton>
    </AppCard>

    <!-- Spotlight 1: how to start sending requests. -->
    <section class="dashboard-connect" aria-labelledby="connect-title">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="dashboard-connect-icon"><AppIcon name="i-tabler-plug-connected" class="size-5" aria-hidden="true" /></span>
          <div><h2 id="connect-title" class="text-base font-semibold text-[var(--ui-text-highlighted)]">{{ t('ws.dashboard.connectTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.connectSubtitle') }}</p></div>
        </div>
        <AppButton to="/app/models" size="xs" color="neutral" variant="ghost" class="rounded-full" trailing-icon="i-tabler-arrow-right">{{ t('ws.dashboard.findModel') }}</AppButton>
      </div>

      <ol class="dashboard-steps mt-5">
        <li class="dashboard-step">
          <span class="dashboard-step-index" aria-hidden="true">1</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ t('ws.dashboard.step1Title') }}</p>
            <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.step1Detail') }}</p>
          </div>
          <AppButton to="/app/api-keys" size="sm" icon="i-tabler-key" class="dashboard-primary-action shrink-0 rounded-full">{{ t('ws.dashboard.apiKeys') }}</AppButton>
        </li>
        <li class="dashboard-step">
          <span class="dashboard-step-index" aria-hidden="true">2</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ t('ws.dashboard.step2Title') }}</p>
            <div v-if="serverInfo.cpa_public_url" class="dashboard-endpoint-field mt-2">
              <code class="min-w-0 flex-1 truncate font-mono text-sm text-[var(--ui-text-highlighted)]" :title="serverInfo.cpa_public_url">{{ serverInfo.cpa_public_url }}</code>
              <AppButton type="button" size="xs" class="shrink-0" color="neutral" variant="soft" icon="i-tabler-copy" :aria-label="t('ws.dashboard.copyEndpoint')" @click="copyText(serverInfo.cpa_public_url, t('ws.dashboard.endpointCopied'))">{{ t('common.copy') }}</AppButton>
            </div>
            <p v-else class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.noEndpoint') }}</p>
          </div>
        </li>
        <li class="dashboard-step">
          <span class="dashboard-step-index" aria-hidden="true">3</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ t('ws.dashboard.step3Title') }}</p>
            <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.step3Detail') }}</p>
            <div v-if="serverInfo.cpa_public_url" class="dashboard-code mt-2 overflow-hidden rounded-xl">
              <div class="flex items-center justify-between gap-2 border-b px-3 py-1.5">
                <span class="font-mono text-[11px] opacity-70">curl</span>
                <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" class="dashboard-code-copy" :aria-label="t('ws.dashboard.copyCurl')" @click="copyText(curlExample, t('ws.dashboard.exampleCopied'))">{{ t('common.copy') }}</AppButton>
              </div>
              <pre class="overflow-x-auto p-4 text-xs leading-6"><code class="font-mono">{{ curlExample }}</code></pre>
            </div>
          </div>
        </li>
      </ol>
    </section>

    <!-- Spotlight 2: what the user can still spend. -->
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
    <AppCard class="dashboard-panel dashboard-usage min-w-0" :ui="{ header: 'px-4 pt-4 pb-3', body: 'px-4 pt-0 pb-4' }">
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

      <PortalAlert v-if="billingError" class="mt-3" color="error" variant="subtle" :title="t('ws.dashboard.usageError')" :description="billingError" />
    </AppCard>
  </div>
</template>

<style scoped>
/* Priority layout: connect (how to start) + credits & limits (what is left), then one usage strip. */
.dashboard-bento {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}
.dashboard-bento > * { min-width: 0; }

.dashboard-greeting h1 { font-size: 1.5rem; font-weight: 600; line-height: 1.35; letter-spacing: -0.015em; }
.dashboard-connect,
.dashboard-credits {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border-radius: var(--user-panel-radius);
  box-shadow: var(--user-panel-shadow);
}
.dashboard-connect {
  border: 1px solid var(--user-panel-border);
  background: var(--user-panel-bg);
}
.dashboard-connect-icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background: var(--user-inset-bg);
  color: var(--ui-text-muted);
}
.dashboard-steps { display: grid; gap: 0.25rem; }
.dashboard-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding-block: 0.75rem;
}
.dashboard-step:not(:last-child)::before {
  position: absolute;
  top: 2.5rem;
  bottom: -0.5rem;
  left: 0.8125rem;
  width: 2px;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--brand-from) 18%, var(--ui-border));
  content: '';
}
.dashboard-step-index {
  position: relative;
  z-index: 1;
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in oklch, var(--brand-from) 30%, var(--ui-border));
  border-radius: 9999px;
  background: var(--user-panel-bg);
  color: var(--ui-primary);
  font-size: 0.75rem;
  font-weight: 700;
}
.dashboard-endpoint-field {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.375rem 0.375rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
  background: var(--user-inset-bg);
}
.user-dashboard .dashboard-primary-action {
  background: var(--ui-primary);
  color: var(--ui-text-inverted);
  box-shadow: none;
}
.user-dashboard .dashboard-primary-action:hover { filter: brightness(1.06); }
.dashboard-code {
  border: 1px solid var(--color-zinc-800);
  background: var(--color-zinc-950);
  color: var(--color-zinc-200);
}
.dashboard-code > div { border-color: var(--color-zinc-800); color: var(--color-zinc-400); }
.dashboard-code :deep(.dashboard-code-copy) { color: var(--color-zinc-400); }
.dashboard-code :deep(.dashboard-code-copy:hover) { background: var(--color-zinc-800); color: white; }
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
  .dashboard-bento > .dashboard-usage { grid-column: 1 / -1; }
  .dashboard-bento > .dashboard-connect { grid-column: span 7; }
  .dashboard-bento > .dashboard-credits { grid-column: span 5; }
}
.period-progress-track {
  background: color-mix(in oklch, var(--ui-text-muted) 16%, var(--ui-bg));
}
</style>
