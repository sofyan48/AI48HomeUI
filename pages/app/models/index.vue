<template>
  <div class="model-workspace min-w-0 space-y-5">

    <UAlert v-if="catalogUnsupported" color="warning" variant="subtle" :title="t('models.unsupportedTitle')" :description="t('models.unsupportedDescription')" />

    <template v-else>
      <ModelsAlerts />
      <ModelsFilters />
      <ModelsGrid />
    </template>

    <ModelsDetailDrawer />
  </div>
</template>

<script setup lang="ts">
import ModelsAlerts from '~/components/app/models/ModelsAlerts.vue'
import ModelsDetailDrawer from '~/components/app/models/ModelsDetailDrawer.vue'
import ModelsFilters from '~/components/app/models/ModelsFilters.vue'
import ModelsGrid from '~/components/app/models/ModelsGrid.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { provideModelsWorkspace } from '~/composables/models/useModelsWorkspace'

definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const { catalogUnsupported } = provideModelsWorkspace()
</script>

<style scoped>
.model-workspace {
  max-width: 80rem;
  padding-block: 0.75rem;
  margin-inline: auto;
}
</style>
