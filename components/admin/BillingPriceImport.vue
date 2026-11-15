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
      <details ref="advancedDetails" class="rounded-lg border border-[var(--ui-border)] p-4">
        <summary class="cursor-pointer text-sm font-semibold">{{ t('billing.import.advanced') }}</summary>
        <fieldset class="mt-4 min-w-0 space-y-4" :disabled="applying">
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.manualTargets') }}</legend><AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="addTarget">{{ t('billing.import.addTarget') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.manualTargetsHint') }}</p>
        <div v-for="(target, index) in targets" :key="index" class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <UFormField :label="t('billing.import.providerN', { n: index + 1 })"><UInputMenu v-model="target.provider" :items="providers" create-item :placeholder="t('billing.import.providerPlaceholder')" class="w-full" @update:model-value="targetSet = 'manual'" @create="targetSet = 'manual'; target.provider = $event.trim()" /></UFormField>
          <UFormField :label="t('billing.import.modelN', { n: index + 1 })"><UInputMenu v-model="target.model" :items="models" create-item :placeholder="t('billing.import.modelPlaceholder')" class="w-full" @update:model-value="targetSet = 'manual'" @create="targetSet = 'manual'; target.model = $event.trim()" /></UFormField>
          <AppButton v-if="targets.length > 1" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeTarget')" class="self-end" @click="removeTarget(index)" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.aliases') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { aliases.push({ target_model: '', source_models: '' }) }">{{ t('billing.import.addAlias') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.aliasesHint') }}</p>
        <div v-for="(alias, index) in aliases" :key="index" class="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <UFormField :label="t('billing.import.targetModel')"><UInput v-model="alias.target_model" :placeholder="t('billing.import.targetModelPlaceholder')" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.catalogModelIds')"><UInput v-model="alias.source_models" placeholder="catalog-model-a, catalog-model-b" class="w-full" /></UFormField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeAlias')" class="self-end" @click="() => { aliases.splice(index, 1) }" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.multiplierRules') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { multiplierRules.push({ id: '', label: '', match_mode: 'prefix', pattern: '', multiplier: 1 }) }">{{ t('billing.import.addRule') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.multiplierRulesHint') }}</p>
        <div v-for="(rule, index) in multiplierRules" :key="index" class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <UFormField :label="t('billing.import.labelOptional')"><UInput v-model="rule.label" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.match')"><USelect v-model="rule.match_mode" :items="matchModeOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.pattern')"><UInput v-model="rule.pattern" :placeholder="rule.match_mode === 'regex' ? t('billing.import.regexPlaceholder') : t('billing.import.prefixPlaceholder')" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.multiplier')"><UInput v-model.number="rule.multiplier" type="number" min="0.000001" step="0.01" class="w-full" /></UFormField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeMultiplierRule')" class="self-end" @click="() => { multiplierRules.splice(index, 1) }" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.rowMultipliers') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { rowMultipliers.push({ row_key: '', multiplier: 1 }) }">{{ t('billing.import.addRow') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.rowMultipliersHint') }}</p>
        <div v-for="(row, index) in rowMultipliers" :key="index" class="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <UFormField :label="t('billing.import.rowKey')"><UInput v-model="row.row_key" placeholder="provider::model or provider::model::*::200000" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.multiplier')"><UInput v-model.number="row.multiplier" type="number" min="0.000001" step="0.01" class="w-full" /></UFormField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeRowMultiplier')" class="self-end" @click="() => { rowMultipliers.splice(index, 1) }" />
        </div>
      </fieldset>
      <fieldset class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between gap-3"><legend class="font-medium">{{ t('billing.import.overrides') }}</legend><AppButton size="sm" color="neutral" variant="outline" @click="() => { matchOverrides.push({ target_provider: '', target_model: '', source_provider: '', source_model: '' }) }">{{ t('billing.import.addOverride') }}</AppButton></div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.overridesHint') }}</p>
        <div v-for="(override, index) in matchOverrides" :key="index" class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <UFormField :label="t('billing.import.targetProvider')"><UInput v-model="override.target_provider" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.targetModel')"><UInput v-model="override.target_model" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.catalogProvider')"><UInput v-model="override.source_provider" class="w-full" /></UFormField>
          <UFormField :label="t('billing.import.catalogModel')"><UInput v-model="override.source_model" class="w-full" /></UFormField>
          <AppButton color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('billing.import.removeOverride')" class="self-end" @click="() => { matchOverrides.splice(index, 1) }" />
        </div>
      </fieldset>
        <form class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4" @submit.prevent="lookupOperation">
          <h4 class="text-sm font-medium">{{ t('billing.import.lookupTitle') }}</h4>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.lookupHint') }}</p>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <UFormField :label="t('billing.import.operationId')" class="flex-1"><UInput v-model="operationId" placeholder="import_…" class="w-full" :disabled="operationLoading" /></UFormField>
            <AppButton type="submit" color="neutral" variant="outline" :loading="operationLoading" :disabled="busy || !operationId.trim()">{{ t('billing.import.lookup') }}</AppButton>
          </div>
          <UAlert v-if="operationError" color="error" variant="subtle" :title="t('billing.import.lookupFailed')" :description="operationError" />
        </form>
        </fieldset>
      </details>
      <UAlert v-if="validationError" color="warning" variant="subtle" :description="validationError" />
      <section class="space-y-3" aria-labelledby="import-preview-title" aria-live="polite">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h3 id="import-preview-title" class="text-sm font-semibold">{{ t('billing.import.previewTitle') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.previewHint') }}</p></div>
          <div class="flex flex-wrap gap-2">
            <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-download" :disabled="!preview || busy" @click="exportPreview">{{ t('billing.import.exportPreview') }}</AppButton>
            <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-refresh" :loading="loading" :disabled="busy || !!pendingApply || importUnavailable || !!validationError" @click="previewPrices(targetSet === 'synced')">{{ preview ? t('billing.import.refreshPreview') : t('billing.import.generatePreview') }}</AppButton>
          </div>
        </div>
      <template v-if="preview">
        <div class="flex flex-wrap gap-2">
          <UBadge color="neutral" variant="subtle">{{ t('billing.import.rowsBadge', { count: preview.rows?.length || 0 }) }}</UBadge>
          <UBadge color="success" variant="subtle">{{ t('billing.import.applicableBadge', { count: changedRows }) }}</UBadge>
          <UBadge color="warning" variant="subtle">{{ t('billing.import.reviewBadge', { count: reviewRows }) }}</UBadge>
          <UBadge color="primary" variant="subtle">{{ t('billing.import.selectedBadge', { count: selected.length }) }}</UBadge>
        </div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.expires', { date: preview.expires_at ? formatDate(preview.expires_at) : t('common.unknown') }) }}</p>
        <p class="break-all text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.sourceMeta', { url: preview.source_url, date: formatDate(preview.source_fetched_at), version: preview.source_version }) }}</p>
        <UAlert v-if="checkingUpdates" :color="changedRows || reviewRows ? 'info' : 'success'" variant="subtle" :title="changedRows ? t('billing.import.changedTitle', { count: changedRows }) : reviewRows ? t('billing.import.reviewRequiredTitle') : t('billing.import.noChangesTitle')" :description="t('billing.import.updatesDescription', { count: reviewRows })" />
        <p v-if="!preview.rows?.length" class="text-sm text-[var(--ui-text-muted)]">{{ t('billing.import.noRows') }}</p>
        <p v-else-if="!changedRows && !checkingUpdates" class="text-sm text-[var(--ui-text-muted)]">{{ t('billing.import.noApplicable') }}</p>
        <div class="max-h-[28rem] overflow-auto rounded-lg border border-[var(--ui-border)]">
          <table class="w-full text-left text-sm">
            <caption class="sr-only">{{ t('billing.import.tableCaption') }}</caption>
            <thead class="sticky top-0 z-10 bg-[var(--ui-bg-muted)] text-xs text-[var(--ui-text-muted)]"><tr><th scope="col" class="p-3">{{ t('billing.import.colSelect') }}</th><th scope="col" class="p-3">{{ t('billing.import.colTarget') }}</th><th scope="col" class="p-3">{{ t('billing.import.colAction') }}</th><th scope="col" class="p-3">{{ t('billing.import.colWriteFields') }}</th></tr></thead>
            <tbody>
              <tr v-for="row in preview.rows || []" :key="row.row_key" class="border-t border-[var(--ui-border)] align-top">
                <td class="p-3"><input v-model="selected" type="checkbox" :value="row.row_key" :aria-label="t('billing.import.selectRow', { key: row.row_key })" :disabled="applying || !selectable(row)" class="accent-[var(--ui-primary)]" /></td>
                <td class="min-w-48 p-3"><p class="break-all font-medium">{{ row.model || row.row_key }}</p><p class="break-all text-xs text-[var(--ui-text-muted)]">{{ row.row_key }}</p><p v-if="row.matched_model" class="mt-1 break-all text-xs">{{ row.matched_provider }}/{{ row.matched_model }} · ×{{ row.multiplier }}</p></td>
                <td class="p-3"><UBadge :color="selectable(row) ? 'success' : 'neutral'" variant="subtle">{{ checkingUpdates && row.action === 'update_sync' && !pricesChanged(row) ? t('billing.import.action.unchanged') : actionLabel(row.action) }}</UBadge><p v-for="(reason, index) in row.reasons || []" :key="index" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ reason.message || reason.code }}</p></td>
                <td class="min-w-64 p-3">
                  <dl v-if="row.write_rule" class="space-y-1 text-xs"><div v-for="field in writeFields" :key="field.key" class="flex justify-between gap-3"><dt class="text-[var(--ui-text-muted)]">{{ field.label }}</dt><dd class="font-mono">{{ (field.cost ? row.final?.[field.cost] : row.write_rule[field.key]) ?? '—' }}</dd></div></dl>
                  <p v-else class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.noWriteRule') }}</p>
                  <details class="mt-2"><summary class="cursor-pointer text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.exactRule') }}</summary><pre class="mt-2 max-w-80 overflow-auto rounded bg-[var(--ui-bg-muted)] p-2 text-xs">{{ JSON.stringify({ official: row.official, final: row.final, write_rule: row.write_rule, existing_rule: row.existing_rule, reasons: row.reasons }, null, 2) }}</pre></details>
                  <AppButton v-if="row.official && !rowMultipliers.some((entry) => entry.row_key === row.row_key)" size="xs" color="neutral" variant="ghost" class="mt-2" :disabled="applying" @click="setRowMultiplier(row)">{{ t('billing.import.setRowMultiplier') }}</AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <p v-else class="rounded-lg border border-dashed border-[var(--ui-border)] p-6 text-center text-sm text-[var(--ui-text-muted)]">{{ loading ? t('billing.import.fetching') : t('billing.import.emptyPreview') }}</p>
      </section>
      <UAlert v-if="operation" :color="operation.status === 'applied' ? 'success' : 'warning'" variant="subtle" :title="t('billing.import.operationTitle', { status: statusLabel(operation.status) })" :description="t('billing.import.operationDescription', { id: operation.operation_id, count: operation.rows?.length || 0, atomic: operation.atomic ? t('billing.import.atomic') : t('billing.import.nonAtomic'), date: operation.applied_at ? formatDate(operation.applied_at) : t('common.unknown') })" />
      <AppButton v-if="failedRows.length" color="neutral" variant="outline" :disabled="busy || !!pendingApply" @click="retryFailedRows">{{ t('billing.import.retryFailed', { count: failedRows.length }) }}</AppButton>
      <pre v-if="operation?.summary" class="overflow-auto rounded-lg bg-[var(--ui-bg-muted)] p-3 text-xs">{{ JSON.stringify(operation.summary, null, 2) }}</pre>
      <div v-if="operation?.rows?.length" class="max-h-56 space-y-2 overflow-y-auto"><div v-for="result in operation.rows" :key="result.key" class="rounded-lg border border-[var(--ui-border)] p-3 text-xs"><strong>{{ result.key }}</strong><span> · {{ result.status ? statusLabel(result.status) : actionLabel(result.action) }}</span><span v-if="result.resource_id" class="block font-mono text-[var(--ui-text-muted)]">{{ result.resource_id }}</span><span v-if="result.error_code || result.error_message" class="block text-[var(--ui-error)]">{{ result.error_code }} {{ result.error_message }}</span></div></div>
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
import { billingImportApplySupportError, createBillingImportIdempotencyKey, billingImportStorageKey, isDefinitiveBillingImportFailure, readBillingImportPending, validateBillingImportResult, writeBillingImportPending, type BillingImportPendingApply } from '~/composables/billingImport'
import { billingCatalogSources, defaultBillingImportPreferences, readBillingImportPreferences, writeBillingImportPreferences, type BillingCatalogSource, type BillingImportPreferences } from '~/composables/billingPreferences'
type ImportTarget = { provider: string; model: string }
const props = defineProps<{ providers: string[]; models: string[]; candidates: ImportTarget[]; availableTargets: ImportTarget[]; priceRules: { provider: string; model: string; source: string }[]; serviceTierSource: string }>()
const { t, intlLocale } = useAdminI18n()
const formatDate = (value: string) => new Date(value).toLocaleString(intlLocale.value)
const catalogLabels = computed<Record<string, { label: string; description: string }>>(() => ({
  auto: { label: t('billing.catalog.auto'), description: t('billing.catalog.autoDescription') },
  openrouter: { label: 'OpenRouter', description: t('billing.catalog.openrouterDescription') },
  litellm: { label: 'LiteLLM', description: t('billing.catalog.litellmDescription') },
  'models.dev': { label: 'models.dev', description: t('billing.catalog.modelsDevDescription') }
}))
const catalogSourceOptions = computed(() => billingCatalogSources.map(option => ({ ...option, ...catalogLabels.value[option.value] })))
const matchModeOptions = computed(() => [{ label: t('billing.import.matchPrefix'), value: 'prefix' }, { label: t('billing.import.matchRegex'), value: 'regex' }])
function actionLabel(action: string) {
  const labels: Record<string, string> = { create: t('billing.import.action.create'), update_sync: t('billing.import.action.updateSync'), overwrite: t('billing.import.action.overwrite'), skip: t('billing.import.action.skip'), review: t('billing.import.action.review') }
  return labels[action] || action
}
function statusLabel(status: string) {
  const labels: Record<string, string> = { applied: t('billing.import.status.applied'), failed: t('billing.import.status.failed'), conflict: t('billing.import.status.conflict'), expired: t('billing.import.status.expired'), created: t('billing.import.status.created'), updated: t('billing.import.status.updated'), overwritten: t('billing.import.status.overwritten') }
  return labels[status] || status
}
// Maps the English messages thrown by composables/billingImport.ts; other messages (e.g. from the backend) pass through.
function libMessage(message?: string) {
  if (!message) return message || ''
  const labels: Record<string, string> = {
    'Safe import recovery requires Web Crypto.': t('billing.import.lib.webCrypto'),
    'Applying prices requires crypto.randomUUID.': t('billing.import.lib.randomUuid'),
    'Stored import recovery data is invalid.': t('billing.import.lib.invalidStored'),
    'Invalid import operation response.': t('billing.import.lib.invalidOperation'),
    'Invalid import row response.': t('billing.import.lib.invalidRow'),
    'Incomplete import result.': t('billing.import.lib.incomplete')
  }
  const prefix = Object.keys(labels).find(start => message.startsWith(start))
  return prefix ? labels[prefix]! : message
}
const open = ref(false)
const advancedDetails = ref<HTMLDetailsElement | null>(null)
const providerFilter = ref('__all_providers__')
const targetSet = ref('available')
const targetSetOptions = computed(() => [
  { label: t('billing.import.targetSetAll'), value: 'all' },
  { label: t('billing.import.targetSetAvailable'), value: 'available' },
  { label: t('billing.import.targetSetSynced'), value: 'synced' },
  { label: t('billing.import.manualTargets'), value: 'manual' }
])
const overwriteOptions = computed(() => [
  { label: t('billing.import.overwriteMissing'), value: 'missing' },
  { label: t('billing.import.overwriteSync'), value: 'sync' },
  { label: t('billing.import.overwriteAll'), value: 'all' }
])
const providerOptions = computed(() => [
  { label: t('billing.filter.allProviders'), value: '__all_providers__' },
  ...[...new Set([...props.candidates, ...props.availableTargets, ...props.priceRules].map(target => target.provider).filter(Boolean))].sort().map(provider => ({ label: provider, value: provider }))
])
const writeFields = computed<{ key: string; cost?: string; label: string }[]>(() => [
  { key: 'service_tier', label: t('billing.prices.serviceTier') }, { key: 'min_input_tokens', label: t('billing.priceForm.minInputTokens') },
  { key: 'input_price_per_million', cost: 'input', label: t('billing.priceForm.inputPerM') }, { key: 'output_price_per_million', cost: 'output', label: t('billing.priceForm.outputPerM') },
  { key: 'cache_read_price_per_million', cost: 'cache_read', label: t('billing.priceForm.cacheReadPerM') }, { key: 'cache_write_price_per_million', cost: 'cache_write', label: t('billing.priceForm.cacheWritePerM') },
  { key: 'request_price', cost: 'request', label: t('billing.col.perRequest') }
])
const source = ref<BillingCatalogSource>('auto')
const sourceDescription = computed(() => catalogSourceOptions.value.find(option => option.value === source.value)?.description)
let preferenceKey = ''
const importUnavailable = ref(false)
const checkingUpdates = ref(false)
const syncTargets = computed(() => [...new Map(props.priceRules.filter(rule => rule.source === 'sync').map(rule => [`${rule.provider.toLowerCase()}::${rule.model}`, { provider: rule.provider, model: rule.model }])).values()])
const emit = defineEmits<{ applied: [] }>()
const { fetchAPI, apiBase, token } = useApi()
const runtimeConfig = useRuntimeConfig()
const effectiveToken = computed(() => String(token.value || runtimeConfig.public.secretKey || '').trim())
const applySupportError = billingImportApplySupportError()
const recoveryReady = ref(false)
const recoveryError = ref('')
const pendingApply = ref<BillingImportPendingApply | null>(null)
const discardPendingOpen = ref(false)
let storageKey = ''
let sessionVersion = 0
const emptyTarget = () => ({ provider: '', model: '' })
const targets = reactive([emptyTarget()])
const overwriteMode = ref('missing')
const defaultMultiplier = ref(1)
const includeZeroCost = ref(false)
const aliases = reactive<{ target_model: string; source_models: string }[]>([])
const multiplierRules = reactive<{ id: string; label: string; match_mode: string; pattern: string; multiplier: number }[]>([])
const rowMultipliers = reactive<{ row_key: string; multiplier: number }[]>([])
const matchOverrides = reactive<{ target_provider: string; target_model: string; source_provider: string; source_model: string }[]>([])
const loading = ref(false)
const applying = ref(false)
const error = ref('')
const preview = ref<any>(null)
const operation = ref<any>(null)
const operationId = ref('')
const operationLoading = ref(false)
const operationError = ref('')
let operationController: AbortController | null = null
let previewController: AbortController | null = null
let applyController: AbortController | null = null
let disposed = false
function preventUnload(event: BeforeUnloadEvent) {
  if (!applying.value) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', preventUnload))
onScopeDispose(() => {
  disposed = true
  sessionVersion++
  operationController?.abort()
  previewController?.abort()
  applyController?.abort()
  window.removeEventListener('beforeunload', preventUnload)
})
const busy = computed(() => loading.value || applying.value || operationLoading.value)
const automaticTargets = computed(() => {
  const candidates = targetSet.value === 'synced' ? syncTargets.value : targetSet.value === 'all' ? props.candidates : props.availableTargets
  return [...new Map(candidates.filter(target => providerFilter.value === '__all_providers__' || target.provider === providerFilter.value).map(target => [`${target.provider.toLowerCase()}::${target.model}`, { provider: target.provider, model: target.model }])).values()]
})
function openImport() {
  open.value = true
}
async function checkUpdates() {
  if (busy.value || pendingApply.value || importUnavailable.value || !syncTargets.value.length) return
  open.value = true
  providerFilter.value = '__all_providers__'
  targetSet.value = 'synced'
  targets.splice(0, targets.length, ...automaticTargets.value)
  overwriteMode.value = 'sync'
  await previewPrices(true)
}
defineExpose({ openImport, checkUpdates })
function exportPreview() {
  if (!preview.value) return
  const url = URL.createObjectURL(new Blob([JSON.stringify(preview.value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'model-price-import-preview.json'
  link.click()
  URL.revokeObjectURL(url)
}
function setRowMultiplier(row: any) {
  rowMultipliers.push({ row_key: row.row_key, multiplier: row.multiplier })
  if (advancedDetails.value) advancedDetails.value.open = true
}
function pricesChanged(row: any) {
  if (!row.existing_rule || !row.final) return true
  const fields: [string, string][] = [
    ['input', 'input_price_per_million'], ['output', 'output_price_per_million'],
    ['cache_read', 'cache_read_price_per_million'], ['cache_write', 'cache_write_price_per_million'],
    ['request', 'request_price']
  ]
  return fields.some(([cost, field]) => Number(row.final[cost]) !== Number(row.existing_rule[field]))
}
function selectable(row: any) {
  return row.applicable && row.write_rule && row.action !== 'skip' && (!checkingUpdates.value || pricesChanged(row))
}
const changedRows = computed(() => (preview.value?.rows || []).filter(selectable).length)
const reviewRows = computed(() => (preview.value?.rows || []).filter((row: any) => row.action === 'review' || ['conflict', 'failed'].includes(row.status)).length)
watch(operationId, () => { operationError.value = '' })
async function lookupOperation() {
  const id = operationId.value.trim()
  if (!id || operationLoading.value || loading.value || applying.value) return
  operationLoading.value = true
  operationError.value = ''
  operation.value = null
  const controller = new AbortController()
  const session = sessionVersion
  operationController = controller
  try {
    const result = await fetchAPI(`/billing/model-prices/import/operations/${encodeURIComponent(id)}`, { method: 'GET', signal: controller.signal })
    if (!disposed && session === sessionVersion && !controller.signal.aborted) operation.value = result
  } catch (cause: any) {
    if (!disposed && session === sessionVersion && !controller.signal.aborted) operationError.value = cause?.message || t('billing.import.err.lookup')
  } finally {
    if (!disposed && session === sessionVersion && operationController === controller) {
      operationLoading.value = false
      operationController = null
    }
  }
}
const selected = ref<string[]>([])
const confirmOverwrite = ref(false)
let inputVersion = 0
function invalidatePreview() {
  inputVersion++
  previewController?.abort()
  checkingUpdates.value = false
  error.value = ''
  preview.value = null
  selected.value = []
  confirmOverwrite.value = false
}
watch([source, targets, overwriteMode, defaultMultiplier, includeZeroCost, aliases, multiplierRules, rowMultipliers, matchOverrides], invalidatePreview, { deep: true, flush: 'sync' })
function restorePreferences(preferences: BillingImportPreferences) {
  source.value = preferences.source
  overwriteMode.value = preferences.overwriteMode
  targetSet.value = preferences.targetSet
  defaultMultiplier.value = preferences.defaultMultiplier
  includeZeroCost.value = preferences.includeZeroCost
  aliases.splice(0, aliases.length, ...preferences.aliases)
  multiplierRules.splice(0, multiplierRules.length, ...preferences.multiplierRules)
  rowMultipliers.splice(0)
  matchOverrides.splice(0)
}
watch([source, overwriteMode, targetSet, defaultMultiplier, includeZeroCost, aliases, multiplierRules], () => {
  if (!preferenceKey || !import.meta.client) return
  try {
    writeBillingImportPreferences(window.localStorage, preferenceKey, {
      source: source.value, overwriteMode: overwriteMode.value, targetSet: targetSet.value,
      defaultMultiplier: defaultMultiplier.value, includeZeroCost: includeZeroCost.value,
      aliases: [...aliases], multiplierRules: [...multiplierRules]
    })
  } catch { /* Preference storage must not block imports. */ }
}, { deep: true })
watch(effectiveToken, async () => {
  const session = ++sessionVersion
  operationController?.abort()
  applyController?.abort()
  invalidatePreview()
  loading.value = false
  applying.value = false
  operationLoading.value = false
  operation.value = null
  operationId.value = ''
  operationError.value = ''
  importUnavailable.value = false
  pendingApply.value = null
  discardPendingOpen.value = false
  recoveryReady.value = false
  recoveryError.value = ''
  storageKey = ''
  preferenceKey = ''
  restorePreferences(defaultBillingImportPreferences())
  if (!effectiveToken.value || !import.meta.client) return
  try {
    const key = await billingImportStorageKey(new URL(apiBase, window.location.origin).href, effectiveToken.value)
    if (disposed || session !== sessionVersion) return
    storageKey = key
    preferenceKey = key.replace(':pending:', ':preferences:')
    try { restorePreferences(readBillingImportPreferences(window.localStorage, preferenceKey)) } catch { /* Import defaults still work when local storage is blocked. */ }
    pendingApply.value = readBillingImportPending(window.sessionStorage, key)
    recoveryReady.value = true
  } catch (cause: any) {
    if (!disposed && session === sessionVersion) recoveryError.value = t('billing.import.err.recoveryUnavailable', { reason: libMessage(cause?.message) || t('billing.import.err.recoveryStorage') })
  }
}, { immediate: true, flush: 'sync' })
watch([targetSet, automaticTargets], () => {
  if (targetSet.value === 'manual') {
    if (advancedDetails.value) advancedDetails.value.open = true
    return
  }
  targets.splice(0, targets.length, ...automaticTargets.value)
}, { immediate: true, deep: true, flush: 'sync' })
const addTarget = () => { targetSet.value = 'manual'; targets.push(emptyTarget()) }
const removeTarget = (index: number) => { targetSet.value = 'manual'; targets.splice(index, 1) }
const positive = (value: number) => typeof value === 'number' && Number.isFinite(value) && value > 0
const validationError = computed(() => {
  if (!targets.length) return t('billing.import.err.noTargets')
    if (targets.some(target => !target.provider.trim() || !target.model.trim())) return t('billing.import.err.targetIncomplete')
  const targetKeys = targets.map(target => `${target.provider.trim().toLowerCase()}::${target.model.trim()}`)
  if (new Set(targetKeys).size !== targetKeys.length) return t('billing.import.err.duplicateTargets')
  if (!positive(defaultMultiplier.value)) return t('billing.import.err.defaultMultiplier')
  if (aliases.some(alias => !alias.target_model.trim() || alias.source_models.split(',').some(model => !model.trim()))) return t('billing.import.err.alias')
  if (multiplierRules.some(rule => !rule.pattern.trim() || !positive(rule.multiplier))) return t('billing.import.err.multiplierRule')
  const rowKeys = rowMultipliers.map(row => row.row_key.trim())
  if (rowMultipliers.some(row => !row.row_key.trim() || !positive(row.multiplier)) || new Set(rowKeys).size !== rowKeys.length) return t('billing.import.err.rowMultiplier')
  const overrideKeys = matchOverrides.map(item => `${item.target_provider.trim().toLowerCase()}::${item.target_model.trim()}`)
  if (matchOverrides.some(item => !item.target_provider.trim() || !item.target_model.trim() || !item.source_provider.trim() || !item.source_model.trim()) || new Set(overrideKeys).size !== overrideKeys.length || overrideKeys.some(key => !targetKeys.includes(key))) return t('billing.import.err.override')
  return ''
})
const requiresOverwrite = computed(() => (preview.value?.rows || []).some((row: any) => selected.value.includes(row.row_key) && row.action === 'overwrite'))
async function previewPrices(updates = false, preferredSelection?: string[]) {
  if (busy.value || pendingApply.value || importUnavailable.value) return
  loading.value = true
  error.value = ''
  invalidatePreview()
  checkingUpdates.value = updates
  operation.value = null
  const version = inputVersion
  const session = sessionVersion
  const controller = new AbortController()
  previewController = controller
  try {
    if (validationError.value) throw new Error(validationError.value)
    const result: any = await fetchAPI('/billing/model-prices/import/preview', {
      method: 'POST',
      signal: controller.signal,
      body: {
        source: source.value,
        targets: targets.map(target => ({ provider: target.provider.trim(), model: target.model.trim(), service_tier: '*', min_input_tokens: 0 })),
        policy: {
          overwrite_mode: overwriteMode.value,
          default_multiplier: defaultMultiplier.value,
          include_zero_cost: includeZeroCost.value,
          aliases: aliases.map(alias => ({ target_model: alias.target_model.trim(), source_models: alias.source_models.split(',').map(model => model.trim()) })),
          multiplier_rules: multiplierRules.map((rule, index) => ({ id: rule.id || `rule-${index + 1}`, label: rule.label.trim(), match_mode: rule.match_mode, pattern: rule.pattern.trim(), multiplier: rule.multiplier })),
          row_multipliers: Object.fromEntries(rowMultipliers.map(row => [row.row_key.trim(), row.multiplier]))
        },
        match_overrides: matchOverrides.map(item => ({ target_provider: item.target_provider.trim(), target_model: item.target_model.trim(), source_provider: item.source_provider.trim(), source_model: item.source_model.trim() }))
      }
    })
    if (disposed || session !== sessionVersion || controller.signal.aborted || version !== inputVersion) return
    preview.value = result
    selected.value = (result.rows || []).filter((row: any) => selectable(row) && (!preferredSelection || preferredSelection.includes(row.row_key))).map((row: any) => row.row_key)
    confirmOverwrite.value = false
  } catch (cause: any) {
    if (!disposed && session === sessionVersion && !controller.signal.aborted && version === inputVersion) {
      if ([404, 405, 501].includes(cause?.statusCode)) importUnavailable.value = true
      else error.value = cause?.message || t('billing.import.err.preview')
    }
  } finally {
    if (!disposed && session === sessionVersion && previewController === controller) {
      loading.value = false
      previewController = null
    }
  }
}
async function applyPrices() {
  if (!preview.value || !selected.value.length || busy.value || pendingApply.value || (requiresOverwrite.value && !confirmOverwrite.value)) return
  if (!recoveryReady.value || applySupportError) {
    error.value = recoveryError.value || libMessage(applySupportError) || t('billing.import.err.initializing')
    return
  }
  try {
    const pending: BillingImportPendingApply = {
      version: 1,
      createdAt: new Date().toISOString(),
      input: {
        preview_id: preview.value.preview_id,
        preview_revision: preview.value.preview_revision,
        selected_keys: [...selected.value],
        confirm_overwrite: confirmOverwrite.value,
        idempotency_key: createBillingImportIdempotencyKey()
      }
    }
    writeBillingImportPending(window.sessionStorage, storageKey, pending)
    pendingApply.value = pending
  } catch (cause: any) {
    error.value = libMessage(cause?.message) || t('billing.import.err.saveRecovery')
    return
  }
  await retryPendingApply()
}
async function retryPendingApply() {
  if (busy.value || !recoveryReady.value || !pendingApply.value) return
  const pending = pendingApply.value
  const session = sessionVersion
  const controller = new AbortController()
  applyController = controller
  applying.value = true
  error.value = ''
  try {
    // Persist again before a retry, and never rebuild this body from editable controls.
    writeBillingImportPending(window.sessionStorage, storageKey, pending)
    const result = await fetchAPI('/billing/model-prices/import/apply', { method: 'POST', body: pending.input, signal: controller.signal })
    if (disposed || session !== sessionVersion || controller.signal.aborted) return
    validateBillingImportResult(result, pending.input)
    operation.value = result
    writeBillingImportPending(window.sessionStorage, storageKey, null)
    pendingApply.value = null
    invalidatePreview()
    emit('applied')
  } catch (cause: any) {
    if (disposed || session !== sessionVersion || controller.signal.aborted) return
    if (isDefinitiveBillingImportFailure(cause)) {
      try {
        writeBillingImportPending(window.sessionStorage, storageKey, null)
        pendingApply.value = null
        invalidatePreview()
      } catch {
        error.value = t('billing.import.err.clearRecovery')
        return
      }
    }
    error.value = libMessage(cause?.message) || t('billing.import.err.uncertain')
  } finally {
    if (!disposed && session === sessionVersion && applyController === controller) {
      applying.value = false
      applyController = null
    }
  }
}
function discardPendingApply() {
  if (busy.value || !storageKey) return
  try {
    writeBillingImportPending(window.sessionStorage, storageKey, null)
    pendingApply.value = null
    discardPendingOpen.value = false
    recoveryError.value = ''
    recoveryReady.value = true
    invalidatePreview()
  } catch {
    error.value = t('billing.import.err.removeRecovery')
  }
}
const failedRows = computed<any[]>(() => (operation.value?.rows || []).filter((row: any) => ['failed', 'conflict'].includes(row.status)))
async function retryFailedRows() {
  if (busy.value || pendingApply.value || !failedRows.value.length) return
  const rows = [...failedRows.value]
  const retryTargets = rows.map(row => ({ provider: row.provider, model: row.model }))
  if (retryTargets.some(target => typeof target.provider !== 'string' || !target.provider.trim() || typeof target.model !== 'string' || !target.model.trim())) {
    error.value = t('billing.import.err.noIdentities')
    return
  }
  targetSet.value = 'manual'
  const existingTargets = targets.filter(target => target.provider.trim() && target.model.trim())
  targets.splice(0, targets.length, ...new Map([...existingTargets, ...retryTargets].map(target => [`${target.provider.toLowerCase()}::${target.model}`, target])).values())
  // Preserve policy, but select only failed/conflicting exact row keys in the new preview.
  await previewPrices(false, rows.map(row => row.key))
}
</script>
