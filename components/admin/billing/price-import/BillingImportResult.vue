<template>
      <UAlert v-if="operation" :color="operation.status === 'applied' ? 'success' : 'warning'" variant="subtle" :title="t('billing.import.operationTitle', { status: statusLabel(operation.status) })" :description="t('billing.import.operationDescription', { id: operation.operation_id, count: operation.rows?.length || 0, atomic: operation.atomic ? t('billing.import.atomic') : t('billing.import.nonAtomic'), date: operation.applied_at ? formatDate(operation.applied_at) : t('common.unknown') })" />
      <AppButton v-if="failedRows.length" color="neutral" variant="outline" :disabled="busy || !!pendingApply" @click="retryFailedRows">{{ t('billing.import.retryFailed', { count: failedRows.length }) }}</AppButton>
      <pre v-if="operation?.summary" class="overflow-auto rounded-lg bg-[var(--ui-bg-muted)] p-3 text-xs">{{ JSON.stringify(operation.summary, null, 2) }}</pre>
      <div v-if="operation?.rows?.length" class="max-h-56 space-y-2 overflow-y-auto"><div v-for="result in operation.rows" :key="result.key" class="rounded-lg border border-[var(--ui-border)] p-3 text-xs"><strong>{{ result.key }}</strong><span> · {{ result.status ? statusLabel(result.status) : actionLabel(result.action) }}</span><span v-if="result.resource_id" class="block font-mono text-[var(--ui-text-muted)]">{{ result.resource_id }}</span><span v-if="result.error_code || result.error_message" class="block text-[var(--ui-error)]">{{ result.error_code }} {{ result.error_message }}</span></div></div>

</template>
<script setup lang="ts">
import { useBillingPriceImport } from "~/composables/billing/useBillingPriceImport"
const { t, operation, statusLabel, formatDate, failedRows, busy, pendingApply, retryFailedRows, actionLabel } = useBillingPriceImport()
</script>
