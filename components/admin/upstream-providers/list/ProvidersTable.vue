<template>
  <div class="min-w-0">
    <AppCard :ui="{ body: 'p-0' }">
    <div class="flex flex-col gap-3 border-b border-[var(--ui-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div class="w-full sm:w-auto">
        <label class="mb-1.5 block text-sm font-medium xl:hidden">{{ t('upstream.providers.category') }}</label>
        <USelectMenu
          v-model="selectedProviderRoute"
          :items="providerOptions"
          value-key="value"
          label-key="label"
          :search-input="{ placeholder: t('upstream.providers.searchCategories') }"
          :disabled="providerEditorOpen || deleteOpen"
          class="w-full xl:hidden"
        />
        <h2 class="hidden items-center gap-2 text-base font-semibold text-[var(--ui-text-highlighted)] xl:flex"><span class="flex size-5 items-center justify-center rounded border border-[var(--ui-border)] text-[9px]" aria-hidden="true">{{ selectedProvider.mark }}</span>{{ selectedProviderLabel }} <span class="font-mono text-xs font-normal text-[var(--ui-text-muted)]">/{{ selectedProviderRoute }}</span></h2>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput v-model="providerSearch" icon="i-tabler-search" :placeholder="t('upstream.providers.filterEntries')" class="w-full sm:w-72" />
        <AppButton color="primary" icon="i-tabler-plus" :disabled="pending || !!pageError" @click="openProviderCreate">{{ t('upstream.providers.newProvider') }}</AppButton>
      </div>
    </div>

    <AppTable :columns="providerColumns" :data="filteredProviderEntries" :loading="pending">
      <template #identity-cell="{ row }">
        <div class="min-w-0">
          <p class="max-w-52 truncate font-medium text-[var(--ui-text-highlighted)]">{{ providerEntryLabel(rowValue(row)) }}</p>
          <p class="mt-1 max-w-52 truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).api_key_preview || rowValue(row).auth_index || rowValue(row).id || selectedProviderLabel }}</p>
        </div>
      </template>

      <template #endpoint-cell="{ row }">
        <p class="max-w-56 truncate font-mono text-xs text-[var(--ui-text-muted)]" :title="safeEndpoint(rowValue(row)['base-url'] || rowValue(row).base_url)">{{ safeEndpoint(rowValue(row)['base-url'] || rowValue(row).base_url) }}</p>
      </template>
      <template #prefix-cell="{ row }"><span class="rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5 font-mono text-xs">{{ rowValue(row).prefix || t('common.none') }}</span></template>
      <template #models-cell="{ row }"><span class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.modelsHeaders', { models: Array.isArray(rowValue(row).models) ? rowValue(row).models.length : 0, headers: Object.keys(rowValue(row).headers || {}).length }) }}</span></template>
      <template #status-cell="{ row }">
        <UBadge :color="rowValue(row).disabled ? 'warning' : 'success'" variant="subtle" size="sm" :icon="rowValue(row).disabled ? 'i-tabler-alert-triangle' : 'i-tabler-circle-check'">{{ rowValue(row).disabled ? t('common.disabled') : t('common.active') }}</UBadge>
      </template>

      <template #actions-cell="{ row }">
        <AdminRowActions :actions="providerRowActions(rowValue(row))" :menu-label="t('upstream.providers.rowMenu', { name: providerEntryLabel(rowValue(row)) })" />
      </template>

      <template #empty>
        <div class="flex flex-col items-center justify-center px-6 py-8 text-center">
          <div class="mb-3 rounded-full bg-[var(--ui-bg-muted)] p-3 text-[var(--ui-text-muted)]">
            <UIcon name="i-tabler-server-2" class="size-6 text-[var(--ui-text-muted)]" />
          </div>
          <p class="font-medium">{{ pending ? t('upstream.providers.emptyLoading') : pageError ? t('upstream.providers.emptyUnavailable') : providerSearch ? t('upstream.providers.emptyNoMatch') : t('upstream.providers.emptyNone', { provider: selectedProviderLabel }) }}</p>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ pageError ? t('upstream.providers.emptyCheckError') : providerSearch ? t('upstream.providers.emptyTryDifferent') : t('upstream.providers.emptyAddHint') }}</p>
        </div>
      </template>
    </AppTable>
    </AppCard>
  </div>
</template>

<script setup>
import AdminRowActions from '~/components/admin/general/RowActions.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const {
  t, rowValue, selectedProviderRoute, providerOptions, providerEditorOpen, deleteOpen, selectedProvider, selectedProviderLabel,
  providerSearch, pending, pageError, openProviderCreate, providerColumns, filteredProviderEntries, providerEntryLabel,
  safeEndpoint, providerRowActions
} = useUpstreamProvidersWorkspace()
</script>
