<template>
      <PortalAlert v-if="modelCandidatesError" color="warning" variant="subtle" :title="t('billing.prices.candidatesImportUnavailable')" :description="modelCandidatesError" />
      <AdminBillingPriceImport ref="priceImporter" :providers="importProviderOptions" :models="modelSearchOptions" :candidates="modelCandidates" :available-targets="modelCandidates.filter(candidate => candidate.available)" :price-rules="priceRules" :service-tier-source="savedTierSource" @applied="loadPricesSafely" />
      <AdminDataPanel :title="t('billing.section.prices')" :description="t('billing.prices.ruleCount', { shown: filteredPriceRules.length, total: priceRules.length })">
        <template #actions>
          <AppButton v-if="selectedIDs.size" size="sm" color="error" variant="outline" icon="i-tabler-trash" :disabled="pricesLoading || busy" @click="confirm">{{ t('billing.bulkDelete.action', { count: selectedIDs.size }) }}</AppButton>
          <AppButton v-if="selectedIDs.size" size="sm" color="neutral" variant="ghost" :disabled="busy" @click="clear">{{ t('billing.priceForm.clearSelection') }}</AppButton>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-dots-vertical" :aria-label="t('billing.prices.moreActions')" :title="t('billing.prices.moreActions')" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <template v-for="(group, groupIndex) in priceMenuItems" :key="groupIndex">
                <DropdownMenuSeparator v-if="groupIndex" />
                <DropdownMenuItem v-for="item in group" :key="item.label" :disabled="busy || item.disabled" @select="item.onSelect">
                  <AppIcon :name="item.icon" />
                  {{ item.label }}
                </DropdownMenuItem>
              </template>
            </DropdownMenuContent>
          </DropdownMenu>
          <AppButton size="sm" icon="i-tabler-plus" :disabled="busy" @click="openPriceForm()">{{ t('billing.prices.new') }}</AppButton>
        </template>
        <template #toolbar>
          <div class="flex flex-wrap items-center gap-2">
            <AdminInput v-model="priceFilters.search" icon="i-tabler-search" :placeholder="t('billing.prices.searchPlaceholder')" :aria-label="t('billing.prices.searchLabel')" class="w-full sm:w-64" />
            <AdminSelect :model-value="priceFilters.enabled || allOptionValue" :items="enabledOptions" value-key="value" label-key="label" :aria-label="t('common.status')" class="w-32" @update:model-value="priceFilters.enabled = $event === allOptionValue ? '' : $event" />
            <AdminSelect :model-value="priceFilters.source || allOptionValue" :items="priceSourceOptions" value-key="value" label-key="label" :aria-label="t('billing.col.source')" class="w-36" @update:model-value="priceFilters.source = $event === allOptionValue ? '' : $event" />
            <AdminInputMenu v-if="priceSchemaVersion >= 2" v-model="priceFilters.service_tier" :items="priceTierOptions" create-item :placeholder="t('billing.prices.allTiers')" :aria-label="t('billing.prices.serviceTier')" class="w-32" @create="priceFilters.service_tier = $event.trim()" />
            <AppButton v-if="hasPriceFilters" size="sm" color="neutral" variant="ghost" @click="clearPriceFilters">{{ t('billing.prices.clear') }}</AppButton>
            <span class="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)]" :title="settingsForm.service_tier_source === 'response' ? t('billing.prices.matchResponseHint') : t('billing.prices.matchRequestHint')">
              <AppIcon name="i-tabler-arrows-exchange" class="size-3.5" />
              {{ priceSchemaVersion >= 2 ? t('billing.prices.tierMatching', { source: savedTierSource === 'response' ? t('billing.prices.responseTier') : t('billing.prices.requestedTier') }) : t('billing.prices.flatOnly') }}
              <span v-if="modelCandidatesLoading">{{ t('billing.prices.loadingCandidates') }}</span>
            </span>
          </div>
        </template>
        <AppTable :columns="selectablePriceColumns" :data="filteredPriceRules" :loading="pricesLoading" class="min-w-[72rem]">
          <template #select-header><AdminCheckbox :model-value="allSelected" :indeterminate="someSelected" :disabled="busy || pricesLoading || !filteredPriceRules.length" :aria-label="t('billing.bulkDelete.selectAll')" @update:model-value="selectAll($event === true)" /></template>
          <template #select-cell="{ row }"><AdminCheckbox :model-value="selectedIDs.has(rowValue(row).id)" :disabled="busy || pricesLoading" :aria-label="t('billing.bulkDelete.selectOne', { model: rowValue(row).model, provider: rowValue(row).provider })" @update:model-value="select(rowValue(row).id, $event === true)" /></template>
          <template #model-cell="{ row }"><div class="group flex min-w-0 items-center gap-1"><div class="min-w-0"><p class="max-w-72 truncate font-mono text-xs font-medium text-[var(--ui-text-highlighted)]" :title="rowValue(row).model">{{ rowValue(row).model }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).provider }}</p></div><AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('billing.prices.copyModelId')" class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" @click="copyText(rowValue(row).model)" /></div></template>
          <template #scope-cell="{ row }"><template v-if="priceSchemaVersion >= 2"><p class="font-mono text-xs">{{ rowValue(row).service_tier || '*' }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ contextBandLabel(rowValue(row).min_input_tokens) }}</p></template><span v-else class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.prices.flat') }}</span></template>
          <template #input-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).input_price_per_million) }}</span></template>
          <template #output-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).output_price_per_million) }}</span></template>
          <template #cache_read-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).cache_read_price_per_million) }}</span></template>
          <template #cache_write-cell="{ row }"><span v-if="Number(rowValue(row).cache_write_price_per_million)" class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).cache_write_price_per_million) }}</span><span v-else class="block text-right text-xs text-[var(--ui-text-dimmed)]" :title="t('billing.prices.noCacheWrite')">—</span></template>
          <template #request-cell="{ row }"><span class="block text-right font-mono text-xs tabular-nums">{{ formatCredits(rowValue(row).request_price) }}</span></template>
          <template #source-cell="{ row }"><span class="text-xs capitalize text-[var(--ui-text-muted)]">{{ priceSourceLabel(rowValue(row).source || 'manual') }}</span></template>
          <template #state-cell="{ row }"><AdminSwitch :model-value="Boolean(rowValue(row).enabled)" :disabled="busy" :loading="togglingPrice === rowValue(row).id" :aria-label="rowValue(row).enabled ? t('billing.prices.disableRule') : t('billing.prices.enableRule')" @update:model-value="togglePriceEnabled(rowValue(row), $event)" /></template>
          <template #updated-cell="{ row }"><span class="whitespace-nowrap text-xs text-[var(--ui-text-muted)]">{{ formatDateTime(rowValue(row).updated_at) }}</span></template>
          <template #actions-cell="{ row }"><div class="flex justify-end gap-1"><AdminTableAction action="edit" :disabled="busy" :label="t('billing.prices.edit')" @click="openPriceForm(rowValue(row))" /><AdminTableAction action="delete" :disabled="busy" :label="t('billing.prices.delete')" destructive @click="confirmDeletePrice(rowValue(row))" /></div></template>
          <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('billing.prices.empty') }}</div></template>
        </AppTable>
      </AdminDataPanel>
      <AppConfirmModal v-model:open="open" :title="t('billing.bulkDelete.title')" :description="t('billing.delete.description')" :message="t('billing.bulkDelete.message', { count: targets.length })" :confirm-label="t('billing.bulkDelete.action', { count: targets.length })" :loading="busy" :locked="busy" :error="error" @confirm="remove">
        <ul class="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-muted-foreground"><li v-for="rule in targets" :key="rule.id">{{ rule.provider }} / {{ rule.model }} · {{ rule.service_tier || '*' }} · {{ contextBandLabel(rule.min_input_tokens) }}</li></ul>
      </AppConfirmModal>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useApi } from '~/composables/useApi'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import AppConfirmModal from '~/components/AppConfirmModal.vue'
import { useBulkPriceDelete } from '~/composables/billing/useBulkPriceDelete'
import AdminInputMenu from '~/components/admin/general/controls/AdminInputMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AppIcon from '~/components/AppIcon.vue'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import AdminDataPanel from '~/components/admin/general/DataPanel.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
import AdminBillingPriceImport from "~/components/admin/billing/BillingPriceImport.vue"
const { t, modelCandidatesError, priceImporter, importProviderOptions, modelSearchOptions, modelCandidates, priceRules, savedTierSource, loadPricesSafely, filteredPriceRules, priceMenuItems, openPriceForm, priceFilters, allOptionValue, enabledOptions, priceSourceOptions, priceSchemaVersion, priceTierOptions, hasPriceFilters, clearPriceFilters, settingsForm, modelCandidatesLoading, priceColumns, pricesLoading, rowValue, copyText, contextBandLabel, formatCredits, priceSourceLabel, togglingPrice, togglePriceEnabled, formatDateTime, confirmDeletePrice } = useBillingWorkspace()
const selectablePriceColumns = computed(() => [{ id: 'select', header: '', enableSorting: false }, ...priceColumns.value])
const { fetchAPI } = useApi()
const toast = useAdminToast()
const { selectedIDs, open, busy, error, targets, allSelected, someSelected, select, selectAll, clear, confirm, remove } = useBulkPriceDelete(priceRules, filteredPriceRules, loadPricesSafely, {
  deleteRule: id => fetchAPI(`/billing/model-prices/${encodeURIComponent(id)}`, { method: 'DELETE' }), t, toast,
})
</script>
