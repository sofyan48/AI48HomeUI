<template>
    <AppModal v-model:open="balanceDetailOpen" :title="t('billing.balanceDetail.title')" :description="t('billing.balanceDetail.description')">
          <template #body><dl v-if="selectedBalance" class="grid grid-cols-1 gap-4 sm:grid-cols-2"><div v-for="item in balanceDetailItems" :key="item.label" class="min-w-0"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words text-sm" :class="item.mono ? 'font-mono text-xs' : ''">{{ item.value }}</dd></div></dl></template>
        </AppModal>

</template>
<script setup lang="ts">
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, balanceDetailOpen, selectedBalance, balanceDetailItems } = useBillingWorkspace()
</script>
