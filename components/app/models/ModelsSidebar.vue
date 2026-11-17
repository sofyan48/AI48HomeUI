<template>
  <AppCard :ui="{ body: 'flex flex-col gap-4' }">
    <ModelsProviders />
    <Separator v-if="showProviders" />
    <ModelsFeatures />
    <Separator />
    <ModelsPriceFilter />
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '~/components/AppCard.vue'
import { Separator } from '~/components/ui/separator'
import ModelsFeatures from './ModelsFeatures.vue'
import ModelsPriceFilter from './ModelsPriceFilter.vue'
import ModelsProviders from './ModelsProviders.vue'
import { catalogProviders } from '~/composables/models/catalog'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

const { models, catalogReady, loading, error } = useModelsWorkspace()
const showProviders = computed(() => catalogReady.value && !loading.value && !error.value && catalogProviders(models.value).length > 0)
</script>
