<template>
  <AppCard class="catalog-panel catalog-model min-w-0" :ui="{ body: 'flex h-full flex-col p-5 sm:p-6' }">
    <div class="flex items-start justify-between gap-2">
      <div class="catalog-icon flex size-10 shrink-0 items-center justify-center rounded-xl">
        <UIcon :name="modelLogoIcon(model)" class="size-6" aria-hidden="true" />
      </div>
      <UBadge v-if="model.accessible === true" color="success" variant="subtle" size="sm">{{ t('models.badge.included') }}</UBadge>
      <UBadge v-else-if="model.accessible === false" color="neutral" variant="subtle" size="sm">{{ t('models.badge.notIncluded') }}</UBadge>
    </div>
    <div class="mt-3 min-w-0">
      <AppButton color="neutral" variant="link" class="max-w-full justify-start whitespace-normal text-left" aria-haspopup="dialog" @click="openDetails(model, $event)">{{ model.display_name || model.id }}</AppButton>
      <p v-if="model.providers?.length" class="mt-1 break-words text-xs text-[var(--ui-text-muted)]">{{ t('models.servingProvidersLabel') }} <span class="font-mono">{{ model.providers.join(' · ') }}</span></p>
      <div class="mt-0.5 flex min-w-0 items-center gap-0.5">
        <code class="truncate text-xs text-[var(--ui-text-muted)]" :title="model.id">{{ model.id }}</code>
        <AppButton color="neutral" variant="ghost" size="xs" icon="i-tabler-copy" :aria-label="t('models.copyModelIdAria', { id: model.id })" @click.stop="copyModelId(model.id)" />
      </div>
    </div>
    <div v-if="capabilityLabels(model).length" class="mt-3 flex flex-wrap gap-1.5">
      <UBadge v-for="label in capabilityLabels(model)" :key="label" color="neutral" variant="soft" size="sm" class="rounded-full">{{ label }}</UBadge>
    </div>
    <div class="catalog-price mt-auto flex items-center justify-between gap-3 pt-4">
      <div class="min-w-0 space-y-1">
        <template v-if="pricingEntryPoint(model.pricing)">
          <p class="text-sm font-medium leading-6">{{ t('models.price.from', { input: price(pricingEntryPoint(model.pricing)?.input), output: price(pricingEntryPoint(model.pricing)?.output) }) }}</p>
          <UBadge v-if="(pricingEntryPoint(model.pricing)?.maxRungCount || 0) > 1" color="info" variant="subtle" size="sm">{{ t('models.price.tiered', { count: pricingEntryPoint(model.pricing)?.maxRungCount }) }}</UBadge>
          <p v-if="pricingEntryPoint(model.pricing)?.hasFormula" class="text-xs text-[var(--ui-text-muted)]">{{ t('models.price.formula') }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.price.openingNote') }}</p>
          <AppButton color="primary" variant="link" size="sm" icon="i-tabler-receipt" @click="openDetails(model, $event, 'pricing')">{{ t('models.price.complete') }}<span v-if="pricingEntryPoint(model.pricing)?.toolPrices.length"> · {{ t('models.price.toolRates', { count: pricingEntryPoint(model.pricing)?.toolPrices.length }) }}</span></AppButton>
        </template>
        <p v-else class="text-sm leading-6 text-[var(--ui-text-muted)]">{{ pricingText(model) }}</p>
      </div>
      <AppButton color="primary" variant="ghost" size="sm" class="shrink-0 rounded-full" trailing-icon="i-tabler-arrow-right" :aria-label="t('models.detailsAria', { name: model.display_name || model.id })" @click="openDetails(model, $event)">{{ t('models.details') }}</AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { usePortalI18n } from '~/composables/usePortalI18n'
import { pricingEntryPoint, type CatalogModel } from '~/composables/userModelCatalog'
import { modelLogoIcon } from '~/composables/models/catalog'
import { useModelFormat } from '~/composables/models/useModelFormat'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

defineProps<{ model: CatalogModel }>()

const { t } = usePortalI18n()
const { openDetails } = useModelsWorkspace()
const { copyModelId, capabilityLabels, price, pricingText } = useModelFormat()
</script>

<style scoped>
.catalog-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}
.catalog-model {
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.catalog-model:is(:hover, :focus-within) {
  border-color: color-mix(in oklch, var(--ui-primary) 35%, var(--ui-border)) !important;
  box-shadow: 0 12px 28px -14px color-mix(in oklch, var(--ui-primary) 40%, transparent) !important;
}
.catalog-model .catalog-icon { border-radius: 0.625rem; }
.catalog-price { padding-top: 1rem; border-top: 1px solid var(--ui-border); }
.catalog-model :deep([data-slot="body"]) { gap: 0.25rem; }
.catalog-price { margin-top: 1.25rem; }
@media (prefers-reduced-motion: reduce) {
  .catalog-model { transition: none; }
}
</style>
