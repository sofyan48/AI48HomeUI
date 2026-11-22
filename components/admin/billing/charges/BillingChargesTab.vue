<template>
      <AdminDataPanel :title="t('billing.charges.title')" :description="t('billing.charges.records', { count: formatNumber(chargesTotal) })">
        <template #toolbar>
          <AdminBillingFilterBar v-model:filters="chargeFilters" :organization-scope="organizationScope" v-model:preset="chargePreset" :range-options="rangeOptions" :user-options="userSearchOptions" :provider-options="providerSearchOptions" :model-options="modelSearchOptions" :loading="chargesLoading" @range="selectRange('charges', $event)" @apply="applyChargeFilters" @reset="resetChargeFilters" />
        </template>
        <AppTable :columns="chargeColumns" :data="charges" :loading="chargesLoading" :number-offset="(chargePage - 1) * chargePageSize" class="min-w-[36rem] sm:min-w-[56rem]">
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
<script setup lang="ts">
import AdminDataPanel from '~/components/admin/general/DataPanel.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, organizationScope, formatNumber, chargesTotal, chargeFilters, chargePreset, rangeOptions, userSearchOptions, providerSearchOptions, modelSearchOptions, chargesLoading, selectRange, applyChargeFilters, resetChargeFilters, chargeColumns, charges, chargePage, chargePageSize, formatDateTime, rowValue, chargeUserName, totalChargeTokens, formatCredits, openChargeDetail, changeChargePage, changePageSize } = useBillingWorkspace()
</script>
