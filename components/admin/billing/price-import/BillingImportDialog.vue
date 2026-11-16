<template>
  <USlideover v-model:open="open" side="right" :title="t('billing.prices.import')" :description="t('billing.import.description')" :dismissible="!applying" :close="!applying" :ui="{ content: 'w-full sm:max-w-4xl', body: 'min-h-0 overflow-y-auto', footer: 'shrink-0 bg-[var(--ui-bg)]' }">
    <template #body>
    <div class="space-y-5">
      <UAlert v-if="error" color="error" variant="subtle" :description="error" />
      <UAlert v-if="recoveryError" color="warning" variant="subtle" :title="t('billing.import.applyDisabled')" :description="recoveryError" />
      <UAlert v-else-if="applySupportError" color="warning" variant="subtle" :title="t('billing.import.newAppliesUnavailable')" :description="libMessage(applySupportError)" />
      <AppButton v-if="recoveryError && storageKey" color="error" variant="outline" :disabled="busy" @click="discardPendingOpen = true">{{ t('billing.import.discardUnreadable') }}</AppButton>
      <section v-if="pendingApply" class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4" aria-labelledby="pending-import-title">
        <h3 id="pending-import-title" class="text-sm font-semibold">{{ t('billing.import.pendingTitle') }}</h3>
        <p class="text-sm">{{ t('billing.import.pendingBody') }}</p>
        <p class="break-all text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.pendingMeta', { date: formatDate(pendingApply.createdAt), count: pendingApply.input.selected_keys.length, id: pendingApply.input.preview_id }) }}</p>
        <div class="flex flex-col gap-2 sm:flex-row">
          <AppButton :loading="applying" :disabled="busy || !recoveryReady" @click="retryPendingApply">{{ t('billing.import.retrySaved') }}</AppButton>
          <AppButton color="error" variant="outline" :disabled="busy" @click="discardPendingOpen = true">{{ t('billing.import.discardRecoveryEllipsis') }}</AppButton>
        </div>
      </section>
      <UAlert v-if="importUnavailable" color="warning" variant="subtle" :title="t('billing.import.unavailableTitle')" :description="t('billing.import.unavailableDescription')" />
      <section class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-4" aria-labelledby="import-context-title">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 id="import-context-title" class="text-sm font-semibold">{{ t('billing.import.contextTitle') }}</h3>
          <UBadge color="neutral" variant="subtle">{{ serviceTierSource === 'response' ? t('billing.tierSource.response') : t('billing.import.clientRequestTier') }}</UBadge>
        </div>
        <p class="mt-2 text-xs text-[var(--ui-text-muted)]">{{ serviceTierSource === 'response' ? t('billing.import.contextResponse') : t('billing.import.contextRequest') }} {{ t('billing.import.contextSuffix') }}</p>
      </section>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4" :disabled="applying">
        <legend class="px-1 text-sm font-semibold">{{ t('billing.import.targetsTitle') }}</legend>
        <UFormField :label="t('billing.import.catalogSource')"><USelect v-model="source" :items="catalogSourceOptions" value-key="value" label-key="label" class="w-full" :disabled="busy || !!pendingApply" /></UFormField>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ sourceDescription }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField :label="t('common.provider')"><USelect v-model="providerFilter" :items="providerOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.targetSet')"><USelect v-model="targetSet" :items="targetSetOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
        </div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.targetCount', { count: targets.length }) }} · {{ targetSet === 'manual' ? t('billing.import.targetsManualHint') : t('billing.import.targetsAutoHint') }}</p>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.credentialsNote') }}</p>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4" :disabled="applying">
        <legend class="px-1 text-sm font-semibold">{{ t('billing.import.policyTitle') }}</legend>
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField :label="t('billing.import.defaultMultiplier')"><UInput v-model.number="defaultMultiplier" type="number" min="0.000001" step="0.01" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.existingHandling')"><USelect v-model="overwriteMode" :items="overwriteOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
        </div>
        <UCheckbox v-model="includeZeroCost" :label="t('billing.import.includeZeroCost')" />
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.policyHint') }}</p>
      </fieldset>
      <BillingImportAdvanced />
      <UAlert v-if="validationError" color="warning" variant="subtle" :description="validationError" />
      <BillingImportPreview />
      <BillingImportResult />
    </div>
    </template>
    <template #footer>
      <div class="w-full space-y-3">
        <UCheckbox v-if="requiresOverwrite" v-model="confirmOverwrite" :disabled="applying" :label="t('billing.import.confirmOverwrite')" />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.selectedFooter', { count: selected.length }) }}</p>
          <div class="flex gap-2">
            <AppButton color="neutral" variant="outline" :disabled="applying" @click="open = false">{{ t('common.cancel') }}</AppButton>
            <AppButton :loading="applying" :disabled="busy || !recoveryReady || !!applySupportError || !!pendingApply || !preview || !selected.length || (requiresOverwrite && !confirmOverwrite)" @click="applyPrices">{{ t('billing.import.confirmApply', { count: selected.length }) }}</AppButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
  <UModal v-model:open="discardPendingOpen" :title="t('billing.import.discardTitle')" :description="t('billing.import.discardDescription')">
    <template #footer>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
        <AppButton color="neutral" variant="outline" @click="discardPendingOpen = false">{{ t('billing.import.keepRecovery') }}</AppButton>
        <AppButton color="error" :disabled="busy" @click="discardPendingApply">{{ t('billing.import.discardRecovery') }}</AppButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useBillingPriceImport } from "~/composables/billing/useBillingPriceImport"
import BillingImportAdvanced from "~/components/admin/billing/price-import/BillingImportAdvanced.vue"
import BillingImportPreview from "~/components/admin/billing/price-import/BillingImportPreview.vue"
import BillingImportResult from "~/components/admin/billing/price-import/BillingImportResult.vue"
const { t, open, applying, error, recoveryError, applySupportError, libMessage, discardPendingOpen, busy, pendingApply, formatDate, recoveryReady, retryPendingApply, importUnavailable, providerFilter, targetSet, targets, catalogSourceOptions, source, sourceDescription, providerOptions, targetSetOptions, defaultMultiplier, overwriteMode, overwriteOptions, includeZeroCost, validationError, requiresOverwrite, confirmOverwrite, selected, preview, applyPrices, discardPendingApply } = useBillingPriceImport()
const importState = useBillingPriceImport()
const storageKey = toRef(() => importState.storageKey)
const { serviceTierSource } = defineProps<{ serviceTierSource: string }>()
</script>
