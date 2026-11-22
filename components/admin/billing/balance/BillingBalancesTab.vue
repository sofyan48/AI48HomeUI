<template>
      <AdminDataPanel :title="t('billing.section.balances')" :description="t('billing.balances.adjustments', { count: formatNumber(balancesTotal) })">
        <template #actions>
          <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-minus" @click="openBalanceAdjustment('deduct')">{{ t('billing.balances.deduct') }}</AppButton>
          <AppButton size="sm" icon="i-tabler-plus" @click="openBalanceAdjustment('recharge')">{{ t('billing.balances.recharge') }}</AppButton>
        </template>
        <template #toolbar>
          <AdminBillingFilterBar v-model:filters="balanceFilters" :organization-scope="organizationScope" v-model:preset="balancePreset" :range-options="rangeOptions" :user-options="userSearchOptions" :loading="balancesLoading" @range="selectRange('balances', $event)" @apply="applyBalanceFilters" @reset="resetBalanceFilters" />
        </template>
        <AppTable :columns="balanceColumns" :data="balanceRecords" :loading="balancesLoading" :number-offset="(balancePage - 1) * balancePageSize" class="min-w-[30rem] sm:min-w-[52rem]">
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
<script setup lang="ts">
import AdminDataPanel from '~/components/admin/general/DataPanel.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, organizationScope, formatNumber, balancesTotal, openBalanceAdjustment, balanceFilters, balancePreset, rangeOptions, userSearchOptions, balancesLoading, selectRange, applyBalanceFilters, resetBalanceFilters, balanceColumns, balanceRecords, balancePage, balancePageSize, formatDateTime, rowValue, balanceUserName, balanceTypeLabel, formatCredits, openBalanceDetail, changeBalancePage, changePageSize } = useBillingWorkspace()
</script>
