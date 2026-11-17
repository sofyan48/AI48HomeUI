<template>
  <AppCard class="catalog-panel catalog-filters" :ui="{ body: 'flex flex-col gap-4' }">

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <PortalField :label="t('models.filter.search')" class="sm:col-span-2 lg:col-span-1">
        <PortalInput v-model="search" :aria-label="t('models.filter.searchAria')" icon="i-tabler-search" :placeholder="t('models.filter.searchPlaceholder')" size="lg" class="w-full" />
      </PortalField>

      <PortalField :label="t('models.filter.modality')">
        <PortalSelect :model-value="inputModality || noFilterValue" @update:model-value="inputModality = $event === noFilterValue ? '' : String($event)" :aria-label="t('models.filter.modality')" :items="modalityOptions" value-key="value" label-key="label" size="lg" class="w-full" />
      </PortalField>
      <PortalField :label="t('models.filter.sortBy')"><PortalSelect v-model="sortBy" :aria-label="t('models.filter.sortAria')" :items="sortOptions" value-key="value" label-key="label" size="lg" class="w-full" /></PortalField>
    </div>


  </AppCard>
</template>

<script setup lang="ts">
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalField from '~/components/app/general/PortalField.vue'

import PortalSelect from '~/components/app/general/PortalSelect.vue'
import { computed } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { noFilterValue } from '~/composables/models/catalog'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

const { t } = usePortalI18n()
const { search, inputModality, sortBy, modalityOptions } = useModelsWorkspace()


const sortOptions = computed(() => [{ label: t('models.sort.name'), value: 'name' }, { label: t('models.sort.priceAsc'), value: 'price-asc' }, { label: t('models.sort.priceDesc'), value: 'price-desc' }])
</script>
