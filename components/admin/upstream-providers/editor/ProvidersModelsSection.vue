<template>
  <AdminModalCard as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.customModels') }}</summary>
    <div class="mt-3 flex justify-end"><AppButton type="button" size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="addProviderModel">{{ t('upstream.providers.addModel') }}</AppButton></div>

    <ProvidersDiscoveryPanel v-if="supportsDiscovery" />
    <AdminModalCard v-for="(model, index) in providerForm.models" :key="index" nested class="space-y-2">
      <div class="grid gap-2 sm:grid-cols-2"><UFormField :label="t('upstream.providers.modelId')"><UInputMenu v-model="model.name" :items="modelSuggestions" create-item class="w-full" :placeholder="t('upstream.providers.searchCatalog')" @create="model.name = $event.trim()" /></UFormField><UFormField :label="t('upstream.providers.alias')"><UInput v-model="model.alias" class="w-full" /></UFormField><UFormField v-if="supportsModelMapping" :label="t('upstream.providers.displayName')"><UInput v-model="model['display-name']" class="w-full" /></UFormField><div class="flex items-end justify-between gap-2"><UCheckbox v-if="supportsModelMapping" v-model="model['force-mapping']" :label="t('upstream.providers.forceMapping')" /><AppButton type="button" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('upstream.providers.removeModel')" :disabled="providerForm.models.length <= 1" @click="removeProviderModel(index)" /></div></div>
      <details class="rounded-md border border-[var(--ui-border)] p-3">
        <summary class="cursor-pointer text-sm font-medium">{{ t('upstream.providers.modelCapabilities') }}</summary>
        <div class="mt-3 space-y-3">
          <UFormField v-if="supportsContextLimit" :label="t('upstream.providers.contextLimit')" :hint="t('upstream.providers.contextLimitHint')">
            <UInput v-model="model['max-context-length']" type="number" min="1" step="1" class="w-full" />
          </UFormField>
          <UCheckbox v-if="supportsContextLimit" v-model="model['is-compat']" :label="t('upstream.providers.retainThinking')" />
          <UCheckbox v-if="selectedProviderRoute === 'codex-api-key'" v-model="model['support-configuration-update']" :label="t('upstream.providers.configurationUpdate')" />
          <UFormField v-if="selectedProviderRoute === 'vertex-api-key'" :label="t('upstream.providers.vertexOpenapi')" :hint="t('upstream.providers.vertexOpenapiHint')">
            <USelect :model-value="model.openapi == null ? 'inherit' : model.openapi ? 'true' : 'false'" :items="triStateOptions" value-key="value" label-key="label" class="w-full" @update:model-value="model.openapi = $event === 'inherit' ? undefined : $event === 'true'" />
          </UFormField>
          <UCheckbox :model-value="model.thinking != null" :label="t('upstream.providers.overrideThinking')" @update:model-value="model.thinking = $event ? (model.thinking || {}) : undefined" />
          <div v-if="model.thinking != null" class="grid gap-3 sm:grid-cols-2">
            <UFormField :label="t('upstream.providers.minBudget')"><UInput v-model="model.thinking.min" type="number" min="0" step="1" class="w-full" /></UFormField>
            <UFormField :label="t('upstream.providers.maxBudget')"><UInput v-model="model.thinking.max" type="number" min="0" step="1" class="w-full" /></UFormField>
            <UCheckbox v-model="model.thinking['zero-allowed']" :label="t('upstream.providers.allowZero')" />
            <UCheckbox v-model="model.thinking['dynamic-allowed']" :label="t('upstream.providers.allowDynamic')" />
            <UFormField :label="t('upstream.providers.thinkingLevels')" :hint="t('upstream.providers.thinkingLevelsHint')" class="sm:col-span-2">
              <UInput :model-value="(model.thinking.levels || []).join(', ')" class="w-full" @update:model-value="model.thinking.levels = splitModelList($event)" />
            </UFormField>
          </div>
          <template v-if="isCompat">
            <UCheckbox v-model="model.image" :label="t('upstream.providers.imageModel')" />
            <UCheckbox v-model="model['use-max-completion-tokens']" :label="t('upstream.providers.maxCompletionTokens')" />
            <UFormField v-for="field in ['input-modalities', 'output-modalities']" :key="field" :label="field === 'input-modalities' ? t('upstream.providers.inputModalities') : t('upstream.providers.outputModalities')" :hint="t('upstream.providers.modalitiesHint')">
              <UInput :model-value="(model[field] || []).join(', ')" class="w-full" placeholder="text, image" @update:model-value="model[field] = splitModelList($event)" />
            </UFormField>
          </template>
        </div>
      </details>
    </AdminModalCard>
  </AdminModalCard>
  <AdminModalCard v-if="!isCompat" as="details"><summary class="cursor-pointer font-medium">{{ t('upstream.providers.excludedModels') }}</summary><UTextarea v-model="excludedModelsText" :rows="3" class="mt-3 w-full" :placeholder="t('upstream.providers.excludedPlaceholder')" /></AdminModalCard>
</template>

<script setup>
import AdminModalCard from '~/components/admin/general/ModalCard.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'
import ProvidersDiscoveryPanel from '~/components/admin/upstream-providers/editor/ProvidersDiscoveryPanel.vue'

const {
  t, addProviderModel, supportsDiscovery, providerForm, modelSuggestions, supportsModelMapping, removeProviderModel, supportsContextLimit,
  selectedProviderRoute, triStateOptions, splitModelList, isCompat, excludedModelsText
} = useUpstreamProvidersWorkspace()
</script>
