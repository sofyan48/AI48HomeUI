<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h2 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-grid-dots" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('models.explore') }}</h2>
    <span class="rounded-full bg-[var(--ui-bg-muted)] px-3 py-1 text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('models.countSummary', { shown: filteredModels.length, total: models.length }) }}</span>
  </div>

  <div v-if="(loading || !catalogReady) && !models.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    <PortalSkeleton v-for="index in 12" :key="index" class="h-52 rounded-xl" />
  </div>
  <div v-else class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    <ModelsCard v-for="model in pagedModels" :key="model.id" :model="model" />
  </div>
  <div v-if="filteredModels.length" class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.showing', { from: (catalogPage - 1) * catalogPageSize + 1, to: Math.min(catalogPage * catalogPageSize, filteredModels.length), total: filteredModels.length }) }}</p>
    <PortalPagination v-if="filteredModels.length > catalogPageSize" v-model:page="catalogPage" :total="filteredModels.length" :items-per-page="catalogPageSize" :sibling-count="1" size="sm" />
  </div>
  <Empty v-if="catalogReady && !loading && !error && !filteredModels.length" class="rounded-2xl border border-border py-16 md:py-16"><EmptyHeader><EmptyDescription>{{ models.length ? t('models.emptyFiltered') : t('models.emptyNone') }}</EmptyDescription></EmptyHeader></Empty>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { Empty, EmptyDescription, EmptyHeader } from '~/components/ui/empty'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import PortalPagination from '~/components/app/general/PortalPagination.vue'
import ModelsCard from '~/components/app/models/ModelsCard.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { catalogPageSize } from '~/composables/models/catalog'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

const { t } = usePortalI18n()
const { models, loading, catalogReady, error, filteredModels, pagedModels, catalogPage } = useModelsWorkspace()
</script>
