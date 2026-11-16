<template>
  <BillingImportDialog :service-tier-source="serviceTierSource" />
</template>

<script setup lang="ts">
import BillingImportDialog from '~/components/admin/billing/price-import/BillingImportDialog.vue'
import { provideBillingPriceImport } from '~/composables/billing/useBillingPriceImport'

type ImportTarget = { provider: string; model: string }
const props = defineProps<{ providers: string[]; models: string[]; candidates: ImportTarget[]; availableTargets: ImportTarget[]; priceRules: { provider: string; model: string; source: string }[]; serviceTierSource: string }>()
const emit = defineEmits<{ applied: [] }>()
const { openImport, checkUpdates } = provideBillingPriceImport(props, emit)
defineExpose({ openImport, checkUpdates })
</script>
