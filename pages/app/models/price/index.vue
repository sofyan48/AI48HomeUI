<script setup lang="ts">
import AppCard from '~/components/AppCard.vue'
import AppIcon from '~/components/AppIcon.vue'
import PriceRatesTable from '~/components/app/models/PriceRatesTable.vue'
import AppModal from '~/components/AppModal.vue'
import { type CatalogModel } from '~/composables/userModelCatalog'
import ModelPricing from '~/components/app/models/ModelPricing.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import { Empty, EmptyDescription, EmptyHeader } from '~/components/ui/empty'
import { useModelPrices } from '~/composables/models/useModelPrices'

definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const selectedModel = ref<CatalogModel | null>(null)
const priceDetailOpen = ref(false)
function openPriceDetails(model: CatalogModel) { selectedModel.value = model; priceDetailOpen.value = true }
const { models, provider, providerOptions, providerModels, visibleModels, search, loading, error, unsupported, refresh } = useModelPrices()
watch([provider, models], () => { priceDetailOpen.value = false; selectedModel.value = null })
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5">
    <AppCard :ui="{ body: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' }">
      <div class="flex items-start gap-3">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><AppIcon name="i-tabler-receipt" class="size-5" aria-hidden="true" /></span>
        <details class="max-w-3xl text-sm">
          <summary class="cursor-pointer font-semibold">{{ t('models.prices.title') }}</summary>
          <p class="mt-2 leading-relaxed text-muted-foreground">{{ t('models.prices.description') }}</p>
        </details>
      </div>
      <AppButton to="/app/models" color="neutral" variant="outline" size="sm" icon="i-tabler-box-multiple" class="shrink-0">{{ t('models.prices.catalogLink') }}</AppButton>
    </AppCard>
    <PortalAlert v-if="unsupported" color="warning" :title="t('models.unsupportedTitle')" :description="t('models.error.keyAccess')" />
    <PortalAlert v-else-if="error" color="error" :title="t('models.loadErrorTitle')" :description="error" />
    <AppCard v-else :ui="{ body: 'flex min-w-0 flex-col gap-5' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 class="text-sm font-semibold">{{ t('models.prices.tableTitle') }}</h2>
            <p class="text-xs text-muted-foreground">{{ t('models.countSummary', { shown: visibleModels.length, total: providerModels.length }) }}</p>
          </div>
          <AppButton icon="i-tabler-refresh" color="neutral" variant="outline" size="sm" :loading="loading" @click="refresh">{{ t('models.prices.retry') }}</AppButton>
        </div>
      </template>
      <div class="flex flex-col gap-3 sm:flex-row">
        <PortalField :label="t('models.filter.provider')" class="w-full sm:max-w-xs">
          <PortalSelect v-model="provider" :items="providerOptions" value-key="value" label-key="label" :aria-label="t('models.filter.provider')" :disabled="loading || !providerOptions.length" class="w-full" />
        </PortalField>
        <PortalField :label="t('models.filter.search')" class="w-full sm:max-w-md">
          <PortalInput v-model="search" :aria-label="t('models.filter.searchAria')" :placeholder="t('models.filter.searchPlaceholder')" icon="i-tabler-search" class="w-full" />
        </PortalField>
      </div>

      <div v-if="loading" class="flex flex-col gap-2" aria-busy="true">
        <PortalSkeleton v-for="index in 4" :key="index" class="h-14 rounded-lg" />
      </div>
      <template v-else>
        <PriceRatesTable v-if="visibleModels.length" :models="visibleModels" @details="openPriceDetails" />
        <Empty v-if="!visibleModels.length" class="border border-border">
          <EmptyHeader><EmptyDescription>{{ models.length ? t('models.emptyFiltered') : t('models.prices.empty') }}</EmptyDescription></EmptyHeader>
        </Empty>
      </template>
    </AppCard>
    <AppModal v-model:open="priceDetailOpen" :title="selectedModel?.display_name || selectedModel?.id || t('models.pricing.title')" :description="selectedModel?.id" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div v-if="selectedModel" class="flex min-w-0 flex-col gap-4">
          <h2 class="text-sm font-semibold">{{ t('models.pricing.title') }}</h2>
          <p class="text-xs leading-relaxed text-muted-foreground">{{ t('models.pricing.noteRungs') }}</p>
          <p class="text-xs leading-relaxed text-muted-foreground">{{ t('models.pricing.noteFormula') }}</p>
          <ModelPricing :model="selectedModel" />
        </div>
      </template>
    </AppModal>
  </div>
</template>
