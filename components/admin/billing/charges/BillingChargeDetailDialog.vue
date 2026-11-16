<template>
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

</template>
<script setup lang="ts">
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, chargeDetailOpen, selectedCharge, chargeDetailItems, snapshotDetailItems, prettyJSON } = useBillingWorkspace()
</script>
