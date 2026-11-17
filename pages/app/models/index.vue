<template>
  <div class="model-workspace min-w-0 space-y-5">

    <PortalAlert v-if="catalogUnsupported" color="warning" variant="subtle" :title="t('models.unsupportedTitle')" :description="t('models.unsupportedDescription')" />

    <template v-else>

      <ModelsAlerts />
      <div class="grid min-w-0 items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside class="catalog-sidebar flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain" :aria-label="t('models.filter.features')">
          <ModelsSidebar />
        </aside>
        <div class="flex min-w-0 flex-col gap-5">
          <ModelsFilters />
          <ModelsGrid />
        </div>
      </div>
    </template>

    <ModelsDetailDrawer />
  </div>
</template>

<script setup lang="ts">

import PortalAlert from '~/components/app/general/PortalAlert.vue'
import ModelsAlerts from '~/components/app/models/ModelsAlerts.vue'
import ModelsDetailDrawer from '~/components/app/models/ModelsDetailDrawer.vue'
import ModelsFilters from '~/components/app/models/ModelsFilters.vue'

import ModelsGrid from '~/components/app/models/ModelsGrid.vue'
import ModelsSidebar from '~/components/app/models/ModelsSidebar.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { provideModelsWorkspace } from '~/composables/models/useModelsWorkspace'

definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const { catalogUnsupported } = provideModelsWorkspace()
</script>

<style scoped>
@media (min-width: 1024px) {
  :global(.user-shell--public) .catalog-sidebar {
    top: 5rem;
  }
}

.model-workspace {
  max-width: 96rem;
  padding-block: 0.75rem;
  margin-inline: auto;
}
</style>
