<template>
  <div class="space-y-4">
    <BillingWorkspaceHeader />
    <BillingOverviewTab v-if="activeSection === 'overview'" />
    <BillingChargesTab v-else-if="activeSection === 'charges'" />
    <BillingBalancesTab v-else-if="activeSection === 'balances'" />
    <BillingPricesTab v-else-if="activeSection === 'prices'" />
    <BillingSettingsDialog />
    <BillingAdjustmentDialog />
    <BillingPriceDialog />
    <BillingBalanceDetailDialog />
    <BillingChargeDetailDialog />
  </div>
</template>

<script setup lang="ts">
import { provideBillingWorkspace } from '~/composables/billing/useBillingWorkspace'
import BillingWorkspaceHeader from '~/components/admin/billing/BillingWorkspaceHeader.vue'
import BillingOverviewTab from '~/components/admin/billing/overview/BillingOverviewTab.vue'
import BillingChargesTab from '~/components/admin/billing/charges/BillingChargesTab.vue'
import BillingBalancesTab from '~/components/admin/billing/balance/BillingBalancesTab.vue'
import BillingPricesTab from '~/components/admin/billing/pricing/BillingPricesTab.vue'
import BillingSettingsDialog from '~/components/admin/billing/settings/BillingSettingsDialog.vue'
import BillingAdjustmentDialog from '~/components/admin/billing/balance/BillingAdjustmentDialog.vue'
import BillingPriceDialog from '~/components/admin/billing/pricing/BillingPriceDialog.vue'
import BillingBalanceDetailDialog from '~/components/admin/billing/balance/BillingBalanceDetailDialog.vue'
import BillingChargeDetailDialog from '~/components/admin/billing/charges/BillingChargeDetailDialog.vue'

const { activeSection } = provideBillingWorkspace()
</script>
