<template>
  <div class="flex flex-col gap-5">
    <div><p class="text-xs font-medium uppercase text-[var(--ui-text-muted)]">{{ t('upstream.providers.detailsTitle') }}</p><h2 class="mt-2 text-base font-semibold">{{ providerEntryLabel(editingProviderEntry) }}</h2></div>
    <dl class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      <div v-for="field in providerDetailFields" :key="field.label" class="min-w-0"><dt class="text-xs text-[var(--ui-text-muted)]">{{ field.label }}</dt><dd class="mt-1 break-words font-mono text-xs">{{ field.value }}</dd></div>
    </dl>
    <details class="rounded-md border border-[var(--ui-border)] px-3 py-2.5 text-sm"><summary class="cursor-pointer font-medium">{{ t('upstream.providers.additionalMetadata') }}</summary>
      <dl class="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2"><div v-for="field in providerMetadataFields" :key="field.label"><dt class="text-xs text-[var(--ui-text-muted)]">{{ field.label }}</dt><dd class="mt-1 break-words font-mono text-xs">{{ field.value }}</dd></div></dl>
    </details>
    <div class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"><AppButton color="neutral" variant="ghost" @click="providerEditorOpen = false">{{ t('common.close') }}</AppButton><AppButton color="primary" icon="i-tabler-pencil" @click="openProviderEdit(editingProviderEntry)">{{ t('common.edit') }}</AppButton></div>
  </div>
</template>

<script setup>
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const { t, editingProviderEntry, providerEntryLabel, providerDetailFields, providerMetadataFields, providerEditorOpen, openProviderEdit } = useUpstreamProvidersWorkspace()
</script>
