<template>
  <div :class="section === 'dashboard' ? 'user-dashboard space-y-5' : 'space-y-8'">

    <UAlert v-if="pageError" color="error" variant="subtle" icon="i-tabler-alert-triangle" :title="t('ws.pageError')" :description="pageError" />

    <div v-if="section === 'dashboard'" class="dashboard-bento">
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

    <section v-if="section === 'billing'" class="workspace-finance space-y-5" aria-labelledby="billing-title">
      <AppCard class="finance-panel finance-usage" :ui="{ body: 'space-y-5' }">
        <template #header><div class="flex items-center gap-3"><span class="finance-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-chart-bar" class="size-5" aria-hidden="true" /></span><div><h2 id="billing-title" class="text-sm font-semibold">{{ t('ws.billing.title') }}</h2><p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.billing.subtitle') }}</p></div></div></template>
        <form class="billing-range flex flex-wrap items-end gap-3" @submit.prevent="applyBillingRange">
          <UFormField :label="t('ws.dashboard.timeRange')">
            <USelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-44" @update:model-value="selectRange" />
          </UFormField>
          <template v-if="rangePreset === 'custom'">
            <UFormField :label="t('ws.dashboard.fromUtc')"><UInput v-model="rangeFrom" type="date" /></UFormField>
            <UFormField :label="t('ws.dashboard.toUtc')"><UInput v-model="rangeTo" type="date" /></UFormField>
            <AppButton type="submit" :loading="billingLoading">{{ t('ws.billing.applyRange') }}</AppButton>
          </template>
          <AppButton type="button" class="ml-auto shrink-0 rounded-full" color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="billingLoading" @click="loadBilling">{{ t('common.refresh') }}</AppButton>
        </form>
        <UAlert v-if="billingError" class="mt-4" color="error" variant="subtle" :title="t('ws.billing.error')" :description="billingError" />

        <div class="billing-stat-strip grid min-w-0 grid-cols-2 gap-5 lg:grid-cols-4" :aria-label="t('ws.billing.summaryAria')" :aria-busy="billingLoading">
          <div v-for="(metric, index) in billingMetrics" :key="metric.label" class="billing-stat min-w-0" :class="{ 'billing-stat--featured': index === 0 }">
            <p class="flex items-center gap-2 text-sm text-[var(--ui-text-muted)]"><UIcon :name="dashboardMetricIcons[index]" class="size-4 billing-stat-icon" aria-hidden="true" />{{ metric.label }}</p>
            <p class="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums text-[var(--ui-text-highlighted)]">{{ billingLoading ? '—' : metric.value }}</p>
            <p class="mt-2 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ metric.detail }}</p>
          </div>
        </div>
        <details class="billing-models">
          <summary class="flex cursor-pointer items-center gap-3 text-sm font-medium"><UIcon name="i-tabler-stack-2" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /><span>{{ t('ws.billing.modelBreakdown') }}</span><UIcon name="i-tabler-chevron-down" class="billing-model-chevron ml-auto size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /></summary>
          <div v-if="topModels.length" class="space-y-4">
            <div v-for="(model, index) in topModels" :key="model.id || model.label" class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ index + 1 }}. {{ model.label || model.id || t('ws.billing.unknownModel') }}</p>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ t('ws.billing.modelRequests', { count: formatNumber(model.request_count) }) }}</p>
              </div>
              <span class="shrink-0 font-mono text-sm font-semibold">{{ formatCredits(model.amount) }}</span>
            </div>
          </div>
          <p v-else class="py-5 text-sm text-[var(--ui-text-muted)]">{{ t('ws.billing.noModelCharges') }}</p>
        </details>
      </AppCard>

        <div class="grid min-w-0 grid-cols-1 items-stretch gap-5">

        <AppCard class="finance-panel flex min-w-0 flex-col overflow-hidden" :ui="{ header: 'min-h-24', body: 'flex-1 p-0' }">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="flex items-center gap-2 text-sm font-semibold"><UIcon name="i-tabler-receipt" class="size-4 text-[var(--ui-primary)]" aria-hidden="true" /> {{ t('ws.billing.recentCharges') }}</h3>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ t('ws.billing.matchingRecords', { count: formatNumber(chargesTotal) }) }}</p>
              </div>
              <UFormField :label="t('ws.billing.rowsPerPage')">
                <USelect v-model="chargePageSize" :items="pageSizeOptions" value-key="value" label-key="label" class="w-28" @update:model-value="changePageSize" />
              </UFormField>
            </div>
          </template>
          <div class="min-h-64 overflow-x-auto">
            <AppTable :data="charges" :columns="chargeColumns" :loading="billingLoading" :empty="t('ws.billing.noCharges')" class="min-w-[800px]">
              <template #created_at-cell="{ row }"><span class="whitespace-nowrap text-sm">{{ formatDate(rowValue(row).created_at) }}</span></template>
              <template #provider-cell="{ row }"><span class="text-sm">{{ rowValue(row).provider || '—' }}</span></template>
              <template #model-cell="{ row }"><span class="text-sm font-medium">{{ rowValue(row).model || '—' }}</span></template>
              <template #input_tokens-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).input_tokens) }}</span></template>
              <template #output_tokens-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).output_tokens) }}</span></template>
              <template #amount-cell="{ row }"><span class="font-mono font-semibold tabular-nums text-[var(--ui-text-highlighted)]">−{{ formatCredits(Math.abs(Number(rowValue(row).amount) || 0)) }}</span></template>
              <template #balance_after-cell="{ row }"><span class="font-mono">{{ formatCredits(rowValue(row).balance_after) }}</span></template>
            </AppTable>
          </div>
          <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span class="text-[var(--ui-text-muted)]">{{ t('ws.billing.showing', { start: chargeRangeStart, end: chargeRangeEnd, total: formatNumber(chargesTotal) }) }}</span>
            <div class="flex items-center gap-2">
              <AppButton size="sm" color="neutral" variant="outline" :disabled="chargePage <= 1 || billingLoading" @click="changeChargePage(-1)">{{ t('ws.billing.previous') }}</AppButton>
              <span>{{ t('ws.billing.page', { page: chargePage, pages: chargePages }) }}</span>
              <AppButton size="sm" color="neutral" variant="outline" :disabled="chargePage >= chargePages || billingLoading" @click="changeChargePage(1)">{{ t('ws.billing.next') }}</AppButton>
            </div>
          </div>
          </template>
        </AppCard>
          <slot name="balance-history" />
        </div>
    </section>

    <section v-if="section === 'api-keys'" class="workspace-finance workspace-keys space-y-5" aria-labelledby="keys-title">
      <AppCard class="finance-panel keys-panel">
        <div class="flex flex-wrap items-end gap-4">
          <UFormField :label="t('ws.keys.search')" class="min-w-0 flex-1">
            <UInput v-model="keySearch" icon="i-tabler-search" :placeholder="t('ws.keys.searchPlaceholder')" :aria-label="t('ws.keys.searchAria')" size="lg" class="w-full" />
          </UFormField>
          <AppButton icon="i-tabler-plus" size="lg" class="shrink-0 rounded-full" @click="openKeyForm()">{{ t('ws.keys.create') }}</AppButton>
        </div>
        <p class="mt-4 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.keys.hint') }}</p>
      </AppCard>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="keys-title" class="flex items-center gap-2 text-sm font-semibold"><UIcon name="i-tabler-key" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('ws.keys.yourKeys') }}</h2>
        <span class="rounded-full bg-[var(--ui-bg-muted)] px-3 py-1 text-xs tabular-nums text-[var(--ui-text-muted)]">{{ keysLoading ? t('ws.keys.countLoading') : t('ws.keys.count', { shown: filteredKeys.length, total: keys.length }) }}</span>
      </div>
      <div v-if="keysLoading" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" :aria-label="t('ws.keys.loadingAria')" aria-busy="true">
        <USkeleton v-for="index in 3" :key="index" class="h-56 rounded-3xl" />
      </div>
      <div v-else-if="filteredKeys.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AppCard v-for="key in filteredKeys" :key="key.api_key" class="finance-panel key-card min-w-0" :ui="{ body: 'flex h-full flex-col p-5 sm:p-6' }">
          <span class="finance-icon flex size-10 items-center justify-center rounded-full"><UIcon name="i-tabler-key" class="size-5" aria-hidden="true" /></span>
          <h3 class="mt-3 break-words text-base font-semibold tracking-tight text-[var(--ui-text-highlighted)]">{{ key.display_name || t('ws.keys.unnamed') }}</h3>
          <div class="mt-1 flex min-w-0 items-center gap-2">
            <code class="min-w-0 break-all text-xs text-[var(--ui-text-muted)]">{{ maskKey(key.api_key) }}</code>
            <AppButton type="button" size="xs" class="shrink-0" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('ws.keys.copyAria', { key: maskKey(key.api_key) })" @click="copyKey(key.api_key)" />
          </div>
          <dl class="my-4 space-y-2 text-xs">
            <div class="flex flex-wrap justify-between gap-2"><dt class="text-[var(--ui-text-muted)]">{{ t('ws.keys.created') }}</dt><dd>{{ formatDate(key.created_at) }}</dd></div>
            <div class="flex flex-wrap justify-between gap-2"><dt class="text-[var(--ui-text-muted)]">{{ t('ws.keys.updated') }}</dt><dd>{{ formatDate(key.updated_at || key.created_at) }}</dd></div>
          </dl>
          <div class="mt-auto flex items-center justify-between gap-3 border-t border-[var(--ui-border)] pt-3">
            <AppButton color="primary" variant="ghost" size="sm" class="rounded-full" icon="i-tabler-pencil" :aria-label="t('ws.keys.editAria', { name: key.display_name || t('ws.keys.keyFallback') })" @click="openKeyForm(key)">{{ t('ws.keys.edit') }}</AppButton>
            <AppButton color="error" variant="ghost" size="sm" class="rounded-full" icon="i-tabler-trash" :aria-label="t('ws.keys.deleteAria', { name: key.display_name || t('ws.keys.keyFallback') })" @click="confirmKeyDelete(key)">{{ t('ws.keys.delete') }}</AppButton>
          </div>
        </AppCard>
      </div>
      <div v-else class="flex flex-col items-center px-5 py-12 text-center">
        <span class="finance-icon mb-4 flex size-12 items-center justify-center rounded-2xl"><UIcon :name="keys.length ? 'i-tabler-search' : 'i-tabler-key'" class="size-6" aria-hidden="true" /></span>
        <h2 class="text-sm font-semibold">{{ keys.length ? t('ws.keys.noMatch') : t('ws.keys.emptyTitle') }}</h2>
        <p class="mt-2 max-w-sm text-sm text-[var(--ui-text-muted)]">{{ keys.length ? t('ws.keys.noMatchDetail') : t('ws.keys.emptyDetail') }}</p>
        <AppButton v-if="keys.length" class="mt-5 rounded-full" color="neutral" variant="soft" size="sm" @click="keySearch = ''">{{ t('ws.keys.clearSearch') }}</AppButton>
      </div>

    </section>

    <section v-if="section === 'settings'" class="workspace-settings min-w-0 space-y-5" aria-labelledby="security-title">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="security-title" class="text-base font-semibold tracking-tight">{{ t('ws.settings.title') }}</h1>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('ws.settings.subtitle') }}</p>
        </div>
        <AppButton to="/app/profile" color="neutral" variant="ghost" size="sm" class="rounded-full" trailing-icon="i-tabler-arrow-right">{{ t('ws.settings.viewProfile') }}</AppButton>
      </div>
      <div class="settings-layout">
        <nav class="settings-nav" :aria-label="t('ws.settings.navAria')">
          <a v-for="item in settingsSections" :key="item.id" :href="`#${item.id}`" class="settings-nav-link" @click.prevent="scrollToSection(item.id)">
            <UIcon :name="item.icon" class="size-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span class="settings-nav-dot" :class="item.done ? 'settings-nav-dot--on' : ''" :title="item.done ? t('ws.settings.configured') : t('ws.settings.notConfigured')" />
          </a>
        </nav>
        <div class="min-w-0 space-y-4">
        <AppCard id="settings-password" class="settings-panel min-w-0">
          <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-lock" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('ws.settings.password') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.settings.passwordDetail') }}</p></div></div></template>
          <form class="space-y-4" @submit.prevent="changePassword">
            <UAlert v-if="passwordError" color="error" variant="subtle" :description="passwordError" />
            <UFormField :label="t('ws.settings.newPassword')" required><UInput v-model="passwordForm.password" type="password" autocomplete="new-password" class="w-full" /></UFormField>
            <UFormField :label="t('ws.settings.confirmPassword')" required><UInput v-model="passwordForm.confirm" type="password" autocomplete="new-password" class="w-full" /></UFormField>
            <div class="flex justify-end"><AppButton type="submit" :loading="passwordSaving">{{ t('ws.settings.changePassword') }}</AppButton></div>
          </form>
        </AppCard>

        <AppCard id="settings-email" class="settings-panel min-w-0">
          <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-mail" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('ws.settings.recoveryEmail') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ emailDetail }}</p></div></div></template>
          <form v-if="capabilities.email_verification !== false" class="space-y-4" @submit.prevent="updateEmail">
            <UAlert v-if="emailError" color="error" variant="subtle" :description="emailError" />
            <UFormField :label="t('ws.settings.emailAddress')" required><UInput v-model="email" type="email" autocomplete="email" class="w-full" :disabled="capabilities.email_verification === false" /></UFormField>
            <div class="flex flex-wrap justify-end gap-2">
              <AppButton v-if="user?.email_status.configured" type="button" color="error" variant="soft" :loading="emailSaving" @click="clearEmail">{{ t('ws.settings.removeEmail') }}</AppButton>
              <AppButton v-if="user?.email_status.configured && !user?.email_status.verified" type="button" color="neutral" variant="outline" :loading="emailSaving" @click="requestVerification">{{ t('ws.settings.resendVerification') }}</AppButton>
              <AppButton type="submit" :loading="emailSaving" :disabled="capabilities.email_verification === false">{{ t('ws.settings.saveVerify') }}</AppButton>
            </div>
          </form>
        </AppCard>

        <AppCard id="settings-totp" class="settings-panel min-w-0">
          <template #header>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 flex-1 items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-device-mobile" class="size-5" aria-hidden="true" /></span><div class="min-w-0"><h2 class="text-sm font-semibold">{{ t('ws.settings.authenticator') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ user?.totp_enabled ? t('ws.settings.totpOn') : t('ws.settings.totpOff') }}</p></div></div>
              <UBadge :color="user?.totp_enabled ? 'success' : 'neutral'" variant="subtle">{{ user?.totp_enabled ? t('ws.settings.enabled') : t('ws.settings.notEnabled') }}</UBadge>
            </div>
          </template>
          <div class="space-y-4">
            <UAlert v-if="totpError" color="error" variant="subtle" :description="totpError" />
            <div class="flex flex-wrap gap-2">
              <AppButton color="primary" variant="soft" :loading="totpLoading" @click="showTOTP(false)">{{ user?.totp_enabled ? t('ws.settings.viewSetup') : t('ws.settings.setupAuthenticator') }}</AppButton>
              <AppButton v-if="user?.totp_enabled || totpSetup" color="neutral" variant="ghost" :loading="totpLoading" @click="showTOTP(true)">{{ t('ws.settings.regenerate') }}</AppButton>
              <AppButton v-if="user?.totp_enabled" color="error" variant="soft" @click="openTOTPDelete">{{ t('ws.settings.disableTotp') }}</AppButton>
            </div>
            <form v-if="totpSetup" class="settings-setup min-w-0 space-y-4 rounded-xl border p-4" @submit.prevent="bindTOTP">
              <p class="text-sm text-[var(--ui-text-muted)]">{{ t('ws.settings.setupHelp') }}</p>
              <div>
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)]">{{ t('ws.settings.rawSecret') }}</p>
                <div class="mt-1 flex items-start gap-2"><code class="min-w-0 flex-1 break-all text-sm font-semibold">{{ totpSetup.secret }}</code><AppButton type="button" icon="i-tabler-clipboard" color="neutral" variant="ghost" size="xs" :aria-label="t('ws.settings.copySecret')" @click="copyText(totpSetup.secret, t('ws.settings.secretCopied'))" /></div>
              </div>
              <div v-if="totpSetup.otp_auth_url">
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)]">{{ t('ws.settings.setupLink') }}</p>
                <a :href="totpSetup.otp_auth_url" class="mt-1 block break-all text-sm text-primary-500 underline underline-offset-2">{{ totpSetup.otp_auth_url }}</a>
                <p class="mt-1 text-xs text-[var(--ui-text-dimmed)]">{{ t('ws.settings.noQr') }}</p>
              </div>
              <UFormField :label="t('ws.settings.verificationCode')" required><UInput v-model="totpCode" class="w-full font-mono tracking-[0.3em]" inputmode="numeric" autocomplete="one-time-code" /></UFormField>
              <div class="flex justify-end"><AppButton type="submit" :loading="totpSaving">{{ user?.totp_enabled ? t('ws.settings.confirmRegenerated') : t('ws.settings.enableTotp') }}</AppButton></div>
            </form>
          </div>
        </AppCard>

        <AppCard id="settings-passkeys" class="settings-panel settings-passkeys min-w-0 overflow-hidden" :ui="{ body: 'p-0' }">
          <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-fingerprint" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('ws.settings.passkeys') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.settings.passkeysDetail') }}</p></div></div></template>
          <div class="settings-passkey-form">
            <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="addPasskey">
              <UFormField :label="t('ws.settings.passkeyName')" :hint="t('ws.settings.optional')" class="min-w-0 flex-1"><UInput v-model="passkeyName" class="w-full" placeholder="MacBook Touch ID" /></UFormField>
              <AppButton type="submit" icon="i-tabler-fingerprint" :loading="passkeySaving">{{ t('ws.settings.addPasskey') }}</AppButton>
            </form>
            <UAlert v-if="passkeyError" class="mt-4" color="error" variant="subtle" :description="passkeyError" />
          </div>
          <div v-if="user?.passkeys?.length" class="overflow-x-auto">
            <AppTable :data="user?.passkeys || []" :columns="passkeyColumns" :empty="t('ws.settings.noPasskeysRegistered')" class="min-w-[560px]">
              <template #empty><div class="flex flex-col items-center gap-2 py-6 text-center"><span class="settings-icon mb-1 flex size-10 items-center justify-center rounded-xl"><UIcon name="i-tabler-fingerprint" class="size-5" aria-hidden="true" /></span><p class="text-sm font-medium text-[var(--ui-text-highlighted)]">{{ t('ws.settings.noPasskeysTitle') }}</p><p class="max-w-xs text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.settings.noPasskeysHint') }}</p></div></template>
              <template #name-cell="{ row }"><span class="font-medium">{{ row.original.name || t('ws.settings.unnamedPasskey') }}</span></template>
              <template #created_at-cell="{ row }">{{ formatDate(row.original.created_at) }}</template>
              <template #updated_at-cell="{ row }">{{ formatDate(row.original.updated_at) }}</template>
              <template #actions-cell="{ row }">
                <div class="flex justify-end"><AppButton icon="i-tabler-trash" color="error" variant="ghost" size="sm" :aria-label="t('ws.settings.deleteAria', { name: row.original.name || t('ws.settings.passkeyFallback') })" @click="confirmPasskeyDelete(row.original)" /></div>
              </template>
            </AppTable>
          </div>
          <p v-else class="settings-passkey-empty text-xs text-[var(--ui-text-muted)]">{{ t('ws.settings.noPasskeysShort') }}</p>
        </AppCard>
        </div>
      </div>
    </section>

    <AppModal v-model:open="keyFormOpen" :title="editingKey ? t('ws.keys.formEditTitle') : t('ws.keys.formCreateTitle')" :description="editingKey ? t('ws.keys.formEditDesc') : t('ws.keys.formCreateDesc')">
      <template #body>
        <form class="space-y-5" @submit.prevent="saveKey">
          <div class="flex items-start gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-4"><UIcon name="i-tabler-shield-lock" class="mt-0.5 size-5 shrink-0 text-[var(--ui-primary)]" aria-hidden="true" /><p class="text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.keys.formNotice') }}</p></div>
          <UAlert v-if="keyFormError" color="error" variant="subtle" :description="keyFormError" />
          <UFormField :label="t('ws.keys.name')" :hint="t('ws.keys.nameHint')"><UInput v-model="keyName" icon="i-tabler-tag" class="w-full" maxlength="128" :placeholder="t('ws.keys.namePlaceholder')" /></UFormField>
          <UFormField :label="t('ws.keys.key')" :hint="editingKey ? t('ws.keys.keyHintEdit') : t('ws.keys.keyHintCreate')">
            <UInput v-model="keyValue" icon="i-tabler-key" class="w-full font-mono" autocomplete="off" />
          </UFormField>

          <div class="flex justify-end gap-2"><AppButton type="button" color="neutral" variant="ghost" @click="closeKeyForm">{{ t('common.cancel') }}</AppButton><AppButton type="submit" :loading="keySaving">{{ editingKey ? t('ws.keys.save') : t('ws.keys.create') }}</AppButton></div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="keyDeleteOpen" :title="t('ws.keys.deleteTitle')" :description="t('ws.keys.deleteDesc')">
      <template #body><div class="space-y-5"><p class="break-all text-sm">{{ t('ws.keys.deletePrompt') }} <code>{{ keyDeleteTarget ? maskKey(keyDeleteTarget.api_key) : '' }}</code>?</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="keyDeleting" @click="closeKeyDelete">{{ t('common.cancel') }}</AppButton><AppButton color="error" icon="i-tabler-trash" :loading="keyDeleting" @click="deleteKey">{{ t('ws.keys.deleteKey') }}</AppButton></div></div></template>
    </AppModal>

    <AppModal v-model:open="totpDeleteOpen" :title="t('ws.settings.totpDeleteTitle')" :description="t('ws.settings.totpDeleteDesc')">
      <template #body><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="totpDeleting" @click="closeTOTPDelete">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="totpDeleting" @click="deleteTOTP">{{ t('ws.settings.disableTotp') }}</AppButton></div></template>
    </AppModal>

    <AppModal v-model:open="passkeyDeleteOpen" :title="t('ws.settings.passkeyDeleteTitle')" :description="t('ws.settings.passkeyDeleteDesc')">
      <template #body><div class="space-y-5"><p class="text-sm">{{ t('ws.settings.passkeyDeletePrompt', { name: passkeyDeleteTarget?.name || t('ws.settings.thisPasskey') }) }}</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="passkeyDeleting" @click="closePasskeyDelete">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="passkeyDeleting" @click="deletePasskey">{{ t('ws.settings.deletePasskey') }}</AppButton></div></div></template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceState } from '~/composables/useWorkspaceState'
const props = withDefaults(defineProps<{ section?: 'dashboard' | 'api-keys' | 'settings' | 'billing' }>(), { section: 'dashboard' })
const section = computed(() => props.section)

type BillingRange = { from: string; to: string }
type WorkspaceBillingOverview = BillingOverview & {
  request_count?: number
  input_tokens?: number
  output_tokens?: number
  cache_tokens?: number
  total_charge_amount?: number
}
type BillingChargesResponse = { items?: BillingCharge[]; data?: BillingCharge[]; total?: number; limit?: number; offset?: number }
type TOTPSetup = { secret: string; otp_auth_url?: string; issuer?: string; enabled?: boolean }
type WorkspaceKey = Omit<UserApiKey, 'id'> & { id: number | null; index: number }
type PeriodWindowStatus = { id: string; enabled: boolean; limit: number | null; used: number; remaining: number | null; active: boolean; reset_at?: string | null }
type PeriodLimitsStatus = { windows?: PeriodWindowStatus[] }

const dashboardMetricIcons = ['i-tabler-calendar-stats', 'i-tabler-sun', 'i-tabler-calendar-month', 'i-tabler-activity']

const toast = useToast()
const { t, intlLocale } = usePortalI18n()
const { currentUser: user, fetchAPI, loadCurrentUser, saveSession, capabilities, serverInfo, loadCapabilities, registerPasskey } = useUserApi()

const curlExample = computed(() => {
  const url = new URL(serverInfo.value.cpa_public_url || 'https://api.gonkagate.com/v1')
  const basePath = url.pathname.replace(/\/+$/, '')
  url.pathname = `${basePath.endsWith('/v1') ? basePath : `${basePath}/v1`}/chat/completions`
  url.search = ''
  url.hash = ''
  const endpoint = url.toString().replace(/'/g, "'\\''")
  return [
    `curl '${endpoint}' \\`,
    '  -H "Authorization: Bearer gp-..." \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "model": "<model-id>",',
    '    "messages": [{"role": "user", "content": "Hello"}]',
    "  }'"
  ].join('\n')
})

const pageError = useWorkspaceState('user:workspace:page-error', () => '')
const keys = useWorkspaceState<WorkspaceKey[]>('user:workspace:keys', () => [])
const keySearch = ref('')
const filteredKeys = computed(() => {
  const query = keySearch.value.trim().toLowerCase()
  if (!query) return keys.value
  return keys.value.filter(key =>
    (key.display_name || t('ws.keys.unnamed')).toLowerCase().includes(query) ||
    key.api_key.toLowerCase().includes(query)
  )
})
const keysLoading = useWorkspaceState('user:workspace:keys-loading', () => false)
const selectedOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:selected-overview', () => null)
const todayOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:today-overview', () => null)
const monthOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:month-overview', () => null)
const charges = useWorkspaceState<BillingCharge[]>('user:workspace:charges', () => [])
const chargesTotal = useWorkspaceState('user:workspace:charges-total', () => 0)
const billingLoading = useWorkspaceState('user:workspace:billing-loading', () => false)
const billingError = useWorkspaceState('user:workspace:billing-error', () => '')
const periodLimits = useWorkspaceState<PeriodLimitsStatus | null>('user:workspace:period-limits', () => null)

let billingRequest = 0

const rangeOptions = computed(() => [
  { label: t('ws.range.today'), value: 'today' },
  { label: t('ws.range.7d'), value: '7d' },
  { label: t('ws.range.30d'), value: '30d' },
  { label: t('ws.range.custom'), value: 'custom' }
])
const pageSizeOptions = [5, 20, 50, 100].map(value => ({ label: String(value), value }))
const rangePreset = ref('today')
const rangeFrom = ref('')
const rangeTo = ref('')
const appliedRange = ref<BillingRange>(presetRange('today'))
const chargePage = ref(1)
const chargePageSize = ref(5)
const chargePages = computed(() => Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)))
const chargeRangeStart = computed(() => chargesTotal.value ? (chargePage.value - 1) * chargePageSize.value + 1 : 0)
const chargeRangeEnd = computed(() => Math.min(chargePage.value * chargePageSize.value, chargesTotal.value))
const topModels = computed(() => (selectedOverview.value?.top_models || []).slice(0, 5))
const activePeriodWindows = computed(() => (periodLimits.value?.windows || []).filter(window => window.enabled && window.limit != null))

const keyFormOpen = ref(false)
const keyFormError = useWorkspaceState('user:workspace:key-form-error', () => '')
const keySaving = useWorkspaceState('user:workspace:key-saving', () => false)
const editingKey = ref<WorkspaceKey | null>(null)
const keyValue = ref('')
const keyName = ref('')
const keyDeleteOpen = ref(false)
const keyDeleteTarget = ref<WorkspaceKey | null>(null)
const keyDeleting = useWorkspaceState('user:workspace:key-deleting', () => false)

const passwordForm = reactive({ password: '', confirm: '' })
const passwordError = useWorkspaceState('user:workspace:password-error', () => '')
const passwordSaving = useWorkspaceState('user:workspace:password-saving', () => false)
const email = ref('')
const emailError = useWorkspaceState('user:workspace:email-error', () => '')
const emailSaving = useWorkspaceState('user:workspace:email-saving', () => false)
const totpSetup = useWorkspaceState<TOTPSetup | null>('user:workspace:totp-setup', () => null)
const totpCode = ref('')
const totpError = useWorkspaceState('user:workspace:totp-error', () => '')
const totpLoading = useWorkspaceState('user:workspace:totp-loading', () => false)
const totpSaving = useWorkspaceState('user:workspace:totp-saving', () => false)
const totpDeleteOpen = ref(false)
const totpDeleting = useWorkspaceState('user:workspace:totp-deleting', () => false)
const passkeyName = ref('')
const passkeyError = useWorkspaceState('user:workspace:passkey-error', () => '')
const passkeySaving = useWorkspaceState('user:workspace:passkey-saving', () => false)
const passkeyDeleteOpen = ref(false)
const passkeyDeleteTarget = ref<UserPasskey | null>(null)
const passkeyDeleting = useWorkspaceState('user:workspace:passkey-deleting', () => false)


const passkeyColumns = computed(() => [
  { accessorKey: 'name', header: t('ws.settings.col.name') },
  { accessorKey: 'created_at', header: t('ws.settings.col.created') },
  { accessorKey: 'updated_at', header: t('ws.settings.col.updated') },
  { id: 'actions', header: t('ws.settings.col.actions'), meta: { class: { th: 'text-right', td: 'text-right' } } }
])

const chargeColumns = computed(() => [
  { accessorKey: 'created_at', header: t('ws.billing.col.time') },
  { accessorKey: 'provider', header: t('ws.billing.col.provider') },
  { accessorKey: 'model', header: t('ws.billing.col.model') },
  { accessorKey: 'input_tokens', header: t('ws.billing.col.inputTokens') },
  { accessorKey: 'output_tokens', header: t('ws.billing.col.outputTokens') },
  { accessorKey: 'amount', header: t('ws.billing.col.charge') },
  { accessorKey: 'balance_after', header: t('ws.billing.col.balanceAfter') }
])



const billingMetrics = computed(() => [
  { label: t('ws.billing.selectedRange'), value: formatCredits(selectedOverview.value?.total_charge_amount ?? selectedOverview.value?.today_spend), detail: `${appliedRange.value.from} – ${appliedRange.value.to}` },
  { label: t('ws.billing.today'), value: formatCredits(todayOverview.value?.total_charge_amount ?? todayOverview.value?.today_spend), detail: t('ws.billing.todayDetail') },
  { label: t('ws.billing.thisMonth'), value: formatCredits(monthOverview.value?.total_charge_amount ?? monthOverview.value?.month_spend), detail: t('ws.billing.monthDetail') },
  { label: t('ws.dashboard.requests'), value: formatNumber(selectedOverview.value?.request_count), detail: t('ws.billing.tokensDetail', { input: formatNumber(selectedOverview.value?.input_tokens), output: formatNumber(selectedOverview.value?.output_tokens) }) }
])

const settingsSections = computed(() => [
  { id: 'settings-password', label: t('ws.settings.password'), icon: 'i-tabler-lock', done: true },
  { id: 'settings-email', label: t('ws.settings.recoveryEmail'), icon: 'i-tabler-mail', done: Boolean(user.value?.email_status?.verified) },
  { id: 'settings-totp', label: t('ws.settings.authenticator'), icon: 'i-tabler-device-mobile', done: Boolean(user.value?.totp_enabled) },
  { id: 'settings-passkeys', label: t('ws.settings.passkeys'), icon: 'i-tabler-fingerprint', done: Boolean(user.value?.passkey_count) }
])
function scrollToSection(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

const dashboardUsageMetrics = computed(() => [
  { label: t('ws.dashboard.creditsSpent'), value: formatCredits(selectedOverview.value?.total_charge_amount ?? selectedOverview.value?.today_spend), icon: 'i-tabler-coins' },
  { label: t('ws.dashboard.requests'), value: formatNumber(selectedOverview.value?.request_count), icon: 'i-tabler-arrows-exchange' },
  { label: t('ws.dashboard.inputTokens'), value: formatCompactNumber(selectedOverview.value?.input_tokens), icon: 'i-tabler-arrow-bar-to-right' },
  { label: t('ws.dashboard.outputTokens'), value: formatCompactNumber(selectedOverview.value?.output_tokens), icon: 'i-tabler-arrow-bar-to-left' }
])
const limitAlert = computed(() => {
  const highest = Math.max(0, ...activePeriodWindows.value.map(periodWindowRatio))
  if (!activePeriodWindows.value.length) return null
  if (highest >= 1) return { label: t('ws.dashboard.limitReached'), color: 'error' as const }
  if (highest >= 0.8) return { label: t('ws.dashboard.nearLimit'), color: 'warning' as const }
  return null
})
const dashboardStatusLine = computed(() => {
  if (limitAlert.value?.color === 'error') return t('ws.dashboard.statusReached')
  if (limitAlert.value) return t('ws.dashboard.statusNear')
  if (user.value && Number(user.value.credits) <= 0) return t('ws.dashboard.statusEmpty')
  return t('ws.dashboard.statusReady')
})

const emailDetail = computed(() => {
  if (capabilities.value.email_verification === false) return t('ws.settings.emailDisabled')
  if (!user.value?.email_status.configured) return t('ws.settings.noEmail')
  return user.value.email_status.verified ? t('ws.settings.emailVerified', { email: user.value.email_status.masked }) : t('ws.settings.emailPending', { email: user.value.email_status.masked })
})

function presetRange(preset: string): BillingRange {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end)
  if (preset === 'month') start.setUTCDate(1)
  else start.setUTCDate(start.getUTCDate() - (preset === '30d' ? 29 : preset === '7d' ? 6 : 0))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}
function overviewValue(response: any): WorkspaceBillingOverview {
  return (response?.overview && typeof response.overview === 'object' ? response.overview : response || {}) as WorkspaceBillingOverview
}
function rowValue(row: any): BillingCharge { return row?.original ?? row }

function isObject(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function keyEntries(payload: any): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isObject(payload)) return []
  for (const name of ['api_keys', 'api-keys', 'items', 'data']) {
    const value = payload[name]
    if (Array.isArray(value)) return value
    if (isObject(value)) {
      const nested = keyEntries(value)
      if (nested.length) return nested
    }
  }
  return []
}
function numericArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(Number).filter(item => Number.isInteger(item) && item > 0)
}
function normalizeKey(entry: unknown, index: number): WorkspaceKey | null {
  const source = isObject(entry) ? entry : {}
  const value = String(typeof entry === 'string' ? entry : source.api_key ?? source['api-key'] ?? source.key ?? source.value ?? '').trim()
  if (!value) return null
  const numericID = Number(source.id ?? source.api_key_id ?? source['api-key-id'])
  return {
    id: Number.isInteger(numericID) && numericID > 0 ? numericID : null,
    index,
    api_key: value,
    display_name: typeof source.display_name === 'string' ? source.display_name.trim() || null : null,
    channels: numericArray(source.channels),
    model_groups: numericArray(source.model_groups ?? source['model-groups']),
    created_at: typeof source.created_at === 'string' ? source.created_at : undefined,
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : undefined
  }
}
function errorMessage(error: any, fallback: string) { return error?.data?.message || error?.data?.error || error?.message || fallback }
function periodWindowLabel(id: string) { return id === '5h' ? t('ws.window.5h') : id === '1d' ? t('ws.window.1d') : id === '7d' ? t('ws.window.7d') : id === '30d' ? t('ws.window.30d') : id }
function periodWindowRatio(window: PeriodWindowStatus) { const limit = Number(window.limit); return limit > 0 ? Math.max(0, Math.min(1, Number(window.used || 0) / limit)) : 1 }
function periodWindowColor(window: PeriodWindowStatus) { const ratio = periodWindowRatio(window); return ratio >= 1 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ratio >= 0.8 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400' }
function periodWindowBarColor(window: PeriodWindowStatus) { const ratio = periodWindowRatio(window); return ratio >= 1 ? 'bg-red-600 dark:bg-red-400' : ratio >= 0.8 ? 'bg-amber-600 dark:bg-amber-400' : 'bg-violet-600 dark:bg-violet-400' }
function formatPercent(value: number) { return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }

async function loadPeriodLimits() {
  try { periodLimits.value = await fetchAPI<PeriodLimitsStatus>('/period-limits') }
  catch (error: any) { if (error?.statusCode !== 404) throw error; periodLimits.value = null }
}


async function loadKeys() {
  keysLoading.value = true
  try {
    const response = await fetchAPI<any>('/api-keys')
    keys.value = keyEntries(response).map(normalizeKey).filter((item): item is WorkspaceKey => Boolean(item))
  } finally {
    keysLoading.value = false
  }
}
async function loadDashboardBilling() {
  billingLoading.value = true
  billingError.value = ''
  try {
    const request = ++billingRequest
    const [selectedResponse, todayResponse, monthResponse] = await Promise.all([
      fetchAPI<any>('/billing/overview', { query: appliedRange.value }),
      fetchAPI<any>('/billing/overview', { query: presetRange('today') }),
      fetchAPI<any>('/billing/overview', { query: presetRange('month') })
    ])
    if (request !== billingRequest) return
    todayOverview.value = overviewValue(todayResponse)
    selectedOverview.value = overviewValue(selectedResponse)
    monthOverview.value = overviewValue(monthResponse)
  } catch (error: any) {
    billingError.value = errorMessage(error, t('ws.billing.loadSummaryFailed'))
  } finally {
    billingLoading.value = false
  }
}
async function loadBilling() {
  if (section.value === 'dashboard') return loadDashboardBilling()
  const request = ++billingRequest
  const selected = appliedRange.value
  const today = presetRange('today')
  const month = presetRange('month')
  const limit = chargePageSize.value
  const offset = (chargePage.value - 1) * limit
  billingLoading.value = true
  billingError.value = ''
  try {
    const [selectedResponse, todayResponse, monthResponse, chargesResponse] = await Promise.all([
      fetchAPI<any>('/billing/overview', { query: selected }),
      fetchAPI<any>('/billing/overview', { query: today }),
      fetchAPI<any>('/billing/overview', { query: month }),
      fetchAPI<BillingChargesResponse>('/billing/charges', { query: { ...selected, limit, offset } })
    ])
    if (request !== billingRequest) return
    selectedOverview.value = overviewValue(selectedResponse)
    todayOverview.value = overviewValue(todayResponse)
    monthOverview.value = overviewValue(monthResponse)
    charges.value = Array.isArray(chargesResponse?.items) ? chargesResponse.items : Array.isArray(chargesResponse?.data) ? chargesResponse.data : []
    chargesTotal.value = Number(chargesResponse?.total) || 0
  } catch (error: any) {
    if (request === billingRequest) billingError.value = errorMessage(error, t('ws.billing.loadFailed'))
  } finally {
    if (request === billingRequest) billingLoading.value = false
  }
}
async function loadWorkspace() {
  pageError.value = ''
  const tasks: Promise<unknown>[] = []
  if (section.value === 'billing') tasks.push(loadBilling())
  else {
    tasks.push(loadCapabilities(), loadCurrentUser())
    if (section.value === 'api-keys') tasks.push(loadKeys())
    if (section.value === 'dashboard') tasks.push(loadPeriodLimits(), loadDashboardBilling())
  }
  const results = await Promise.allSettled(tasks)
  const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
  if (failures.length) pageError.value = failures.map(result => errorMessage(result.reason, t('ws.loadFailed'))).join(' · ')
  email.value = ''
}
function selectRange(preset: string) {
  if (preset === 'custom') {
    rangeFrom.value = appliedRange.value.from
    rangeTo.value = appliedRange.value.to
    return
  }
  appliedRange.value = presetRange(preset)
  chargePage.value = 1
  void loadBilling()
}
function applyBillingRange() {
  if (!rangeFrom.value || !rangeTo.value || rangeFrom.value > rangeTo.value) {
    billingError.value = t('ws.billing.invalidRange')
    return
  }
  appliedRange.value = { from: rangeFrom.value, to: rangeTo.value }
  chargePage.value = 1
  void loadBilling()
}
function changePageSize() {

  chargePage.value = 1
  void loadBilling()
}
function changeChargePage(delta: number) {
  const next = chargePage.value + delta
  if (next < 1 || next > chargePages.value) return
  chargePage.value = next
  void loadBilling()
}

function openKeyForm(key?: WorkspaceKey) {
  editingKey.value = key || null
  keyValue.value = key?.api_key || ''
  keyName.value = key?.display_name || ''
  keyFormError.value = ''
  keyFormOpen.value = true
}
function closeKeyForm() { keyFormOpen.value = false }
function closeKeyDelete() { keyDeleteOpen.value = false }
function openTOTPDelete() { totpDeleteOpen.value = true }
function closeTOTPDelete() { totpDeleteOpen.value = false }
function closePasskeyDelete() { passkeyDeleteOpen.value = false }
async function saveKey() {
  keyFormError.value = ''
  const nextValue = keyValue.value.trim()
  const nextName = keyName.value.trim()
  if ([...nextName].length > 128) {
    keyFormError.value = t('ws.keys.nameTooLong')
    return
  }
  if (editingKey.value && !nextValue) {
    keyFormError.value = t('ws.keys.keyRequired')
    return
  }
  keySaving.value = true
  try {
    if (editingKey.value) {
      if (editingKey.value.id != null) {
        await fetchAPI(`/api-keys/${editingKey.value.id}`, { method: 'PATCH', body: { api_key: nextValue, display_name: nextName } })
      } else {
        await fetchAPI('/api-keys', { method: 'PATCH', body: { old: editingKey.value.api_key, new_api_key: nextValue, display_name: nextName } })
      }
    } else {
      await fetchAPI('/api-keys', { method: 'POST', body: { ...(nextValue ? { api_key: nextValue } : {}), display_name: nextName } })
    }
    keyFormOpen.value = false
    await loadKeys()
    toast.add({ title: editingKey.value ? t('ws.keys.updatedToast') : t('ws.keys.createdToast'), color: 'success' })
  } catch (error: any) {
    keyFormError.value = errorMessage(error, t('ws.keys.saveFailed'))
  } finally {
    keySaving.value = false
  }
}
function confirmKeyDelete(key: WorkspaceKey) {
  keyDeleteTarget.value = key
  keyDeleteOpen.value = true
}
async function deleteKey() {
  const target = keyDeleteTarget.value
  if (!target) return
  keyDeleting.value = true
  try {
    if (target.id != null) await fetchAPI(`/api-keys/${target.id}`, { method: 'DELETE', body: {} })
    else await fetchAPI('/api-keys', { method: 'DELETE', body: { api_key: target.api_key } })
    keyDeleteOpen.value = false
    keyDeleteTarget.value = null
    await loadKeys()
    toast.add({ title: t('ws.keys.deletedToast'), color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('ws.keys.deleteFailed'), description: errorMessage(error, t('ws.keys.deleteFailedDetail')), color: 'error' })
  } finally {
    keyDeleting.value = false
  }
}

async function changePassword() {
  passwordError.value = ''
  if (!passwordForm.password) return void (passwordError.value = t('ws.settings.enterPassword'))
  if (passwordForm.password !== passwordForm.confirm) return void (passwordError.value = t('ws.settings.passwordMismatch'))
  passwordSaving.value = true
  try {
    const session = await fetchAPI<UserSessionResponse>('/password', { method: 'POST', body: { new_password: passwordForm.password } })
    saveSession(session)
    passwordForm.password = ''
    passwordForm.confirm = ''
    toast.add({ title: t('ws.settings.passwordChanged'), color: 'success' })
  } catch (error: any) {
    passwordError.value = errorMessage(error, t('ws.settings.passwordFailed'))
  } finally {
    passwordSaving.value = false
  }
}
async function updateEmail() {
  emailError.value = ''
  const value = email.value.trim()
  if (!value) return void (emailError.value = t('ws.settings.enterEmail'))
  emailSaving.value = true
  try {
    await fetchAPI('/email', { method: 'PUT', body: { email: value } })
    await fetchAPI('/email/verification', { method: 'POST', body: {} })
    await loadCurrentUser()
    email.value = ''
    toast.add({ title: t('ws.settings.emailSaved'), description: t('ws.settings.emailQueued'), color: 'success' })
  } catch (error: any) {
    emailError.value = errorMessage(error, t('ws.settings.emailUpdateFailed'))
  } finally {
    emailSaving.value = false
  }
}
async function clearEmail() {
  emailError.value = ''
  emailSaving.value = true
  try {
    await fetchAPI('/email', { method: 'DELETE', body: {} })
    await loadCurrentUser()
    email.value = ''
    toast.add({ title: t('ws.settings.emailRemoved'), color: 'success' })
  } catch (error: any) {
    emailError.value = errorMessage(error, t('ws.settings.emailRemoveFailed'))
  } finally {
    emailSaving.value = false
  }
}
async function requestVerification() {
  emailError.value = ''
  emailSaving.value = true
  try {
    await fetchAPI('/email/verification', { method: 'POST', body: {} })
    toast.add({ title: t('ws.settings.verificationQueued'), color: 'success' })
  } catch (error: any) {
    emailError.value = errorMessage(error, t('ws.settings.verificationFailed'))
  } finally {
    emailSaving.value = false
  }
}
async function showTOTP(regenerate: boolean) {
  totpError.value = ''
  totpLoading.value = true
  try {
    totpSetup.value = await fetchAPI<TOTPSetup>('/totp', { query: { issuer: 'AI48Hub', ...(regenerate ? { regenerate: true } : {}) } })
    totpCode.value = ''
  } catch (error: any) {
    totpError.value = errorMessage(error, t('ws.settings.totpLoadFailed'))
  } finally {
    totpLoading.value = false
  }
}
async function bindTOTP() {
  if (!totpSetup.value) return
  totpError.value = ''
  if (!totpCode.value.trim()) return void (totpError.value = t('ws.settings.enterCode'))
  totpSaving.value = true
  try {
    await fetchAPI('/totp', { method: 'POST', body: { secret: totpSetup.value.secret, issuer: totpSetup.value.issuer || 'AI48Hub', code: totpCode.value.trim() } })
    await loadCurrentUser()
    totpSetup.value = null
    totpCode.value = ''
    toast.add({ title: t('ws.settings.totpSaved'), color: 'success' })
  } catch (error: any) {
    totpError.value = errorMessage(error, t('ws.settings.totpSaveFailed'))
  } finally {
    totpSaving.value = false
  }
}
async function deleteTOTP() {
  totpDeleting.value = true
  try {
    await fetchAPI('/totp', { method: 'DELETE', body: {} })
    await loadCurrentUser()
    totpSetup.value = null
    totpDeleteOpen.value = false
    toast.add({ title: t('ws.settings.totpDisabled'), color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('ws.settings.totpDisableFailed'), description: errorMessage(error, t('ws.requestFailed')), color: 'error' })
  } finally {
    totpDeleting.value = false
  }
}
async function addPasskey() {
  passkeyError.value = ''
  passkeySaving.value = true
  try {
    await registerPasskey(passkeyName.value.trim())
    passkeyName.value = ''
    toast.add({ title: t('ws.settings.passkeyAdded'), color: 'success' })
  } catch (error: any) {
    passkeyError.value = error?.name === 'NotAllowedError' ? t('ws.settings.passkeyCancelled') : errorMessage(error, t('ws.settings.passkeyAddFailed'))
  } finally {
    passkeySaving.value = false
  }
}
function confirmPasskeyDelete(passkey: UserPasskey) {
  passkeyDeleteTarget.value = passkey
  passkeyDeleteOpen.value = true
}
async function deletePasskey() {
  const target = passkeyDeleteTarget.value
  if (!target) return
  passkeyDeleting.value = true
  try {
    await fetchAPI(`/passkeys/${encodeURIComponent(target.id)}`, { method: 'DELETE', body: {} })
    await loadCurrentUser()
    passkeyDeleteOpen.value = false
    passkeyDeleteTarget.value = null
    toast.add({ title: t('ws.settings.passkeyDeleted'), color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('ws.settings.passkeyDeleteFailed'), description: errorMessage(error, t('ws.requestFailed')), color: 'error' })
  } finally {
    passkeyDeleting.value = false
  }
}

async function copyKey(value: string) { await copyText(value, t('ws.keys.copiedToast')) }
async function copyText(value: string, title: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title, color: 'success' })
  } catch {
    toast.add({ title: t('common.copyFailed'), color: 'error' })
  }
}
function maskKey(value: string) {
  const text = String(value || '')
  return text.length <= 12 ? `${text.slice(0, 3)}***` : `${text.slice(0, 8)}...${text.slice(-4)}`
}

function formatCredits(value: unknown) {
  const number = Number(value)
  return new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2, roundingMode: 'ceil' } as Intl.NumberFormatOptions).format(Number.isFinite(number) ? number : 0)
}
function formatCompactNumber(value: unknown) {
  const number = Number(value)
  return new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Number.isFinite(number) ? number : 0)
}
function formatNumber(value: unknown) {
  const number = Number(value)
  return new Intl.NumberFormat(intlLocale.value).format(Number.isFinite(number) ? number : 0)
}
function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—'
}

onMounted(() => {

  void loadWorkspace()
})
</script>

<style scoped>
.workspace-settings { max-width: 80rem; margin-inline: auto; padding-block: 0.75rem; }
.workspace-settings .settings-panel h2 { font-size: 1rem; letter-spacing: -0.02em; }
.workspace-settings .settings-panel { scroll-margin-top: 1rem; }
.settings-layout { display: grid; gap: 1rem; }
.settings-nav {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0.25rem;
  border: 1px solid var(--user-panel-border);
  border-radius: 0.875rem;
  background: var(--user-panel-bg);
  box-shadow: var(--user-panel-shadow);
}
.settings-nav-link {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 120ms ease, color 120ms ease;
}
.settings-nav-link:hover { background: var(--ui-hover); color: var(--ui-text-highlighted); }
.settings-nav-link:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
.settings-nav-dot { width: 0.5rem; height: 0.5rem; flex-shrink: 0; border-radius: 9999px; background: var(--ui-border-accented); }
.settings-nav-dot--on { background: var(--ui-success); box-shadow: 0 0 0 3px color-mix(in oklch, var(--ui-success) 20%, transparent); }
@media (min-width: 1024px) {
  .settings-layout { grid-template-columns: 15rem minmax(0, 1fr); align-items: start; }
  .settings-nav { position: sticky; top: 0; flex-direction: column; overflow: visible; padding: 0.375rem; }
}
.workspace-settings .settings-icon { border-radius: 0.625rem; }


.workspace-settings .settings-panel :deep([data-slot="header"]) {
  border-bottom: 0;
  padding: 1.5rem 1.5rem 0;
}
.workspace-settings .settings-panel :deep([data-slot="body"]) {
  padding: 1.25rem 1.5rem 1.5rem;
}
.workspace-settings .settings-passkeys :deep([data-slot="body"]) { padding: 0; }
.settings-passkey-form { padding: 1.25rem 1.5rem; }
.settings-passkey-empty { padding: 0 1.5rem 1.5rem; }
@media (min-width: 640px) {
  .workspace-settings .settings-panel :deep([data-slot="header"]) { padding: 1.75rem 1.75rem 0; }
  .workspace-settings .settings-panel :deep([data-slot="body"]) { padding: 1.5rem 1.75rem 1.75rem; }
  .workspace-settings .settings-passkeys :deep([data-slot="body"]) { padding: 0; }
  .settings-passkey-form { padding: 1.5rem 1.75rem; }
  .settings-passkey-empty { padding: 0 1.75rem 1.75rem; }
}

.workspace-settings .settings-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}

.workspace-settings .settings-setup {
  border-color: color-mix(in oklch, var(--ui-primary) 18%, var(--ui-border));
  background: color-mix(in oklch, var(--ui-primary) 4%, var(--ui-bg));
}


.workspace-finance .finance-hero,
.workspace-finance .finance-metric {
  background: radial-gradient(ellipse at 0% 0%, color-mix(in oklch, var(--ui-primary) 9%, transparent), transparent 70%), var(--ui-bg);
  border-color: color-mix(in oklch, var(--ui-primary) 15%, var(--ui-border));
}

.workspace-finance .finance-usage :deep([data-slot="header"]) { border-bottom: 0; padding-bottom: 0; }
.finance-usage h2 { font-size: 1.125rem; letter-spacing: -0.025em; }
.billing-range { padding-block: 0.25rem; }
.billing-stat-strip { align-items: center; padding-block: 0.5rem; }
.billing-stat {
  height: 100%;
  padding: 1rem 1.125rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
}
.billing-stat--featured {
  border-color: color-mix(in oklch, var(--ui-primary) 25%, var(--ui-border));
  background: radial-gradient(ellipse at 100% 0%, color-mix(in oklch, var(--ui-primary) 14%, transparent), transparent 70%), color-mix(in oklch, var(--ui-primary) 5%, var(--user-panel-bg));
}
.billing-stat--featured > p:nth-child(2) { font-size: 2.25rem; line-height: 1.2; }
.billing-stat-icon { color: var(--ui-primary); }
.billing-stat--featured > p:first-child { color: var(--ui-text); }
.billing-models { padding: 0.875rem 1rem; border: 1px solid var(--ui-border); border-radius: 0.875rem; background: var(--user-inset-bg); }
.billing-models summary { list-style: none; border-radius: 0.5rem; }
.billing-models summary::-webkit-details-marker { display: none; }
.billing-models summary:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 4px; }
.billing-model-chevron { transition: transform 150ms ease; }
.billing-models[open] .billing-model-chevron { transform: rotate(180deg); }
.billing-models > div { margin-top: 1.25rem; }
@media (max-width: 639px) {
  .billing-stat-strip { gap: 0.5rem; }
  .billing-stat { padding: 1rem 0.5rem; }
  .billing-stat--featured { padding: 1rem; }
}

.workspace-keys { max-width: 80rem; margin-inline: auto; padding-block: 0.75rem; }
.workspace-keys .key-card {
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.workspace-keys .key-card:is(:hover, :focus-within) {
  border-color: color-mix(in oklch, var(--ui-primary) 35%, var(--ui-border)) !important;
  box-shadow: 0 12px 28px -14px color-mix(in oklch, var(--ui-primary) 40%, transparent) !important;
}
@media (prefers-reduced-motion: reduce) {
  .workspace-keys .key-card { transition: none; }
}

.workspace-finance .finance-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}

.user-dashboard {
  --dashboard-accent: var(--ui-primary);
  max-width: 80rem;
  margin-inline: auto;
  padding-block: 0.25rem 1rem;
}

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
