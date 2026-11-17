<template>
  <AppCard class="catalog-panel catalog-model min-w-0" :ui="{ body: 'flex h-full flex-col gap-2.5 p-3.5 sm:p-4' }">
    <div class="flex min-w-0 items-center gap-2">
      <div class="catalog-icon flex size-8 shrink-0 items-center justify-center rounded-lg">
        <AppIcon :name="modelLogoIcon(model)" class="size-4" aria-hidden="true" />
      </div>
      <AppButton color="neutral" variant="link" size="sm" class="min-w-0 justify-start whitespace-normal break-words text-left" aria-haspopup="dialog" @click="openDetails(model, $event)">{{ model.display_name || model.id }}</AppButton>
    </div>
    <PortalBadge v-if="model.accessible === false" color="neutral" variant="subtle" size="sm" class="self-start">{{ t('models.badge.notIncluded') }}</PortalBadge>
    <div class="min-w-0">
      <p v-if="model.providers?.length" class="mt-1 break-words text-xs text-[var(--ui-text-muted)]">{{ t('models.servingProvidersLabel') }} <span class="font-mono">{{ model.providers.join(' · ') }}</span></p>
      <div class="mt-0.5 flex min-w-0 items-center gap-0.5">
        <code class="truncate text-xs text-[var(--ui-text-muted)]" :title="model.id">{{ model.id }}</code>
        <AppButton color="neutral" variant="ghost" size="xs" icon="i-tabler-copy" :aria-label="t('models.copyModelIdAria', { id: model.id })" @click.stop="copyModelId(model.id)" />
      </div>
    </div>
    <div v-if="capabilityLabels(model).length" class="flex flex-wrap gap-1">
      <PortalBadge v-for="label in capabilityLabels(model)" :key="label" color="neutral" variant="soft" size="xs">{{ label }}</PortalBadge>
    </div>
    <dl class="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2">
      <div><dt class="text-xs text-muted-foreground">{{ t('models.fact.context') }}</dt><dd class="mt-1 text-sm font-medium tabular-nums">{{ modelLimit(model, 'context_length') }}</dd></div>
      <div><dt class="text-xs text-muted-foreground">{{ t('models.fact.maxOutput') }}</dt><dd class="mt-1 text-sm font-medium tabular-nums">{{ modelLimit(model, 'max_output_tokens') }}</dd></div>
    </dl>
    <div class="catalog-price mt-auto flex items-center justify-between gap-2 pt-2.5">
      <div class="min-w-0">
        <template v-if="pricingEntryPoint(model.pricing)">
          <p class="text-xs font-medium leading-5">{{ t('models.price.from', { input: price(pricingEntryPoint(model.pricing)?.input), output: price(pricingEntryPoint(model.pricing)?.output) }) }}</p>

        </template>
        <p v-else class="text-xs leading-5 text-[var(--ui-text-muted)]">{{ pricingText(model) }}</p>
      </div>
      <AppButton color="primary" variant="ghost" size="xs" class="shrink-0" trailing-icon="i-tabler-arrow-right" :aria-label="t('models.detailsAria', { name: model.display_name || model.id })" @click="openDetails(model, $event)">{{ t('models.details') }}</AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { pricingEntryPoint, type CatalogModel } from '~/composables/userModelCatalog'
import { modelLogoIcon } from '~/composables/models/catalog'
import { useModelFormat } from '~/composables/models/useModelFormat'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

defineProps<{ model: CatalogModel }>()

const { t } = usePortalI18n()
const { openDetails } = useModelsWorkspace()
const { copyModelId, capabilityLabels, modelLimit, price, pricingText } = useModelFormat()
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
.catalog-price { border-top: 1px solid var(--ui-border); }
@media (prefers-reduced-motion: reduce) {
  .catalog-model { transition: none; }
}
</style>
