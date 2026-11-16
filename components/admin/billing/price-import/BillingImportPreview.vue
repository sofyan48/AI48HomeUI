<template>
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
          <PortalBadge color="neutral" variant="subtle">{{ t('billing.import.rowsBadge', { count: preview.rows?.length || 0 }) }}</PortalBadge>
          <PortalBadge color="success" variant="subtle">{{ t('billing.import.applicableBadge', { count: changedRows }) }}</PortalBadge>
          <PortalBadge color="warning" variant="subtle">{{ t('billing.import.reviewBadge', { count: reviewRows }) }}</PortalBadge>
          <PortalBadge color="primary" variant="subtle">{{ t('billing.import.selectedBadge', { count: selected.length }) }}</PortalBadge>
        </div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.expires', { date: preview.expires_at ? formatDate(preview.expires_at) : t('common.unknown') }) }}</p>
        <p class="break-all text-xs text-[var(--ui-text-muted)]">{{ t('billing.import.sourceMeta', { url: preview.source_url, date: formatDate(preview.source_fetched_at), version: preview.source_version }) }}</p>
        <PortalAlert v-if="checkingUpdates" :color="changedRows || reviewRows ? 'info' : 'success'" variant="subtle" :title="changedRows ? t('billing.import.changedTitle', { count: changedRows }) : reviewRows ? t('billing.import.reviewRequiredTitle') : t('billing.import.noChangesTitle')" :description="t('billing.import.updatesDescription', { count: reviewRows })" />
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
                <td class="p-3"><PortalBadge :color="selectable(row) ? 'success' : 'neutral'" variant="subtle">{{ checkingUpdates && row.action === 'update_sync' && !pricesChanged(row) ? t('billing.import.action.unchanged') : actionLabel(row.action) }}</PortalBadge><p v-for="(reason, index) in row.reasons || []" :key="index" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ reason.message || reason.code }}</p></td>
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

</template>
<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { useBillingPriceImport } from "~/composables/billing/useBillingPriceImport"
const { t, preview, busy, exportPreview, loading, pendingApply, importUnavailable, validationError, previewPrices, targetSet, changedRows, reviewRows, selected, formatDate, checkingUpdates, applying, selectable, pricesChanged, actionLabel, writeFields, rowMultipliers, setRowMultiplier } = useBillingPriceImport()
</script>
