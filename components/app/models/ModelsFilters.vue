<template>
  <AppCard class="catalog-panel catalog-filters" :ui="{ body: 'space-y-4' }">

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <PortalField :label="t('models.filter.search')" class="sm:col-span-2 lg:col-span-1">
        <PortalInput v-model="search" :aria-label="t('models.filter.searchAria')" icon="i-tabler-search" :placeholder="t('models.filter.searchPlaceholder')" size="lg" class="w-full" />
      </PortalField>
      <PortalField :label="t('models.filter.provider')">
        <PortalSelect :model-value="provider || noFilterValue" @update:model-value="provider = $event === noFilterValue ? '' : String($event)" :aria-label="t('models.filter.provider')" :items="providerOptions" value-key="value" label-key="label" size="lg" class="w-full" />
      </PortalField>
      <PortalField :label="t('models.filter.modality')">
        <PortalSelect :model-value="inputModality || noFilterValue" @update:model-value="inputModality = $event === noFilterValue ? '' : String($event)" :aria-label="t('models.filter.modality')" :items="modalityOptions" value-key="value" label-key="label" size="lg" class="w-full" />
      </PortalField>
      <PortalField :label="t('models.filter.sortBy')"><PortalSelect v-model="sortBy" :aria-label="t('models.filter.sortAria')" :items="sortOptions" value-key="value" label-key="label" size="lg" class="w-full" /></PortalField>
    </div>

    <fieldset class="catalog-capabilities flex flex-wrap items-center gap-2">
      <legend class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('models.filter.features') }}</legend>
      <AppButton v-for="option in capabilityOptions" :key="option.value" type="button" size="sm" class="rounded-full" :color="selectedCapabilities.includes(option.value) ? 'primary' : 'neutral'" :variant="selectedCapabilities.includes(option.value) ? 'soft' : 'ghost'" :icon="selectedCapabilities.includes(option.value) ? 'i-tabler-check' : undefined" :aria-pressed="selectedCapabilities.includes(option.value)" @click="setCapability(option.value, !selectedCapabilities.includes(option.value))">{{ option.label }}</AppButton>
    </fieldset>
    <PortalCheckbox v-if="token" v-model="mineOnly" :label="t('models.filter.mineOnly')" :disabled="!accessLoaded" />

    <p class="text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('models.filter.note') }}</p>
  </AppCard>
</template>

<script setup lang="ts">
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalCheckbox from '~/components/app/general/PortalCheckbox.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import { computed } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { noFilterValue, type CapabilityFilter } from '~/composables/models/catalog'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

const { t } = usePortalI18n()
const { token, accessLoaded, search, provider, inputModality, selectedCapabilities, mineOnly, sortBy, providerOptions, modalityOptions, setCapability } = useModelsWorkspace()

const capabilityOptions = computed<{ label: string; value: CapabilityFilter }[]>(() => [{ label: t('models.capability.tools'), value: 'tools' }, { label: t('models.capability.structuredOutput'), value: 'structuredOutput' }, { label: t('models.capability.reasoning'), value: 'reasoning' }])
const sortOptions = computed(() => [{ label: t('models.sort.name'), value: 'name' }, { label: t('models.sort.priceAsc'), value: 'price-asc' }, { label: t('models.sort.priceDesc'), value: 'price-desc' }])
</script>

<style scoped>
.catalog-capabilities button { padding-inline: 1rem; }
</style>
