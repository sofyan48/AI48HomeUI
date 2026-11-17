<template>
  <div class="model-workspace min-w-0 space-y-5">

    <PortalAlert v-if="catalogUnsupported" color="warning" variant="subtle" :title="t('models.unsupportedTitle')" :description="t('models.unsupportedDescription')" />

    <template v-else>
      <AppCard tinted :ui="{ body: 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between' }">
        <div class="flex items-start gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><AppIcon name="i-tabler-box-multiple" class="size-5" aria-hidden="true" /></span>
          <div class="flex max-w-3xl flex-col gap-1.5">
            <h1 class="text-lg font-semibold">{{ t('models.catalog.title') }}</h1>
            <p class="text-sm leading-relaxed text-muted-foreground">{{ t('models.catalog.description') }}</p>
          </div>
        </div>
        <AppButton v-if="token" to="/app/models/price" color="neutral" variant="outline" size="sm" icon="i-tabler-receipt" class="shrink-0">{{ t('models.catalog.priceLink') }}</AppButton>
      </AppCard>
      <ModelsAlerts />
      <ModelsFilters />
      <ModelsGrid />
    </template>

    <ModelsDetailDrawer />
  </div>
</template>

<script setup lang="ts">
import AppCard from '~/components/AppCard.vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import ModelsAlerts from '~/components/app/models/ModelsAlerts.vue'
import ModelsDetailDrawer from '~/components/app/models/ModelsDetailDrawer.vue'
import ModelsFilters from '~/components/app/models/ModelsFilters.vue'
import ModelsGrid from '~/components/app/models/ModelsGrid.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { provideModelsWorkspace } from '~/composables/models/useModelsWorkspace'

definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const { catalogUnsupported, token } = provideModelsWorkspace()
</script>

<style scoped>
.model-workspace {
  max-width: 80rem;
  padding-block: 0.75rem;
  margin-inline: auto;
}
</style>
