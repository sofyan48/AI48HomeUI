<template>
  <AdminModalCard nested class="space-y-3">
    <p class="text-sm font-medium">{{ t('upstream.providers.discoverModels') }}</p>
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.discoverDescription') }}</p>
    <div class="flex flex-wrap items-center gap-2">
      <AppButton type="button" color="neutral" variant="outline" icon="i-tabler-search" :loading="discovering" :disabled="!discoveryReady" @click="discoverModels">{{ discoveryLoaded ? t('common.reload') : t('upstream.providers.discoverModels') }}</AppButton>
      <span class="text-xs text-[var(--ui-text-muted)]">{{ discoveryAuthLabel }} · {{ requiresBaseURL ? providerForm['base-url']?.trim() ? t('upstream.providers.baseUrlSet') : t('upstream.providers.baseUrlRequiredShort') : t('upstream.providers.defaultBaseUrl') }}</span>
    </div>
    <UAlert v-if="discoveryError" color="error" variant="subtle" :title="t('upstream.providers.discoveryFailed')" :description="discoveryError" />
    <div v-if="discoveryVisible" class="space-y-2">
      <UInput v-model="discoverySearch" icon="i-tabler-search" :placeholder="t('upstream.providers.searchModels')" class="w-full" />
      <p v-if="discoveryLoaded && !discoveredModels.length" class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.noModelsFound') }}</p>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm">{{ t('upstream.providers.selectedOf', { selected: selectedDiscovered.length, total: discoveredModels.length }) }}</p>
        <div class="flex gap-2"><AppButton type="button" size="sm" color="neutral" variant="ghost" @click="selectAllDiscoveredModels">{{ t('upstream.providers.selectAll') }}</AppButton><AppButton type="button" size="sm" color="neutral" variant="ghost" @click="selectedDiscovered = []">{{ t('upstream.providers.clear') }}</AppButton></div>
      </div>
      <div class="max-h-40 space-y-1 overflow-y-auto">
        <UCheckbox v-for="model in filteredDiscoveredModels" :key="model.name" :model-value="existingModelNames.has(model.name.toLowerCase()) || selectedDiscovered.includes(model.name)" :disabled="existingModelNames.has(model.name.toLowerCase())" :label="existingModelNames.has(model.name.toLowerCase()) ? t('upstream.providers.alreadyAdded', { name: model.name }) : model.displayName ? `${model.name} · ${model.displayName}` : model.name" @update:model-value="toggleDiscoveredModel(model.name, $event)" />
      </div>
      <div class="flex justify-end gap-2"><AppButton type="button" size="sm" color="neutral" variant="ghost" @click="discoveryVisible = false">{{ t('common.close') }}</AppButton><AppButton type="button" size="sm" color="primary" :disabled="!selectedDiscovered.length" @click="applyDiscoveredModels">{{ t('common.apply') }}</AppButton></div>
    </div>
  </AdminModalCard>
</template>

<script setup>
import AdminModalCard from '~/components/admin/general/ModalCard.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const {
  t, discovering, discoveryReady, discoverModels, discoveryLoaded, discoveryAuthLabel, requiresBaseURL, providerForm, discoveryError,
  discoveryVisible, discoverySearch, discoveredModels, selectedDiscovered, selectAllDiscoveredModels, filteredDiscoveredModels,
  existingModelNames, toggleDiscoveredModel, applyDiscoveredModels
} = useUpstreamProvidersWorkspace()
</script>
