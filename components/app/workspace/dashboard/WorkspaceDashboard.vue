<script setup lang="ts">
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
    <header class="dashboard-greeting" aria-labelledby="dashboard-title">
      <div class="min-w-0">
        <h1 id="dashboard-title" class="break-words font-bold tracking-tight text-[var(--ui-text-highlighted)]">{{ user?.username ? t('ws.dashboard.welcomeUser', { name: user.username }) : t('ws.dashboard.welcome') }}</h1>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ dashboardStatusLine }}</p>
      </div>
      <AppButton v-if="capabilities.request_logs === true" to="/app/logs" icon="i-tabler-list-details" color="neutral" variant="ghost" size="sm" class="rounded-full">{{ t('ws.dashboard.requestLogs') }}</AppButton>
    </header>

    <!-- Spotlight 1: how to start sending requests. -->
    <section class="dashboard-connect" aria-labelledby="connect-title">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="dashboard-connect-icon"><UIcon name="i-tabler-plug-connected" class="size-5" aria-hidden="true" /></span>
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
        <h2 id="credits-title" class="flex items-center gap-2 text-sm font-semibold text-[var(--ui-text-highlighted)]"><span class="dashboard-balance-icon"><UIcon name="i-tabler-wallet" class="size-4" aria-hidden="true" /></span>{{ t('ws.dashboard.creditsTitle') }}</h2>
        <UBadge v-if="limitAlert" :color="limitAlert.color" variant="subtle" class="rounded-full">{{ limitAlert.label }}</UBadge>
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
            <div class="period-progress-track mt-2 h-2 overflow-hidden rounded-full" role="progressbar" :aria-label="t('ws.dashboard.limitUsed', { label: periodWindowLabel(window.id) })" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(periodWindowRatio(window) * 100)"><div class="h-full rounded-full transition-[width]" :class="periodWindowBarColor(window)" :style="{ width: `${periodWindowRatio(window) * 100}%`, minWidth: periodWindowRatio(window) > 0 ? '4px' : '0' }" /></div>
            <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-[var(--ui-text-muted)]">
              <span><strong class="font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ formatCredits(window.remaining) }}</strong> {{ t('ws.dashboard.leftOf', { limit: formatCredits(window.limit) }) }}</span>
              <span v-if="window.reset_at" class="text-[var(--ui-text-dimmed)]">{{ t('ws.dashboard.resets', { date: formatDate(window.reset_at) }) }}</span>
            </div>
          </div>
        </template>
        <p v-else class="rounded-xl border border-dashed border-[var(--ui-border)] px-3 py-3 text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.noLimits') }}</p>
      </div>
      <AppLimitReset class="mt-auto" @reset="loadPeriodLimits" />
    </section>

    <!-- Single place for activity numbers. -->
    <AppCard class="dashboard-panel dashboard-usage min-w-0" :ui="{ body: 'pt-2' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3"><span class="dashboard-icon flex size-9 items-center justify-center rounded-lg"><UIcon name="i-tabler-chart-bar" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('ws.dashboard.usage') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ appliedRange.from === appliedRange.to ? appliedRange.from : `${appliedRange.from} – ${appliedRange.to}` }}<template v-if="monthOverview"> · {{ t('ws.dashboard.creditsThisMonth', { amount: formatCredits(monthOverview.total_charge_amount ?? monthOverview.month_spend) }) }}</template></p></div></div>
          <form class="flex flex-wrap items-center gap-2" @submit.prevent="applyBillingRange">
            <USelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-36" :aria-label="t('ws.dashboard.timeRange')" @update:model-value="selectRange" />
            <template v-if="rangePreset === 'custom'">
              <UInput v-model="rangeFrom" type="date" :aria-label="t('ws.dashboard.fromUtc')" />
              <UInput v-model="rangeTo" type="date" :aria-label="t('ws.dashboard.toUtc')" />
              <AppButton type="submit" :loading="billingLoading">{{ t('ws.dashboard.apply') }}</AppButton>
            </template>
            <AppButton type="button" color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="billingLoading" :aria-label="t('ws.dashboard.refreshUsage')" :title="t('ws.dashboard.refreshUsage')" @click="loadBilling" />
            <AppButton to="/app/balance" color="neutral" variant="ghost" size="sm" trailing-icon="i-tabler-arrow-right">{{ t('ws.dashboard.details') }}</AppButton>
          </form>
        </div>
      </template>
      <dl class="dashboard-usage-strip" :aria-busy="billingLoading">
        <div v-for="(metric, index) in dashboardUsageMetrics" :key="metric.label" class="dashboard-usage-item" :class="`dashboard-metric--${index}`">
          <dt class="flex items-center gap-2 text-xs font-medium text-[var(--ui-text-muted)]"><UIcon :name="metric.icon" class="size-4 dashboard-usage-icon" aria-hidden="true" />{{ metric.label }}</dt>
          <dd class="mt-1.5 break-words text-2xl font-bold tabular-nums tracking-tight text-[var(--ui-text-highlighted)]">{{ billingLoading ? '—' : metric.value }}</dd>
        </div>
      </dl>
      <UAlert v-if="billingError" class="mt-3" color="error" variant="subtle" :title="t('ws.dashboard.usageError')" :description="billingError" />
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
.dashboard-greeting {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  padding-block: 0.25rem;
}
.dashboard-greeting h1 { font-size: clamp(1.5rem, 2.4vw, 2rem); line-height: 1.2; letter-spacing: -0.03em; }
.dashboard-connect,
.dashboard-credits {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border-radius: 1.25rem;
  box-shadow: var(--user-panel-shadow);
}
.dashboard-connect {
  border: 1px solid color-mix(in oklch, var(--brand-from) 24%, var(--user-panel-border));
  background:
    radial-gradient(ellipse 60% 70% at 100% 0%, color-mix(in oklch, var(--brand-to) 11%, transparent), transparent 70%),
    radial-gradient(ellipse 50% 60% at 0% 0%, color-mix(in oklch, var(--brand-from) 9%, transparent), transparent 70%),
    var(--user-panel-bg);
}
.dashboard-connect-icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: var(--brand-gradient);
  color: white;
  box-shadow: 0 6px 16px -6px color-mix(in oklch, var(--brand-from) 60%, transparent);
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
  border-radius: 0.75rem;
  background: var(--user-inset-bg);
}
.user-dashboard .dashboard-primary-action {
  background: var(--brand-gradient);
  color: white;
  box-shadow: 0 6px 18px -6px color-mix(in oklch, var(--brand-from) 60%, transparent);
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
  --dashboard-accent: var(--ui-success);
  border: 1px solid color-mix(in oklch, var(--dashboard-accent) 24%, var(--user-panel-border));
  background:
    radial-gradient(ellipse 90% 45% at 100% 0%, color-mix(in oklch, var(--dashboard-accent) 13%, transparent), transparent 70%),
    var(--user-panel-bg);
}
.dashboard-balance-icon {
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--dashboard-accent) 15%, transparent);
  color: var(--dashboard-accent);
}
.dashboard-balance-value { font-size: clamp(2rem, 3vw, 2.5rem); line-height: 1.1; }
.dashboard-limit-list { display: grid; gap: 0.5rem; }
.dashboard-limit {
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
}
.dashboard-credits :deep(.limit-reset) { margin-top: 1rem; padding-block: 1rem 0; border-top: 1px solid var(--ui-border); }
.user-dashboard .dashboard-icon {
  color: var(--dashboard-accent);
  background: color-mix(in oklch, var(--dashboard-accent) 13%, transparent);
}
.user-dashboard .dashboard-panel :deep([data-slot="header"]) { border-bottom: 0; padding-bottom: 0.25rem; }
.user-dashboard .dashboard-panel h2 { font-size: 0.9375rem; letter-spacing: -0.01em; }
.dashboard-usage-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
}
.dashboard-usage-item { padding: 0.875rem 1rem; }
.dashboard-usage-item:nth-child(odd) { border-right: 1px solid var(--ui-border); }
.dashboard-usage-item:nth-child(-n + 2) { border-bottom: 1px solid var(--ui-border); }
.dashboard-usage-icon { color: var(--dashboard-accent); }
.dashboard-metric--0 { --dashboard-accent: var(--ui-primary); }
.dashboard-metric--1 { --dashboard-accent: var(--color-blue-500); }
.dashboard-metric--2 { --dashboard-accent: var(--color-emerald-500); }
.dashboard-metric--3 { --dashboard-accent: var(--color-amber-500); }
@media (min-width: 768px) {
  .dashboard-usage-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .dashboard-usage-item { border-bottom: 0 !important; }
  .dashboard-usage-item:not(:last-child) { border-right: 1px solid var(--ui-border); }
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
