<template>
  <div class="space-y-4">
    <UAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('billing.requestFailed')"
      :description="pageError"
    />

    <div class="flex items-end justify-between gap-3 border-b border-[var(--ui-border)]">
      <AppPanelTabs v-model="activeSection" :items="sections" :label="t('billing.sectionsLabel')" class="!border-b-0" />
      <div class="flex shrink-0 items-center gap-1 pb-1.5">
        <span class="hidden items-center gap-1 text-xs text-[var(--ui-text-muted)] md:inline-flex" :title="t('billing.timezoneHint')"><UIcon name="i-tabler-world" class="size-3.5" />{{ savedReportTimezone }}</span>
        <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-refresh" :aria-label="t('common.refresh')" :title="t('common.refresh')" :loading="loading" @click="refreshCurrent" />
        <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-settings" :aria-label="t('billing.settings')" :title="t('billing.settings')" :loading="settingsLoading" :disabled="settingsLoading || settingsSaving" @click="openMatchingSettings" />
      </div>
    </div>

    <!-- Overview -->
    <template v-if="activeSection === 'overview'">
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

    <!-- Charge records -->
    <template v-else-if="activeSection === 'charges'">
      <AdminDataPanel :title="t('billing.charges.title')" :description="t('billing.charges.records', { count: formatNumber(chargesTotal) })">
        <template #toolbar>
          <AdminBillingFilterBar v-model:filters="chargeFilters" v-model:preset="chargePreset" :range-options="rangeOptions" :user-options="userSearchOptions" :provider-options="providerSearchOptions" :model-options="modelSearchOptions" :loading="chargesLoading" @range="selectRange('charges', $event)" @apply="applyChargeFilters" @reset="resetChargeFilters" />
        </template>
        <AppTable :columns="chargeColumns" :data="charges" :loading="chargesLoading" :number-offset="(chargePage - 1) * chargePageSize" class="min-w-[56rem]">
          <template #created_at-cell="{ row }"><p class="whitespace-nowrap text-sm">{{ formatDateTime(rowValue(row).created_at) }}</p><p class="max-w-44 truncate font-mono text-xs text-[var(--ui-text-muted)]" :title="rowValue(row).request_id || rowValue(row).id">{{ rowValue(row).request_id || rowValue(row).id }}</p></template>
          <template #user-cell="{ row }"><p class="text-sm font-medium">{{ chargeUserName(rowValue(row)) }}</p><p class="max-w-40 truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).api_key_masked || rowValue(row).api_key_label || t('billing.charges.noClientKey') }}</p></template>
          <template #model-cell="{ row }"><p class="max-w-64 truncate text-sm font-medium" :title="rowValue(row).model">{{ rowValue(row).model || t('common.unknown') }}</p><p class="max-w-64 truncate text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).provider || t('common.unknown') }}<span v-if="rowValue(row).original_model && rowValue(row).original_model !== rowValue(row).model"> · {{ t('billing.charges.fromModel', { model: rowValue(row).original_model }) }}</span></p></template>
          <template #tokens-cell="{ row }"><p class="text-right text-sm tabular-nums">{{ formatNumber(totalChargeTokens(rowValue(row))) }}</p><p class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('billing.charges.tokensInOut', { input: formatNumber(rowValue(row).input_tokens), output: formatNumber(rowValue(row).output_tokens) }) }}</p></template>
          <template #amount-cell="{ row }"><p class="text-right text-sm font-semibold tabular-nums">{{ formatCredits(rowValue(row).amount) }}</p><p class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('billing.charges.balanceShort', { amount: formatCredits(rowValue(row).balance_after) }) }}</p></template>
          <template #actions-cell="{ row }"><AdminTableAction action="view" :label="t('billing.charges.viewDetails')" @click="openChargeDetail(rowValue(row))" /></template>
          <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.charges.empty') }}</div></template>
        </AppTable>
        <template v-if="chargesTotal > 0" #footer><AdminBillingPagination :page="chargePage" :total="chargesTotal" :page-size="chargePageSize" :loading="chargesLoading" @previous="changeChargePage(-1)" @next="changeChargePage(1)" @update:page-size="chargePageSize = $event; changePageSize('charges')" /></template>
      </AdminDataPanel>
    </template>

    <!-- Balance records -->
    <template v-else-if="activeSection === 'balances'">
      <AdminDataPanel :title="t('billing.section.balances')" :description="t('billing.balances.adjustments', { count: formatNumber(balancesTotal) })">
        <template #actions>
          <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-minus" @click="openBalanceAdjustment('deduct')">{{ t('billing.balances.deduct') }}</AppButton>
          <AppButton size="sm" icon="i-tabler-plus" @click="openBalanceAdjustment('recharge')">{{ t('billing.balances.recharge') }}</AppButton>
        </template>
        <template #toolbar>
          <AdminBillingFilterBar v-model:filters="balanceFilters" v-model:preset="balancePreset" :range-options="rangeOptions" :user-options="userSearchOptions" :loading="balancesLoading" @range="selectRange('balances', $event)" @apply="applyBalanceFilters" @reset="resetBalanceFilters" />
        </template>
        <AppTable :columns="balanceColumns" :data="balanceRecords" :loading="balancesLoading" :number-offset="(balancePage - 1) * balancePageSize" class="min-w-[52rem]">
          <template #created_at-cell="{ row }"><p class="whitespace-nowrap text-sm">{{ formatDateTime(rowValue(row).created_at) }}</p><p class="font-mono text-xs text-[var(--ui-text-muted)]">#{{ rowValue(row).id }}</p></template>
          <template #user_id-cell="{ row }"><span class="text-sm font-medium">{{ balanceUserName(rowValue(row)) }}</span></template>
          <template #type-cell="{ row }"><span class="inline-flex items-center gap-1.5 text-sm capitalize"><span class="size-1.5 rounded-full" :class="rowValue(row).type === 'recharge' ? 'bg-green-500' : 'bg-amber-500'" />{{ balanceTypeLabel(rowValue(row).type) }}</span></template>
          <template #amount-cell="{ row }"><p class="text-right text-sm font-semibold tabular-nums" :class="rowValue(row).type === 'recharge' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">{{ rowValue(row).type === 'recharge' ? '+' : '−' }}{{ formatCredits(rowValue(row).amount) }}</p></template>
          <template #balance-cell="{ row }"><p class="text-right text-sm tabular-nums">{{ formatCredits(rowValue(row).balance_after) }}</p><p class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('billing.balances.from', { amount: formatCredits(rowValue(row).balance_before) }) }}</p></template>
          <template #note-cell="{ row }"><p class="max-w-72 truncate text-sm" :title="rowValue(row).note">{{ rowValue(row).note || '—' }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.balances.by', { operator: rowValue(row).operator || '—' }) }}</p></template>
          <template #actions-cell="{ row }"><AdminTableAction action="view" :label="t('billing.balances.viewDetails')" @click="openBalanceDetail(rowValue(row))" /></template>
          <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.balances.empty') }}</div></template>
        </AppTable>
        <template v-if="balancesTotal > 0" #footer><AdminBillingPagination :page="balancePage" :total="balancesTotal" :page-size="balancePageSize" :loading="balancesLoading" @previous="changeBalancePage(-1)" @next="changeBalancePage(1)" @update:page-size="balancePageSize = $event; changePageSize('balances')" /></template>
      </AdminDataPanel>
    </template>

    <!-- Model prices -->
    <template v-else-if="activeSection === 'prices'">
      <UAlert v-if="modelCandidatesError" color="warning" variant="subtle" :title="t('billing.prices.candidatesImportUnavailable')" :description="modelCandidatesError" />
      <AdminBillingPriceImport ref="priceImporter" :providers="importProviderOptions" :models="modelSearchOptions" :candidates="modelCandidates" :available-targets="modelCandidates.filter(candidate => candidate.available)" :price-rules="priceRules" :service-tier-source="savedTierSource" @applied="loadPricesSafely" />
      <AdminDataPanel :title="t('billing.section.prices')" :description="t('billing.prices.ruleCount', { shown: filteredPriceRules.length, total: priceRules.length })">
        <template #actions>
          <UDropdownMenu :items="priceMenuItems" :content="{ align: 'end' }">
            <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-dots-vertical" :aria-label="t('billing.prices.moreActions')" :title="t('billing.prices.moreActions')" />
          </UDropdownMenu>
          <AppButton size="sm" icon="i-tabler-plus" @click="openPriceForm()">{{ t('billing.prices.new') }}</AppButton>
        </template>
        <template #toolbar>
          <div class="flex flex-wrap items-center gap-2">
            <UInput v-model="priceFilters.search" icon="i-tabler-search" :placeholder="t('billing.prices.searchPlaceholder')" :aria-label="t('billing.prices.searchLabel')" class="w-full sm:w-64" />
            <USelect :model-value="priceFilters.enabled || allOptionValue" :items="enabledOptions" value-key="value" label-key="label" :aria-label="t('common.status')" class="w-32" @update:model-value="priceFilters.enabled = $event === allOptionValue ? '' : $event" />
            <USelect :model-value="priceFilters.source || allOptionValue" :items="priceSourceOptions" value-key="value" label-key="label" :aria-label="t('billing.col.source')" class="w-36" @update:model-value="priceFilters.source = $event === allOptionValue ? '' : $event" />
            <UInputMenu v-if="priceSchemaVersion >= 2" v-model="priceFilters.service_tier" :items="priceTierOptions" create-item :placeholder="t('billing.prices.allTiers')" :aria-label="t('billing.prices.serviceTier')" class="w-32" @create="priceFilters.service_tier = $event.trim()" />
            <AppButton v-if="hasPriceFilters" size="sm" color="neutral" variant="ghost" @click="clearPriceFilters">{{ t('billing.prices.clear') }}</AppButton>
            <span class="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)]" :title="settingsForm.service_tier_source === 'response' ? t('billing.prices.matchResponseHint') : t('billing.prices.matchRequestHint')">
              <UIcon name="i-tabler-arrows-exchange" class="size-3.5" />
              {{ priceSchemaVersion >= 2 ? t('billing.prices.tierMatching', { source: savedTierSource === 'response' ? t('billing.prices.responseTier') : t('billing.prices.requestedTier') }) : t('billing.prices.flatOnly') }}
              <span v-if="modelCandidatesLoading">{{ t('billing.prices.loadingCandidates') }}</span>
            </span>
          </div>
        </template>
        <AppTable :columns="priceColumns" :data="filteredPriceRules" :loading="pricesLoading" class="min-w-[72rem]">
          <template #model-cell="{ row }"><div class="group flex min-w-0 items-center gap-1"><div class="min-w-0"><p class="max-w-72 truncate font-mono text-xs font-medium text-[var(--ui-text-highlighted)]" :title="rowValue(row).model">{{ rowValue(row).model }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).provider }}</p></div><AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('billing.prices.copyModelId')" class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" @click="copyText(rowValue(row).model)" /></div></template>
          <template #scope-cell="{ row }"><template v-if="priceSchemaVersion >= 2"><p class="font-mono text-xs">{{ rowValue(row).service_tier || '*' }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ contextBandLabel(rowValue(row).min_input_tokens) }}</p></template><span v-else class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.prices.flat') }}</span></template>
          <template #input-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).input_price_per_million) }}</span></template>
          <template #output-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).output_price_per_million) }}</span></template>
          <template #cache_read-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).cache_read_price_per_million) }}</span></template>
          <template #cache_write-cell="{ row }"><span v-if="Number(rowValue(row).cache_write_price_per_million)" class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).cache_write_price_per_million) }}</span><span v-else class="block text-right text-xs text-[var(--ui-text-dimmed)]" :title="t('billing.prices.noCacheWrite')">—</span></template>
          <template #request-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).request_price) }}</span></template>
          <template #source-cell="{ row }"><span class="text-xs capitalize text-[var(--ui-text-muted)]">{{ priceSourceLabel(rowValue(row).source || 'manual') }}</span></template>
          <template #state-cell="{ row }"><USwitch :model-value="Boolean(rowValue(row).enabled)" :loading="togglingPrice === rowValue(row).id" :aria-label="rowValue(row).enabled ? t('billing.prices.disableRule') : t('billing.prices.enableRule')" @update:model-value="togglePriceEnabled(rowValue(row), $event)" /></template>
          <template #updated-cell="{ row }"><span class="whitespace-nowrap text-xs text-[var(--ui-text-muted)]">{{ formatDateTime(rowValue(row).updated_at) }}</span></template>
          <template #actions-cell="{ row }"><div class="flex justify-end gap-1"><AdminTableAction action="edit" :label="t('billing.prices.edit')" @click="openPriceForm(rowValue(row))" /><AdminTableAction action="delete" :label="t('billing.prices.delete')" destructive @click="confirmDeletePrice(rowValue(row))" /></div></template>
          <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.prices.empty') }}</div></template>
        </AppTable>
      </AdminDataPanel>
    </template>




    <AppModal v-model:open="matchingSettingsOpen" :title="t('billing.settings')" :description="t('billing.settings.description')">
      <template #body><form class="space-y-5" @submit.prevent="saveSettings"><UAlert v-if="settingsError" color="error" variant="subtle" :description="settingsError" /><UFormField :label="t('billing.settings.timezone')" required :error="timezoneError"><UInputMenu v-model="settingsForm.report_timezone" :items="timezoneOptions" create-item :search-input="{ placeholder: t('billing.settings.timezoneSearch') }" class="w-full" @create="settingsForm.report_timezone = $event.trim()" /><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('billing.settings.timezoneHelp') }}</p></UFormField><UFormField :label="t('billing.settings.modelSource')"><USelect v-model="settingsForm.model_source" :items="[{ label: t('billing.settings.modelSourceRequest'), value: 'request' }, { label: t('billing.settings.modelSourceResponse'), value: 'response' }]" value-key="value" label-key="label" class="w-full" /><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ settingsForm.model_source === 'response' ? t('billing.settings.modelSourceResponseHelp') : t('billing.settings.modelSourceRequestHelp') }}</p></UFormField><UFormField :label="t('billing.settings.publicPricing')"><USwitch v-model="settingsForm.public_model_pricing" :aria-label="t('billing.settings.publicPricingLabel')" /><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('billing.settings.publicPricingHelp') }}</p></UFormField><UFormField v-if="priceSchemaVersion >= 2" :label="t('billing.settings.tierSource')"><div class="grid gap-2"><button v-for="option in tierSourceOptions" :key="option.value" type="button" class="rounded-lg border border-[var(--ui-border)] p-3 text-left" :class="settingsForm.service_tier_source === option.value ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10' : ''" @click="settingsForm.service_tier_source = option.value"><span class="font-medium">{{ option.label }}</span><UBadge v-if="option.value === 'request'" class="ml-2" color="neutral" variant="subtle">{{ t('common.default') }}</UBadge><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ option.value === 'request' ? t('billing.settings.tierSourceRequestHelp') : t('billing.settings.tierSourceResponseHelp') }}</p></button></div></UFormField><UAlert v-if="diagnosticsError" color="warning" variant="subtle" :title="t('billing.settings.diagnosticsUnavailable')" :description="diagnosticsError" /><div v-else-if="settingsForm.service_tier_source === 'response' && tierDiagnostics" class="rounded-lg border border-[var(--ui-border)] p-4 text-sm"><p>{{ t('billing.settings.fallbackSummary', { fallback: formatNumber(tierDiagnostics.fallback_requests), eligible: formatNumber(tierDiagnostics.eligible_requests) }) }}</p></div><div class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" @click="matchingSettingsOpen = false">{{ t('common.cancel') }}</AppButton><AppButton type="submit" :loading="settingsSaving || diagnosticsLoading" :disabled="settingsSaving || diagnosticsLoading || !!timezoneError">{{ t('billing.settings.save') }}</AppButton></div></form></template>
    </AppModal>

    <AppModal v-model:open="adjustmentOpen" :title="adjustmentForm.type === 'recharge' ? t('billing.adjust.rechargeTitle') : t('billing.adjust.deductTitle')" :description="t('billing.adjust.description')">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitBalanceAdjustment">
          <UAlert v-if="modalError" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('billing.adjust.failedTitle')" :description="modalError" />
          <div class="grid grid-cols-2 gap-2">
            <AppButton type="button" :color="adjustmentForm.type === 'recharge' ? 'success' : 'neutral'" :variant="adjustmentForm.type === 'recharge' ? 'soft' : 'outline'" @click="adjustmentForm.type = 'recharge'">{{ t('billing.balances.recharge') }}</AppButton>
            <AppButton type="button" :color="adjustmentForm.type === 'deduct' ? 'warning' : 'neutral'" :variant="adjustmentForm.type === 'deduct' ? 'soft' : 'outline'" @click="adjustmentForm.type = 'deduct'">{{ t('billing.balances.deduct') }}</AppButton>
          </div>
          <UFormField :label="t('common.user')" required>
            <USelectMenu v-model="adjustmentForm.user_id" :items="userOptions" value-key="value" label-key="label" :placeholder="t('billing.adjust.searchUsers')" :search-input="{ placeholder: t('billing.adjust.searchUserInput') }" class="w-full" />
          </UFormField>
          <UFormField :label="t('billing.col.amount')" required><UInput v-model="adjustmentForm.amount" type="number" min="0.000001" step="0.000001" class="w-full" /></UFormField>
          <UFormField :label="t('billing.col.note')" :required="adjustmentForm.type === 'deduct'" :hint="adjustmentForm.type === 'deduct' ? t('billing.adjust.noteRequiredHint') : t('common.optional')"><UTextarea v-model="adjustmentForm.note" :rows="3" class="w-full" /></UFormField>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" @click="adjustmentOpen = false">{{ t('common.cancel') }}</AppButton><AppButton type="submit" :color="adjustmentForm.type === 'recharge' ? 'success' : 'warning'" :loading="adjustmentSaving">{{ adjustmentForm.type === 'recharge' ? t('billing.balances.recharge') : t('billing.balances.deduct') }}</AppButton></div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="priceFormOpen" :title="editingPrice ? t('billing.prices.edit') : t('billing.priceForm.newTitle')" :description="t('billing.priceForm.description')" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitPrice">
          <UAlert v-if="modalError" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('billing.priceForm.saveFailedTitle')" :description="modalError" />
          <UAlert v-if="modelCandidatesError" color="warning" variant="subtle" :title="t('billing.priceForm.candidatesUnavailable')" :description="modelCandidatesError" />
          <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
            <div class="flex flex-wrap items-center justify-between gap-2"><div><legend class="font-medium">{{ t('common.models') }}</legend><p class="text-xs text-[var(--ui-text-muted)]">{{ editingPrice ? t('billing.priceForm.selectOne') : t('billing.priceForm.selectMany') }}</p></div><AppButton v-if="selectedPriceCandidates.length" type="button" size="sm" color="neutral" variant="ghost" @click="clearPriceCandidateSelection">{{ t('billing.priceForm.clearSelection') }}</AppButton></div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center"><UInput v-model="modelCandidateSearch" icon="i-tabler-search" :placeholder="t('billing.priceForm.candidateSearch')" class="w-full" /><UCheckbox v-model="availableModelsOnly" :label="t('billing.priceForm.availableOnly')" class="shrink-0" /></div>
            <div v-if="selectedPriceCandidates.length" class="flex flex-wrap gap-2"><UBadge v-for="candidate in selectedPriceCandidates" :key="candidate.key" color="primary" variant="subtle">{{ candidate.provider }} / {{ candidate.model }}</UBadge></div>
            <div class="max-h-72 overflow-y-auto rounded-md border border-[var(--ui-border)]">
              <button v-for="candidate in filteredModelCandidates" :key="candidate.key" type="button" class="flex w-full items-start gap-3 border-b border-[var(--ui-border)] px-3 py-2.5 text-left last:border-b-0 hover:bg-[var(--ui-bg-elevated)]" :class="isPriceCandidateSelected(candidate) ? 'bg-[var(--ui-primary)]/10' : ''" @click="togglePriceCandidate(candidate)">
                <input :type="editingPrice ? 'radio' : 'checkbox'" :checked="isPriceCandidateSelected(candidate)" tabindex="-1" class="mt-1" />
                <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-bg-elevated)] text-xs font-semibold">{{ providerMark(candidate.provider) }}</span>
                <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ candidate.displayName || candidate.model }}</span><span class="block truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ candidate.model }}</span><span class="block truncate text-xs text-[var(--ui-text-muted)]">{{ candidate.provider }} · {{ candidate.available ? t('billing.priceForm.available') : t('billing.priceForm.staticCatalog') }}<template v-if="candidate.ownedBy"> · {{ candidate.ownedBy }}</template><template v-if="candidate.type"> · {{ candidate.type }}</template></span><span v-if="candidate.description" class="mt-1 block line-clamp-2 text-xs text-[var(--ui-text-muted)]">{{ candidate.raw === null && candidate.description === 'Existing model price rule' ? t('billing.priceForm.existingRule') : candidate.description }}</span></span>
              </button>
              <p v-if="modelCandidatesLoading" class="p-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.priceForm.loadingCandidates') }}</p><p v-else-if="!filteredModelCandidates.length" class="p-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.priceForm.noCandidates') }}</p>
            </div>
          </fieldset>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField v-if="priceSchemaVersion >= 2" :label="t('billing.prices.serviceTier')"><USelect v-model="priceForm.service_tier" :items="serviceTierOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
            <UFormField v-if="priceSchemaVersion >= 2" :label="t('billing.priceForm.contextBand')"><USelect v-model="contextPreset" :items="contextPresetOptions" value-key="value" label-key="label" class="w-full" @update:model-value="applyContextPreset" /></UFormField>
            <UFormField v-if="priceSchemaVersion >= 2 && contextPreset === 'custom'" :label="t('billing.priceForm.minInputTokens')"><UInput v-model="priceForm.min_input_tokens" type="number" min="0" step="1" class="w-full" /></UFormField>
            <UFormField :label="t('billing.priceForm.inputPerM')"><UInput v-model="priceForm.input_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField :label="t('billing.priceForm.outputPerM')"><UInput v-model="priceForm.output_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField :label="t('billing.priceForm.cacheReadPerM')"><UInput v-model="priceForm.cache_read_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField :label="t('billing.priceForm.cacheWritePerM')"><UInput v-model="priceForm.cache_write_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField :label="t('billing.col.perRequest')"><UInput v-model="priceForm.request_price" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField :label="t('billing.col.source')"><USelect v-model="priceForm.source" :items="sourceOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('billing.col.note')"><UTextarea v-model="priceForm.note" :rows="3" class="w-full" /></UFormField>
          <div class="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-4"><div><p class="font-medium">{{ t('common.enabled') }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.priceForm.enabledHelp') }}</p></div><USwitch v-model="priceForm.enabled" /></div>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" :disabled="priceSaving" @click="priceFormOpen = false">{{ t('common.cancel') }}</AppButton><AppButton type="submit" :loading="priceSaving">{{ editingPrice ? t('billing.priceForm.saveChanges') : !selectedPriceCandidates.length ? t('billing.priceForm.createNone') : selectedPriceCandidates.length === 1 ? t('billing.priceForm.createOne', { count: 1 }) : t('billing.priceForm.createMany', { count: selectedPriceCandidates.length }) }}</AppButton></div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="deletePriceOpen" :title="t('billing.delete.title')" :description="t('billing.delete.description')">
      <template #body><div class="space-y-5"><UAlert color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('billing.delete.warning')" :description="deletePriceTarget ? `${deletePriceTarget.provider} / ${deletePriceTarget.model} / ${deletePriceTarget.service_tier || '*'}` : ''" /><div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" @click="deletePriceOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="priceDeleting" @click="deletePrice">{{ t('billing.delete.confirm') }}</AppButton></div></div></template>
    </AppModal>

    <AppModal v-model:open="balanceDetailOpen" :title="t('billing.balanceDetail.title')" :description="t('billing.balanceDetail.description')">
          <template #body><dl v-if="selectedBalance" class="grid grid-cols-1 gap-4 sm:grid-cols-2"><div v-for="item in balanceDetailItems" :key="item.label" class="min-w-0"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words text-sm" :class="item.mono ? 'font-mono text-xs' : ''">{{ item.value }}</dd></div></dl></template>
        </AppModal>

        <AppModal v-model:open="tierConfirmOpen" :title="t('billing.tierConfirm.title')" :description="t('billing.tierConfirm.description')">
          <template #body><div class="space-y-4"><p class="text-sm">{{ t('billing.tierConfirm.body', { fallback: formatNumber(tierDiagnostics?.fallback_requests), eligible: formatNumber(tierDiagnostics?.eligible_requests) }) }}</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" @click="tierConfirmOpen = false">{{ t('common.cancel') }}</AppButton><AppButton :loading="settingsSaving" @click="persistSettings">{{ t('billing.tierConfirm.confirm') }}</AppButton></div></div></template>
        </AppModal>

        <AppModal v-model:open="chargeDetailOpen" :title="t('billing.chargeDetail.title')" :description="t('billing.chargeDetail.description')">
      <template #body>
        <div v-if="selectedCharge" class="space-y-5">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-for="item in chargeDetailItems" :key="item.label" class="min-w-0"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words text-sm" :class="item.mono ? 'font-mono text-xs' : ''">{{ item.value }}</dd></div>
          </dl>
          <div class="space-y-3"><p class="text-sm font-semibold">{{ t('billing.detail.priceSnapshot') }}</p><dl v-if="snapshotDetailItems.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2"><div v-for="item in snapshotDetailItems" :key="item.label" class="min-w-0"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words text-sm">{{ item.value }}</dd></div></dl><p v-else class="text-sm text-[var(--ui-text-muted)]">{{ t('billing.detail.noSnapshot') }}</p><details v-if="selectedCharge.price_snapshot"><summary class="cursor-pointer text-xs text-[var(--ui-text-muted)]">{{ t('billing.detail.rawSnapshot') }}</summary><pre class="mt-2 max-h-72 overflow-auto rounded-lg bg-[var(--ui-bg-muted)] p-4 text-xs">{{ prettyJSON(selectedCharge.price_snapshot) }}</pre></details></div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { dateRangeError } from '~/composables/dateRange'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import { billingModelCandidates } from '~/composables/billingModelCandidates'
import { normalizeBillingSettings, billingSettingsPayload } from '~/composables/billingPreferences'
const { fetchAPI } = useApi()
const { t, intlLocale } = useAdminI18n()
const allOptionValue = '__all__'
const toast = useToast()
const pageSizeOptions = [50, 100, 200].map(value => ({ label: String(value), value }))
const rangeOptions = computed(() => [
  { label: t('common.today'), value: 'today' }, { label: t('common.last7d'), value: '7d' },
  { label: t('common.last30d'), value: '30d' }, { label: t('common.custom'), value: 'custom' }
])
const rowValue = row => row?.original ?? row
const savedReportTimezone = useWorkspaceState('admin:billing:savedReportTimezone', () => ('UTC'))
const dateInputValue = date => date.toISOString().slice(0, 10)

function datesForRange(preset) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: savedReportTimezone.value, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = type => parts.find(item => item.type === type).value
  const to = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`)
  const from = new Date(to)
  if (preset === 'all') return { from: '', to: '' }
  if (preset === 'yesterday') { from.setUTCDate(to.getUTCDate() - 1); return { from: dateInputValue(from), to: dateInputValue(from) } }
  if (preset === 'month') from.setUTCDate(1)
  if (preset === '7d') from.setUTCDate(to.getUTCDate() - 6)
  if (preset === '30d') from.setUTCDate(to.getUTCDate() - 29)
  return { from: dateInputValue(from), to: dateInputValue(to) }
}
const defaultRange = () => datesForRange('7d')

const sections = computed(() => [
  { label: t('billing.section.overview'), value: 'overview', icon: 'i-tabler-chart-pie' },
  { label: t('billing.section.charges'), value: 'charges', icon: 'i-tabler-receipt-tax' },
  { label: t('billing.section.balances'), value: 'balances', icon: 'i-tabler-cash-banknote' },
  { label: t('billing.section.prices'), value: 'prices', icon: 'i-tabler-tag' }
])
const activeSection = ref('overview')
const pageError = useWorkspaceState('admin:billing:pageError', () => (''))
const overview = useWorkspaceState('admin:billing:overview', () => (null))
const chargesResponse = useWorkspaceState('admin:billing:chargesResponse', () => (null))
const balancesResponse = useWorkspaceState('admin:billing:balancesResponse', () => (null))
const priceResponse = useWorkspaceState('admin:billing:priceResponse', () => (null))
const usersResponse = useWorkspaceState('admin:billing:usersResponse', () => (null))
const modelCandidatesResponse = useWorkspaceState('admin:billing:modelCandidatesResponse', () => ({ available: [], static: [] }))
const modelCandidatesLoading = useWorkspaceState('admin:billing:modelCandidatesLoading', () => (false))
const modelCandidatesError = useWorkspaceState('admin:billing:modelCandidatesError', () => (''))
const modelCandidateSearch = ref('')
const availableModelsOnly = ref(true)
const selectedPriceCandidateKeys = ref([])
const overviewLoading = useWorkspaceState('admin:billing:overviewLoading', () => (false))
const chargesLoading = useWorkspaceState('admin:billing:chargesLoading', () => (false))
const balancesLoading = useWorkspaceState('admin:billing:balancesLoading', () => (false))
const priceImporter = ref(null)
const importProviderOptions = computed(() => [...new Set([...providerSearchOptions.value, ...modelCandidates.value.map(candidate => candidate.provider)])].sort())
const pricesLoading = useWorkspaceState('admin:billing:pricesLoading', () => (false))
const settingsLoading = useWorkspaceState('admin:billing:settingsLoading', () => (false))
const settingsSaving = useWorkspaceState('admin:billing:settingsSaving', () => (false))

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const settingsForm = ref(normalizeBillingSettings(null))
const settingsError = ref('')
const timezoneOptions = computed(() => {
  let supported = []
  try { supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [] } catch {}
  return [...new Set(['UTC', deviceTimezone, savedReportTimezone.value, 'Asia/Shanghai', 'Asia/Tokyo', 'Europe/London', 'America/New_York', ...supported])].sort((left, right) => left.localeCompare(right))
})
const timezoneError = computed(() => {
  const timezone = settingsForm.value.report_timezone?.trim()
  if (!timezone || /^[+-]/.test(timezone)) return t('billing.settings.timezoneInvalid')
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); return '' }
  catch { return t('billing.settings.timezoneInvalid') }
})
const overviewFilters = ref({ ...defaultRange(), user: '', provider: '', model: '' })
const appliedOverviewFilters = ref({ ...overviewFilters.value })
const chargeFilters = ref({ ...defaultRange(), user: '', provider: '', model: '' })
const appliedChargeFilters = ref({ ...chargeFilters.value })
const balanceFilters = ref({ ...defaultRange(), user: '' })
const appliedBalanceFilters = ref({ ...balanceFilters.value })
const priceFilters = ref({ search: '', enabled: '', service_tier: '', source: '' })
const overviewPreset = ref('7d')
const chargePreset = ref('7d')
const balancePreset = ref('7d')
const chargePageSize = ref(50)
const balancePageSize = ref(50)
const tierDiagnostics = useWorkspaceState('admin:billing:tierDiagnostics', () => (null))
const diagnosticsLoading = useWorkspaceState('admin:billing:diagnosticsLoading', () => (false))
const diagnosticsError = useWorkspaceState('admin:billing:diagnosticsError', () => (''))
const tierConfirmOpen = ref(false)
const matchingSettingsOpen = ref(false)
const savedTierSource = useWorkspaceState('admin:billing:savedTierSource', () => ('request'))
const chargePage = ref(1)
const balancePage = ref(1)

const adjustmentOpen = ref(false)
const adjustmentSaving = useWorkspaceState('admin:billing:adjustmentSaving', () => (false))
const adjustmentForm = ref({ type: 'recharge', user_id: '', amount: '', note: '' })
const priceFormOpen = ref(false)
const priceSaving = useWorkspaceState('admin:billing:priceSaving', () => (false))

const editingPrice = ref(null)
const modalError = ref('')
const deletePriceOpen = ref(false)
const deletePriceTarget = ref(null)
const priceDeleting = useWorkspaceState('admin:billing:priceDeleting', () => (false))
const togglingPrice = useWorkspaceState('admin:billing:togglingPrice', () => (''))
const chargeDetailOpen = ref(false)
const selectedCharge = ref(null)
const balanceDetailOpen = ref(false)
const selectedBalance = ref(null)

const actionColumn = { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
const rightAligned = { class: { th: 'text-right' } }
const chargeColumns = computed(() => [
  { accessorKey: 'created_at', header: t('billing.col.time') },
  { accessorKey: 'user', header: t('common.user') },
  { accessorKey: 'model', header: t('common.model') },
  { accessorKey: 'tokens', header: t('common.tokens'), meta: rightAligned },
  { accessorKey: 'amount', header: t('billing.col.charge'), meta: rightAligned },
  actionColumn
])
const balanceColumns = computed(() => [
  { accessorKey: 'created_at', header: t('billing.col.time') },
  { accessorKey: 'user_id', header: t('common.user') },
  { accessorKey: 'type', header: t('common.type') },
  { accessorKey: 'amount', header: t('billing.col.amount'), meta: rightAligned },
  { accessorKey: 'balance', header: t('billing.col.balance'), meta: rightAligned },
  { accessorKey: 'note', header: t('billing.col.note') },
  actionColumn
])
const priceColumns = computed(() => [
  { accessorKey: 'model', header: t('common.model') },
  { accessorKey: 'scope', header: t('billing.col.tierContext') },
  { accessorKey: 'input', header: t('billing.col.inputPerM'), meta: rightAligned },
  { accessorKey: 'output', header: t('billing.col.outputPerM'), meta: rightAligned },
  { accessorKey: 'cache_read', header: t('billing.col.cacheReadPerM'), meta: rightAligned },
  { accessorKey: 'cache_write', header: t('billing.col.cacheWritePerM'), meta: rightAligned },
  { accessorKey: 'request', header: t('billing.col.perRequest'), meta: rightAligned },
  { accessorKey: 'source', header: t('billing.col.source') },
  { accessorKey: 'state', header: t('common.enabled') },
  { accessorKey: 'updated', header: t('common.updated') },
  actionColumn
])
const enabledOptions = computed(() => [{ label: t('billing.prices.allRules'), value: allOptionValue }, { label: t('common.enabled'), value: 'true' }, { label: t('common.disabled'), value: 'false' }])
const sourceOptions = computed(() => [{ label: t('billing.source.manual'), value: 'manual' }, { label: t('common.default'), value: 'default' }, { label: t('billing.source.sync'), value: 'sync' }])
const priceSourceOptions = computed(() => [{ label: t('billing.prices.allSources'), value: allOptionValue }, ...sourceOptions.value])
const tierSourceOptions = computed(() => [{ label: t('billing.tierSource.request'), value: 'request' }, { label: t('billing.tierSource.response'), value: 'response' }])
const serviceTierOptions = computed(() => [{ label: t('billing.tier.all'), value: '*' }, { label: t('billing.tier.standard'), value: 'standard' }, { label: t('billing.tier.flex'), value: 'flex' }, { label: t('billing.tier.priority'), value: 'priority' }])
const contextPresetOptions = computed(() => [{ label: t('billing.context.base'), value: 'base' }, { label: t('billing.context.272k'), value: '272k' }, { label: t('billing.context.custom'), value: 'custom' }])
function priceSourceLabel(source) { return sourceOptions.value.find(option => option.value === source)?.label || source }
function balanceTypeLabel(type) { return type === 'recharge' ? t('billing.balances.recharge') : type === 'deduct' ? t('billing.balances.deduct') : type }
function dateErrorLabel(error) {
  if (error.startsWith('Enter a valid date and time')) return t('billing.date.invalidDateTime')
  if (error.startsWith('Enter a valid date')) return t('billing.date.invalidDate')
  if (error.startsWith('Start must be')) return t('billing.date.order')
  return error
}
const contextPreset = ref('base')
function applyContextPreset(value) { if (value === 'base') priceForm.value.min_input_tokens = '0'; else if (value === '272k') priceForm.value.min_input_tokens = '272001' }

const emptyPriceForm = () => ({ provider: '', model: '', service_tier: '*', min_input_tokens: '0', input_price_per_million: '0', output_price_per_million: '0', cache_read_price_per_million: '0', cache_write_price_per_million: '0', request_price: '0', source: 'manual', enabled: true, note: '' })
const priceForm = ref(emptyPriceForm())

const overviewData = computed(() => overview.value?.overview || {})
const overviewRange = computed(() => overviewData.value.range || {})
const dailyTrend = computed(() => (Array.isArray(overviewData.value.daily_trend) ? overviewData.value.daily_trend : [])
  .slice()
  .sort((left, right) => Date.parse(right.date) - Date.parse(left.date)))
const topUsers = computed(() => (Array.isArray(overviewData.value.top_users) ? overviewData.value.top_users : [])
  .slice()
  .sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0)))
const topModels = computed(() => Array.isArray(overviewData.value.top_models) ? overviewData.value.top_models : [])
const topProviders = computed(() => Array.isArray(overviewData.value.top_providers) ? overviewData.value.top_providers : [])
const rankingGroups = computed(() => [
  { title: t('billing.overview.topModels'), items: topModels.value, empty: t('billing.overview.noModelCharges') },
  { title: t('billing.overview.topProviders'), items: topProviders.value, empty: t('billing.overview.noProviderCharges') }
])
const priceMenuItems = computed(() => [[
  { label: t('billing.prices.import'), icon: 'i-tabler-download', onSelect: () => priceImporter.value?.openImport() },
  { label: t('billing.prices.checkUpdates'), icon: 'i-tabler-refresh', disabled: pricesLoading.value || modelCandidatesLoading.value || !priceRules.value.some(rule => rule.source === 'sync'), onSelect: () => priceImporter.value?.checkUpdates() }
], [
  { label: t('billing.prices.matchingSettings'), icon: 'i-tabler-settings', onSelect: () => openMatchingSettings() }
]])
const maxTrendCharge = computed(() => Math.max(0.000001, ...dailyTrend.value.map(point => Number(point.charge_amount) || 0)))
const charges = computed(() => Array.isArray(chargesResponse.value?.items) ? chargesResponse.value.items : [])
const chargesTotal = computed(() => Number(chargesResponse.value?.total) || 0)
const chargePageCount = computed(() => Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)))
const chargeRangeStart = computed(() => chargesTotal.value ? ((chargePage.value - 1) * chargePageSize.value) + 1 : 0)
const chargeRangeEnd = computed(() => Math.min(chargePage.value * chargePageSize.value, chargesTotal.value))
const balanceRecords = computed(() => Array.isArray(balancesResponse.value?.items) ? balancesResponse.value.items : [])
const balancesTotal = computed(() => Number(balancesResponse.value?.total) || 0)
const priceRules = computed(() => Array.isArray(priceResponse.value?.items) ? priceResponse.value.items : [])
const priceSchemaVersion = computed(() => Number(priceResponse.value?.price_rule_schema_version || priceResponse.value?.schema_version || 1))
const priceTierOptions = computed(() => [...new Set(priceRules.value.map(rule => rule.service_tier).filter(Boolean))].sort())
const filteredPriceRules = computed(() => {
  const search = priceFilters.value.search.trim().toLowerCase()
  return [...priceRules.value].filter(rule =>
    (!search || [rule.provider, rule.model].some(value => String(value || '').toLowerCase().includes(search))) &&
    (!priceFilters.value.service_tier.trim() || rule.service_tier?.toLowerCase() === priceFilters.value.service_tier.trim().toLowerCase()) &&
    (!priceFilters.value.source || rule.source === priceFilters.value.source) &&
    (!priceFilters.value.enabled || String(Boolean(rule.enabled)) === priceFilters.value.enabled)
  ).sort((a, b) => String(a.provider || '').localeCompare(String(b.provider || '')) || String(a.model || '').localeCompare(String(b.model || '')) || String(a.service_tier || '').localeCompare(String(b.service_tier || '')) || Number(a.min_input_tokens || 0) - Number(b.min_input_tokens || 0))
})
const hasPriceFilters = computed(() => Boolean(priceFilters.value.search.trim() || priceFilters.value.service_tier.trim() || priceFilters.value.source || priceFilters.value.enabled))
function clearPriceFilters() { priceFilters.value = { search: '', enabled: '', service_tier: '', source: '' } }
const users = computed(() => Array.isArray(usersResponse.value?.users) ? usersResponse.value.users : [])
const userOptions = computed(() => users.value.map(user => ({ label: `${t('billing.adjust.userOption', { name: user.username, id: user.id, balance: formatCredits(user.credits) })}${user.credits_unlimited ? ` · ${t('billing.adjust.unlimited')}` : ''}`, value: String(user.id) })))
const userSearchOptions = computed(() => users.value.map(user => user.username))
const providerSearchOptions = computed(() => [...new Set([
  ...priceRules.value.map(rule => rule.provider),
  ...charges.value.map(charge => charge.provider),
  ...topProviders.value.map(item => item.label || item.provider)
].filter(Boolean))].sort())
const modelSearchOptions = computed(() => [...new Set([
  ...priceRules.value.map(rule => rule.model),
  ...charges.value.map(charge => charge.model),
  ...topModels.value.map(item => item.label || item.model),
  ...modelCandidates.value.map(item => item.model)
].filter(Boolean))].sort())
const modelCandidates = computed(() => billingModelCandidates(modelCandidatesResponse.value.available, modelCandidatesResponse.value.static, priceRules.value))
const filteredModelCandidates = computed(() => {
  const query = modelCandidateSearch.value.trim().toLowerCase()
  return modelCandidates.value.filter(candidate =>
    (!availableModelsOnly.value || candidate.available) &&
    (!query || [candidate.model, candidate.displayName, candidate.description, candidate.provider, candidate.ownedBy, candidate.type].some(value => String(value || '').toLowerCase().includes(query)))
  )
})
const selectedPriceCandidates = computed(() => selectedPriceCandidateKeys.value.map(key => modelCandidates.value.find(candidate => candidate.key === key)).filter(Boolean))
const loading = computed(() => overviewLoading.value || chargesLoading.value || balancesLoading.value || pricesLoading.value || settingsLoading.value)
const financeMetrics = computed(() => [
  { label: t('billing.metric.charged'), value: formatCredits(overviewData.value.total_charge_amount), detail: t('billing.metric.chargedDetail'), icon: 'i-tabler-receipt', tone: 'violet' },
  { label: t('billing.metric.recharged'), value: formatCredits(overviewData.value.total_recharge_amount), detail: t('billing.metric.rechargedDetail'), icon: 'i-tabler-circle-plus', tone: 'emerald' },
  { label: t('billing.metric.deducted'), value: formatCredits(overviewData.value.total_deduct_amount), detail: t('billing.metric.deductedDetail'), icon: 'i-tabler-circle-minus', tone: 'amber' },
  { label: t('billing.metric.totalBalance'), value: formatCredits(overviewData.value.total_balance), detail: t('billing.metric.totalBalanceDetail'), icon: 'i-tabler-wallet', tone: 'blue' }
])
const usageMetrics = computed(() => [
  { label: t('common.requests'), value: formatNumber(overviewData.value.request_count) },
  { label: t('billing.metric.inputTokens'), value: formatNumber(overviewData.value.input_tokens) },
  { label: t('billing.metric.outputTokens'), value: formatNumber(overviewData.value.output_tokens) },
  { label: t('billing.metric.cacheTokens'), value: formatNumber(overviewData.value.cache_tokens) },
  { label: t('billing.metric.activeUsers'), value: formatNumber(overviewData.value.active_user_count) }
])
const balanceDetailItems = computed(() => selectedBalance.value ? [
  { label: t('billing.detail.recordId'), value: selectedBalance.value.id || '—', mono: true },
  { label: t('common.created'), value: formatDateTime(selectedBalance.value.created_at) },
  { label: t('billing.detail.userId'), value: selectedBalance.value.user_id ?? '—' },
  { label: t('common.type'), value: balanceTypeLabel(selectedBalance.value.type) || '—' },
  { label: t('billing.col.amount'), value: formatCredits(selectedBalance.value.amount) },
  { label: t('billing.detail.balanceBefore'), value: formatCredits(selectedBalance.value.balance_before) },
  { label: t('billing.detail.balanceAfter'), value: formatCredits(selectedBalance.value.balance_after) },
  { label: t('billing.detail.operator'), value: selectedBalance.value.operator || '—' },
  { label: t('billing.col.note'), value: selectedBalance.value.note || '—' }
] : [])
const snapshotDetailItems = computed(() => {
  const source = selectedCharge.value?.price_snapshot
  if (!source) return []
  let snapshot = source
  if (typeof source === 'string') {
    try { snapshot = JSON.parse(source) } catch { return [] }
  }
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return []
  const fields = [
    ['provider', t('common.provider')], ['model', t('common.model')],
    ['matched_service_tier', t('billing.snapshot.matchedTier')], ['min_input_tokens', t('billing.snapshot.minInputTokens')],
    ['requested_service_tier', t('billing.snapshot.requestedTier')], ['response_service_tier', t('billing.snapshot.responseTier')],
    ['service_tier_source', t('billing.snapshot.tierSource')], ['effective_service_tier', t('billing.snapshot.effectiveTier')],
    ['response_tier_fallback', t('billing.snapshot.responseFallback')],
    ['input_price_per_million', t('billing.snapshot.inputPerMillion')], ['output_price_per_million', t('billing.snapshot.outputPerMillion')],
    ['cache_read_price_per_million', t('billing.snapshot.cacheReadPerMillion')], ['cache_write_price_per_million', t('billing.snapshot.cacheWritePerMillion')],
    ['request_price', t('billing.snapshot.requestPrice')]
  ]
  return fields.filter(([key]) => Object.hasOwn(snapshot, key)).map(([key, label]) => ({ label, value: typeof snapshot[key] === 'boolean' ? (snapshot[key] ? t('common.yes') : t('common.no')) : String(snapshot[key]) }))
})
const chargeDetailItems = computed(() => selectedCharge.value ? [
  { label: t('billing.detail.chargeId'), value: selectedCharge.value.id || '—', mono: true },
  { label: t('billing.detail.requestId'), value: selectedCharge.value.request_id || '—', mono: true },
  { label: t('common.created'), value: formatDateTime(selectedCharge.value.created_at) },
  { label: t('billing.detail.endpoint'), value: selectedCharge.value.endpoint || '—', mono: true },
  { label: t('billing.detail.providerModel'), value: `${selectedCharge.value.provider || t('common.unknown')} / ${selectedCharge.value.model || t('common.unknown')}` },
  { label: t('billing.detail.actualModel'), value: selectedCharge.value.actual_model || selectedCharge.value.model || '—' },
  ...[['input_tokens', t('billing.metric.inputTokens')], ['output_tokens', t('billing.metric.outputTokens')], ['cache_tokens', t('billing.metric.cacheTokens')]]
    .filter(([key]) => selectedCharge.value[key] != null)
    .map(([key, label]) => ({ label, value: formatNumber(selectedCharge.value[key]) })),
  { label: t('billing.detail.matchedRule'), value: selectedCharge.value.matched_price_rule || '—', mono: true },
  { label: t('billing.col.amount'), value: formatCredits(selectedCharge.value.amount) },
  { label: t('billing.detail.balanceTransition'), value: `${formatCredits(selectedCharge.value.balance_before)} → ${formatCredits(selectedCharge.value.balance_after)}` },
  { label: t('billing.detail.clientKey'), value: selectedCharge.value.api_key_label || selectedCharge.value.api_key_masked || '—' }
] : [])

function buildRangeQuery(source) {
  const query = {}
  if (source.from) query.from = source.from
  if (source.to) query.to = source.to

  if (source.user?.trim()) (/^\d+$/.test(source.user.trim()) ? query.user_id = source.user.trim() : query.user = source.user.trim())
  if (source.provider?.trim()) query.provider = source.provider.trim()
  if (source.model?.trim()) query.model = source.model.trim()
  return query
}
async function loadOverview() { overviewLoading.value = true; try { overview.value = await fetchAPI('/billing/overview', { query: buildRangeQuery(appliedOverviewFilters.value) }) } finally { overviewLoading.value = false } }
async function loadCharges() { chargesLoading.value = true; try { chargesResponse.value = await fetchAPI('/billing/charges', { query: { ...buildRangeQuery(appliedChargeFilters.value), limit: chargePageSize.value, offset: (chargePage.value - 1) * chargePageSize.value } }) } finally { chargesLoading.value = false } }
async function loadBalances() { balancesLoading.value = true; try { balancesResponse.value = await fetchAPI('/billing/balance-records', { query: { ...buildRangeQuery(appliedBalanceFilters.value), limit: balancePageSize.value, offset: (balancePage.value - 1) * balancePageSize.value } }) } finally { balancesLoading.value = false } }
async function loadPrices() { pricesLoading.value = true; try { priceResponse.value = await fetchAPI('/billing/model-prices') } finally { pricesLoading.value = false } }
function updateReportTimezone(timezone) {
  if (savedReportTimezone.value === timezone) return
  savedReportTimezone.value = timezone
  for (const [preset, filters, applied] of [[overviewPreset, overviewFilters, appliedOverviewFilters], [chargePreset, chargeFilters, appliedChargeFilters], [balancePreset, balanceFilters, appliedBalanceFilters]]) {
    if (preset.value === 'custom') continue
    const range = datesForRange(preset.value)
    Object.assign(filters.value, range)
    Object.assign(applied.value, range)
  }
}
async function loadSettings(preserveDraft = false) { settingsLoading.value = true; try { const settings = await fetchAPI('/billing/settings'); updateReportTimezone(settings?.report_timezone || 'UTC'); if (preserveDraft !== true) settingsForm.value = normalizeBillingSettings(settings); savedTierSource.value = settings?.service_tier_source || 'request' } finally { settingsLoading.value = false } }
async function loadDiagnostics() {
  diagnosticsLoading.value = true
  diagnosticsError.value = ''
  try { tierDiagnostics.value = await fetchAPI('/billing/settings/diagnostics') }
  catch (error) { tierDiagnostics.value = null; diagnosticsError.value = errorMessage(error, t('billing.settings.diagnosticsFailed')) }
  finally { diagnosticsLoading.value = false }
}
async function loadUsers() { try { usersResponse.value = await fetchAPI('/users') } catch { usersResponse.value = { users: [] } } }
async function loadModelCandidates() {
  if (modelCandidatesLoading.value) return
  modelCandidatesLoading.value = true; modelCandidatesError.value = ''
  try {
    const [available, staticResult] = await Promise.allSettled([fetchAPI('/models?scope=available'), fetchAPI('/models?scope=static')])
    modelCandidatesResponse.value = { available: available.status === 'fulfilled' ? available.value?.models : [], static: staticResult.status === 'fulfilled' ? staticResult.value?.models : [] }
    if (available.status === 'rejected' && staticResult.status === 'rejected') modelCandidatesError.value = t('billing.error.candidatesAll')
    else if (available.status === 'rejected' || staticResult.status === 'rejected') modelCandidatesError.value = t('billing.error.candidatesSome')
  } finally { modelCandidatesLoading.value = false }
}
async function safely(action, fallback) { pageError.value = ''; try { await action() } catch (error) { pageError.value = errorMessage(error, fallback) } }
async function loadPricesSafely() { await safely(loadPrices, t('billing.error.loadPrices')) }
async function refreshCurrent() {
  const actions = { overview: loadOverview, charges: loadCharges, balances: loadBalances, prices: loadPrices }
  await safely(actions[activeSection.value], t('billing.error.refresh'))
}
function selectRange(section, preset) {
  if (preset === 'custom') return
  const filters = { overview: overviewFilters, charges: chargeFilters, balances: balanceFilters }[section]
  Object.assign(filters.value, datesForRange(preset))
}
async function changePageSize(section) {
  if (section === 'charges') { chargePage.value = 1; await safely(loadCharges, t('billing.error.loadCharges')) }
  else { balancePage.value = 1; await safely(loadBalances, t('billing.error.loadBalances')) }
}
async function openMatchingSettings() { await safely(async () => { await loadSettings(); settingsError.value = ''; matchingSettingsOpen.value = true; if (priceSchemaVersion.value >= 2) await loadDiagnostics() }, t('billing.settings.loadFailed')) }
async function applyOverviewFilters() { const error = dateRangeError(overviewFilters.value.from, overviewFilters.value.to); if (error) { pageError.value = dateErrorLabel(error); return }; appliedOverviewFilters.value = { ...overviewFilters.value }; await safely(loadOverview, t('billing.error.loadOverview')) }
async function resetOverviewFilters() { overviewPreset.value = '7d'; overviewFilters.value = { ...defaultRange(), user: '', provider: '', model: '' }; appliedOverviewFilters.value = { ...overviewFilters.value }; await safely(loadOverview, t('billing.error.loadOverview')) }
async function applyChargeFilters() { const error = dateRangeError(chargeFilters.value.from, chargeFilters.value.to); if (error) { pageError.value = dateErrorLabel(error); return }; appliedChargeFilters.value = { ...chargeFilters.value }; chargePage.value = 1; await safely(loadCharges, t('billing.error.loadCharges')) }
async function resetChargeFilters() { chargePreset.value = '7d'; chargeFilters.value = { ...defaultRange(), user: '', provider: '', model: '' }; appliedChargeFilters.value = { ...chargeFilters.value }; chargePage.value = 1; await safely(loadCharges, t('billing.error.loadCharges')) }
async function applyBalanceFilters() { const error = dateRangeError(balanceFilters.value.from, balanceFilters.value.to); if (error) { pageError.value = dateErrorLabel(error); return }; appliedBalanceFilters.value = { ...balanceFilters.value }; balancePage.value = 1; await safely(loadBalances, t('billing.error.loadBalances')) }
async function resetBalanceFilters() { balancePreset.value = '7d'; balanceFilters.value = { ...defaultRange(), user: '' }; appliedBalanceFilters.value = { ...balanceFilters.value }; balancePage.value = 1; await safely(loadBalances, t('billing.error.loadBalances')) }
async function changeChargePage(delta) { const next = chargePage.value + delta; const pages = Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)); if (next < 1 || next > pages) return; chargePage.value = next; await safely(loadCharges, t('billing.error.loadCharges')) }
async function changeBalancePage(delta) { const next = balancePage.value + delta; const pages = Math.max(1, Math.ceil(balancesTotal.value / balancePageSize.value)); if (next < 1 || next > pages) return; balancePage.value = next; await safely(loadBalances, t('billing.error.loadBalances')) }

function openBalanceAdjustment(type) { modalError.value = ''; adjustmentForm.value = { type, user_id: '', amount: '', note: '' }; adjustmentOpen.value = true }
async function submitBalanceAdjustment() {
  modalError.value = ''
  const userID = Number(adjustmentForm.value.user_id)
  const amount = Number(adjustmentForm.value.amount)
  if (!Number.isInteger(userID) || userID <= 0) return modalError.value = t('billing.adjust.selectUser')
  if (!Number.isFinite(amount) || amount <= 0) return modalError.value = t('billing.adjust.amountPositive')
  if (adjustmentForm.value.type === 'deduct' && !adjustmentForm.value.note.trim()) return modalError.value = t('billing.adjust.noteRequired')
  adjustmentSaving.value = true
  try {
    await fetchAPI(`/billing/balance-records/${adjustmentForm.value.type}`, { method: 'POST', body: { user_id: userID, amount, note: adjustmentForm.value.note.trim() } })
    adjustmentOpen.value = false
    await Promise.all([loadOverview(), loadBalances(), loadUsers()])
    toast.add({ title: adjustmentForm.value.type === 'recharge' ? t('billing.adjust.recharged') : t('billing.adjust.deducted'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) { modalError.value = errorMessage(error, t('billing.adjust.failed')) } finally { adjustmentSaving.value = false }
}

async function openPriceForm(rule = null) {
  modalError.value = ''
  editingPrice.value = rule
  modelCandidateSearch.value = ''
  priceFormOpen.value = true
  await loadModelCandidates()
  priceForm.value = rule ? {
    provider: rule.provider || '', model: rule.model || '', service_tier: rule.service_tier || '*', min_input_tokens: String(rule.min_input_tokens ?? 0), input_price_per_million: String(rule.input_price_per_million ?? 0), output_price_per_million: String(rule.output_price_per_million ?? 0), cache_read_price_per_million: String(rule.cache_read_price_per_million ?? 0), cache_write_price_per_million: String(rule.cache_write_price_per_million ?? 0), request_price: String(rule.request_price ?? 0), source: rule.source || 'manual', enabled: Boolean(rule.enabled), note: rule.note || ''
  } : emptyPriceForm()
  contextPreset.value = String(priceForm.value.min_input_tokens) === '0' ? 'base' : String(priceForm.value.min_input_tokens) === '272001' ? '272k' : 'custom'
  const existingKey = rule ? `${String(rule.provider || '').toLowerCase()}::${rule.model || ''}` : ''
  selectedPriceCandidateKeys.value = existingKey ? [existingKey] : []
}
function isPriceCandidateSelected(candidate) { return selectedPriceCandidateKeys.value.includes(candidate.key) }
function togglePriceCandidate(candidate) {
  if (editingPrice.value) { selectedPriceCandidateKeys.value = [candidate.key]; return }
  selectedPriceCandidateKeys.value = isPriceCandidateSelected(candidate) ? selectedPriceCandidateKeys.value.filter(key => key !== candidate.key) : [...selectedPriceCandidateKeys.value, candidate.key]
}
function clearPriceCandidateSelection() { selectedPriceCandidateKeys.value = [] }
function providerMark(provider) { return String(provider || '?').split(/[-_\s]+/).map(part => part[0]).join('').slice(0, 3).toUpperCase() }

async function submitPrice() {
  modalError.value = ''
  const selected = selectedPriceCandidates.value
  if (!selected.length) return modalError.value = t('billing.priceForm.selectAtLeastOne')
  if (editingPrice.value && selected.length !== 1) return modalError.value = t('billing.priceForm.selectOneEditing')
  const numericFields = ['min_input_tokens', 'input_price_per_million', 'output_price_per_million', 'cache_read_price_per_million', 'cache_write_price_per_million', 'request_price']
  const body = { service_tier: priceForm.value.service_tier.trim() || '*', source: priceForm.value.source, enabled: priceForm.value.enabled, note: priceForm.value.note.trim() }
  for (const field of numericFields) { const value = Number(priceForm.value[field]); if (!Number.isFinite(value) || value < 0 || (field === 'min_input_tokens' && !Number.isSafeInteger(value))) return modalError.value = t('billing.priceForm.nonNegative', { field: field.replaceAll('_', ' ') }); body[field] = value }
  priceSaving.value = true
  try {
    if (editingPrice.value) {
      const candidate = selected[0]
      await fetchAPI(`/billing/model-prices/${encodeURIComponent(editingPrice.value.id)}`, { method: 'PATCH', body: { ...body, provider: candidate.provider, model: candidate.model } })
      toast.add({ title: t('billing.priceForm.updated'), color: 'success', icon: 'i-tabler-circle-check' })
    } else {
      const failed = []
      for (const candidate of selected) {
        try { await fetchAPI('/billing/model-prices', { method: 'POST', body: { ...body, provider: candidate.provider, model: candidate.model } }) }
        catch (error) { failed.push(`${candidate.provider}/${candidate.model}: ${errorMessage(error, t('billing.priceForm.createRuleFailed'))}`) }
      }
      if (failed.length) { modalError.value = t('billing.priceForm.partialFailure', { count: failed.length, details: failed.join(' | ') }); await loadPrices(); return }
      toast.add({ title: t('billing.priceForm.created', { count: selected.length }), color: 'success', icon: 'i-tabler-circle-check' })
    }
    priceFormOpen.value = false
    await loadPrices()
  } catch (error) { modalError.value = errorMessage(error, t('billing.priceForm.saveFailed')) } finally { priceSaving.value = false }
}

async function copyText(value) { try { await navigator.clipboard.writeText(String(value || '')); toast.add({ title: t('common.copied'), color: 'success' }) } catch {} }
function contextBandLabel(value) { const amount = Number(value || 0); return amount === 0 ? t('billing.context.base') : amount === 272001 ? t('billing.context.272k') : t('billing.context.from', { count: formatNumber(amount) }) }
async function togglePriceEnabled(rule, enabled) { togglingPrice.value = rule.id; try { await fetchAPI(`/billing/model-prices/${encodeURIComponent(rule.id)}`, { method: 'PATCH', body: { enabled } }); await loadPrices() } catch (error) { pageError.value = errorMessage(error, t('billing.priceForm.toggleFailed')) } finally { togglingPrice.value = '' } }
function confirmDeletePrice(rule) { deletePriceTarget.value = rule; deletePriceOpen.value = true }
async function deletePrice() { if (!deletePriceTarget.value) return; priceDeleting.value = true; try { await fetchAPI(`/billing/model-prices/${encodeURIComponent(deletePriceTarget.value.id)}`, { method: 'DELETE' }); deletePriceOpen.value = false; await loadPrices(); toast.add({ title: t('billing.delete.deleted'), color: 'success', icon: 'i-tabler-circle-check' }) } catch (error) { pageError.value = errorMessage(error, t('billing.delete.failed')) } finally { priceDeleting.value = false } }
async function saveSettings() {
  if (settingsSaving.value || diagnosticsLoading.value) return
  settingsError.value = timezoneError.value
  if (settingsError.value) return
  if (settingsForm.value.service_tier_source === 'response' && savedTierSource.value !== 'response') {
    await loadDiagnostics()
    if (diagnosticsError.value || !tierDiagnostics.value?.supported) {
      settingsError.value = diagnosticsError.value || t('billing.settings.responseTierUnsupported')
      return
    }
    tierConfirmOpen.value = true
    return
  }
  await persistSettings()
}
async function persistSettings() {
  if (settingsSaving.value) return
  settingsError.value = timezoneError.value
  if (settingsError.value) return
  settingsSaving.value = true
  try {
    const saved = await fetchAPI('/billing/settings', { method: 'PATCH', body: billingSettingsPayload(settingsForm.value) })
    settingsForm.value = normalizeBillingSettings(saved)
    savedTierSource.value = saved.service_tier_source
    updateReportTimezone(saved.report_timezone || 'UTC')
    tierConfirmOpen.value = false
    matchingSettingsOpen.value = false
    toast.add({ title: t('billing.settings.saved'), color: 'success', icon: 'i-tabler-circle-check' })
    await safely(async () => { await Promise.all([loadOverview(), loadCharges(), loadBalances()]) }, t('billing.settings.refreshFailed'))
  } catch (error) { settingsError.value = errorMessage(error, t('billing.settings.saveFailed')) }
  finally { settingsSaving.value = false }
}
function chargeUserName(charge) {
  if (charge.username) return charge.username
  const user = users.value.find(item => String(item.id) === String(charge.user_id))
  if (user?.username) return user.username
  return charge.user_id ? t('billing.userNumber', { id: charge.user_id }) : t('billing.unknownUser')
}
function balanceUserName(record) {
  const user = users.value.find(item => String(item.id) === String(record.user_id))
  return user?.username || (record.user_id ? t('billing.userNumber', { id: record.user_id }) : '—')
}
function share(amount, items) {
  const max = Math.max(0.000001, ...items.map(item => Number(item.amount) || 0))
  return Math.round(((Number(amount) || 0) / max) * 100)
}
function openBalanceDetail(record) { selectedBalance.value = record; balanceDetailOpen.value = true }
function openChargeDetail(charge) { selectedCharge.value = charge; chargeDetailOpen.value = true }
function totalChargeTokens(charge) { return (Number(charge.input_tokens) || 0) + (Number(charge.output_tokens) || 0) + (Number(charge.cache_tokens) || 0) }
function trendWidth(value) { return Math.max(2, Math.round(((Number(value) || 0) / maxTrendCharge.value) * 100)) }
function formatCredits(value) { return new Intl.NumberFormat(intlLocale.value, { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(Number(value) || 0) }
function formatNumber(value) { return new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0) }

function formatDateTime(value) { return value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short', timeZone: savedReportTimezone.value }).format(new Date(value)) : '—' }
function prettyJSON(value) { return JSON.stringify(value || {}, null, 2) }
function errorMessage(error, fallback = t('billing.error.unexpected')) { return error?.data?.message || error?.data?.error || error?.message || fallback }

async function loadBilling(preserveDraft = false) {
  await safely(async () => {
    await loadSettings(preserveDraft)
    await Promise.all([loadOverview(), loadCharges(), loadBalances(), loadPrices(), loadUsers(), loadModelCandidates()])
  }, t('billing.error.load'))
}
useDataSync('admin:billing:sync', () => loadBilling(true))
onMounted(loadBilling)
</script>

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
