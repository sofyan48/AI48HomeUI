<template>
    <AppModal v-model:open="priceFormOpen" :title="editingPrice ? t('billing.prices.edit') : t('billing.priceForm.newTitle')" :description="t('billing.priceForm.description')" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitPrice">
          <PortalAlert v-if="modalError" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('billing.priceForm.saveFailedTitle')" :description="modalError" />
          <PortalAlert v-if="modelCandidatesError" color="warning" variant="subtle" :title="t('billing.priceForm.candidatesUnavailable')" :description="modelCandidatesError" />
          <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
            <div class="flex flex-wrap items-center justify-between gap-2"><div><legend class="font-medium">{{ t('common.models') }}</legend><p class="text-xs text-[var(--ui-text-muted)]">{{ editingPrice ? t('billing.priceForm.selectOne') : t('billing.priceForm.selectMany') }}</p></div><AppButton v-if="selectedPriceCandidates.length" type="button" size="sm" color="neutral" variant="ghost" @click="clearPriceCandidateSelection">{{ t('billing.priceForm.clearSelection') }}</AppButton></div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center"><AdminInput v-model="modelCandidateSearch" icon="i-tabler-search" :placeholder="t('billing.priceForm.candidateSearch')" class="w-full" /><AdminCheckbox v-model="availableModelsOnly" :label="t('billing.priceForm.availableOnly')" class="shrink-0" /></div>
            <div v-if="selectedPriceCandidates.length" class="flex flex-wrap gap-2"><PortalBadge v-for="candidate in selectedPriceCandidates" :key="candidate.key" color="primary" variant="subtle">{{ candidate.provider }} / {{ candidate.model }}</PortalBadge></div>
            <div class="max-h-72 overflow-y-auto rounded-md border border-[var(--ui-border)]">
              <button v-for="candidate in filteredModelCandidates" :key="candidate.key" type="button" class="flex w-full items-start gap-3 border-b border-[var(--ui-border)] px-3 py-2.5 text-left last:border-b-0 hover:bg-[var(--ui-bg-elevated)]" :class="isPriceCandidateSelected(candidate) ? 'bg-[var(--ui-primary)]/10' : ''" @click="togglePriceCandidate(candidate)">
                <input :type="editingPrice ? 'radio' : 'checkbox'" :checked="isPriceCandidateSelected(candidate)" tabindex="-1" class="mt-1" />
                <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-bg-elevated)] text-xs font-semibold">{{ providerMark(candidate.provider) }}</span>
                <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ candidate.displayName || candidate.model }}</span><span class="block truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ candidate.model }}</span><span class="block truncate text-xs text-[var(--ui-text-muted)]">{{ candidate.provider }} · {{ candidate.available ? t('billing.priceForm.available') : t('billing.priceForm.staticCatalog') }}<template v-if="candidate.ownedBy"> · {{ candidate.ownedBy }}</template><template v-if="candidate.type"> · {{ candidate.type }}</template></span><span v-if="candidate.description" class="mt-1 block line-clamp-2 text-xs text-[var(--ui-text-muted)]">{{ candidate.raw === null && candidate.description === 'Existing model price rule' ? t('billing.priceForm.existingRule') : candidate.description }}</span></span>
              </button>
              <p v-if="modelCandidatesLoading" class="p-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.priceForm.loadingCandidates') }}</p><p v-else-if="!filteredModelCandidates.length" class="p-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.priceForm.noCandidates') }}</p>
            </div>
          </fieldset>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField v-if="priceSchemaVersion >= 2" :label="t('billing.prices.serviceTier')"><AdminSelect v-model="priceForm.service_tier" :items="serviceTierOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
            <AdminField v-if="priceSchemaVersion >= 2" :label="t('billing.priceForm.contextBand')"><AdminSelect v-model="contextPreset" :items="contextPresetOptions" value-key="value" label-key="label" class="w-full" @update:model-value="applyContextPreset" /></AdminField>
            <AdminField v-if="priceSchemaVersion >= 2 && contextPreset === 'custom'" :label="t('billing.priceForm.minInputTokens')"><AdminInput v-model="priceForm.min_input_tokens" type="number" min="0" step="1" class="w-full" /></AdminField>
            <AdminField :label="t('billing.priceForm.inputPerM')"><AdminInput v-model="priceForm.input_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></AdminField>
            <AdminField :label="t('billing.priceForm.outputPerM')"><AdminInput v-model="priceForm.output_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></AdminField>
            <AdminField :label="t('billing.priceForm.cacheReadPerM')"><AdminInput v-model="priceForm.cache_read_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></AdminField>
            <AdminField :label="t('billing.priceForm.cacheWritePerM')"><AdminInput v-model="priceForm.cache_write_price_per_million" type="number" min="0" step="0.000001" class="w-full" /></AdminField>
            <AdminField :label="t('billing.col.perRequest')"><AdminInput v-model="priceForm.request_price" type="number" min="0" step="0.000001" class="w-full" /></AdminField>
            <AdminField :label="t('billing.col.source')"><AdminSelect v-model="priceForm.source" :items="sourceOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
          </div>
          <AdminField :label="t('billing.col.note')"><AdminTextarea v-model="priceForm.note" :rows="3" class="w-full" /></AdminField>
          <div class="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-4"><div><p class="font-medium">{{ t('common.enabled') }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.priceForm.enabledHelp') }}</p></div><AdminSwitch v-model="priceForm.enabled" /></div>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" :disabled="priceSaving" @click="priceFormOpen = false">{{ t('common.cancel') }}</AppButton><AppButton type="submit" :loading="priceSaving">{{ editingPrice ? t('billing.priceForm.saveChanges') : !selectedPriceCandidates.length ? t('billing.priceForm.createNone') : selectedPriceCandidates.length === 1 ? t('billing.priceForm.createOne', { count: 1 }) : t('billing.priceForm.createMany', { count: selectedPriceCandidates.length }) }}</AppButton></div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="deletePriceOpen" :title="t('billing.delete.title')" :description="t('billing.delete.description')">
      <template #body><div class="space-y-5"><PortalAlert color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('billing.delete.warning')" :description="deletePriceTarget ? `${deletePriceTarget.provider} / ${deletePriceTarget.model} / ${deletePriceTarget.service_tier || '*'}` : ''" /><div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" @click="deletePriceOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="priceDeleting" @click="deletePrice">{{ t('billing.delete.confirm') }}</AppButton></div></div></template>
    </AppModal>

</template>
<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, priceFormOpen, editingPrice, submitPrice, modalError, modelCandidatesError, selectedPriceCandidates, clearPriceCandidateSelection, modelCandidateSearch, availableModelsOnly, filteredModelCandidates, isPriceCandidateSelected, togglePriceCandidate, providerMark, modelCandidatesLoading, priceSchemaVersion, priceForm, serviceTierOptions, contextPreset, contextPresetOptions, applyContextPreset, sourceOptions, priceSaving, deletePriceOpen, deletePriceTarget, priceDeleting, deletePrice } = useBillingWorkspace()
</script>
