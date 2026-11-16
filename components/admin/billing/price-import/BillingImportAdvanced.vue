<template>
      <details ref="advancedDetails" class="rounded-lg border border-[var(--ui-border)] p-4">
        <summary class="cursor-pointer text-sm font-semibold">{{ t('billing.import.advanced') }}</summary>
        <fieldset class="mt-4 min-w-0 space-y-4" :disabled="applying">
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.manualTargets') }}</legend><AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="addTarget">{{ t('billing.import.addTarget') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.manualTargetsHint') }}</p>
        <div v-for="(target, index) in targets" :key="index" class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <AdminField :label="t('billing.import.providerN', { n: index + 1 })"><AdminInputMenu v-model="target.provider" :items="providers" create-item :placeholder="t('billing.import.providerPlaceholder')" class="w-full" @update:model-value="targetSet = 'manual'" @create="targetSet = 'manual'; target.provider = $event.trim()" /></AdminField>
          <AdminField :label="t('billing.import.modelN', { n: index + 1 })"><AdminInputMenu v-model="target.model" :items="models" create-item :placeholder="t('billing.import.modelPlaceholder')" class="w-full" @update:model-value="targetSet = 'manual'" @create="targetSet = 'manual'; target.model = $event.trim()" /></AdminField>
          <AppButton v-if="targets.length > 1" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeTarget')" class="self-end" @click="removeTarget(index)" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.aliases') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { aliases.push({ target_model: '', source_models: '' }) }">{{ t('billing.import.addAlias') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.aliasesHint') }}</p>
        <div v-for="(alias, index) in aliases" :key="index" class="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <AdminField :label="t('billing.import.targetModel')"><AdminInput v-model="alias.target_model" :placeholder="t('billing.import.targetModelPlaceholder')" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.catalogModelIds')"><AdminInput v-model="alias.source_models" placeholder="catalog-model-a, catalog-model-b" class="w-full" /></AdminField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeAlias')" class="self-end" @click="() => { aliases.splice(index, 1) }" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.multiplierRules') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { multiplierRules.push({ id: '', label: '', match_mode: 'prefix', pattern: '', multiplier: 1 }) }">{{ t('billing.import.addRule') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.multiplierRulesHint') }}</p>
        <div v-for="(rule, index) in multiplierRules" :key="index" class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <AdminField :label="t('billing.import.labelOptional')"><AdminInput v-model="rule.label" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.match')"><AdminSelect v-model="rule.match_mode" :items="matchModeOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.pattern')"><AdminInput v-model="rule.pattern" :placeholder="rule.match_mode === 'regex' ? t('billing.import.regexPlaceholder') : t('billing.import.prefixPlaceholder')" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.multiplier')"><AdminInput v-model.number="rule.multiplier" type="number" min="0.000001" step="0.01" class="w-full" /></AdminField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeMultiplierRule')" class="self-end" @click="() => { multiplierRules.splice(index, 1) }" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.rowMultipliers') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { rowMultipliers.push({ row_key: '', multiplier: 1 }) }">{{ t('billing.import.addRow') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.rowMultipliersHint') }}</p>
        <div v-for="(row, index) in rowMultipliers" :key="index" class="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <AdminField :label="t('billing.import.rowKey')"><AdminInput v-model="row.row_key" placeholder="provider::model or provider::model::*::200000" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.multiplier')"><AdminInput v-model.number="row.multiplier" type="number" min="0.000001" step="0.01" class="w-full" /></AdminField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeRowMultiplier')" class="self-end" @click="() => { rowMultipliers.splice(index, 1) }" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.overrides') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { matchOverrides.push({ target_provider: '', target_model: '', source_provider: '', source_model: '' }) }">{{ t('billing.import.addOverride') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.overridesHint') }}</p>
        <div v-for="(override, index) in matchOverrides" :key="index" class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <AdminField :label="t('billing.import.targetProvider')"><AdminInput v-model="override.target_provider" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.targetModel')"><AdminInput v-model="override.target_model" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.catalogProvider')"><AdminInput v-model="override.source_provider" class="w-full" /></AdminField>
          <AdminField :label="t('billing.import.catalogModel')"><AdminInput v-model="override.source_model" class="w-full" /></AdminField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeOverride')" class="self-end" @click="() => { matchOverrides.splice(index, 1) }" />
        </div>
      </fieldset>
        <form class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4" @submit.prevent="lookupOperation">
          <h4 class="text-sm font-medium">{{ t('billing.import.lookupTitle') }}</h4>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.lookupHint') }}</p>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <AdminField :label="t('billing.import.operationId')" class="flex-1"><AdminInput v-model="operationId" placeholder="import_…" class="w-full" :disabled="operationLoading" /></AdminField>
            <AppButton type="submit" color="neutral" variant="outline" :loading="operationLoading" :disabled="busy || !operationId.trim()">{{ t('billing.import.lookup') }}</AppButton>
          </div>
          <PortalAlert v-if="operationError" color="error" variant="subtle" :title="t('billing.import.lookupFailed')" :description="operationError" />
        </form>
        </fieldset>
      </details>

</template>
<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInputMenu from '~/components/admin/general/controls/AdminInputMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useBillingPriceImport } from "~/composables/billing/useBillingPriceImport"
const { t, advancedDetails, applying, addTarget, targets, providers, models, targetSet, removeTarget, aliases, multiplierRules, matchModeOptions, rowMultipliers, matchOverrides, lookupOperation, operationId, operationLoading, busy, operationError } = useBillingPriceImport()
</script>
