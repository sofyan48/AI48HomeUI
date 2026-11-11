<template>
  <div class="space-y-4">
    <UAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      title="Billing request failed"
      :description="pageError"
    />

    <div class="flex items-end justify-between gap-3 border-b border-[var(--ui-border)]">
      <AppPanelTabs v-model="activeSection" :items="sections" label="Billing sections" class="!border-b-0" />
      <div class="flex shrink-0 items-center gap-1 pb-1.5">
        <span class="hidden items-center gap-1 text-xs text-[var(--ui-text-muted)] md:inline-flex" :title="'Reports and date filters use this timezone. Date ranges include both calendar dates.'"><UIcon name="i-tabler-world" class="size-3.5" />{{ savedReportTimezone }}</span>
        <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-refresh" aria-label="Refresh" title="Refresh" :loading="loading" @click="refreshCurrent" />
        <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-settings" aria-label="Billing settings" title="Billing settings" :loading="settingsLoading" :disabled="settingsLoading || settingsSaving" @click="openMatchingSettings" />
      </div>
    </div>

    <!-- Overview -->
    <template v-if="activeSection === 'overview'">
      <AdminBillingFilterBar v-model:filters="overviewFilters" v-model:preset="overviewPreset" :range-options="rangeOptions" :user-options="userSearchOptions" :provider-options="providerSearchOptions" :model-options="modelSearchOptions" :loading="overviewLoading" @range="selectRange('overview', $event)" @apply="applyOverviewFilters" @reset="resetOverviewFilters" />

      <template v-if="overview">
        <section class="overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)]" aria-label="Summary">
          <dl class="grid grid-cols-2 divide-[var(--ui-border)] lg:grid-cols-4 lg:divide-x">
            <div v-for="(metric, index) in financeMetrics" :key="metric.label" class="min-w-0 px-4 py-4 sm:px-5" :class="[index % 2 ? 'border-l border-[var(--ui-border)] lg:border-l-0' : '', index > 1 ? 'border-t border-[var(--ui-border)] lg:border-t-0' : '']">
              <dt class="flex items-center justify-between text-xs text-[var(--ui-text-muted)]">{{ metric.label }}<span class="text-[10px] uppercase tracking-wide text-[var(--ui-text-dimmed)]">{{ metric.hint }}</span></dt>
              <dd class="mt-1.5 truncate text-2xl font-semibold tabular-nums text-[var(--ui-text-highlighted)]" :title="metric.value">{{ metric.value }}</dd>
            </div>
          </dl>
          <dl class="flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]/50 px-4 py-2.5 text-xs sm:px-5">
            <div v-for="metric in usageMetrics" :key="metric.label" class="flex items-baseline gap-1.5"><dt class="text-[var(--ui-text-muted)]">{{ metric.label }}</dt><dd class="font-medium tabular-nums text-[var(--ui-text-highlighted)]">{{ metric.value }}</dd></div>
          </dl>
        </section>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section class="min-w-0 overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] xl:col-span-2" aria-labelledby="billing-daily">
            <header class="flex items-baseline justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-3">
              <h2 id="billing-daily" class="text-sm font-semibold">Daily charges</h2>
              <span class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ overviewRange.from || 'All time' }} – {{ overviewRange.to || 'Now' }} · {{ overviewRange.timezone || savedReportTimezone }}</span>
            </header>
            <div v-if="dailyTrend.length" class="max-h-96 overflow-y-auto">
              <div v-for="point in dailyTrend" :key="point.date" class="grid grid-cols-[6.5rem_minmax(0,1fr)_7rem_6rem] items-center gap-4 border-b border-[var(--ui-border)] px-4 py-2 text-sm last:border-b-0 hover:bg-[var(--ui-bg-elevated)]/60">
                <span class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ point.date }}</span>
                <div class="h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]/50"><div class="h-full rounded-full bg-[var(--ui-primary)]" :style="{ width: `${trendWidth(point.charge_amount)}%` }" /></div>
                <span class="text-right font-medium tabular-nums">{{ formatCredits(point.charge_amount) }}</span>
                <span class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">{{ formatNumber(point.request_count) }} req</span>
              </div>
            </div>
            <p v-else class="py-12 text-center text-sm text-[var(--ui-text-muted)]">No charges in the selected range.</p>
          </section>

          <section class="min-w-0 overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)]" aria-labelledby="billing-top-users">
            <header class="border-b border-[var(--ui-border)] px-4 py-3"><h2 id="billing-top-users" class="text-sm font-semibold">Top consumers</h2></header>
            <ol v-if="topUsers.length" class="max-h-96 overflow-y-auto">
              <li v-for="(item, index) in topUsers" :key="item.id || item.label" class="flex items-center gap-3 border-b border-[var(--ui-border)] px-4 py-2 last:border-b-0">
                <span class="w-5 shrink-0 text-right text-xs tabular-nums text-[var(--ui-text-dimmed)]">{{ index + 1 }}</span>
                <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ item.label || `User #${item.id}` }}</p><p class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ formatNumber(item.request_count) }} requests</p></div>
                <span class="text-sm font-semibold tabular-nums">{{ formatCredits(item.amount) }}</span>
              </li>
            </ol>
            <p v-else class="py-12 text-center text-sm text-[var(--ui-text-muted)]">No user charges found.</p>
          </section>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section v-for="group in rankingGroups" :key="group.title" class="min-w-0 overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)]" :aria-label="group.title">
            <header class="border-b border-[var(--ui-border)] px-4 py-3"><h2 class="text-sm font-semibold">{{ group.title }}</h2></header>
            <ul v-if="group.items.length" class="max-h-80 overflow-y-auto">
              <li v-for="item in group.items" :key="item.id || item.label" class="relative flex items-center justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-2 text-sm last:border-b-0">
                <span class="absolute inset-y-0 left-0 bg-[var(--ui-primary)]/8" :style="{ width: `${share(item.amount, group.items)}%` }" aria-hidden="true" />
                <span class="relative min-w-0 truncate" :title="item.label">{{ item.label }}</span>
                <span class="relative shrink-0 font-medium tabular-nums">{{ formatCredits(item.amount) }}</span>
              </li>
            </ul>
            <p v-else class="py-10 text-center text-sm text-[var(--ui-text-muted)]">{{ group.empty }}</p>
          </section>
        </div>
      </template>
      <div v-else-if="overviewLoading" class="grid gap-4"><USkeleton class="h-32 w-full" /><USkeleton class="h-72 w-full" /></div>
      <p v-else-if="!pageError" class="py-12 text-center text-sm text-[var(--ui-text-muted)]">No billing overview available.</p>
    </template>

    <!-- Charge records -->
    <template v-else-if="activeSection === 'charges'">
      <AdminDataPanel title="Charges" :description="`${formatNumber(chargesTotal)} records`">
        <template #toolbar>
          <AdminBillingFilterBar v-model:filters="chargeFilters" v-model:preset="chargePreset" :range-options="rangeOptions" :user-options="userSearchOptions" :provider-options="providerSearchOptions" :model-options="modelSearchOptions" :loading="chargesLoading" @range="selectRange('charges', $event)" @apply="applyChargeFilters" @reset="resetChargeFilters" />
        </template>
        <AppTable :columns="chargeColumns" :data="charges" :loading="chargesLoading" class="min-w-[56rem]">
          <template #created_at-cell="{ row }"><p class="whitespace-nowrap text-sm">{{ formatDateTime(rowValue(row).created_at) }}</p><p class="max-w-44 truncate font-mono text-xs text-[var(--ui-text-muted)]" :title="rowValue(row).request_id || rowValue(row).id">{{ rowValue(row).request_id || rowValue(row).id }}</p></template>
          <template #user-cell="{ row }"><p class="text-sm font-medium">{{ chargeUserName(rowValue(row)) }}</p><p class="max-w-40 truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).api_key_masked || rowValue(row).api_key_label || 'No client key' }}</p></template>
          <template #model-cell="{ row }"><p class="max-w-64 truncate text-sm font-medium" :title="rowValue(row).model">{{ rowValue(row).model || 'Unknown' }}</p><p class="max-w-64 truncate text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).provider || 'Unknown' }}<span v-if="rowValue(row).original_model && rowValue(row).original_model !== rowValue(row).model"> · from {{ rowValue(row).original_model }}</span></p></template>
          <template #tokens-cell="{ row }"><p class="text-right text-sm tabular-nums">{{ formatNumber(totalChargeTokens(rowValue(row))) }}</p><p class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">{{ formatNumber(rowValue(row).input_tokens) }} in · {{ formatNumber(rowValue(row).output_tokens) }} out</p></template>
          <template #amount-cell="{ row }"><p class="text-right text-sm font-semibold tabular-nums">{{ formatCredits(rowValue(row).amount) }}</p><p class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">bal. {{ formatCredits(rowValue(row).balance_after) }}</p></template>
          <template #actions-cell="{ row }"><AdminTableAction action="view" label="View charge details" @click="openChargeDetail(rowValue(row))" /></template>
          <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">No charges match these filters.</div></template>
        </AppTable>
        <template v-if="chargesTotal > 0" #footer><AdminBillingPagination :page="chargePage" :total="chargesTotal" :page-size="chargePageSize" :loading="chargesLoading" @previous="changeChargePage(-1)" @next="changeChargePage(1)" @update:page-size="chargePageSize = $event; changePageSize('charges')" /></template>
      </AdminDataPanel>
    </template>

    <!-- Balance records -->
    <template v-else-if="activeSection === 'balances'">
      <AdminDataPanel title="Balance records" :description="`${formatNumber(balancesTotal)} adjustments`">
        <template #actions>
          <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-minus" @click="openBalanceAdjustment('deduct')">Deduct</AppButton>
          <AppButton size="sm" icon="i-tabler-plus" @click="openBalanceAdjustment('recharge')">Recharge</AppButton>
        </template>
        <template #toolbar>
          <AdminBillingFilterBar v-model:filters="balanceFilters" v-model:preset="balancePreset" :range-options="rangeOptions" :user-options="userSearchOptions" :loading="balancesLoading" @range="selectRange('balances', $event)" @apply="applyBalanceFilters" @reset="resetBalanceFilters" />
        </template>
        <AppTable :columns="balanceColumns" :data="balanceRecords" :loading="balancesLoading" class="min-w-[52rem]">
          <template #created_at-cell="{ row }"><p class="whitespace-nowrap text-sm">{{ formatDateTime(rowValue(row).created_at) }}</p><p class="font-mono text-xs text-[var(--ui-text-muted)]">#{{ rowValue(row).id }}</p></template>
          <template #user_id-cell="{ row }"><span class="text-sm font-medium">{{ balanceUserName(rowValue(row)) }}</span></template>
          <template #type-cell="{ row }"><span class="inline-flex items-center gap-1.5 text-sm capitalize"><span class="size-1.5 rounded-full" :class="rowValue(row).type === 'recharge' ? 'bg-green-500' : 'bg-amber-500'" />{{ rowValue(row).type }}</span></template>
          <template #amount-cell="{ row }"><p class="text-right text-sm font-semibold tabular-nums" :class="rowValue(row).type === 'recharge' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">{{ rowValue(row).type === 'recharge' ? '+' : '−' }}{{ formatCredits(rowValue(row).amount) }}</p></template>
          <template #balance-cell="{ row }"><p class="text-right text-sm tabular-nums">{{ formatCredits(rowValue(row).balance_after) }}</p><p class="text-right text-xs tabular-nums text-[var(--ui-text-muted)]">from {{ formatCredits(rowValue(row).balance_before) }}</p></template>
          <template #note-cell="{ row }"><p class="max-w-72 truncate text-sm" :title="rowValue(row).note">{{ rowValue(row).note || '—' }}</p><p class="text-xs text-[var(--ui-text-muted)]">by {{ rowValue(row).operator || '—' }}</p></template>
          <template #actions-cell="{ row }"><AdminTableAction action="view" label="View balance details" @click="openBalanceDetail(rowValue(row))" /></template>
          <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">No balance records match these filters.</div></template>
        </AppTable>
        <template v-if="balancesTotal > 0" #footer><AdminBillingPagination :page="balancePage" :total="balancesTotal" :page-size="balancePageSize" :loading="balancesLoading" @previous="changeBalancePage(-1)" @next="changeBalancePage(1)" @update:page-size="balancePageSize = $event; changePageSize('balances')" /></template>
      </AdminDataPanel>
    </template>

    <!-- Model prices -->
    <template v-else-if="activeSection === 'prices'">
      <UAlert v-if="modelCandidatesError" color="warning" variant="subtle" title="Import model candidates unavailable" :description="modelCandidatesError" />
      <AdminBillingPriceImport ref="priceImporter" :providers="importProviderOptions" :models="modelSearchOptions" :candidates="modelCandidates" :available-targets="modelCandidates.filter(candidate => candidate.available)" :price-rules="priceRules" :service-tier-source="savedTierSource" @applied="loadPricesSafely" />
      <AdminDataPanel title="Model prices" :description="`${filteredPriceRules.length} of ${priceRules.length} rules`">
        <template #actions>
          <UDropdownMenu :items="priceMenuItems" :content="{ align: 'end' }">
            <AppButton size="sm" color="neutral" variant="outline" trailing-icon="i-tabler-chevron-down">More</AppButton>
          </UDropdownMenu>
          <AppButton size="sm" icon="i-tabler-plus" @click="openPriceForm()">New price</AppButton>
        </template>
        <template #toolbar>
          <div class="flex flex-wrap items-center gap-2">
            <UInput v-model="priceFilters.search" icon="i-tabler-search" placeholder="Search model or provider" aria-label="Search model prices" class="w-full sm:w-64" />
            <USelect :model-value="priceFilters.enabled || allOptionValue" :items="enabledOptions" value-key="value" label-key="label" aria-label="Status" class="w-32" @update:model-value="priceFilters.enabled = $event === allOptionValue ? '' : $event" />
            <USelect :model-value="priceFilters.source || allOptionValue" :items="priceSourceOptions" value-key="value" label-key="label" aria-label="Source" class="w-36" @update:model-value="priceFilters.source = $event === allOptionValue ? '' : $event" />
            <UInputMenu v-if="priceSchemaVersion >= 2" v-model="priceFilters.service_tier" :items="priceTierOptions" create-item placeholder="All tiers" aria-label="Service tier" class="w-32" @create="priceFilters.service_tier = $event.trim()" />
            <AppButton v-if="hasPriceFilters" size="sm" color="neutral" variant="ghost" @click="clearPriceFilters">Clear</AppButton>
            <span class="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)]" :title="settingsForm.service_tier_source === 'response' ? 'Rules match the provider response tier, falling back to the requested tier when absent.' : 'Rules match the service tier requested by the client.'">
              <UIcon name="i-tabler-arrows-exchange" class="size-3.5" />
              {{ priceSchemaVersion >= 2 ? `Tier matching: ${savedTierSource === 'response' ? 'response tier' : 'requested tier'}` : 'Flat-price rules only' }}
              <span v-if="modelCandidatesLoading">· loading candidates…</span>
            </span>
          </div>
        </template>
        <AppTable :columns="priceColumns" :data="filteredPriceRules" :loading="pricesLoading" class="min-w-[72rem]">
          <template #model-cell="{ row }"><div class="group flex min-w-0 items-center gap-1"><div class="min-w-0"><p class="max-w-72 truncate font-mono text-xs font-medium text-[var(--ui-text-highlighted)]" :title="rowValue(row).model">{{ rowValue(row).model }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).provider }}</p></div><AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" aria-label="Copy model ID" class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" @click="copyText(rowValue(row).model)" /></div></template>
          <template #scope-cell="{ row }"><template v-if="priceSchemaVersion >= 2"><p class="font-mono text-xs">{{ rowValue(row).service_tier || '*' }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ contextBandLabel(rowValue(row).min_input_tokens) }}</p></template><span v-else class="text-xs text-[var(--ui-text-muted)]">Flat</span></template>
          <template #input-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).input_price_per_million) }}</span></template>
          <template #output-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).output_price_per_million) }}</span></template>
          <template #cache_read-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).cache_read_price_per_million) }}</span></template>
          <template #cache_write-cell="{ row }"><span v-if="Number(rowValue(row).cache_write_price_per_million)" class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).cache_write_price_per_million) }}</span><span v-else class="block text-right text-xs text-[var(--ui-text-dimmed)]" title="No separate cache-write rate; billing fallback behavior is preserved in the charge snapshot.">—</span></template>
          <template #request-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).request_price) }}</span></template>
          <template #source-cell="{ row }"><span class="text-xs capitalize text-[var(--ui-text-muted)]">{{ rowValue(row).source || 'manual' }}</span></template>
          <template #state-cell="{ row }"><USwitch :model-value="Boolean(rowValue(row).enabled)" :loading="togglingPrice === rowValue(row).id" :aria-label="rowValue(row).enabled ? 'Disable price rule' : 'Enable price rule'" @update:model-value="togglePriceEnabled(rowValue(row), $event)" /></template>
          <template #updated-cell="{ row }"><span class="whitespace-nowrap text-xs text-[var(--ui-text-muted)]">{{ formatDateTime(rowValue(row).updated_at) }}</span></template>
          <template #actions-cell="{ row }"><div class="flex justify-end gap-1"><AdminTableAction action="edit" label="Edit model price" @click="openPriceForm(rowValue(row))" /><AdminTableAction action="delete" label="Delete model price" destructive @click="confirmDeletePrice(rowValue(row))" /></div></template>
          <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">No model price rules match these filters.</div></template>
        </AppTable>
      </AdminDataPanel>
    </template>




    <AppModal v-model:open="matchingSettingsOpen" title="Billing settings" description="Set the saved reporting timezone and tier matching for future charges.">
      <template #body><form class="space-y-5" @submit.prevent="saveSettings"><UAlert v-if="settingsError" color="error" variant="subtle" :description="settingsError" /><UFormField label="Reporting timezone" required :error="timezoneError"><UInputMenu v-model="settingsForm.report_timezone" :items="timezoneOptions" create-item :search-input="{ placeholder: 'Search IANA timezones…' }" class="w-full" @create="settingsForm.report_timezone = $event.trim()" /><p class="mt-1 text-xs text-[var(--ui-text-muted)]">Saved default for billing overview, charge records, and balance records. Changes regroup reports and reinterpret date filters, but do not change historical charges.</p></UFormField><UFormField v-if="priceSchemaVersion >= 2" label="Tier matching source"><div class="grid gap-2"><button v-for="option in tierSourceOptions" :key="option.value" type="button" class="rounded-lg border border-[var(--ui-border)] p-3 text-left" :class="settingsForm.service_tier_source === option.value ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10' : ''" @click="settingsForm.service_tier_source = option.value"><span class="font-medium">{{ option.label }}</span><UBadge v-if="option.value === 'request'" class="ml-2" color="neutral" variant="subtle">Default</UBadge><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ option.value === 'request' ? 'Match the tier requested by the client.' : 'Match the provider response tier and fall back to the requested tier when absent.' }}</p></button></div></UFormField><UAlert v-if="diagnosticsError" color="warning" variant="subtle" title="Tier diagnostics unavailable" :description="diagnosticsError" /><div v-else-if="settingsForm.service_tier_source === 'response' && tierDiagnostics" class="rounded-lg border border-[var(--ui-border)] p-4 text-sm"><p>{{ formatNumber(tierDiagnostics.fallback_requests) }} of {{ formatNumber(tierDiagnostics.eligible_requests) }} recent eligible requests would fall back to the requested tier.</p></div><div class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" @click="matchingSettingsOpen = false">Cancel</AppButton><AppButton type="submit" :loading="settingsSaving || diagnosticsLoading" :disabled="settingsSaving || diagnosticsLoading || !!timezoneError">Save settings</AppButton></div></form></template>
    </AppModal>

    <AppModal v-model:open="adjustmentOpen" :title="adjustmentForm.type === 'recharge' ? 'Recharge user balance' : 'Deduct user balance'" description="Creates an immutable billing balance record.">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitBalanceAdjustment">
          <UAlert v-if="modalError" color="error" variant="subtle" icon="i-tabler-alert-circle" title="Could not adjust balance" :description="modalError" />
          <div class="grid grid-cols-2 gap-2">
            <AppButton type="button" :color="adjustmentForm.type === 'recharge' ? 'success' : 'neutral'" :variant="adjustmentForm.type === 'recharge' ? 'soft' : 'outline'" @click="adjustmentForm.type = 'recharge'">Recharge</AppButton>
            <AppButton type="button" :color="adjustmentForm.type === 'deduct' ? 'warning' : 'neutral'" :variant="adjustmentForm.type === 'deduct' ? 'soft' : 'outline'" @click="adjustmentForm.type = 'deduct'">Deduct</AppButton>
          </div>
          <UFormField label="User" required>
            <USelectMenu v-model="adjustmentForm.user_id" :items="userOptions" value-key="value" label-key="label" placeholder="Search users..." :search-input="{ placeholder: 'Search username or ID...' }" class="w-full" />
          </UFormField>
          <UFormField label="Amount" required><UInput v-model="adjustmentForm.amount" type="number" min="0.000001" step="0.000001" class="w-full" /></UFormField>
          <UFormField label="Note" :required="adjustmentForm.type === 'deduct'" :hint="adjustmentForm.type === 'deduct' ? 'Required for deductions' : 'Optional'"><UTextarea v-model="adjustmentForm.note" :rows="3" class="w-full" /></UFormField>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" @click="adjustmentOpen = false">Cancel</AppButton><AppButton type="submit" :color="adjustmentForm.type === 'recharge' ? 'success' : 'warning'" :loading="adjustmentSaving">{{ adjustmentForm.type === 'recharge' ? 'Recharge' : 'Deduct' }}</AppButton></div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="priceFormOpen" :title="editingPrice ? 'Edit model price' : 'New model price'" description="Prices affect future charges only; historical charges retain their snapshots." :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitPrice">
          <UAlert v-if="modalError" color="error" variant="subtle" icon="i-tabler-alert-circle" title="Could not save price rule" :description="modalError" />
          <UAlert v-if="modelCandidatesError" color="warning" variant="subtle" title="Model candidates unavailable" :description="modelCandidatesError" />
          <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
            <div class="flex flex-wrap items-center justify-between gap-2"><div><legend class="font-medium">Models</legend><p class="text-xs text-[var(--ui-text-muted)]">{{ editingPrice ? 'Select one provider/model identity.' : 'Select one or more models. The same pricing is created sequentially for each selection.' }}</p></div><AppButton v-if="selectedPriceCandidates.length" type="button" size="sm" color="neutral" variant="ghost" @click="clearPriceCandidateSelection">Clear selection</AppButton></div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center"><UInput v-model="modelCandidateSearch" icon="i-tabler-search" placeholder="Search model ID, label, description, provider, owner, or type..." class="w-full" /><UCheckbox v-model="availableModelsOnly" label="Available only" class="shrink-0" /></div>
            <div v-if="selectedPriceCandidates.length" class="flex flex-wrap gap-2"><UBadge v-for="candidate in selectedPriceCandidates" :key="candidate.key" color="primary" variant="subtle">{{ candidate.provider }} / {{ candidate.model }}</UBadge></div>
            <div class="max-h-72 overflow-y-auto rounded-md border border-[var(--ui-border)]">
              <button v-for="candidate in filteredModelCandidates" :key="candidate.key" type="button" class="flex w-full items-start gap-3 border-b border-[var(--ui-border)] px-3 py-2.5 text-left last:border-b-0 hover:bg-[var(--ui-bg-elevated)]" :class="isPriceCandidateSelected(candidate) ? 'bg-[var(--ui-primary)]/10' : ''" @click="togglePriceCandidate(candidate)">
                <input :type="editingPrice ? 'radio' : 'checkbox'" :checked="isPriceCandidateSelected(candidate)" tabindex="-1" class="mt-1" />
                <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-bg-elevated)] text-xs font-semibold">{{ providerMark(candidate.provider) }}</span>
                <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ candidate.displayName || candidate.model }}</span><span class="block truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ candidate.model }}</span><span class="block truncate text-xs text-[var(--ui-text-muted)]">{{ candidate.provider }} · {{ candidate.available ? 'Available' : 'Static catalog' }}<template v-if="candidate.ownedBy"> · {{ candidate.ownedBy }}</template><template v-if="candidate.type"> · {{ candidate.type }}</template></span><span v-if="candidate.description" class="mt-1 block line-clamp-2 text-xs text-[var(--ui-text-muted)]">{{ candidate.description }}</span></span>
              </button>
              <p v-if="modelCandidatesLoading" class="p-6 text-center text-sm text-[var(--ui-text-muted)]">Loading model candidates…</p><p v-else-if="!filteredModelCandidates.length" class="p-6 text-center text-sm text-[var(--ui-text-muted)]">No matching model candidates.</p>
            </div>
          </fieldset>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField v-if="priceSchemaVersion >= 2" label="Service tier"><USelect v-model="priceForm.service_tier" :items="serviceTierOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
            <UFormField v-if="priceSchemaVersion >= 2" label="Context band"><USelect v-model="contextPreset" :items="contextPresetOptions" value-key="value" label-key="label" class="w-full" @update:model-value="applyContextPreset" /></UFormField>
            <UFormField v-if="priceSchemaVersion >= 2 && contextPreset === 'custom'" label="Minimum input tokens"><UInput v-model="priceForm.min_input_tokens" type="number" min="0" step="1" class="w-full" /></UFormField>
            <UFormField label="Input / 1M"><UInput v-model="priceForm.input_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField label="Output / 1M"><UInput v-model="priceForm.output_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField label="Cache read / 1M"><UInput v-model="priceForm.cache_read_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField label="Cache write / 1M"><UInput v-model="priceForm.cache_write_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField label="Per request"><UInput v-model="priceForm.request_price" type="number" min="0" step="0.000001" class="w-full" /></UFormField>
            <UFormField label="Source"><USelect v-model="priceForm.source" :items="sourceOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
          </div>
          <UFormField label="Note"><UTextarea v-model="priceForm.note" :rows="3" class="w-full" /></UFormField>
          <div class="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-4"><div><p class="font-medium">Enabled</p><p class="text-xs text-[var(--ui-text-muted)]">Allow this rule to match new usage.</p></div><USwitch v-model="priceForm.enabled" /></div>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" :disabled="priceSaving" @click="priceFormOpen = false">Cancel</AppButton><AppButton type="submit" :loading="priceSaving">{{ editingPrice ? 'Save changes' : `Create ${selectedPriceCandidates.length || ''} price${selectedPriceCandidates.length === 1 ? '' : 's'}` }}</AppButton></div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="deletePriceOpen" title="Delete price rule" description="Historical charges keep their stored price snapshots.">
      <template #body><div class="space-y-5"><UAlert color="warning" variant="subtle" icon="i-tabler-alert-triangle" title="This rule will no longer match future usage" :description="deletePriceTarget ? `${deletePriceTarget.provider} / ${deletePriceTarget.model} / ${deletePriceTarget.service_tier || '*'}` : ''" /><div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" @click="deletePriceOpen = false">Cancel</AppButton><AppButton color="error" :loading="priceDeleting" @click="deletePrice">Delete rule</AppButton></div></div></template>
    </AppModal>

    <AppModal v-model:open="balanceDetailOpen" title="Balance record details" description="Immutable ledger adjustment and balance transition.">
          <template #body><dl v-if="selectedBalance" class="grid grid-cols-1 gap-4 sm:grid-cols-2"><div v-for="item in balanceDetailItems" :key="item.label" class="min-w-0"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words text-sm" :class="item.mono ? 'font-mono text-xs' : ''">{{ item.value }}</dd></div></dl></template>
        </AppModal>

        <AppModal v-model:open="tierConfirmOpen" title="Use provider response tiers?" description="Changing this setting affects future charges only.">
          <template #body><div class="space-y-4"><p class="text-sm">{{ formatNumber(tierDiagnostics?.fallback_requests) }} of {{ formatNumber(tierDiagnostics?.eligible_requests) }} observed eligible requests lacked a response tier and would use the requested tier instead. This evidence does not guarantee future coverage. Continue?</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" @click="tierConfirmOpen = false">Cancel</AppButton><AppButton :loading="settingsSaving" @click="persistSettings">Confirm and save</AppButton></div></div></template>
        </AppModal>

        <AppModal v-model:open="chargeDetailOpen" title="Charge details" description="Price attribution and balance transition for this request.">
      <template #body>
        <div v-if="selectedCharge" class="space-y-5">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-for="item in chargeDetailItems" :key="item.label" class="min-w-0"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words text-sm" :class="item.mono ? 'font-mono text-xs' : ''">{{ item.value }}</dd></div>
          </dl>
          <div class="space-y-3"><p class="text-sm font-semibold">Price snapshot</p><dl v-if="snapshotDetailItems.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2"><div v-for="item in snapshotDetailItems" :key="item.label" class="min-w-0"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words text-sm">{{ item.value }}</dd></div></dl><p v-else class="text-sm text-[var(--ui-text-muted)]">No price snapshot recorded.</p><details v-if="selectedCharge.price_snapshot"><summary class="cursor-pointer text-xs text-[var(--ui-text-muted)]">Raw snapshot</summary><pre class="mt-2 max-h-72 overflow-auto rounded-lg bg-[var(--ui-bg-muted)] p-4 text-xs">{{ prettyJSON(selectedCharge.price_snapshot) }}</pre></details></div>
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
const { fetchAPI } = useApi()
const allOptionValue = '__all__'
const toast = useToast()
const pageSizeOptions = [50, 100, 200].map(value => ({ label: String(value), value }))
const rangeOptions = [
  { label: 'Today', value: 'today' }, { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' }, { label: 'Custom', value: 'custom' }
]
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

const sections = [
  { label: 'Overview', value: 'overview', icon: 'i-tabler-chart-pie' },
  { label: 'Charge records', value: 'charges', icon: 'i-tabler-receipt-tax' },
  { label: 'Balance records', value: 'balances', icon: 'i-tabler-cash-banknote' },
  { label: 'Model prices', value: 'prices', icon: 'i-tabler-tag' }
]
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
const settingsForm = ref({ service_tier_source: 'request', report_timezone: 'UTC' })
const settingsError = ref('')
const timezoneOptions = computed(() => {
  let supported = []
  try { supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [] } catch {}
  return [...new Set(['UTC', deviceTimezone, savedReportTimezone.value, 'Asia/Shanghai', 'Asia/Tokyo', 'Europe/London', 'America/New_York', ...supported])].sort((left, right) => left.localeCompare(right))
})
const timezoneError = computed(() => {
  const timezone = settingsForm.value.report_timezone?.trim()
  if (!timezone || /^[+-]/.test(timezone)) return 'Choose a valid IANA timezone, such as UTC or Asia/Shanghai.'
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); return '' }
  catch { return 'Choose a valid IANA timezone, such as UTC or Asia/Shanghai.' }
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
const chargeColumns = [
  { accessorKey: 'created_at', header: 'Time' },
  { accessorKey: 'user', header: 'User' },
  { accessorKey: 'model', header: 'Model' },
  { accessorKey: 'tokens', header: 'Tokens', meta: rightAligned },
  { accessorKey: 'amount', header: 'Charge', meta: rightAligned },
  actionColumn
]
const balanceColumns = [
  { accessorKey: 'created_at', header: 'Time' },
  { accessorKey: 'user_id', header: 'User' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'amount', header: 'Amount', meta: rightAligned },
  { accessorKey: 'balance', header: 'Balance', meta: rightAligned },
  { accessorKey: 'note', header: 'Note' },
  actionColumn
]
const priceColumns = [
  { accessorKey: 'model', header: 'Model' },
  { accessorKey: 'scope', header: 'Tier / context' },
  { accessorKey: 'input', header: 'Input /1M', meta: rightAligned },
  { accessorKey: 'output', header: 'Output /1M', meta: rightAligned },
  { accessorKey: 'cache_read', header: 'Cache read /1M', meta: rightAligned },
  { accessorKey: 'cache_write', header: 'Cache write /1M', meta: rightAligned },
  { accessorKey: 'request', header: 'Per request', meta: rightAligned },
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'state', header: 'Enabled' },
  { accessorKey: 'updated', header: 'Updated' },
  actionColumn
]
const enabledOptions = [{ label: 'All rules', value: allOptionValue }, { label: 'Enabled', value: 'true' }, { label: 'Disabled', value: 'false' }]
const sourceOptions = [{ label: 'Manual', value: 'manual' }, { label: 'Default', value: 'default' }, { label: 'Synchronized', value: 'sync' }]
const priceSourceOptions = [{ label: 'All sources', value: allOptionValue }, ...sourceOptions]
const tierSourceOptions = [{ label: 'Requested service tier', value: 'request' }, { label: 'Provider response tier', value: 'response' }]
const serviceTierOptions = [{ label: 'All tiers (*)', value: '*' }, { label: 'Standard', value: 'standard' }, { label: 'Flex', value: 'flex' }, { label: 'Priority', value: 'priority' }]
const contextPresetOptions = [{ label: 'Base context', value: 'base' }, { label: '>272K input', value: '272k' }, { label: 'Custom lower bound', value: 'custom' }]
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
  { title: 'Top models', items: topModels.value, empty: 'No model charges found.' },
  { title: 'Top providers', items: topProviders.value, empty: 'No provider charges found.' }
])
const priceMenuItems = computed(() => [[
  { label: 'Import model prices', icon: 'i-tabler-download', onSelect: () => priceImporter.value?.openImport() },
  { label: 'Check for updates', icon: 'i-tabler-refresh', disabled: pricesLoading.value || modelCandidatesLoading.value || !priceRules.value.some(rule => rule.source === 'sync'), onSelect: () => priceImporter.value?.checkUpdates() }
], [
  { label: 'Matching settings', icon: 'i-tabler-settings', onSelect: () => openMatchingSettings() }
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
const userOptions = computed(() => users.value.map(user => ({ label: `${user.username} (#${user.id}) · balance ${formatCredits(user.credits)}${user.credits_unlimited ? ' · unlimited' : ''}`, value: String(user.id) })))
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
  { label: 'Charged', value: formatCredits(overviewData.value.total_charge_amount), hint: 'Selected range' },
  { label: 'Recharged', value: formatCredits(overviewData.value.total_recharge_amount), hint: 'Selected range' },
  { label: 'Deducted', value: formatCredits(overviewData.value.total_deduct_amount), hint: 'Selected range' },
  { label: 'Total balance', value: formatCredits(overviewData.value.total_balance), hint: 'Current snapshot' }
])
const usageMetrics = computed(() => [
  { label: 'Requests', value: formatNumber(overviewData.value.request_count) },
  { label: 'Input tokens', value: formatNumber(overviewData.value.input_tokens) },
  { label: 'Output tokens', value: formatNumber(overviewData.value.output_tokens) },
  { label: 'Cache tokens', value: formatNumber(overviewData.value.cache_tokens) },
  { label: 'Active users', value: formatNumber(overviewData.value.active_user_count) }
])
const balanceDetailItems = computed(() => selectedBalance.value ? [
  { label: 'Record ID', value: selectedBalance.value.id || '—', mono: true },
  { label: 'Created', value: formatDateTime(selectedBalance.value.created_at) },
  { label: 'User ID', value: selectedBalance.value.user_id ?? '—' },
  { label: 'Type', value: selectedBalance.value.type || '—' },
  { label: 'Amount', value: formatCredits(selectedBalance.value.amount) },
  { label: 'Balance before', value: formatCredits(selectedBalance.value.balance_before) },
  { label: 'Balance after', value: formatCredits(selectedBalance.value.balance_after) },
  { label: 'Operator', value: selectedBalance.value.operator || '—' },
  { label: 'Note', value: selectedBalance.value.note || '—' }
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
    ['provider', 'Provider'], ['model', 'Model'],
    ['matched_service_tier', 'Selected rule tier'], ['min_input_tokens', 'Selected band lower bound (input tokens)'],
    ['requested_service_tier', 'Requested service tier'], ['response_service_tier', 'Response service tier'],
    ['service_tier_source', 'Service tier source'], ['effective_service_tier', 'Effective service tier'],
    ['response_tier_fallback', 'Response tier fallback'],
    ['input_price_per_million', 'Input / million'], ['output_price_per_million', 'Output / million'],
    ['cache_read_price_per_million', 'Cache read / million'], ['cache_write_price_per_million', 'Cache write / million'],
    ['request_price', 'Price / request']
  ]
  return fields.filter(([key]) => Object.hasOwn(snapshot, key)).map(([key, label]) => ({ label, value: typeof snapshot[key] === 'boolean' ? (snapshot[key] ? 'Yes' : 'No') : String(snapshot[key]) }))
})
const chargeDetailItems = computed(() => selectedCharge.value ? [
  { label: 'Charge ID', value: selectedCharge.value.id || '—', mono: true },
  { label: 'Request ID', value: selectedCharge.value.request_id || '—', mono: true },
  { label: 'Created', value: formatDateTime(selectedCharge.value.created_at) },
  { label: 'Endpoint', value: selectedCharge.value.endpoint || '—', mono: true },
  { label: 'Provider / Model', value: `${selectedCharge.value.provider || 'Unknown'} / ${selectedCharge.value.model || 'Unknown'}` },
  { label: 'Actual model', value: selectedCharge.value.actual_model || selectedCharge.value.model || '—' },
  ...[['input_tokens', 'Input tokens'], ['output_tokens', 'Output tokens'], ['cache_tokens', 'Cache tokens']]
    .filter(([key]) => selectedCharge.value[key] != null)
    .map(([key, label]) => ({ label, value: formatNumber(selectedCharge.value[key]) })),
  { label: 'Matched price rule', value: selectedCharge.value.matched_price_rule || '—', mono: true },
  { label: 'Amount', value: formatCredits(selectedCharge.value.amount) },
  { label: 'Balance transition', value: `${formatCredits(selectedCharge.value.balance_before)} → ${formatCredits(selectedCharge.value.balance_after)}` },
  { label: 'Client key', value: selectedCharge.value.api_key_label || selectedCharge.value.api_key_masked || '—' }
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
async function loadSettings(preserveDraft = false) { settingsLoading.value = true; try { const settings = await fetchAPI('/billing/settings'); updateReportTimezone(settings?.report_timezone || 'UTC'); if (preserveDraft !== true) settingsForm.value = { service_tier_source: settings?.service_tier_source || 'request', report_timezone: savedReportTimezone.value }; savedTierSource.value = settings?.service_tier_source || 'request' } finally { settingsLoading.value = false } }
async function loadDiagnostics() {
  diagnosticsLoading.value = true
  diagnosticsError.value = ''
  try { tierDiagnostics.value = await fetchAPI('/billing/settings/diagnostics') }
  catch (error) { tierDiagnostics.value = null; diagnosticsError.value = errorMessage(error, 'Could not load tier diagnostics.') }
  finally { diagnosticsLoading.value = false }
}
async function loadUsers() { try { usersResponse.value = await fetchAPI('/users') } catch { usersResponse.value = { users: [] } } }
async function loadModelCandidates() {
  if (modelCandidatesLoading.value) return
  modelCandidatesLoading.value = true; modelCandidatesError.value = ''
  try {
    const [available, staticResult] = await Promise.allSettled([fetchAPI('/models?scope=available'), fetchAPI('/models?scope=static')])
    modelCandidatesResponse.value = { available: available.status === 'fulfilled' ? available.value?.models : [], static: staticResult.status === 'fulfilled' ? staticResult.value?.models : [] }
    if (available.status === 'rejected' && staticResult.status === 'rejected') modelCandidatesError.value = 'Could not load available or static model candidates.'
    else if (available.status === 'rejected' || staticResult.status === 'rejected') modelCandidatesError.value = 'Some model candidates could not be loaded.'
  } finally { modelCandidatesLoading.value = false }
}
async function safely(action, fallback) { pageError.value = ''; try { await action() } catch (error) { pageError.value = errorMessage(error, fallback) } }
async function loadPricesSafely() { await safely(loadPrices, 'Failed to load model prices.') }
async function refreshCurrent() {
  const actions = { overview: loadOverview, charges: loadCharges, balances: loadBalances, prices: loadPrices }
  await safely(actions[activeSection.value], 'Failed to refresh billing data.')
}
function selectRange(section, preset) {
  if (preset === 'custom') return
  const filters = { overview: overviewFilters, charges: chargeFilters, balances: balanceFilters }[section]
  Object.assign(filters.value, datesForRange(preset))
}
async function changePageSize(section) {
  if (section === 'charges') { chargePage.value = 1; await safely(loadCharges, 'Failed to load charges.') }
  else { balancePage.value = 1; await safely(loadBalances, 'Failed to load balance records.') }
}
async function openMatchingSettings() { await safely(async () => { await loadSettings(); settingsError.value = ''; matchingSettingsOpen.value = true; if (priceSchemaVersion.value >= 2) await loadDiagnostics() }, 'Could not load billing settings.') }
async function applyOverviewFilters() { const error = dateRangeError(overviewFilters.value.from, overviewFilters.value.to); if (error) { pageError.value = error; return }; appliedOverviewFilters.value = { ...overviewFilters.value }; await safely(loadOverview, 'Failed to load billing overview.') }
async function resetOverviewFilters() { overviewPreset.value = '7d'; overviewFilters.value = { ...defaultRange(), user: '', provider: '', model: '' }; appliedOverviewFilters.value = { ...overviewFilters.value }; await safely(loadOverview, 'Failed to load billing overview.') }
async function applyChargeFilters() { const error = dateRangeError(chargeFilters.value.from, chargeFilters.value.to); if (error) { pageError.value = error; return }; appliedChargeFilters.value = { ...chargeFilters.value }; chargePage.value = 1; await safely(loadCharges, 'Failed to load charges.') }
async function resetChargeFilters() { chargePreset.value = '7d'; chargeFilters.value = { ...defaultRange(), user: '', provider: '', model: '' }; appliedChargeFilters.value = { ...chargeFilters.value }; chargePage.value = 1; await safely(loadCharges, 'Failed to load charges.') }
async function applyBalanceFilters() { const error = dateRangeError(balanceFilters.value.from, balanceFilters.value.to); if (error) { pageError.value = error; return }; appliedBalanceFilters.value = { ...balanceFilters.value }; balancePage.value = 1; await safely(loadBalances, 'Failed to load balance records.') }
async function resetBalanceFilters() { balancePreset.value = '7d'; balanceFilters.value = { ...defaultRange(), user: '' }; appliedBalanceFilters.value = { ...balanceFilters.value }; balancePage.value = 1; await safely(loadBalances, 'Failed to load balance records.') }
async function changeChargePage(delta) { const next = chargePage.value + delta; const pages = Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)); if (next < 1 || next > pages) return; chargePage.value = next; await safely(loadCharges, 'Failed to load charges.') }
async function changeBalancePage(delta) { const next = balancePage.value + delta; const pages = Math.max(1, Math.ceil(balancesTotal.value / balancePageSize.value)); if (next < 1 || next > pages) return; balancePage.value = next; await safely(loadBalances, 'Failed to load balance records.') }

function openBalanceAdjustment(type) { modalError.value = ''; adjustmentForm.value = { type, user_id: '', amount: '', note: '' }; adjustmentOpen.value = true }
async function submitBalanceAdjustment() {
  modalError.value = ''
  const userID = Number(adjustmentForm.value.user_id)
  const amount = Number(adjustmentForm.value.amount)
  if (!Number.isInteger(userID) || userID <= 0) return modalError.value = 'Select a user.'
  if (!Number.isFinite(amount) || amount <= 0) return modalError.value = 'Amount must be positive.'
  if (adjustmentForm.value.type === 'deduct' && !adjustmentForm.value.note.trim()) return modalError.value = 'A note is required for deductions.'
  adjustmentSaving.value = true
  try {
    await fetchAPI(`/billing/balance-records/${adjustmentForm.value.type}`, { method: 'POST', body: { user_id: userID, amount, note: adjustmentForm.value.note.trim() } })
    adjustmentOpen.value = false
    await Promise.all([loadOverview(), loadBalances(), loadUsers()])
    toast.add({ title: adjustmentForm.value.type === 'recharge' ? 'Balance recharged' : 'Balance deducted', color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) { modalError.value = errorMessage(error, 'Could not adjust the balance.') } finally { adjustmentSaving.value = false }
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
  if (!selected.length) return modalError.value = 'Select at least one model.'
  if (editingPrice.value && selected.length !== 1) return modalError.value = 'Select one model when editing.'
  const numericFields = ['min_input_tokens', 'input_price_per_million', 'output_price_per_million', 'cache_read_price_per_million', 'cache_write_price_per_million', 'request_price']
  const body = { service_tier: priceForm.value.service_tier.trim() || '*', source: priceForm.value.source, enabled: priceForm.value.enabled, note: priceForm.value.note.trim() }
  for (const field of numericFields) { const value = Number(priceForm.value[field]); if (!Number.isFinite(value) || value < 0 || (field === 'min_input_tokens' && !Number.isSafeInteger(value))) return modalError.value = `${field.replaceAll('_', ' ')} must be a non-negative number.`; body[field] = value }
  priceSaving.value = true
  try {
    if (editingPrice.value) {
      const candidate = selected[0]
      await fetchAPI(`/billing/model-prices/${encodeURIComponent(editingPrice.value.id)}`, { method: 'PATCH', body: { ...body, provider: candidate.provider, model: candidate.model } })
      toast.add({ title: 'Price rule updated', color: 'success', icon: 'i-tabler-circle-check' })
    } else {
      const failed = []
      for (const candidate of selected) {
        try { await fetchAPI('/billing/model-prices', { method: 'POST', body: { ...body, provider: candidate.provider, model: candidate.model } }) }
        catch (error) { failed.push(`${candidate.provider}/${candidate.model}: ${errorMessage(error, 'Could not create rule.')}`) }
      }
      if (failed.length) { modalError.value = `${failed.length} price rule(s) failed. ${failed.join(' | ')}`; await loadPrices(); return }
      toast.add({ title: `${selected.length} price rule(s) created`, color: 'success', icon: 'i-tabler-circle-check' })
    }
    priceFormOpen.value = false
    await loadPrices()
  } catch (error) { modalError.value = errorMessage(error, 'Could not save the price rule.') } finally { priceSaving.value = false }
}

async function copyText(value) { try { await navigator.clipboard.writeText(String(value || '')); toast.add({ title: 'Copied', color: 'success' }) } catch {} }
function contextBandLabel(value) { const amount = Number(value || 0); return amount === 0 ? 'Base context' : amount === 272001 ? '>272K input' : `From ${formatNumber(amount)} input tokens` }
async function togglePriceEnabled(rule, enabled) { togglingPrice.value = rule.id; try { await fetchAPI(`/billing/model-prices/${encodeURIComponent(rule.id)}`, { method: 'PATCH', body: { enabled } }); await loadPrices() } catch (error) { pageError.value = errorMessage(error, 'Could not update the price rule.') } finally { togglingPrice.value = '' } }
function confirmDeletePrice(rule) { deletePriceTarget.value = rule; deletePriceOpen.value = true }
async function deletePrice() { if (!deletePriceTarget.value) return; priceDeleting.value = true; try { await fetchAPI(`/billing/model-prices/${encodeURIComponent(deletePriceTarget.value.id)}`, { method: 'DELETE' }); deletePriceOpen.value = false; await loadPrices(); toast.add({ title: 'Price rule deleted', color: 'success', icon: 'i-tabler-circle-check' }) } catch (error) { pageError.value = errorMessage(error, 'Could not delete the price rule.') } finally { priceDeleting.value = false } }
async function saveSettings() {
  if (settingsSaving.value || diagnosticsLoading.value) return
  settingsError.value = timezoneError.value
  if (settingsError.value) return
  if (settingsForm.value.service_tier_source === 'response' && savedTierSource.value !== 'response') {
    await loadDiagnostics()
    if (diagnosticsError.value || !tierDiagnostics.value?.supported) {
      settingsError.value = diagnosticsError.value || 'Response-tier diagnostics are not supported; cannot confirm this change.'
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
    const saved = await fetchAPI('/billing/settings', { method: 'PATCH', body: { service_tier_source: settingsForm.value.service_tier_source, report_timezone: settingsForm.value.report_timezone.trim() } })
    settingsForm.value = saved
    savedTierSource.value = saved.service_tier_source
    updateReportTimezone(saved.report_timezone || 'UTC')
    tierConfirmOpen.value = false
    matchingSettingsOpen.value = false
    toast.add({ title: 'Billing settings saved', color: 'success', icon: 'i-tabler-circle-check' })
    await safely(async () => { await Promise.all([loadOverview(), loadCharges(), loadBalances()]) }, 'Settings saved, but billing reports could not be refreshed.')
  } catch (error) { settingsError.value = errorMessage(error, 'Could not save billing settings.') }
  finally { settingsSaving.value = false }
}
function chargeUserName(charge) {
  if (charge.username) return charge.username
  const user = users.value.find(item => String(item.id) === String(charge.user_id))
  if (user?.username) return user.username
  return charge.user_id ? `User #${charge.user_id}` : 'Unknown user'
}
function balanceUserName(record) {
  const user = users.value.find(item => String(item.id) === String(record.user_id))
  return user?.username || (record.user_id ? `User #${record.user_id}` : '—')
}
function share(amount, items) {
  const max = Math.max(0.000001, ...items.map(item => Number(item.amount) || 0))
  return Math.round(((Number(amount) || 0) / max) * 100)
}
function openBalanceDetail(record) { selectedBalance.value = record; balanceDetailOpen.value = true }
function openChargeDetail(charge) { selectedCharge.value = charge; chargeDetailOpen.value = true }
function totalChargeTokens(charge) { return (Number(charge.input_tokens) || 0) + (Number(charge.output_tokens) || 0) + (Number(charge.cache_tokens) || 0) }
function trendWidth(value) { return Math.max(2, Math.round(((Number(value) || 0) / maxTrendCharge.value) * 100)) }
function formatCredits(value) { return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(Number(value) || 0) }
function formatNumber(value) { return new Intl.NumberFormat().format(Number(value) || 0) }

function formatDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: savedReportTimezone.value }).format(new Date(value)) : '—' }
function prettyJSON(value) { return JSON.stringify(value || {}, null, 2) }
function errorMessage(error, fallback = 'Unexpected request error.') { return error?.data?.message || error?.data?.error || error?.message || fallback }

async function loadBilling(preserveDraft = false) {
  await safely(async () => {
    await loadSettings(preserveDraft)
    await Promise.all([loadOverview(), loadCharges(), loadBalances(), loadPrices(), loadUsers(), loadModelCandidates()])
  }, 'Failed to load billing data.')
}
useDataSync('admin:billing:sync', () => loadBilling(true))
onMounted(loadBilling)
</script>


