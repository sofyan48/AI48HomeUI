<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { dashboardMetricIcons, rowValue, useWorkspaceBilling } from '~/composables/workspace/useWorkspaceBilling'
import { useWorkspaceFormat } from '~/composables/workspace/common'

const { t } = usePortalI18n()
const { formatCredits, formatNumber, formatDate } = useWorkspaceFormat()
const { charges, chargesTotal, billingLoading, billingError, rangeOptions, pageSizeOptions, rangePreset, rangeFrom, rangeTo, chargePage, chargePageSize, chargePages, chargeRangeStart, chargeRangeEnd, topModels, chargeColumns, billingMetrics, loadBilling, selectRange, applyBillingRange, changePageSize, changeChargePage } = useWorkspaceBilling()
</script>

<template>
  <section class="workspace-finance space-y-5" aria-labelledby="billing-title">
    <AppCard class="finance-panel finance-usage" :ui="{ body: 'space-y-5' }">
      <template #header><div class="flex items-center gap-3"><span class="finance-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><AppIcon name="i-tabler-chart-bar" class="size-5" aria-hidden="true" /></span><div><h2 id="billing-title" class="text-sm font-semibold">{{ t('ws.billing.title') }}</h2><p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.billing.subtitle') }}</p></div></div></template>
      <form class="billing-range flex flex-wrap items-end gap-3" @submit.prevent="applyBillingRange">
        <PortalField :label="t('ws.dashboard.timeRange')" class="min-w-0 flex-1 sm:w-44 sm:flex-none">
          <PortalSelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-full" @update:model-value="selectRange" />
        </PortalField>
        <template v-if="rangePreset === 'custom'">
          <PortalField :label="t('ws.dashboard.fromUtc')" class="w-full sm:w-auto"><PortalInput v-model="rangeFrom" type="date" /></PortalField>
          <PortalField :label="t('ws.dashboard.toUtc')" class="w-full sm:w-auto"><PortalInput v-model="rangeTo" type="date" /></PortalField>
          <AppButton type="submit" :loading="billingLoading">{{ t('ws.billing.applyRange') }}</AppButton>
        </template>
        <AppButton type="button" class="ml-auto shrink-0 rounded-full" color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="billingLoading" @click="loadBilling">{{ t('common.refresh') }}</AppButton>
      </form>
      <PortalAlert v-if="billingError" class="mt-4" color="error" variant="subtle" :title="t('ws.billing.error')" :description="billingError" />

      <div class="billing-stat-strip grid min-w-0 grid-cols-2 gap-5 lg:grid-cols-4" :aria-label="t('ws.billing.summaryAria')" :aria-busy="billingLoading">
        <div v-for="(metric, index) in billingMetrics" :key="metric.label" class="billing-stat min-w-0" :class="{ 'billing-stat--featured': index === 0 }">
          <p class="flex items-center gap-2 text-sm text-[var(--ui-text-muted)]"><AppIcon :name="dashboardMetricIcons[index]" class="size-4 billing-stat-icon" aria-hidden="true" />{{ metric.label }}</p>
          <p class="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums text-[var(--ui-text-highlighted)]">{{ billingLoading ? '—' : metric.value }}</p>
          <p class="mt-2 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ metric.detail }}</p>
        </div>
      </div>
      <details class="billing-models">
        <summary class="flex cursor-pointer items-center gap-3 text-sm font-medium"><AppIcon name="i-tabler-stack-2" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /><span>{{ t('ws.billing.modelBreakdown') }}</span><AppIcon name="i-tabler-chevron-down" class="billing-model-chevron ml-auto size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /></summary>
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
              <h3 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-receipt" class="size-4 text-[var(--ui-primary)]" aria-hidden="true" /> {{ t('ws.billing.recentCharges') }}</h3>
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('ws.billing.matchingRecords', { count: formatNumber(chargesTotal) }) }}</p>
            </div>

          </div>
        </template>
        <div class="min-h-64 overflow-x-auto">
          <PortalTable :data="charges" :columns="chargeColumns" :loading="billingLoading" :empty="t('ws.billing.noCharges')" class="min-w-[800px]">
            <template #created_at-cell="{ row }"><span class="whitespace-nowrap text-sm">{{ formatDate(rowValue(row).created_at) }}</span></template>
            <template #provider-cell="{ row }"><span class="text-sm">{{ rowValue(row).provider || '—' }}</span></template>
            <template #model-cell="{ row }"><span class="text-sm font-medium">{{ rowValue(row).model || '—' }}</span></template>
            <template #input_tokens-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).input_tokens) }}</span></template>
            <template #output_tokens-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).output_tokens) }}</span></template>
            <template #amount-cell="{ row }"><span class="font-mono font-semibold tabular-nums text-[var(--ui-text-highlighted)]">−{{ formatCredits(Math.abs(Number(rowValue(row).amount) || 0)) }}</span></template>
            <template #balance_after-cell="{ row }"><span class="font-mono">{{ formatCredits(rowValue(row).balance_after) }}</span></template>
          </PortalTable>
        </div>
        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div class="flex flex-wrap items-center gap-3">
              <PortalField :label="t('ws.billing.rowsPerPage')" orientation="horizontal" class="w-auto shrink-0" :ui="{ container: 'shrink-0', label: 'whitespace-nowrap' }">
                <PortalSelect v-model="chargePageSize" :items="pageSizeOptions" value-key="value" label-key="label" class="w-20 shrink-0" @update:model-value="changePageSize" />
              </PortalField>
              <span class="text-[var(--ui-text-muted)]">{{ t('ws.billing.showing', { start: chargeRangeStart, end: chargeRangeEnd, total: formatNumber(chargesTotal) }) }}</span>
            </div>
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
</template>

<style scoped>
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
.workspace-finance .finance-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}
</style>
